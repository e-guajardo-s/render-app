// backend/routes/settings.routes.js
// FIX: Se eliminó la contraseña por defecto 'admin' hardcodeada.
// Si no existe la clave en BD se retorna un error claro pidiendo
// que el superadmin la configure usando el endpoint de actualización.

const express = require('express');
const router = express.Router();
const SystemSetting = require('../models/SystemSetting.model');
const bcrypt = require('bcryptjs');
const logger = require('../utils/logger');
const { verifyToken, verifyTokenAndAdmin } = require('../authMiddleware');

// POST /api/settings/verify-network-pass
router.post('/verify-network-pass', verifyToken, async (req, res) => {
  const { password } = req.body;

  if (!password) {
    return res.status(400).json({ message: 'La contraseña es requerida.' });
  }

  try {
    const setting = await SystemSetting.findOne({ key: 'network_master_pass' });

    if (!setting) {
      // Sistema no inicializado: el superadmin debe configurar la clave primero.
      return res.status(503).json({
        message: 'La contraseña maestra aún no ha sido configurada. Contacta al administrador del sistema.',
        code: 'NOT_INITIALIZED',
      });
    }

    const isMatch = await bcrypt.compare(password, setting.value);
    if (!isMatch) {
      logger.warn(`Intento fallido de acceso a redes desde usuario: ${req.user?.username}`);
      return res.status(401).json({ message: 'Contraseña incorrecta.' });
    }

    res.status(200).json({ ok: true });
  } catch (error) {
    logger.error('Error verificando contraseña de red:', error);
    res.status(500).json({ message: 'Error al verificar.' });
  }
});

// PUT /api/settings/update-network-pass (solo Admin/Superadmin)
router.put('/update-network-pass', verifyTokenAndAdmin, async (req, res) => {
  const { newPassword } = req.body;

  if (!newPassword || newPassword.length < 8) {
    return res.status(400).json({ message: 'La contraseña debe tener al menos 8 caracteres.' });
  }

  try {
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    await SystemSetting.findOneAndUpdate(
      { key: 'network_master_pass' },
      { value: hashedPassword },
      { upsert: true, new: true }
    );

    logger.info(`Contraseña maestra de red actualizada por: ${req.user?.username}`);
    res.status(200).json({ message: 'Contraseña maestra actualizada correctamente.' });
  } catch (error) {
    logger.error('Error actualizando contraseña de red:', error);
    res.status(500).json({ message: 'Error al actualizar contraseña.' });
  }
});

// GET /api/settings/thresholds
router.get('/thresholds', verifyToken, async (req, res) => {
    try {
        const setting = await SystemSetting.findOne({ key: 'thresholds' });
        const defaults = { watchdogMinutes: 20, upsThreshold: 12, inactivityLimit: 20 };
        res.json(setting ? { ...defaults, ...setting.value } : defaults);
    } catch (e) { res.status(500).json({ message: 'Error obteniendo umbrales' }); }
});

// PUT /api/settings/thresholds (solo admin)
router.put('/thresholds', verifyTokenAndAdmin, async (req, res) => {
    const { watchdogMinutes, upsThreshold, inactivityLimit } = req.body;
    const value = {};
    if (watchdogMinutes !== undefined) value.watchdogMinutes = Number(watchdogMinutes);
    if (upsThreshold !== undefined)    value.upsThreshold    = Number(upsThreshold);
    if (inactivityLimit !== undefined)  value.inactivityLimit  = Number(inactivityLimit);
    try {
        await SystemSetting.findOneAndUpdate(
            { key: 'thresholds' },
            { value },
            { upsert: true, new: true }
        );
        res.json({ message: 'Umbrales actualizados.', value });
    } catch (e) { res.status(500).json({ message: 'Error guardando umbrales' }); }
});

module.exports = router;
