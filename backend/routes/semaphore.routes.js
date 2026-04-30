// backend/routes/semaphore.routes.js
const express = require('express');
const router = express.Router();
const Semaphore = require('../models/Semaphore.model');
const { verifyToken, verifyTokenAndAdmin } = require('../authMiddleware'); 
const { updateDeviceCache } = require('../services/mqttService');
const audit = require('../middlewares/audit');

// Helper: verifica que un semáforo pertenece a la comuna del usuario municipal
const checkComunaAccess = (semaphore, user) => {
    if (!semaphore) return false;
    if (user.role === 'municipalidad' && user.comuna) {
        return semaphore.comuna.toLowerCase() === user.comuna.toLowerCase();
    }
    return true; // admin y superadmin tienen acceso total
};

// GET /api/semaphores - Obtener TODOS
router.get('/', verifyToken, async (req, res) => {
    try {
        let query = {};
        if (req.user && req.user.role === 'municipalidad' && req.user.comuna) {
            query.comuna = { $regex: new RegExp(`^${req.user.comuna}$`, 'i') };
        }
        const semaphores = await Semaphore.find(query).sort({ cruceId: 1 });
        semaphores.sort((a, b) => {
            const nA = parseInt(a.cruceId, 10);
            const nB = parseInt(b.cruceId, 10);
            if (!isNaN(nA) && !isNaN(nB)) return nA - nB;
            return String(a.cruceId).localeCompare(String(b.cruceId), undefined, { numeric: true });
        });
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

// GET /api/semaphores/stats/summary — debe estar ANTES de /:id
router.get('/stats/summary', verifyToken, async (req, res) => {
    try {
        const StatusLog = require('../models/StatusLog.model');
        const Ticket    = require('../models/Ticket.model');

        const isMunicipalidad = req.user.role === 'municipalidad' && req.user.comuna;
        const semaphoreQuery = isMunicipalidad
            ? { comuna: { $regex: new RegExp(`^${req.user.comuna}$`, 'i') } }
            : {};

        const [semaphores, openTickets, recentLogs] = await Promise.all([
            Semaphore.find(semaphoreQuery, 'monitoreando enMantencion status cruceId cruce').lean(),
            // Municipalidad solo ve sus propios tickets, admin ve todos
            isMunicipalidad
                ? Ticket.countDocuments({ status: { $in: ['pending', 'in_progress'] }, createdBy: req.user._id })
                : Ticket.countDocuments({ status: { $in: ['pending', 'in_progress'] } }),
            StatusLog.find({ timestamp: { $gte: new Date(Date.now() - 24*60*60*1000) } })
                .sort({ timestamp: -1 }).limit(500).lean()
        ]);

        let operativo = 0, offline = 0, anomalia = 0, aislado = 0, ups = 0, sinMonitoreo = 0, mantencion = 0;
        for (const s of semaphores) {
            if (s.enMantencion) { mantencion++; continue; }
            if (!s.monitoreando) { sinMonitoreo++; continue; }
            const st = s.status || {};
            const ctrl   = (st.controlador  || '').toLowerCase();
            const alim   = (st.alimentacion || '').toLowerCase();
            const luces  = (st.luces        || '').toLowerCase();
            const upsEst = (st.ups_estado   || '').toLowerCase();
            if (ctrl !== 'prendido' && alim !== 'prendido' && upsEst !== 'prendido') offline++;
            else if (ctrl !== 'prendido') aislado++;
            else if (alim !== 'prendido' && upsEst === 'prendido') ups++;
            else if (luces !== 'prendido') anomalia++;
            else operativo++;
        }

        // topFallas filtrado — solo semáforos visibles al usuario
        const semCruceIds = new Set(semaphores.map(s => s.cruceId));
        const failMap = {};
        for (const l of recentLogs) {
            if ((l.type === 'error' || l.type === 'offline') && semCruceIds.has(l.cruceId)) {
                failMap[l.cruceId] = (failMap[l.cruceId] || 0) + 1;
            }
        }
        const topFallas = Object.entries(failMap)
            .sort((a, b) => b[1] - a[1]).slice(0, 5)
            .map(([cruceId, count]) => {
                const sem = semaphores.find(s => s.cruceId === cruceId);
                return { cruceId, cruce: sem?.cruce || cruceId, count };
            });

        res.json({ total: semaphores.length, operativo, offline, anomalia, aislado, ups, sinMonitoreo, mantencion, openTickets, topFallas });
    } catch (e) {
        console.error('Error stats/summary:', e);
        res.status(500).json({ message: 'Error calculando resumen' });
    }
});

// GET /api/semaphores/:id — con control de acceso por comuna
router.get('/:id', verifyToken, async (req, res) => {
    try {
        const semaphore = await Semaphore.findById(req.params.id);
        if (!semaphore) return res.status(404).json({ message: "Semáforo no encontrado." });

        // Usuario municipal solo puede ver semáforos de su comuna
        if (!checkComunaAccess(semaphore, req.user)) {
            return res.status(403).json({ message: "No tienes acceso a este semáforo." });
        }

        res.status(200).json(semaphore);
    } catch (error) {
        res.status(500).json({ message: "Error al obtener semáforo" });
    }
});

// POST /api/semaphores - Crear NUEVO
router.post('/', verifyTokenAndAdmin, async (req, res) => {
    const { 
        cruce, cruceId, comuna, red, controlador, UOCT, coordenadas,
        ip_gateway, mqtt_topic, tieneUPS
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
            ip_gateway, mqtt_topic,
            tieneUPS: tieneUPS !== undefined ? tieneUPS : true,
            coordenadas: (coords.lat !== undefined) ? coords : undefined,
            status: { controlador: 'Desconocido', alimentacion: 'Desconocido', luces: 'Desconocido', ups_estado: 'Apagado' }
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
        ip_gateway, mqtt_topic, tieneUPS
    } = req.body; 
    
    try {
        let updateData = { 
            cruce, cruceId, comuna, red, controlador, UOCT,
            ip_gateway, mqtt_topic
        };

        if (tieneUPS !== undefined) updateData.tieneUPS = tieneUPS; 
         
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
    if (action === 'set_offline') {
        updateData = { $set: { monitoreando: false, status: { controlador: 'Desconocido', alimentacion: 'Desconocido', luces: 'Desconocido', ups_estado: 'Apagado' } } };
    } else if (action === 'set_online') {
        updateData = { $set: { monitoreando: true, status: { controlador: 'Desconocido', alimentacion: 'Desconocido', luces: 'Desconocido', ups_estado: 'Apagado' } } };
    } else {
        return res.status(400).json({ message: 'Acción no válida.' });
    }

    try {
        const updated = await Semaphore.findByIdAndUpdate(id, updateData, { new: true });
        if (!updated) return res.status(404).json({ message: 'No encontrado' });
        if (updated.mqtt_topic) {
            updateDeviceCache(updated.mqtt_topic, { monitoreando: updated.monitoreando });
        }
        res.status(200).json(updated);
    } catch (error) { res.status(500).json({ message: 'Error status' }); }
});

// PUT /api/semaphores/:id/maintenance
router.put('/:id/maintenance', verifyTokenAndAdmin, async (req, res) => {
    const { action, motivo } = req.body;
    let updateData;
    if (action === 'start') {
        updateData = { $set: { enMantencion: true, mantencionInicio: new Date(), mantencionMotivo: motivo || '' } };
    } else if (action === 'end') {
        updateData = { $set: { enMantencion: false }, $unset: { mantencionInicio: '', mantencionMotivo: '' } };
    } else {
        return res.status(400).json({ message: 'Acción no válida. Usa start o end.' });
    }
    try {
        const updated = await Semaphore.findByIdAndUpdate(req.params.id, updateData, { new: true });
        if (!updated) return res.status(404).json({ message: 'No encontrado' });
        if (updated.mqtt_topic) {
            updateDeviceCache(updated.mqtt_topic, { enMantencion: updated.enMantencion });
        }
        audit(req, {
            action: action === 'start' ? 'MAINTENANCE_START' : 'MAINTENANCE_END',
            target: updated.cruce, targetId: updated._id,
            meta: action === 'start' ? { motivo: motivo || '' } : undefined
        });
        res.json(updated);
    } catch (e) { res.status(500).json({ message: 'Error mantención' }); }
});

// DELETE
router.delete('/:id', verifyTokenAndAdmin, async (req, res) => {
    try {
        await Semaphore.findByIdAndDelete(req.params.id);
        res.status(200).json({ message: "Eliminado" });
    } catch (error) { res.status(500).json({ message: "Error al eliminar" }); }
});

module.exports = router;
