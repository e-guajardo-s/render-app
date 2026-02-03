// En: frontend/src/utils/statusHelper.js

// 1. Colores (AGREGADO: Azul para UPS)
export const STATUS_COLORS = {
    OPERATIVO: '#28a745', // Verde
    ANOMALIA: '#fd7e14',  // Naranja/Amarillo
    FALLA: '#dc3545',     // Rojo
    UPS: '#3b82f6',       // Azul (NUEVO)
    OFFLINE: '#6c757d',   // Gris
};

// 2. Información de la Leyenda (AGREGADO: Respaldo UPS)
export const STATUS_LEGEND = [
    { key: 'OPERATIVO', text: 'Operativo', color: STATUS_COLORS.OPERATIVO },
    { key: 'UPS', text: 'Respaldo UPS', color: STATUS_COLORS.UPS }, // NUEVO
    { key: 'ANOMALIA', text: 'Con Anomalía', color: STATUS_COLORS.ANOMALIA },
    { key: 'FALLA', text: 'Falla', color: STATUS_COLORS.FALLA },
    { key: 'OFFLINE', text: 'Sin Conexión', color: STATUS_COLORS.OFFLINE },
];

// 3. Función para obtener el estado (Clave y Texto)
export const getOverallStatus = (status) => {
    // Regla Base: Si no hay objeto status, es Offline
    if (!status) {
        return { key: 'OFFLINE', text: 'Sin Conexión' };
    }

    // --- NORMALIZACIÓN DE DATOS ---
    const ctrlOn = status.controlador === 'Prendido' || status.controlador === true;
    const alimOn = status.alimentacion === 'Prendido' || status.alimentacion === true;
    const lucesOn = status.luces === 'Prendido' || status.luces === true;

    // --- CORRECCIÓN UPS ---
    const rawUps = status.ups_voltaje ?? status.ups ?? status.UPS?.value ?? 0;
    const upsVal = parseFloat(rawUps);

    // --- TABLA DE PRIORIDADES ---

    // 1. OFFLINE (Gris): Todo apagado (0,0,0)
    if (!ctrlOn && !alimOn && upsVal <= 0) {
        return { key: 'OFFLINE', text: 'Sin Conexión' };
    }

    // 2. FALLA (Rojo): El cerebro (Controlador) está apagado
    if (!ctrlOn) {
        return { key: 'FALLA', text: 'Falla (Controlador)' };
    }

    // 3. RESPALDO UPS (Azul): Corte de luz + UPS Aguantando (>20V)
    // ESTA ERA LA REGLA QUE FALTABA
    if (!alimOn && upsVal > 20) {
        return { key: 'UPS', text: 'Respaldo UPS' };
    }

    // 4. ANOMALÍA (Naranja):
    //    a) Luces apagadas
    //    b) Batería baja o muerta (<= 20V)
    if (!lucesOn || upsVal <= 20) {
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
        case 'OPERATIVO': return 'status-green';
        case 'ANOMALIA': return 'status-orange';
        case 'FALLA': return 'status-red';
        case 'UPS': return 'status-blue'; // NUEVO CASE PARA AZUL
        case 'OFFLINE':
        default:
            return 'status-grey';
    }
};