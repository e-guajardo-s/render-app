// backend/routes/audit.routes.js
const express = require('express');
const router = express.Router();
const AuditLog = require('../models/AuditLog.model');
const { verifyTokenAndAdmin } = require('../authMiddleware');

// GET /api/audit — solo admins/superadmins
router.get('/', verifyTokenAndAdmin, async (req, res) => {
    try {
        const { page = 1, limit = 50, user, action, startDate, endDate } = req.query;
        const query = {};

        if (user)      query.username = { $regex: user, $options: 'i' };
        if (action)    query.action   = action;
        if (startDate || endDate) {
            query.timestamp = {};
            if (startDate) { const d = new Date(startDate); d.setHours(0,0,0,0); query.timestamp.$gte = d; }
            if (endDate)   { const d = new Date(endDate);   d.setHours(23,59,59,999); query.timestamp.$lte = d; }
        }

        const [logs, total] = await Promise.all([
            AuditLog.find(query)
                .sort({ timestamp: -1 })
                .skip((page - 1) * limit)
                .limit(Number(limit))
                .lean(),
            AuditLog.countDocuments(query)
        ]);

        res.json({ logs, total, page: Number(page), pages: Math.ceil(total / limit) });
    } catch (e) {
        res.status(500).json({ message: 'Error obteniendo auditoría' });
    }
});

module.exports = router;
