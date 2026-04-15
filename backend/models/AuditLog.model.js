// backend/models/AuditLog.model.js
const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
    user:       { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    username:   { type: String, required: true },
    action:     { type: String, required: true }, // 'DELETE_TICKET', 'CHANGE_ROLE', etc.
    target:     { type: String },                 // descripción del objeto afectado
    targetId:   { type: String },
    meta:       { type: mongoose.Schema.Types.Mixed }, // datos extra
    ip:         { type: String },
    timestamp:  { type: Date, default: Date.now }
}, { versionKey: false });

// TTL: 90 días
auditLogSchema.index({ timestamp: 1 }, { expireAfterSeconds: 7776000 });
auditLogSchema.index({ user: 1, timestamp: -1 });

module.exports = mongoose.model('AuditLog', auditLogSchema);
