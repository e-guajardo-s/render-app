// backend/models/SystemNotice.model.js
// Avisos de sistema que aparecen al iniciar sesión
const mongoose = require('mongoose');

const systemNoticeSchema = new mongoose.Schema({
    title:   { type: String, required: true, trim: true },
    message: { type: String, required: true, trim: true },
    type:    { type: String, enum: ['info', 'warning', 'maintenance', 'success'], default: 'info' },
    active:  { type: Boolean, default: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

module.exports = mongoose.model('SystemNotice', systemNoticeSchema);
