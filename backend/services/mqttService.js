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

// Configuración de tiempos
const CHECK_INTERVAL = 60 * 1000;        // Revisar inactividad cada 1 min
const INACTIVITY_LIMIT = 20 * 60 * 1000; // 20 min sin señal = Offline
const HEARTBEAT_INTERVAL = 5 * 60 * 1000; // Actualizar 'last_seen' al menos cada 5 min

// --- HELPER 1: BUSCAR USUARIO "sistema" ---
async function getSystemUserId() {
    try {
        const botUser = await User.findOne({ username: 'sistema' }); 
        if (botUser) return botUser._id;
        
        // Fallback: Si no existe, usamos cualquier admin
        console.warn("[AUTO-TICKET] Advertencia: No existe el usuario 'sistema'. Usando admin por defecto.");
        const admin = await User.findOne({ role: { $in: ['admin', 'superadmin'] } });
        return admin ? admin._id : null;
    } catch (e) {
        console.error("Error buscando usuario sistema:", e);
        return null;
    }
}

// --- HELPER 2: CREAR NOTIFICACIÓN ---
async function createNotification(targetRole, targetComuna, title, message, type, relatedEntityId = null, entityType = null) {
    try {
        const notifPayload = {
            targetRole, targetComuna: targetComuna || null, 
            title, message, type, 
            relatedEntity: relatedEntityId, relatedEntityType: entityType
        };

        const notif = await Notification.create(notifPayload);
        if (ioInstance) ioInstance.emit('new_notification', notif);
    } catch (error) {
        console.error("❌ Error guardando Notificación:", error.message);
    }
}

// --- HELPER 3: GESTOR DE TICKETS AUTOMÁTICOS ---
async function handleAutoTicket(device, type, description) {
    try {
        // Verificar Duplicados (Solo tickets pendientes o en progreso)
        const existingTicket = await Ticket.findOne({
            cruceId: device.cruceId,
            status: { $in: ['pending', 'in_progress'] }
        });

        if (existingTicket) {
            console.log(`[AUTO-TICKET] Omitido: Ya existe ticket activo para ${device.cruceId}`);
            return; 
        }

        const systemUserId = await getSystemUserId();
        if (!systemUserId) return; 

        // Crear Ticket
        const newTicket = await Ticket.create({
            title: `[ALERTA IoT] ${type === 'offline' ? 'Pérdida de Conexión' : 'Falla Crítica de Hardware'}`,
            description: description,
            cruceId: device.cruceId,
            origin: 'iot_auto',
            priority: type === 'offline' ? 'Alta' : 'Critica',
            status: 'pending',
            createdBy: systemUserId,
            municipalityName: device.comuna
        });

        console.log(`[AUTO-TICKET] ✅ Ticket Creado: ${newTicket._id}`);

        // Notificar
        await createNotification('municipalidad', device.comuna, `⚠️ Ticket Crítico: ${device.cruceId}`, `Ticket automático por ${type}.`, 'new_ticket', newTicket._id, 'Ticket');
        await createNotification('superadmin', null, `🚨 ALERTA IoT: ${device.cruceId}`, `Falla crítica. Ticket #${newTicket._id}`, 'new_ticket', newTicket._id, 'Ticket');

        if (ioInstance) ioInstance.emit('new_ticket', newTicket);

    } catch (error) {
        console.error("[AUTO-TICKET] Error creando ticket:", error);
    }
}

const connectToBroker = (config, io) => {
    if (io) ioInstance = io;
    if (!config || !config.host) return;

    if (client) {
        console.log("🔄 Reiniciando servicio MQTT...");
        client.end();
    }

    const options = {
        host: config.host,
        port: parseInt(config.port) || 1883,
        protocol: (config.port === 8883 || config.port === '8883') ? 'mqtts' : 'mqtt',
        username: config.username,
        password: config.password,
        reconnectPeriod: 5000,
    };

    console.log(`🔌 Conectando a Broker MQTT: ${options.host}...`);

    client = mqtt.connect(options);

    client.on('connect', () => {
        console.log("✅ MQTT Monitor: CONECTADO.");
        client.subscribe('#'); 
        setInterval(checkInactivity, CHECK_INTERVAL);
    });

    client.on('error', (err) => console.error("❌ Error MQTT:", err.message));

    client.on('message', async (topic, message) => {
        const msgString = message.toString();
        if (ioInstance) ioInstance.emit('mqtt_message', { topic, message: msgString, time: new Date().toLocaleTimeString() });

        try {
            let data;
            try { data = JSON.parse(msgString); } catch (e) { return; }

            if (data.Controlador) { 
                const device = await Semaphore.findOne({ mqtt_topic: topic });
                
                if (device) {
                    const rawControlador = data.Controlador?.state || 'Desc.';
                    const rawLuces = data.Luces?.state || 'Desc.';
                    const rawAlim = data.Alimentacion?.state || 'Desc.';
                    const valorUps = parseFloat(data.UPS?.value || 0);

                    const estControlador = rawControlador.toLowerCase();
                    const estLuces = rawLuces.toLowerCase();
                    const estAlim = rawAlim.toLowerCase();
                    
                    const currentStatus = device.status || {};
                    const diffVoltaje = Math.abs(parseFloat(currentStatus.ups_voltaje || 0) - valorUps);
                    
                    const haCambiado = 
                        (currentStatus.controlador || '').toLowerCase() !== estControlador ||
                        (currentStatus.luces || '').toLowerCase() !== estLuces ||
                        (currentStatus.alimentacion || '').toLowerCase() !== estAlim ||
                        diffVoltaje > 0.5;

                    const timeSinceLastUpdate = Date.now() - new Date(currentStatus.last_seen || 0).getTime();

                    if (haCambiado) {
                        let logType = 'info';      
                        let logMsg = 'Operación Normal';

                        // 1. OFFLINE TOTAL / APAGADO
                        if (estControlador !== 'prendido' && estAlim !== 'prendido' && valorUps <= 0) {
                            logType = 'offline';
                            logMsg = '⚫ Sin Conexión (Apagado Total)';
                            // CORRECCIÓN 1: Generar ticket si el dispositivo avisa que se apaga
                            await handleAutoTicket(device, 'offline', 'El dispositivo reportó apagado total (Offline) vía MQTT.');
                        } 
                        // 2. FALLA CRÍTICA
                        else if (estControlador !== 'prendido') {
                            logType = 'error';
                            logMsg = '⚠️ Falla Crítica: Controlador Apagado';
                            await handleAutoTicket(device, 'critical', `Controlador reporta estado: ${rawControlador}. UPS: ${valorUps}V.`);
                        } 
                        // 3. UPS / ALERTAS
                        else if (estAlim !== 'prendido' && valorUps > 20) {
                            logType = 'ups';
                            logMsg = '🔋 Corte de Energía - Respaldo UPS Activo';
                            // Notificaciones...
                        } else if (estLuces !== 'prendido' || valorUps <= 20) {
                            logType = 'warning';
                            logMsg = valorUps <= 20 ? '🪫 Alerta UPS: Batería Baja / Apagada' : '💡 Luces Apagadas / Intermitente';
                            // Notificaciones...
                        }

                        console.log(`[LOG] Cambio en ${device.cruceId}: ${logMsg}`);

                        try { await MqttLog.create({ topic, message: msgString }); } catch (e) {}

                        const newLog = await StatusLog.create({
                            cruceId: device.cruceId, controlador: rawControlador, luces: rawLuces,
                            alimentacion: rawAlim, ups_voltaje: valorUps, type: logType, message: logMsg
                        });

                        // Actualizar en BD
                        await Semaphore.findByIdAndUpdate(device._id, {
                            $set: {
                                "status.controlador": rawControlador, "status.luces": rawLuces,
                                "status.alimentacion": rawAlim, "status.ups_voltaje": valorUps,
                                "status.last_seen": new Date()
                            }
                        });

                        // CORRECCIÓN 2: Emitir evento 'status_update' para que el Dashboard cambie de color
                        if (ioInstance) {
                            ioInstance.emit('status_log_created', { cruceId: device.cruceId, log: newLog });
                            ioInstance.emit('mqtt_message', { topic, message: msgString, time: new Date().toLocaleTimeString(), type: 'CHANGE' });
                            
                            // 🔥 ESTO FALTABA PARA ACTUALIZAR EL MAPA:
                            ioInstance.emit('status_update', {
                                cruceId: device.cruceId,
                                isOnline: true, // Si manda datos, está online (aunque reporte error)
                                fullStatus: {
                                    controlador: rawControlador,
                                    luces: rawLuces,
                                    alimentacion: rawAlim,
                                    ups_voltaje: valorUps,
                                    last_seen: new Date()
                                }
                            });
                        }
                    } else if (timeSinceLastUpdate > HEARTBEAT_INTERVAL) {
                        await Semaphore.findByIdAndUpdate(device._id, { $set: { "status.last_seen": new Date() } });
                        if (ioInstance) ioInstance.emit('mqtt_message', { topic, message: msgString, time: new Date().toLocaleTimeString(), type: 'HEARTBEAT' });
                    }
                }
            }
        } catch (err) {
            console.error("Error procesando telemetría:", err);
        }
    });

    return client;
};

// --- WATCHDOG (Ticket Offline por Inactividad) ---
const checkInactivity = async () => {
    try {
        const thresholdDate = new Date(Date.now() - INACTIVITY_LIMIT);
        const deadDevices = await Semaphore.find({
            "status.last_seen": { $lt: thresholdDate },
            "status.controlador": { $ne: 'Desconocido' } 
        });

        for (const device of deadDevices) {
            console.log(`[WATCHDOG] Forzando OFFLINE para: ${device.cruceId}`);

            const updatedDevice = await Semaphore.findByIdAndUpdate(
                device._id,
                { $set: { "status.controlador": 'Desconocido', "status.luces": 'Desconocido', "status.alimentacion": 'Desconocido', "status.ups_voltaje": 0 } },
                { new: true } 
            );

            // 🔥 TICKET AUTOMÁTICO (OFFLINE) - Esto ya estaba, pero asegúrate de que el user 'sistema' exista
            await handleAutoTicket(updatedDevice, 'offline', 'El dispositivo ha dejado de comunicar por más de 20 minutos (Watchdog).');

            await StatusLog.create({
                cruceId: updatedDevice.cruceId, type: 'offline', message: '📡 Pérdida de Señal (Watchdog - Inactividad)',
                controlador: 'Desconocido', luces: 'Desconocido', alimentacion: 'Desconocido', ups_voltaje: 0
            });

            if (ioInstance) {
                // Actualiza el mapa a GRIS (Offline)
                ioInstance.emit('status_update', {
                    cruceId: updatedDevice.cruceId,
                    isOnline: false,
                    fullStatus: updatedDevice.status 
                });
            }
        }
    } catch (error) { 
        console.error("Error en Watchdog:", error); 
    }
};

module.exports = { connectToBroker };