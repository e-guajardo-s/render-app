// backend/models/MqttLog.model.js
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const mqttLogSchema = new Schema({
    topic: { type: String, required: true, index: true },
    message: { type: String, required: true },
    cruceId: { type: String }, // Opcional: para vincularlo directamente si quieres
    timestamp: { type: Date, default: Date.now }
});

// IMPORTANTE: Índice TTL (Time To Live)
// Borra automáticamente los logs con más de 24 horas (86400 segundos)
mqttLogSchema.index({ timestamp: 1 }, { expireAfterSeconds: 86400 });

module.exports = mongoose.model('MqttLog', mqttLogSchema);