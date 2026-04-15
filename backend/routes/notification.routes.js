// En: backend/routes/notification.routes.js
const express = require('express');
const router = express.Router();
const Notification = require('../models/Notification.model');
const { verifyToken } = require('../authMiddleware');

const getRoleTargets = (role) => {
    switch (role) {
        case 'superadmin':
            return ['superadmin', 'admin', 'municipalidad', 'user', 'all', 'global'];
        case 'admin':
            return ['admin', 'municipalidad', 'user', 'all', 'global'];
        case 'municipalidad':
            return ['municipalidad', 'all', 'global'];
        case 'user':
        default:
            return ['user', 'all', 'global'];
    }
};

const buildNotificationVisibilityQuery = ({ userId, userRole, userComuna, userCreatedAt }) => {
    const roleTargets = getRoleTargets(userRole);

    const createdAfterSignup = {
        $or: [
            { timestamp: { $gte: userCreatedAt } },
            {
                $and: [
                    { timestamp: { $exists: false } },
                    { createdAt: { $gte: userCreatedAt } }
                ]
            }
        ]
    };

    const globalComunaFilter = userRole === 'municipalidad'
        ? {
            $or: [
                { targetComuna: null },
                { targetComuna: '' },
                ...(userComuna ? [{ targetComuna: { $regex: new RegExp(`^${userComuna}$`, 'i') } }] : [])
            ]
        }
        : {};

    return {
        deletedBy: { $ne: userId },
        $or: [
            // Notificaciones personales directas
            { user: userId },
            { recipient: userId },

            // Notificaciones globales creadas después del registro
            {
                $and: [
                    { $or: [{ user: null }, { user: { $exists: false } }] },
                    { $or: [{ recipient: null }, { recipient: { $exists: false } }] },
                    {
                        $or: [
                            { targetRole: { $in: roleTargets } },
                            { targetRole: { $exists: false } }
                        ]
                    },
                    createdAfterSignup,
                    globalComunaFilter
                ]
            }
        ]
    };
};

// 1. OBTENER NOTIFICACIONES
router.get('/', verifyToken, async (req, res) => {
    try {
        const userId = String(req.user._id || req.user.id);
        const userRole = req.user.role;
        const userComuna = req.user.comuna;
        const userCreatedAt = req.user.createdAt || new Date(0);

        const query = buildNotificationVisibilityQuery({ userId, userRole, userComuna, userCreatedAt });

        const rawNotifications = await Notification.find(query)
            .sort({ timestamp: -1, createdAt: -1 })
            .limit(50);

        // Mapeo robusto para ObjectId/string.
        const notifications = rawNotifications.map(n => ({
            ...n.toObject(),
            isRead: (n.readBy || []).some(id => String(id) === userId)
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

// 3. MARCAR TODAS COMO LEÍDAS
router.put('/read-all', verifyToken, async (req, res) => {
    try {
        const userId = String(req.user._id || req.user.id);
        const visibilityQuery = buildNotificationVisibilityQuery({
            userId,
            userRole: req.user.role,
            userComuna: req.user.comuna,
            userCreatedAt: req.user.createdAt || new Date(0)
        });

        const result = await Notification.updateMany(
            {
                ...visibilityQuery,
                readBy: { $ne: userId }
            },
            {
                $addToSet: { readBy: userId }
            }
        );

        res.json({ message: `Se marcaron ${result.modifiedCount} notificaciones.` });
    } catch (error) {
        console.error("Error PUT /read-all:", error);
        res.status(500).json({ message: "Error al marcar notificaciones" });
    }
});

// 4. LIMPIAR LEÍDAS (Acción del botón que fallaba)
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