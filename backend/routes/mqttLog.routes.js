// backend/routes/mqttLog.routes.js
const express = require('express');
const router = express.Router();
const MqttLog = require('../models/MqttLog.model');
const { verifyToken } = require('../authMiddleware');

// GET /api/mqtt-logs?topic=stgo/renca/cruce22
router.get('/', verifyToken, async (req, res) => {
    try {
        const { topic } = req.query;
        
        if (!topic) {
            return res.status(400).json({ message: "Se requiere el parámetro 'topic'" });
        }

        // Buscamos logs que COMIENCEN con el tópico (usando Regex para flexibilidad)
        // Ejemplo: si busco "stgo/renca", traerá "stgo/renca/cruce1" y "stgo/renca/cruce2"
        const safeTopic = topic.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        
        const logs = await MqttLog.find({ 
            topic: { $regex: new RegExp(`^${safeTopic}`, 'i') } 
        })
        .sort({ timestamp: -1 }) // Los más nuevos primero
        .limit(100); // Traemos solo los últimos 100 para no pegar la página

        // Invertimos el array para que en la terminal el más viejo quede arriba
        res.json(logs.reverse()); 

    } catch (error) {
        console.error("Error obteniendo logs:", error);
        res.status(500).json({ message: "Error del servidor" });
    }
});

// --- ¡NUEVO! ---
// DELETE /api/mqtt-logs?topic=... (BORRAR HISTORIAL)
router.delete('/', verifyToken, async (req, res) => {
    try {
        const { topic } = req.query;
        // Seguridad: Exigimos el tópico para no borrar toda la base de datos por error
        if (!topic) return res.status(400).json({ message: "Se requiere el parámetro 'topic' para borrar." });

        const safeTopic = topic.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

        // Borramos todo lo que coincida con ese tópico (y sus sub-tópicos)
        await MqttLog.deleteMany({ 
            topic: { $regex: new RegExp(`^${safeTopic}`, 'i') } 
        });

        res.status(200).json({ message: "Historial eliminado exitosamente." });

    } catch (error) {
        console.error("Error eliminando logs:", error);
        res.status(500).json({ message: "Error al limpiar historial" });
    }
});

module.exports = router;