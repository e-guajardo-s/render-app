// backend/routes/user.routes.js
const express = require('express');
const router = express.Router();
const User = require('../models/User.model');
const logger = require('../utils/logger');
const { verifyTokenAndAdmin } = require('../authMiddleware');

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
        
        if (actor.role === 'admin') {
            if (['admin', 'superadmin'].includes(targetUser.role)) {
                return res.status(403).json({ message: "No puedes modificar a otro Admin." });
            }
            if (['admin', 'superadmin'].includes(newRole)) {
                 return res.status(403).json({ message: "No tienes permisos para asignar este rol." });
            }
        }

        const updatedUser = await User.findByIdAndUpdate(targetId, { role: newRole }, { new: true }).select('-password');
        
        logger.info(`Rol actualizado: ${targetUser.username} ahora es ${newRole} (por ${actor.username})`);
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

        if (actor.role === 'admin' && ['admin', 'superadmin'].includes(targetUser.role)) {
            return res.status(403).json({ message: "Un Admin no puede eliminar a otro Admin." });
        }

        await User.findByIdAndDelete(targetId);
        logger.info(`Usuario eliminado: ID ${targetId} por ${actor.username}`);
        res.status(200).json({ message: "Usuario eliminado exitosamente." });
    } catch (error) {
        next(error);
    }
});

module.exports = router;