// backend/routes/systemNotice.routes.js
const express = require('express');
const router  = express.Router();
const SystemNotice = require('../models/SystemNotice.model');
const { verifyToken, verifyTokenAndAdmin } = require('../authMiddleware');

// GET /api/notices — obtener todos los avisos activos (para mostrar al login)
router.get('/', verifyToken, async (req, res) => {
    try {
        // admins ven todos, usuarios normales solo los activos
        const query = (req.user.role === 'admin' || req.user.role === 'superadmin')
            ? {}
            : { active: true };
        const notices = await SystemNotice.find(query).sort({ createdAt: -1 });
        res.json(notices);
    } catch (e) { res.status(500).json({ message: 'Error obteniendo avisos' }); }
});

// GET /api/notices/active — solo avisos activos (para el banner de login)
router.get('/active', async (req, res) => {
    try {
        const notices = await SystemNotice.find({ active: true }).sort({ createdAt: -1 });
        res.json(notices);
    } catch (e) { res.status(500).json({ message: 'Error' }); }
});

// POST /api/notices — crear aviso
router.post('/', verifyTokenAndAdmin, async (req, res) => {
    const { title, message, type } = req.body;
    if (!title?.trim() || !message?.trim())
        return res.status(400).json({ message: 'Título y mensaje son requeridos.' });
    try {
        const notice = await SystemNotice.create({
            title: title.trim(),
            message: message.trim(),
            type: type || 'info',
            active: true,
            createdBy: req.user._id
        });
        res.status(201).json(notice);
    } catch (e) { res.status(500).json({ message: 'Error creando aviso' }); }
});

// PUT /api/notices/:id — editar o activar/desactivar
router.put('/:id', verifyTokenAndAdmin, async (req, res) => {
    try {
        const notice = await SystemNotice.findByIdAndUpdate(
            req.params.id,
            { $set: req.body },
            { new: true, runValidators: true }
        );
        if (!notice) return res.status(404).json({ message: 'No encontrado' });
        res.json(notice);
    } catch (e) { res.status(500).json({ message: 'Error actualizando aviso' }); }
});

// DELETE /api/notices/:id
router.delete('/:id', verifyTokenAndAdmin, async (req, res) => {
    try {
        await SystemNotice.findByIdAndDelete(req.params.id);
        res.json({ message: 'Aviso eliminado' });
    } catch (e) { res.status(500).json({ message: 'Error eliminando aviso' }); }
});

module.exports = router;
