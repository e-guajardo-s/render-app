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
// Esto hace que Mongo borre automáticamente los logs más viejos de 7 días (604800 segundos)
mqttLogSchema.index({ timestamp: 1 }, { expireAfterSeconds: 604800 });

module.exports = mongoose.model('MqttLog', mqttLogSchema);