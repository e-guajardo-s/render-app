// backend/routes/semaphore.routes.js
const express = require('express');
const router = express.Router();
const Semaphore = require('../models/Semaphore.model');
const { verifyToken, verifyTokenAndAdmin } = require('../authMiddleware'); 
const mqttService = require('../services/mqttService'); // <--- Importamos el servicio

// GET /api/semaphores - Obtener TODOS
router.get('/', verifyToken, async (req, res) => {
    try {
        let query = {};
        // Filtro para usuarios municipales
        if (req.user && req.user.role === 'municipalidad' && req.user.comuna) {
            query.comuna = { $regex: new RegExp(`^${req.user.comuna}$`, 'i') };
        }
        const semaphores = await Semaphore.find(query).sort({ cruce: 1 });
        res.status(200).json(semaphores);
    } catch (error) {
        console.error("Error GET /api/semaphores:", error);
        res.status(500).json({ message: "Error al obtener semáforos"});
    }
});

// GET /api/semaphores/search - Búsqueda
router.get('/search', verifyToken, async (req, res) => {
    try {
        const searchTerm = req.query.q ? String(req.query.q).trim() : '';
        if (searchTerm.length < 1) return res.json([]);

        const safeSearch = searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp(safeSearch, 'i');

        let query = {
            $or: [
                { cruce: { $regex: regex } },
                { cruceId: { $regex: regex } },
                { comuna: { $regex: regex } }
            ]
        };

        if (req.user.role === 'municipalidad' && req.user.comuna) {
            query = {
                $and: [
                    { comuna: { $regex: new RegExp(`^${req.user.comuna}$`, 'i') } },
                    query
                ]
            };
        }

        const results = await Semaphore.find(query).limit(10);
        res.status(200).json(results);

    } catch (error) {
        console.error("Error search:", error);
        res.status(500).json({ message: "Error al buscar" });
    }
});

// GET /api/semaphores/:id
router.get('/:id', verifyToken, async (req, res) => {
    try {
        const semaphore = await Semaphore.findById(req.params.id);
        if (!semaphore) return res.status(404).json({ message: "Semáforo no encontrado." });
        res.status(200).json(semaphore);
    } catch (error) {
        res.status(500).json({ message: "Error al obtener semáforo" });
    }
});

// POST /api/semaphores - Crear NUEVO
router.post('/', verifyTokenAndAdmin, async (req, res) => {
    const { 
        cruce, cruceId, comuna, red, controlador, UOCT, coordenadas,
        ip_gateway, mqtt_topic, mqtt_config // <--- Campos Nuevos
    } = req.body; 
    
    try {
        if (!cruce || !cruceId) {
            return res.status(400).json({ message: "Nombre e ID son requeridos." });
        }

        let coords = {};
        if (coordenadas && typeof coordenadas === 'string' && coordenadas.trim() !== '') {
             const parts = coordenadas.split(',').map(s => s.trim());
             if (parts.length === 2) {
                 const lat = parseFloat(parts[0]);
                 const lng = parseFloat(parts[1]);
                 if (!isNaN(lat) && !isNaN(lng)) { coords = { lat, lng }; } 
             }
        }

        const newSemaphore = new Semaphore({
            cruce, cruceId, comuna, red, controlador, UOCT,
            ip_gateway, mqtt_topic, mqtt_config, // Guardamos la config
            coordenadas: (coords.lat !== undefined) ? coords : undefined,
            status: { controlador: false, alimentacion: false, ups: false, luces: false }
        });

        const savedSemaphore = await newSemaphore.save(); 
        res.status(201).json(savedSemaphore);

    } catch (error) { 
        console.error("Error guardando semáforo:", error);
        res.status(500).json({ message: "Error al guardar semáforo" });
    }
});

// PUT /api/semaphores/:id - Actualizar
router.put('/:id', verifyTokenAndAdmin, async (req, res) => {
    const { id } = req.params;
    const { 
        cruce, cruceId, comuna, red, controlador, UOCT, coordenadas,
        ip_gateway, mqtt_topic, mqtt_config // <--- Campos Nuevos
    } = req.body; 
    
    try {
        let updateData = { 
            cruce, cruceId, comuna, red, controlador, UOCT,
            ip_gateway, mqtt_topic, mqtt_config // Actualizamos la config
        }; 
         
        if (coordenadas !== undefined) { 
             if (coordenadas && typeof coordenadas === 'string' && coordenadas.trim() !== '') {
                 const parts = coordenadas.split(',').map(s => s.trim());
                 if (parts.length === 2) {
                     const lat = parseFloat(parts[0]); const lng = parseFloat(parts[1]);
                     if (!isNaN(lat) && !isNaN(lng)) { updateData.coordenadas = { lat, lng }; } 
                 }
             } else { 
                 updateData.$unset = { coordenadas: "" }; 
                 delete updateData.coordenadas; 
             }
        } 

        const updatedSemaphore = await Semaphore.findByIdAndUpdate(id, updateData, { new: true, runValidators: true }); 
        
        if (!updatedSemaphore) return res.status(404).json({ message: "Semáforo no encontrado." });

        // --- LÓGICA DE RECONEXIÓN MQTT ---
        // Si se recibió configuración MQTT nueva, intentamos reconectar el servicio global
        if (mqtt_config && mqtt_config.host && mqtt_config.username) {
            console.log(`🔄 Actualización de credenciales MQTT detectada en: ${updatedSemaphore.cruceId}`);
            // Llamamos al servicio para que reinicie la conexión con los nuevos datos
            mqttService.connectToBroker(mqtt_config);
        }
        // --------------------------------

        res.status(200).json(updatedSemaphore);

    } catch (error) { 
        console.error("Error actualizando semáforo:", error);
        res.status(500).json({ message: "Error al actualizar semáforo" });
    }
});

// PUT /api/semaphores/:id/status
router.put('/:id/status', verifyTokenAndAdmin, async (req, res) => {
    const { id } = req.params;
    const { action } = req.body;
    let updateData;
    if (action === 'set_offline') updateData = { $set: { status: null } };
    else if (action === 'set_online') updateData = { $set: { status: { controlador: true, alimentacion: false, ups: false, luces: false } } };
    else return res.status(400).json({ message: "Acción no válida." });

    try {
        const updated = await Semaphore.findByIdAndUpdate(id, updateData, { new: true });
        if (!updated) return res.status(404).json({ message: "No encontrado" });
        res.status(200).json(updated);
    } catch (error) { res.status(500).json({ message: "Error status" }); }
});

// DELETE
router.delete('/:id', verifyTokenAndAdmin, async (req, res) => {
    try {
        await Semaphore.findByIdAndDelete(req.params.id);
        res.status(200).json({ message: "Eliminado" });
    } catch (error) { res.status(500).json({ message: "Error al eliminar" }); }
});

module.exports = router;