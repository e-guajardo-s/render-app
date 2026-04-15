// backend/routes/user.routes.js
const express = require('express');
const router = express.Router();
const User = require('../models/User.model');
const logger = require('../utils/logger');
const { verifyTokenAndAdmin } = require('../authMiddleware');
const audit = require('../middlewares/audit');

// OBTENER TODOS LOS USUARIOS
router.get('/', verifyTokenAndAdmin, async (req, res, next) => {
  try {
    const users = await User.find({}).select('-password');
    res.status(200).json(users);
  } catch (error) {
    next(error);
  }
});

// ACTUALIZAR ROL
router.put('/:id/role', verifyTokenAndAdmin, async (req, res, next) => {
    try {
        const actor = req.user; 
        const targetId = req.params.id;
        const { role: newRole } = req.body;

        if (actor.id === targetId) return res.status(403).json({ message: "No puedes modificar tu propio rol." });

        const targetUser = await User.findById(targetId);
        if (!targetUser) return res.status(404).json({ message: "Usuario no encontrado." });
        
        // Un admin NO puede modificar a otro admin ni a un superadmin,
        // y tampoco puede asignar roles de admin o superadmin.
        if (actor.role === 'admin') {
            if (['admin', 'superadmin'].includes(targetUser.role)) {
                return res.status(403).json({ message: "No puedes modificar a otro Admin o Superadmin." });
            }
            if (['admin', 'superadmin'].includes(newRole)) {
                return res.status(403).json({ message: "No tienes permisos para asignar este rol." });
            }
        }

        // Un superadmin TAMPOCO puede asignarse a sí mismo un rol superior
        // (ya está bloqueado por el check de actor.id === targetId más arriba).
        // Pero un superadmin SÍ puede modificar a otros superadmins (solo otro superadmin puede hacerlo).
        // Si el actor es admin, ya fue bloqueado arriba. Solo superadmin llega aquí para targets superadmin.

        const updatedUser = await User.findByIdAndUpdate(targetId, { role: newRole }, { new: true }).select('-password');
        
        logger.info(`Rol actualizado: ${targetUser.username} ahora es ${newRole} (por ${actor.username})`);
        audit(req, { action: 'CHANGE_ROLE', target: targetUser.username, targetId, meta: { from: targetUser.role, to: newRole } });
        res.status(200).json(updatedUser);
    } catch (error) {
        next(error);
    }
});

// ELIMINAR USUARIO
router.delete('/:id', verifyTokenAndAdmin, async (req, res, next) => {
    try {
        const actor = req.user; 
        const targetId = req.params.id;

        if (actor.id === targetId) return res.status(403).json({ message: "No puedes eliminarte a ti mismo." });
        
        const targetUser = await User.findById(targetId);
        if (!targetUser) return res.status(404).json({ message: "Usuario no encontrado." });

        // Un admin no puede eliminar a otro admin ni a un superadmin.
        if (actor.role === 'admin' && ['admin', 'superadmin'].includes(targetUser.role)) {
            return res.status(403).json({ message: "Un Admin no puede eliminar a otro Admin o Superadmin." });
        }

        await User.findByIdAndDelete(targetId);
        logger.info(`Usuario eliminado: ID ${targetId} por ${actor.username}`);
        audit(req, { action: 'DELETE_USER', target: targetUser.username, targetId });
        res.status(200).json({ message: "Usuario eliminado exitosamente." });
    } catch (error) {
        next(error);
    }
});

module.exports = router;