// En: backend/models/Notification.model.js
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const notificationSchema = new Schema({
    // El usuario específico (null para global)
    user: { 
        type: Schema.Types.ObjectId, 
        ref: 'User', 
        default: null,
        index: true 
    },
    // Alias explícito para receptor directo (compatibilidad con lógica nueva)
    recipient: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        default: null,
        index: true
    },
    // Rol objetivo
    targetRole: {
        type: String,
        enum: ['user', 'admin', 'superadmin', 'municipalidad', 'all', 'global'],
        default: 'all'
    },
    // Comuna objetivo (para municipalidades)
    targetComuna: { type: String, default: null },
    
    title: { type: String, required: true },
    message: { type: String, required: true },
    
    type: { 
        type: String,
        enum: ['status_change', 'new_ticket', 'ticket_update', 'event_due'],
        required: true
    },

    // --- ¡AQUÍ ESTÁ EL CAMBIO CLAVE! ---
    // Reemplazamos 'isRead' por arrays de usuarios
    readBy: [{ type: Schema.Types.ObjectId, ref: 'User' }],     // Quiénes la leyeron
    deletedBy: [{ type: Schema.Types.ObjectId, ref: 'User' }],  // Quiénes la borraron
    // -----------------------------------

    // Fecha de referencia de visibilidad para filtros por alta de usuario.
    timestamp: { type: Date, default: Date.now, index: true },
    
    relatedEntity: { type: Schema.Types.ObjectId, default: null },
    relatedEntityType: { 
        type: String, 
        enum: ['Semaphore', 'Ticket', 'Event', null],
        default: null 
    },
    
}, {
    timestamps: true
});

const Notification = mongoose.model('Notification', notificationSchema);
module.exports = Notification;