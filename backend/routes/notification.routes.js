// En: backend/routes/notification.routes.js
const express = require('express');
const router = express.Router();
const Notification = require('../models/Notification.model');
const { verifyToken, verifyTokenAndAdmin } = require('../authMiddleware');

// 1. OBTENER NOTIFICACIONES
router.get('/', verifyToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const userRole = req.user.role;
        const userComuna = req.user.comuna;

        let query = {
            $or: [
                { user: userId }, 
                { targetRole: 'global' }
            ],
            // FILTRO CLAVE: No mostrar si yo (userId) estoy en la lista de 'deletedBy'
            deletedBy: { $ne: userId } 
        };

        // Filtros por Rol
        if (userRole === 'user') {
            query.$or.push({ targetRole: 'user' });
        } else if (userRole === 'admin' || userRole === 'superadmin') {
            query.$or.push({ targetRole: 'admin' }, { targetRole: 'superadmin' }, { targetRole: 'user' });
        }
        // Filtro por Comuna
        if (userRole === 'municipalidad' && userComuna) {
            query.$or.push({ targetComuna: { $regex: new RegExp(`^${userComuna}$`, 'i') } });
        }

        const rawNotifications = await Notification.find(query)
            .sort({ createdAt: -1 })
            .limit(50);

        // Mapeamos para el frontend: 'isRead' es true si MI ID está en 'readBy'
        const notifications = rawNotifications.map(n => ({
            ...n.toObject(),
            isRead: n.readBy.includes(userId)
        }));

        res.json(notifications);

    } catch (error) {
        console.error("Error GET notifications:", error);
        res.status(500).json({ message: "Error al cargar notificaciones" });
    }
});

// 2. MARCAR COMO LEÍDA
router.put('/:id/read', verifyToken, async (req, res) => {
    try {
        // Agregamos al usuario al array 'readBy'
        const notification = await Notification.findByIdAndUpdate(
            req.params.id,
            { $addToSet: { readBy: req.user.id } }, 
            { new: true }
        );
        res.json(notification);
    } catch (error) {
        res.status(500).json({ message: "Error al actualizar notificación" });
    }
});

// 3. LIMPIAR LEÍDAS (Acción del botón que fallaba)
router.delete('/clear-read', verifyToken, async (req, res) => {
    try {
        const userId = req.user.id; // Usamos .id (string) que es más seguro con Mongoose

        // Buscamos notificaciones que:
        // 1. Yo ya leí (estoy en readBy)
        // 2. Aún no he borrado (no estoy en deletedBy)
        // Y me agrego a 'deletedBy'
        const result = await Notification.updateMany(
            { 
                readBy: userId,
                deletedBy: { $ne: userId } 
            },
            { 
                $addToSet: { deletedBy: userId } 
            }
        );

        res.json({ message: `Se limpiaron ${result.modifiedCount} notificaciones.` });
    } catch (error) {
        console.error("Error DELETE /clear-read:", error);
        res.status(500).json({ message: "Error al limpiar notificaciones" });
    }
});

module.exports = router;