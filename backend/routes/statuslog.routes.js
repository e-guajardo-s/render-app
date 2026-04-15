const express = require('express');
const router = express.Router();
const StatusLog = require('../models/StatusLog.model');
const { verifyToken, verifyTokenAndAdmin } = require('../authMiddleware'); 

router.get('/stats', verifyToken, async (req, res) => {
    try {
        const oneDayAgo = new Date();
        oneDayAgo.setDate(oneDayAgo.getDate() - 1);

        const stats = await StatusLog.aggregate([
            { $match: { timestamp: { $gte: oneDayAgo } } },
            { $group: { _id: "$type", count: { $sum: 1 } } }
        ]);

        const summary = {
            errors: stats.find(s => s._id === 'error')?.count || 0,
            warnings: stats.find(s => s._id === 'warning')?.count || 0,
            ups: stats.find(s => s._id === 'ups')?.count || 0,
            offline: stats.find(s => s._id === 'offline')?.count || 0, // <--- NUEVO
            info: stats.find(s => s._id === 'info')?.count || 0,
        };
        summary.total = summary.errors + summary.warnings + summary.info + summary.ups + summary.offline;

        res.json(summary);
    } catch (error) {
        console.error("Error stats:", error);
        res.status(500).json({ message: "Error calculando estadísticas" });
    }
});

// ... resto del archivo igual (GET / y DELETE /) ...
router.get('/', verifyToken, async (req, res) => {
    try {
        const { limit, startDate, endDate } = req.query;
        let queryObj = {};
        if (startDate && endDate) {
            const start = new Date(startDate); start.setHours(0, 0, 0, 0);
            const end = new Date(endDate); end.setHours(23, 59, 59, 999);
            queryObj.timestamp = { $gte: start, $lte: end };
        }
        let query = StatusLog.find(queryObj).sort({ timestamp: -1 });
        if (limit !== 'all' && (!startDate || !endDate)) {
            query = query.limit(100);
        }
        const logs = await query.exec();
        res.json(logs);
    } catch (error) {
        res.status(500).json({ message: "Error obteniendo logs" });
    }
});

// GET /api/statuslog/history/:cruceId
router.get('/history/:cruceId', verifyToken, async (req, res) => {
    try {
        const { cruceId } = req.params;
        const { days = 7 } = req.query;
        const since = new Date(Date.now() - Number(days) * 24 * 60 * 60 * 1000);
        const logs = await StatusLog.find({ cruceId, timestamp: { $gte: since } })
            .sort({ timestamp: -1 }).limit(200).lean();
        res.json(logs);
    } catch (e) {
        res.status(500).json({ message: 'Error historial' });
    }
});

// GET /api/statuslog/compare?ids=ID1,ID2&days=7
router.get('/compare', verifyToken, async (req, res) => {
    try {
        const ids = (req.query.ids || '').split(',').filter(Boolean).slice(0, 5);
        const days = Number(req.query.days || 7);
        if (!ids.length) return res.status(400).json({ message: 'ids requerido' });
        const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

        const results = {};
        await Promise.all(ids.map(async (cruceId) => {
            const logs = await StatusLog.find({ cruceId, timestamp: { $gte: since } })
                .sort({ timestamp: 1 }).limit(300).lean();
            const failures = logs.filter(l => l.type === 'error' || l.type === 'offline').length;
            const uptime = logs.length
                ? Math.round((logs.filter(l => l.type === 'info').length / logs.length) * 100)
                : null;
            results[cruceId] = { logs, failures, uptime, total: logs.length };
        }));
        res.json(results);
    } catch (e) {
        res.status(500).json({ message: 'Error comparativa' });
    }
});

router.delete('/', verifyTokenAndAdmin, async (req, res) => {
    try {
        const { startDate, endDate } = req.query;
        if (!startDate || !endDate) return res.status(400).json({ message: "Fechas requeridas" });

        const start = new Date(startDate); start.setHours(0, 0, 0, 0);
        const end = new Date(endDate); end.setHours(23, 59, 59, 999);

        const result = await StatusLog.deleteMany({ timestamp: { $gte: start, $lte: end } });
        res.status(200).json({ message: `Eliminados ${result.deletedCount} registros.` });
    } catch (error) {
        res.status(500).json({ message: "Error eliminando." });
    }
});

module.exports = router;