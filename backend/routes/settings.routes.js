const express = require('express');
const router = express.Router();
const SystemSetting = require('../models/SystemSetting.model');
const bcrypt = require('bcryptjs');
const { verifyToken, verifyTokenAndAdmin } = require('../authMiddleware');

// CLAVE POR DEFECTO: Si no existe ninguna en la BD, se usará esta temporalmente
// para que el superadmin pueda entrar la primera vez y cambiarla.
const DEFAULT_FALLBACK_HASH = '$2a$10$X7.G.t.1.1.1.1.1.1.1.1'; // (Es un hash placeholder, la lógica abajo lo maneja)

// POST /api/settings/verify-network-pass
// Verifica si la contraseña ingresada es correcta
router.post('/verify-network-pass', verifyToken, async (req, res) => {
    const { password } = req.body;
    try {
        const setting = await SystemSetting.findOne({ key: 'network_master_pass' });
        
        if (!setting) {
            // Si es la primera vez y no hay clave configurada, permitimos entrar con 'admin'
            // para que puedan configurar la real.
            if (password === 'admin') return res.status(200).json({ ok: true });
            return res.status(401).json({ message: "Sistema no inicializado. Ingrese con clave por defecto." });
        }

        const isMatch = await bcrypt.compare(password, setting.value);
        if (!isMatch) return res.status(401).json({ message: "Contraseña incorrecta." });

        res.status(200).json({ ok: true });
    } catch (error) {
        res.status(500).json({ message: "Error al verificar." });
    }
});

// PUT /api/settings/update-network-pass
// Solo el ADMIN puede cambiar esta clave
router.put('/update-network-pass', verifyTokenAndAdmin, async (req, res) => {
    const { newPassword } = req.body;
    
    if (!newPassword || newPassword.length < 6) {
        return res.status(400).json({ message: "La contraseña debe tener al menos 6 caracteres." });
    }

    try {
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(newPassword, salt);

        // Upsert: Si existe actualiza, si no existe crea
        await SystemSetting.findOneAndUpdate(
            { key: 'network_master_pass' },
            { value: hashedPassword },
            { upsert: true, new: true }
        );

        res.status(200).json({ message: "Contraseña maestra actualizada correctamente." });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Error al actualizar contraseña." });
    }
});

module.exports = router;