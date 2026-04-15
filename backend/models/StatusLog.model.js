const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const statusLogSchema = new Schema({
    cruceId: { type: String, required: true, index: true },
    timestamp: { type: Date, default: Date.now },
    
    // Telemetría
    controlador: { type: String, default: '---' }, 
    luces: { type: String, default: '---' },       
    alimentacion: { type: String, default: '---' },
    ups_estado: { type: String, default: 'Apagado' },     
    
    // AGREGAMOS 'offline'
    type: { type: String, enum: ['info', 'error', 'warning', 'ups', 'offline'], default: 'info' },
    message: { type: String } 
});

// TTL: 7 días (604800s) — suficiente para análisis histórico sin acumular volumen en MongoDB
statusLogSchema.index({ timestamp: 1 }, { expireAfterSeconds: 604800 });
// Índice compuesto para queries por cruce + rango de fechas (usado en historial y export)
statusLogSchema.index({ cruceId: 1, timestamp: -1 });

module.exports = mongoose.model('StatusLog', statusLogSchema);