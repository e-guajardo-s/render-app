// backend/services/mqttService.js
const mqtt = require('mqtt');
const MqttLog = require('../models/MqttLog.model');
const Semaphore = require('../models/Semaphore.model'); 
const StatusLog = require('../models/StatusLog.model'); 
const Ticket = require('../models/Ticket.model');
const Notification = require('../models/Notification.model'); 
const User = require('../models/User.model');

let client = null;
let ioInstance = null;

const deviceCache = new Map();

const CHECK_INTERVAL    = 60 * 1000;
const INACTIVITY_LIMIT  = 20 * 60 * 1000;
const HEARTBEAT_INTERVAL = 5 * 60 * 1000;

async function loadDeviceCache() {
    try {
        console.log("Cargando semaforos en cache de memoria...");
        const devices = await Semaphore.find({}, '_id cruceId mqtt_topic mqtt_config status comuna monitoreando enMantencion tieneUPS');
        devices.forEach(dev => {
            if (dev.mqtt_topic) {
                deviceCache.set(dev.mqtt_topic, {
                    _id:          dev._id,
                    cruceId:      dev.cruceId,
                    comuna:       dev.comuna,
                    monitoreando: dev.monitoreando ?? false,
                    enMantencion: dev.enMantencion ?? false,
                    tieneUPS:     dev.tieneUPS !== false,
                    mqttConfig:   dev.mqtt_config || null,
                    status:       dev.status || {}
                });
            }
        });
        console.log(`Cache lista: ${deviceCache.size} dispositivos cargados.`);
    } catch (error) {
        console.error("Error cargando cache:", error);
    }
}

async function getSystemUserId() {
    try {
        const systemUser = await User.findOne({ role: 'superadmin' }).select('_id');
        if (systemUser) return systemUser._id;
        const anyAdmin = await User.findOne({ role: 'admin' }).select('_id');
        return anyAdmin?._id || null;
    } catch (e) {
        console.error('[MQTT] Error obteniendo systemUserId:', e);
        return null;
    }
}

async function createNotification({ title, message, type, relatedEntity = null, relatedEntityType = null, targetComuna = null }) {
    try {
        await Notification.create({
            title, message, type,
            targetRole: 'admin',
            targetComuna, relatedEntity, relatedEntityType,
            readBy: [], deletedBy: []
        });

        if (targetComuna) {
            await Notification.create({
                title, message, type,
                targetRole: 'municipalidad',
                targetComuna, relatedEntity, relatedEntityType,
                readBy: [], deletedBy: []
            });
        }

        if (ioInstance) {
            ioInstance.emit('new_notification', { title, message, type });
        }
    } catch (e) {
        console.error('[MQTT] Error creando notificacion:', e);
    }
}

// --- HELPER: Crear ticket automatico ---
//
// Tipos y prioridades:
//   'offline'  -> Alim=Apagado + UPS=Apagado -> Sin alimentacion ni respaldo -> CRITICA
//   'ups'      -> Alim=Apagado + UPS=Prendido -> Corte electrico, UPS activo -> ALTA
//   'aislado'  -> UTC=Apagado + Alim=OK       -> UTC fuera de red            -> ALTA
//   'anomalia' -> Luces=Apagado + todo OK     -> Falla en grupo de luces     -> MEDIA
//
// El campo "UTC" en MQTT representa el sistema de coordinacion de semaforos.
// "UTC=Apagado" significa que el UTC no esta en la red, no que este apagado fisicamente.
// UPS.value es voltaje analogico 0-12V (rele). >=6V = Prendido, <6V = Apagado.
async function handleAutoTicket(device, type, description) {
    try {
        const systemUserId = await getSystemUserId();
        if (!systemUserId) {
            console.error('[MQTT] No se pudo crear ticket automatico: sin usuario sistema.');
            return;
        }

        // Evitar duplicados por tipo
        const existingQuery = {
            cruceId: device.cruceId,
            status: { $in: ['pending', 'in_progress'] }
        };
        // Para UPS y aislado: buscar solo tickets del mismo tipo para no bloquear otros
        if (type === 'ups') {
            existingQuery.origin = 'iot_auto';
            existingQuery.title = { $regex: 'Respaldo UPS', $options: 'i' };
        } else if (type === 'aislado') {
            existingQuery.origin = 'iot_auto';
            existingQuery.title = { $regex: 'Aislado', $options: 'i' };
        }

        const existingTicket = await Ticket.findOne(existingQuery);
        if (existingTicket) {
            console.log(`[MQTT] Ticket ya existe para ${device.cruceId} (${type}), omitiendo.`);
            return;
        }

        const CONFIG = {
            offline:  { emoji: '[OFFLINE]',  label: 'Apagado Total',                   priority: 'Critica' },
            ups:      { emoji: '[UPS]',       label: 'Respaldo UPS Activo',             priority: 'Alta'    },
            aislado:  { emoji: '[AISLADO]',   label: 'Cruce Aislado (UTC fuera de red)', priority: 'Alta'   },
            anomalia: { emoji: '[ANOMALIA]',  label: 'Anomalia en Luces',              priority: 'Media'   },
        };
        const cfg   = CONFIG[type] || CONFIG.anomalia;
        const title = `${cfg.emoji} ${cfg.label}: ${device.cruceId}`;

        const ticket = await Ticket.create({
            title,
            description,
            cruceId:   device.cruceId,
            origin:    'iot_auto',
            status:    'pending',
            priority:  cfg.priority,
            createdBy: systemUserId
        });

        console.log(`[MQTT] Ticket automatico [${type}] creado para ${device.cruceId}: ${ticket._id}`);

        await createNotification({
            title,
            message:           description,
            type:              'new_ticket',
            relatedEntity:     ticket._id,
            relatedEntityType: 'Ticket',
            targetComuna:      device.comuna || null
        });

    } catch (e) {
        console.error('[MQTT] Error en handleAutoTicket:', e);
    }
}

const normalizeState = (state) => {
    if (!state) return 'Desc.';
    const s = String(state).toLowerCase().trim();
    if (s === 'prendido')    return 'Prendido';
    if (s === 'apagado')     return 'Apagado';
    if (s === 'falla')       return 'Falla';
    if (s === 'desconocido') return 'Desconocido';
    return 'Desc.';
};

const connectToBroker = async (config, io) => {
    if (io) ioInstance = io;
    if (!config || !config.host) return;

    await loadDeviceCache();

    if (client) {
        console.log("Reiniciando servicio MQTT...");
        client.end(true);
    }

    const port  = parseInt(config.port) || 8883;
    const isTLS = port === 8883;
    const env   = process.env.NODE_ENV === 'production' ? 'aws' : 'local';
    const clientId = `render-app-${env}-${Math.random().toString(16).slice(2, 8)}`;

    const options = {
        host:               config.host,
        port,
        protocol:           isTLS ? 'mqtts' : 'mqtt',
        username:           config.username,
        password:           config.password,
        clientId,
        clean:              true,
        rejectUnauthorized: true,
        keepalive:          30,
        connectTimeout:     10000,
        reconnectPeriod:    5000,
    };

    console.log(`Conectando a HiveMQ: ${options.host}:${port} [${clientId}]`);
    client = mqtt.connect(options);

    let watchdogInterval = null;

    client.on('connect', () => {
        console.log(`MQTT Monitor: CONECTADO como [${clientId}]`);
        client.subscribe('#', { qos: 1 }, (err) => {
            if (err) console.error('Error suscripcion MQTT:', err.message);
            else     console.log('Suscrito a todos los topicos (#)');
        });
        if (!watchdogInterval) {
            watchdogInterval = setInterval(checkInactivity, CHECK_INTERVAL);
        }
    });

    client.on('reconnect', () => console.log('MQTT: Reconectando...'));
    client.on('offline',   () => console.warn('MQTT: Cliente offline'));
    client.on('close',     () => console.warn('MQTT: Conexion cerrada'));
    client.on('error',     (err) => {
        console.error('Error MQTT:', err.message);
        if (err.message.includes('certificate'))      console.error('Verifica MQTT_PORT=8883 y el host');
        if (err.message.includes('Not authorized'))   console.error('Usuario/contrasena incorrectos en HiveMQ');
        if (err.message.includes('Client identifier')) console.error('ClientId rechazado por el broker');
    });

    client.on('message', async (topic, message) => {
        const msgString = message.toString();

        // Filtrar topicos internos (will messages) - no mostrar en el sniffer
        const isInternalTopic = topic.startsWith('render-app/');
        if (ioInstance && !isInternalTopic) {
            ioInstance.emit('mqtt_message', {
                topic, message: msgString,
                time: new Date().toLocaleTimeString()
            });
        }

        try {
            let data;
            try { data = JSON.parse(msgString); } catch (e) { return; }

            if (data.UTC) {
                let cachedDevice = deviceCache.get(topic);

                if (!cachedDevice) {
                    const dbDevice = await Semaphore.findOne({ mqtt_topic: topic });
                    if (dbDevice) {
                        cachedDevice = {
                            _id:          dbDevice._id,
                            cruceId:      dbDevice.cruceId,
                            comuna:       dbDevice.comuna,
                            monitoreando: dbDevice.monitoreando ?? false,
                            enMantencion: dbDevice.enMantencion ?? false,
                            tieneUPS:     dbDevice.tieneUPS !== false,
                            mqttConfig:   dbDevice.mqtt_config || null,
                            status:       dbDevice.status || {}
                        };
                        deviceCache.set(topic, cachedDevice);
                    } else {
                        return; // dispositivo no registrado
                    }
                }

                if (!cachedDevice.monitoreando) {
                    console.log(`[MQTT] Ignorado ${cachedDevice.cruceId}: no monitoreando.`);
                    return;
                }

                const enMantencion = cachedDevice.enMantencion === true;

                // Leer telemetria
                // UTC.state -> estado del UTC en la red ('Prendido'=en red, 'Apagado'=fuera de red)
                // Alimentacion.state -> presencia de energia electrica
                // Luces.state -> estado del grupo de luces
                // UPS.value -> voltaje analogico 0-12V (rele: >=6V = Prendido, <6V = Apagado)
                const rawControlador = normalizeState(data.UTC?.state);
                const rawLuces       = normalizeState(data.Luces?.state);
                const rawAlim        = normalizeState(data.Alimentacion?.state);
                const valorUps       = parseFloat(data.UPS?.value || 0);
                const UPS_THRESHOLD  = 6; // Umbral: >=6V = Prendido, <6V = Apagado
                const upsActivo      = valorUps >= UPS_THRESHOLD;
                const rawUps         = upsActivo ? 'Prendido' : 'Apagado';

                const estControlador = rawControlador.toLowerCase();
                const estLuces       = rawLuces.toLowerCase();
                const estAlim        = rawAlim.toLowerCase();
                const estUps         = rawUps.toLowerCase();

                const currentStatus = cachedDevice.status;

                const haCambiado =
                    (currentStatus.controlador  || '').toLowerCase() !== estControlador ||
                    (currentStatus.luces        || '').toLowerCase() !== estLuces       ||
                    (currentStatus.alimentacion || '').toLowerCase() !== estAlim        ||
                    (currentStatus.ups_estado   || '').toLowerCase() !== estUps;

                const timeSinceLastUpdate = Date.now() - new Date(currentStatus.last_seen || 0).getTime();
                cachedDevice.status.last_seen = new Date();

                if (haCambiado) {
                    cachedDevice.status.controlador  = rawControlador;
                    cachedDevice.status.luces        = rawLuces;
                    cachedDevice.status.alimentacion = rawAlim;
                    cachedDevice.status.ups_estado   = rawUps;

                    let logType = 'info';
                    let logMsg  = 'Operacion Normal';

                    // Si vuelve la alimentacion normal -> limpiar ups_inicio
                    if (estAlim === 'prendido' && cachedDevice.status.ups_inicio) {
                        console.log(`[MQTT] Alimentacion restaurada en ${cachedDevice.cruceId}`);
                        cachedDevice.status.ups_inicio = null;
                    }

                    // ================================================================
                    // LOGICA DE ESTADOS (prioridad de mayor a menor gravedad)
                    //
                    // Datos reales TRB256:
                    //   UTC = UTC en red (Apagado = aislado, no apagado fisico)
                    //   Alimentacion = energia electrica de red
                    //   Luces = grupo de luces del semaforo
                    //   UPS.value = voltaje 0-12V (rele). >=6V=Prendido, <6V=Apagado
                    // ================================================================

                    if (estAlim !== 'prendido' && !upsActivo) {
                        // OFFLINE: sin alimentacion electrica Y sin respaldo UPS
                        logType = 'offline';
                        logMsg  = 'Apagado Total (sin alimentacion ni UPS)';
                        if (!enMantencion) {
                            await handleAutoTicket(
                                cachedDevice, 'offline',
                                `Cruce ${cachedDevice.cruceId} sin alimentacion electrica ni respaldo UPS. ` +
                                `Apagado total detectado via MQTT.`
                            );
                        }

                    } else if (estAlim !== 'prendido' && upsActivo) {
                        // UPS ACTIVO: corte electrico pero UPS encendido
                        logType = 'ups';
                        logMsg  = 'Corte Electrico - Respaldo UPS Activo';
                        // Ticket y ups_inicio solo en la PRIMERA transicion a UPS
                        if (!cachedDevice.status.ups_inicio) {
                            cachedDevice.status.ups_inicio = new Date();
                            console.log(`[MQTT] UPS iniciado en ${cachedDevice.cruceId} a las ${cachedDevice.status.ups_inicio.toLocaleTimeString()}`);
                            if (!enMantencion) {
                                await handleAutoTicket(
                                    cachedDevice, 'ups',
                                    `Corte de energia electrica en cruce ${cachedDevice.cruceId}. ` +
                                    `Sistema operando con respaldo UPS (rele activo). ` +
                                    `Se requiere verificar el suministro electrico.`
                                );
                            }
                        }

                    } else if (estControlador !== 'prendido' && estAlim === 'prendido') {
                        // AISLADO: UTC fuera de red, hay alimentacion pero el UTC no esta coordinado
                        // Nota: "UTC=Apagado" no significa que el equipo este apagado,
                        // significa que el UTC no se encuentra en la red de coordinacion de semaforos.
                        logType = 'error';
                        logMsg  = 'Cruce Aislado (UTC fuera de red)';
                        if (!enMantencion) {
                            await handleAutoTicket(
                                cachedDevice, 'aislado',
                                `El UTC del cruce ${cachedDevice.cruceId} no se encuentra en la red de coordinacion. ` +
                                `Alimentacion presente, UPS ${upsActivo ? 'activo' : 'inactivo'}. ` +
                                `El cruce opera de forma aislada sin coordinacion de red. ` +
                                `Se requiere verificar la conectividad del UTC.`
                            );
                        }

                    } else if (estLuces !== 'prendido' && estControlador === 'prendido' && estAlim === 'prendido') {
                        // ANOMALIA: luces apagadas con controlador y alimentacion OK
                        logType = 'warning';
                        logMsg  = 'Anomalia: Luces Apagadas';
                        if (!enMantencion) {
                            await handleAutoTicket(
                                cachedDevice, 'anomalia',
                                `Luces del semaforo apagadas en cruce ${cachedDevice.cruceId} ` +
                                `con controlador UTC y alimentacion activos. ` +
                                `Posible falla en grupo de lamparas o cable de luces.`
                            );
                        }

                    } else {
                        // OPERATIVO: todo OK
                        logType = 'info';
                        logMsg  = 'Operacion Normal';
                    }

                    // ================================================================

                    try { await MqttLog.create({ topic, message: msgString }); } catch (e) {}

                    const newLog = await StatusLog.create({
                        cruceId:      cachedDevice.cruceId,
                        controlador:  rawControlador,
                        luces:        rawLuces,
                        alimentacion: rawAlim,
                        ups_estado:   rawUps,
                        type:         logType,
                        message:      logMsg
                    });

                    // Guardar en BD
                    const setFields = {
                        'status.controlador':  rawControlador,
                        'status.luces':        rawLuces,
                        'status.alimentacion': rawAlim,
                        'status.ups_estado':   rawUps,
                        'status.last_seen':    cachedDevice.status.last_seen
                    };
                    if (cachedDevice.status.ups_inicio !== undefined) {
                        setFields['status.ups_inicio'] = cachedDevice.status.ups_inicio;
                    }
                    await Semaphore.findByIdAndUpdate(cachedDevice._id, { $set: setFields }, { runValidators: true });

                    if (ioInstance) {
                        ioInstance.emit('status_log_created', { cruceId: cachedDevice.cruceId, log: newLog });
                        ioInstance.emit('status_update', {
                            cruceId:      cachedDevice.cruceId,
                            isOnline:     true,
                            monitoreando: cachedDevice.monitoreando,
                            fullStatus:   cachedDevice.status
                        });
                    }

                } else if (timeSinceLastUpdate > HEARTBEAT_INTERVAL) {
                    // Solo heartbeat: actualizar last_seen sin emitir al sniffer
                    await Semaphore.findByIdAndUpdate(cachedDevice._id, {
                        $set: { 'status.last_seen': cachedDevice.status.last_seen }
                    }, { runValidators: true });
                }
            }
        } catch (err) {
            console.error("Error procesando telemetria:", err);
        }
    });

    return client;
};

// --- WATCHDOG ---
const checkInactivity = async () => {
    try {
        const thresholdDate = new Date(Date.now() - INACTIVITY_LIMIT);

        for (const [topic, device] of deviceCache.entries()) {
            const lastSeen = new Date(device.status.last_seen).getTime();

            if (lastSeen < thresholdDate.getTime() && device.status.controlador !== 'Desconocido') {
                const enMantencion = device.enMantencion === true;
                console.log(`[WATCHDOG] Sin senial: ${device.cruceId}${enMantencion ? ' (en mantencion)' : ''}`);

                device.status.controlador  = 'Desconocido';
                device.status.luces        = 'Desconocido';
                device.status.alimentacion = 'Desconocido';
                device.status.ups_estado   = 'Apagado';

                await Semaphore.findByIdAndUpdate(device._id, {
                    $set: { status: device.status }
                }, { runValidators: true });

                if (!enMantencion) {
                    await handleAutoTicket(
                        device, 'offline',
                        `Cruce ${device.cruceId} sin comunicacion por mas de 20 minutos. Sin senial MQTT (Watchdog).`
                    );
                }

                await StatusLog.create({
                    cruceId:      device.cruceId,
                    type:         'offline',
                    message:      `Perdida de Senial (Watchdog)${enMantencion ? ' [En Mantencion]' : ''}`,
                    controlador:  'Desconocido',
                    luces:        'Desconocido',
                    alimentacion: 'Desconocido',
                    ups_estado:   'Apagado'
                });

                if (ioInstance) {
                    ioInstance.emit('status_update', { cruceId: device.cruceId, isOnline: false, fullStatus: device.status });
                    if (!enMantencion) {
                        ioInstance.emit('new_notification', {
                            title:   `Sin Senial: ${device.cruceId}`,
                            message: `El cruce ${device.cruceId} lleva mas de 20 minutos sin comunicar.`,
                            type:    'status_change'
                        });
                    }
                }
            }
        }
    } catch (error) {
        console.error("Error en Watchdog:", error);
    }
};

// Actualizar cache desde routes externos sin reiniciar el servicio
const updateDeviceCache = (topic, fields) => {
    if (!topic || !deviceCache.has(topic)) return;
    Object.assign(deviceCache.get(topic), fields);
};

module.exports = { connectToBroker, updateDeviceCache };
