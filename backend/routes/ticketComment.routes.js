// backend/routes/ticketComment.routes.js
const express = require('express');
const router = express.Router({ mergeParams: true }); // hereda :ticketId
const TicketComment = require('../models/TicketComment.model');
const { verifyToken } = require('../authMiddleware');

// GET /api/tickets/:ticketId/comments
router.get('/', verifyToken, async (req, res) => {
    try {
        const comments = await TicketComment.find({ ticket: req.params.ticketId })
            .sort({ createdAt: 1 })
            .lean();
        res.json(comments);
    } catch (e) {
        res.status(500).json({ message: 'Error obteniendo comentarios' });
    }
});

// POST /api/tickets/:ticketId/comments
router.post('/', verifyToken, async (req, res) => {
    const { text } = req.body;
    if (!text?.trim()) return res.status(400).json({ message: 'El comentario no puede estar vacío.' });
    try {
        const comment = await TicketComment.create({
            ticket:   req.params.ticketId,
            author:   req.user._id,
            username: req.user.username,
            text:     text.trim()
        });
        res.status(201).json(comment);
    } catch (e) {
        res.status(500).json({ message: 'Error creando comentario' });
    }
});

// DELETE /api/tickets/:ticketId/comments/:commentId — solo el autor o admin
router.delete('/:commentId', verifyToken, async (req, res) => {
    try {
        const comment = await TicketComment.findById(req.params.commentId);
        if (!comment) return res.status(404).json({ message: 'No encontrado' });

        const isOwner = String(comment.author) === String(req.user._id);
        const isAdmin = ['admin', 'superadmin'].includes(req.user.role);
        if (!isOwner && !isAdmin) return res.status(403).json({ message: 'Sin permisos' });

        await comment.deleteOne();
        res.json({ message: 'Comentario eliminado' });
    } catch (e) {
        res.status(500).json({ message: 'Error eliminando comentario' });
    }
});

module.exports = router;
