// backend/routes/ticket.routes.js
const express = require('express');
const router = express.Router();
const Ticket = require('../models/Ticket.model');
const User = require('../models/User.model');
const Notification = require('../models/Notification.model');
const TicketComment = require('../models/TicketComment.model');
const { verifyToken, verifyTokenAndAdmin } = require('../authMiddleware');
const audit = require('../middlewares/audit');

// 1. CREAR TICKET (Sin cambios)
router.post('/', verifyToken, async (req, res) => {
    try {
        const { title, description, cruceId, origin, priority } = req.body;
        
        const newTicket = new Ticket({
            title,
            description,
            cruceId: cruceId || null,
            origin: origin || 'web_admin',
            priority: priority || 'Media',
            createdBy: req.user.id,
            municipalityName: req.user.username
        });

        const savedTicket = await newTicket.save();
        
        const notification = new Notification({
            title: `🔔 Nuevo Ticket: ${title}`,
            message: `Reporte ingresado desde ${origin === 'map_report' ? 'el Mapa' : 'Panel Web'} por ${req.user.username}.`,
            type: 'new_ticket',
            relatedEntity: savedTicket._id,
            relatedEntityType: 'Ticket',
            targetRole: 'user'
        });
        await notification.save();
        
        res.status(201).json(savedTicket);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Error al crear ticket" });
    }
});

// 2. OBTENER TICKETS (Sin cambios)
router.get('/', verifyToken, async (req, res) => {
    try {
        const role = req.user.role;
        const userId = req.user.id;
        let query = {};

        if (role === 'municipalidad') {
            query = { createdBy: userId };
        }
        else if (role === 'user') {
            query = { assignedTo: userId };
        }
        else if (role === 'admin' || role === 'superadmin') {
            query = {}; 
        }

        const tickets = await Ticket.find(query)
            .populate('createdBy', 'username')
            .populate('assignedTo', 'username')
            .sort({ createdAt: -1 });

        res.status(200).json(tickets);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Error al obtener tickets" });
    }
});

// 3. ASIGNAR TICKET (Sin cambios)
router.put('/:id/assign', verifyTokenAndAdmin, async (req, res) => {
    try {
        const { technicianId } = req.body;
        const ticket = await Ticket.findByIdAndUpdate(
            req.params.id,
            { assignedTo: technicianId },
            { new: true }
        ).populate('assignedTo', 'username');
        
        if (ticket.assignedTo) {
             const notification = new Notification({
                title: `🛠️ Ticket Asignado: ${ticket.title}`,
                message: `El ticket ha sido asignado a ${ticket.assignedTo.username}.`,
                type: 'ticket_update',
                relatedEntity: ticket._id,
                relatedEntityType: 'Ticket',
                user: ticket.assignedTo._id 
            });
            await notification.save();
        }

        res.json(ticket);
    } catch (error) {
        res.status(500).json({ message: "Error al asignar responsable" });
    }
});

// 4. CAMBIAR ESTADO (Sin cambios)
router.put('/:id/status', verifyToken, async (req, res) => {
    try {
        const { status, resolutionNote } = req.body; 
        
        const updateData = { status };
        let sendNotificationToMunicipality = false;
        let notificationMessage = '';
        
        if (status === 'in_progress') {
            updateData.acceptedAt = new Date();
            sendNotificationToMunicipality = true;
            notificationMessage = `El responsable ${req.user.username} ha ACEPTADO el ticket y está En Progreso.`;
        } else if (status === 'resolved') {
            updateData.resolvedAt = new Date();
            if (resolutionNote) { updateData.resolutionNote = resolutionNote; }
            sendNotificationToMunicipality = true;
            notificationMessage = `Ticket RESUELTO por ${req.user.username}. Procedimiento: ${resolutionNote || 'N/A'}`;
        }

        const ticket = await Ticket.findByIdAndUpdate(
            req.params.id,
            updateData,
            { new: true }
        ).populate('createdBy', 'username'); 

        if (ticket && sendNotificationToMunicipality) {
            const notification = new Notification({
                title: `✅ Ticket Actualizado: ${ticket.title}`,
                message: notificationMessage,
                type: 'ticket_update',
                relatedEntity: ticket._id,
                relatedEntityType: 'Ticket',
                user: ticket.createdBy._id 
            });
            await notification.save();
        }
        
        res.json(ticket);
    } catch (error) {
        console.error("Error PUT /api/tickets/:id/status:", error);
        res.status(500).json({ message: "Error al actualizar estado" });
    }
});

// 5. OBTENER LISTA DE ASIGNABLES (MODIFICADO)
// Antes traía solo 'user', ahora trae 'user', 'admin', 'superadmin' EXCEPTO 'sistema'
router.get('/technicians', verifyTokenAndAdmin, async (req, res) => {
    try {
        const assignableUsers = await User.find({ 
            role: { $in: ['user', 'admin', 'superadmin'] },
            username: { $ne: 'sistema' } // <--- EXCEPCIÓN SOLICITADA
        }).select('username _id role'); // Traemos el rol para mostrarlo en el dropdown
        
        res.json(assignableUsers);
    } catch (error) {
        res.status(500).json({ message: "Error al cargar usuarios asignables" });
    }
});

// 6. ELIMINAR TICKET
router.delete('/:id', verifyTokenAndAdmin, async (req, res) => {
    try {
        const ticket = await Ticket.findByIdAndDelete(req.params.id);
        if (!ticket) {
            return res.status(404).json({ message: "Ticket no encontrado" });
        }

        // Eliminar notificaciones y comentarios relacionados
        await Promise.all([
            Notification.deleteMany({ relatedEntity: ticket._id }),
            TicketComment.deleteMany({ ticket: ticket._id })
        ]);

        audit(req, { action: 'DELETE_TICKET', target: ticket.title, targetId: ticket._id });
        res.json({ message: "Ticket eliminado exitosamente" });
    } catch (error) {
        console.error("Error DELETE /api/tickets/:id:", error);
        res.status(500).json({ message: "Error al eliminar ticket" });
    }
});

module.exports = router;