// En: frontend/src/utils/statusHelper.js

// 1. Colores
export const STATUS_COLORS = {
    OPERATIVO:     '#28a745', // Verde
    ANOMALIA:      '#fd7e14', // Naranja
    AISLADO:       '#7c3aed', // Morado (UTC apagado pero con señal)
    UPS:           '#3b82f6', // Azul
    OFFLINE:       '#dc3545', // Rojo (monitorado pero sin conexión)
    NO_MONITORADO: '#6c757d', // Gris (no se monitorea)
    MANTENCION:    '#f59e0b', // Amarillo — técnico trabajando en el cruce
};

// 2. Información de la Leyenda
export const STATUS_LEGEND = [
    { key: 'OPERATIVO',     text: 'Operativo',       color: STATUS_COLORS.OPERATIVO },
    { key: 'UPS',           text: 'Respaldo UPS',    color: STATUS_COLORS.UPS },
    { key: 'ANOMALIA',      text: 'Con Anomalía',    color: STATUS_COLORS.ANOMALIA },
    { key: 'AISLADO',       text: 'Aislado',         color: STATUS_COLORS.AISLADO },
    { key: 'OFFLINE',       text: 'Sin Conexión',    color: STATUS_COLORS.OFFLINE },
    { key: 'MANTENCION',    text: 'En Mantención',   color: STATUS_COLORS.MANTENCION },
    { key: 'NO_MONITORADO', text: 'Sin Monitoreo',   color: STATUS_COLORS.NO_MONITORADO },
];

// 3. Función para obtener el estado (Clave y Texto)
// monitoreando y enMantencion son campos independientes del status de telemetría
export const getOverallStatus = (status, monitoreando, enMantencion) => {
    // Rama 0 — MANTENCIÓN (amarillo): técnico trabajando, inhibe alertas
    if (enMantencion === true) {
        return { key: 'MANTENCION', text: 'En Mantención' };
    }

    // Rama A — SIN MONITOREO (gris): campo no es explícitamente true
    if (monitoreando !== true) {
        return { key: 'NO_MONITORADO', text: 'Sin Monitoreo' };
    }

    // Rama B — CON MONITOREO: a partir de aquí se evalúa la telemetría
    // Sin datos de telemetría = perdió conexión
    if (!status) {
        return { key: 'OFFLINE', text: 'Sin Conexión' };
    }

// --- NORMALIZACIÓN DE DATOS (A Prueba de Balas) ---
    const isTrue = (val) => String(val).toLowerCase().trim() === 'prendido' || val === true;
    
    const ctrlOn = isTrue(status.controlador);
    const alimOn = isTrue(status.alimentacion);
    const lucesOn = isTrue(status.luces);

    // --- CORRECCIÓN UPS ---
    // UPS es ahora un relé binario: Prendido/Apagado (no voltaje analógico)
    const rawUps = status.ups_estado ?? status.ups ?? 'Apagado';
    const upsOn = String(rawUps).toLowerCase().trim() === 'prendido' || rawUps === true;
    
    // --- TABLA DE PRIORIDADES ---

    // 1. OFFLINE (Gris): Todo apagado (0,0,0)
    if (!ctrlOn && !alimOn && !upsOn) {
        return { key: 'OFFLINE', text: 'Sin Conexión' };
    }

    // 2. AISLADO (Gris): El UTC está apagado pero hay señal
    if (!ctrlOn) {
        return { key: 'AISLADO', text: 'Aislado' };
    }

    // 3. RESPALDO UPS (Azul): Corte de luz + UPS Activo (relé encendido)
    if (!alimOn && upsOn) {
        return { key: 'UPS', text: 'Respaldo UPS' };
    }

    // 4. ANOMALÍA (Naranja): Luces apagadas
    if (!lucesOn) {
        return { key: 'ANOMALIA', text: 'Con Anomalía' };
    }

    // 5. OPERATIVO (Verde): Todo OK
    return { key: 'OPERATIVO', text: 'Operativo' };
};

// 4. Función para obtener solo el color
export const getStatusColor = (statusKey) => {
    return STATUS_COLORS[statusKey] || STATUS_COLORS.OFFLINE;
};

// 5. Función para la clase CSS de la pastilla (Pill)
export const getStatusPillClass = (statusKey) => {
    switch (statusKey) {
        case 'OPERATIVO':     return 'status-green';
        case 'ANOMALIA':      return 'status-orange';
        case 'AISLADO':       return 'status-purple';
        case 'UPS':           return 'status-blue';
        case 'MANTENCION':    return 'status-yellow';
        case 'NO_MONITORADO': return 'status-grey';
        case 'OFFLINE':
        default:              return 'status-red';
    }
};