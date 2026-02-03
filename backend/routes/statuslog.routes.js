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