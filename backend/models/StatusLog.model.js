const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const statusLogSchema = new Schema({
    cruceId: { type: String, required: true, index: true },
    timestamp: { type: Date, default: Date.now },
    
    // Telemetría
    controlador: { type: String, default: '---' }, 
    luces: { type: String, default: '---' },       
    alimentacion: { type: String, default: '---' },
    ups_voltaje: { type: Number, default: 0 },     
    
    // AGREGAMOS 'offline'
    type: { type: String, enum: ['info', 'error', 'warning', 'ups', 'offline'], default: 'info' },
    message: { type: String } 
});

statusLogSchema.index({ timestamp: 1 }, { expireAfterSeconds: 2592000 });

module.exports = mongoose.model('StatusLog', statusLogSchema);