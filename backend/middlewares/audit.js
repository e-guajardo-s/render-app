// backend/middlewares/audit.js
// Middleware de auditoría — registra quién hizo qué sin bloquear la respuesta
const AuditLog = require('../models/AuditLog.model');

/**
 * Crea un registro de auditoría. Se usa dentro de los routes después de la operación.
 * No lanza errores para no afectar la respuesta al cliente.
 */
const audit = async (req, { action, target, targetId, meta } = {}) => {
    try {
        await AuditLog.create({
            user:     req.user._id,
            username: req.user.username,
            action,
            target,
            targetId: targetId ? String(targetId) : undefined,
            meta,
            ip: req.ip || req.headers['x-forwarded-for'] || 'unknown',
        });
    } catch (e) {
        // Silencioso — la auditoría no debe interrumpir la operación
        console.error('[AUDIT] Error registrando auditoría:', e.message);
    }
};

module.exports = audit;
