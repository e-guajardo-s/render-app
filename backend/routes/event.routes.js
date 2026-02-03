// En: backend/routes/event.routes.js
const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Event = require('../models/Event.model');
const Semaphore = require('../models/Semaphore.model');
const User = require('../models/User.model'); // <--- Importar User
const Notification = require('../models/Notification.model');
const { verifyToken, verifyTokenAndAdmin } = require('../authMiddleware');

// 1. OBTENER EVENTOS (Actualizado con populate de técnicos)
router.get('/', verifyToken, async (req, res) => {
    try {
        let filter = {};
        if (req.user.role === 'municipalidad' && req.user.comuna) {
            const semaphores = await Semaphore.find({ 
                comuna: { $regex: new RegExp(`^${req.user.comuna}$`, 'i') } 
            }).select('_id');
            const semIds = semaphores.map(s => s._id);
            filter.semaphore = { $in: semIds };
        }

        const events = await Event.find(filter)
            .populate('semaphore', 'cruce cruceId comuna')
            .populate('completedBy', 'username')
            .populate('technicians', 'username email') // <--- NUEVO: Traer datos de técnicos
            .sort({ date: 1 });

        res.json(events);
    } catch (error) {
        res.status(500).json({ message: "Error al cargar eventos" });
    }
});

// --- NUEVA RUTA: OBTENER TÉCNICOS ---
router.get('/technicians', verifyTokenAndAdmin, async (req, res) => {
    try {
        // Buscamos usuarios con rol 'user' (técnicos)
        const techs = await User.find({ role: 'user' }).select('username _id email');
        res.json(techs);
    } catch (error) {
        res.status(500).json({ message: "Error al cargar técnicos" });
    }
});

// 2. CREAR EVENTO ÚNICO (Actualizado)
router.post('/', verifyTokenAndAdmin, async (req, res) => {
    try {
        // Recibimos technicians (array de IDs) y description
        const { title, date, semaphore, type, technicians, description } = req.body;
        
        const newEvent = new Event({
            title,
            date,
            semaphore,
            type: type || 'preventivo',
            technicians: technicians || [], // Guardar array
            description: description || ''
        });
        
        await newEvent.save();
        res.status(201).json(newEvent);
        
    } catch (error) {
        console.error("Error creando evento:", error);
        res.status(500).json({ message: "Error al crear evento", error: error.message });
    }
});

// 3. GENERAR MANTENIMIENTOS AUTO (Sin cambios mayores, no asigna técnicos auto)
router.post('/generate', verifyTokenAndAdmin, async (req, res) => {
    try {
        const { semaphoreId, frequencyMonths, startDate } = req.body;
        if (!semaphoreId || !frequencyMonths) return res.status(400).json({ message: "Faltan datos." });

        const batchId = new mongoose.Types.ObjectId().toString();
        const eventsToCreate = [];
        let currentDate = new Date(startDate || Date.now());
        
        for (let i = 0; i < 12 / frequencyMonths; i++) {
            const eventDate = new Date(currentDate);
            eventsToCreate.push({
                title: `Mantenimiento Preventivo (Auto)`,
                description: `Generado automáticamente por plan de mantenimiento.`,
                date: eventDate,
                semaphore: semaphoreId,
                type: 'preventivo',
                status: 'pending',
                batchId: batchId,
                technicians: [] // Por defecto sin asignar
            });
            currentDate.setMonth(currentDate.getMonth() + parseInt(frequencyMonths));
        }

        await Event.insertMany(eventsToCreate);
        res.status(201).json({ message: `${eventsToCreate.length} eventos generados.` });
    } catch (error) {
        res.status(500).json({ message: "Error al generar mantenimientos" });
    }
});

// 4. COMPLETAR EVENTO (Sin cambios lógicos, solo populate extra si quieres)
router.put('/:id/complete', verifyToken, async (req, res) => {
    try {
        if (req.user.role === 'municipalidad') return res.status(403).json({ message: "Sin permisos." });
        const { notes } = req.body;
        
        const updatedEvent = await Event.findByIdAndUpdate(req.params.id, {
            status: 'completed',
            completedBy: req.user.id,
            completedAt: new Date(),
            notes: notes || ''
        }, { new: true }).populate('semaphore', 'cruce cruceId');

        if (updatedEvent) {
             const notification = new Notification({
                title: `✅ Mantenimiento Completado`,
                message: `Técnico ${req.user.username} completó: "${updatedEvent.title}" en ${updatedEvent.semaphore.cruce}.`,
                type: 'event_due',
                relatedEntity: updatedEvent._id,
                relatedEntityType: 'Event',
                targetRole: 'admin'
            });
            await notification.save();
        }
        res.json(updatedEvent);
    } catch (error) {
        res.status(500).json({ message: "Error al completar evento" });
    }
});

// RUTAS DE LOTES Y ELIMINAR (Se mantienen igual)
router.get('/batches', verifyTokenAndAdmin, async (req, res) => {
    try {
        const batches = await Event.aggregate([
            { $match: { batchId: { $exists: true, $ne: null } } },
            { $group: { _id: "$batchId", semaphoreId: { $first: "$semaphore" }, count: { $sum: 1 }, createdAt: { $min: "$createdAt" } } },
            { $sort: { createdAt: -1 } }
        ]);
        await Semaphore.populate(batches, { path: 'semaphoreId', select: 'cruce' });
        res.json(batches);
    } catch (error) { res.status(500).json({ message: "Error lotes" }); }
});

router.delete('/batch/:batchId', verifyTokenAndAdmin, async (req, res) => {
    try {
        const { batchId } = req.params;
        const result = await Event.deleteMany({ batchId: batchId });
        res.json({ message: `Eliminados ${result.deletedCount} eventos.` });
    } catch (error) { res.status(500).json({ message: "Error eliminar lote" }); }
});

router.delete('/:id', verifyTokenAndAdmin, async (req, res) => {
    try {
        await Event.findByIdAndDelete(req.params.id);
        res.json({ message: "Eliminado" });
    } catch (error) { res.status(500).json({ message: "Error eliminar" }); }
});

module.exports = router;