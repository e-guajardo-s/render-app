// backend/routes/invitation.routes.js
const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const Invitation = require('../models/Invitation.model');
const User = require('../models/User.model');
const { verifyTokenAndAdmin } = require('../authMiddleware');

// 1. GENERAR INVITACIÓN (Ahora pide username)
router.post('/generate', verifyTokenAndAdmin, async (req, res) => {
    try {
        // --- CAMBIO: Recibimos 'username' del admin ---
        const { role, comuna, username } = req.body;
        const actor = req.user;

        if (!username) {
            return res.status(400).json({ message: "Debes asignar un nombre de usuario." });
        }

        // Validar que el usuario no exista ya
        const existingUser = await User.findOne({ username });
        if (existingUser) {
            return res.status(400).json({ message: "El usuario ya existe." });
        }

        // Bloqueo de seguridad para admins normales
        if (actor.role === 'admin' && (role === 'admin' || role === 'superadmin')) {
            return res.status(403).json({ message: "No tienes permisos para invitar a este rol." });
        }

        const token = crypto.randomBytes(32).toString('hex');
        const expiresAt = new Date();
        expiresAt.setHours(expiresAt.getHours() + 48);

        const newInvitation = new Invitation({
            token,
            username, // Guardamos el nombre asignado
            role,
            comuna: role === 'municipalidad' ? comuna : null,
            createdBy: actor.id,
            expiresAt
        });

        await newInvitation.save();
        res.status(201).json({ token, message: "Invitación generada exitosamente." });

    } catch (error) {
        console.error("Error generando invitación:", error);
        res.status(500).json({ message: "Error al generar la invitación." });
    }
});

// 2. VALIDAR TOKEN (Devuelve el username para mostrarlo)
router.get('/validate/:token', async (req, res) => {
    try {
        const { token } = req.params;
        const invitation = await Invitation.findOne({ token, isUsed: false });

        if (!invitation) {
            return res.status(404).json({ valid: false, message: "Invitación no válida o ya utilizada." });
        }
        if (new Date() > invitation.expiresAt) {
            return res.status(400).json({ valid: false, message: "La invitación ha expirado." });
        }

        res.json({ 
            valid: true, 
            username: invitation.username, // <--- DEVOLVEMOS EL USUARIO
            role: invitation.role, 
            comuna: invitation.comuna 
        });

    } catch (error) {
        console.error("Error validando invitación:", error);
        res.status(500).json({ message: "Error al validar invitación." });
    }
});

// 3. REGISTRAR (Solo pide contraseña)
router.post('/register', async (req, res) => {
    try {
        // --- CAMBIO: NO recibimos username del cuerpo ---
        const { token, password } = req.body; 

        const invitation = await Invitation.findOne({ token, isUsed: false });
        if (!invitation || new Date() > invitation.expiresAt) {
            return res.status(400).json({ message: "Invitación inválida o expirada." });
        }

        // Verificar si el usuario ya fue tomado mientras tanto
        const existingUser = await User.findOne({ username: invitation.username });
        if (existingUser) {
            return res.status(400).json({ message: "El nombre de usuario ya está en uso." });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const newUser = new User({
            username: invitation.username, // Usamos el de la invitación
            password: hashedPassword,
            role: invitation.role,
            comuna: invitation.comuna
        });

        await newUser.save();

        invitation.isUsed = true;
        await invitation.save();

        res.status(201).json({ message: "Usuario registrado exitosamente." });

    } catch (error) {
        console.error("Error en registro:", error);
        res.status(500).json({ message: "Error al registrar usuario." });
    }
});

module.exports = router;