const express = require('express');
const router = express.Router();
const {
    getHealthSummary,
    getConnectionStats,
    getDatabaseSize
} = require('../utils/postgresMonitor');

// This router will be protected by admin auth at the server.js level

// GET /api/admin/monitor/health - Get a basic health check of the database
router.get('/health', async (req, res) => {
    try {
        const summary = await getHealthSummary();
        if (!summary) {
            return res.status(503).json({ message: 'Could not retrieve database health summary.' });
        }
        res.status(200).json(summary);
    } catch (error) {
        res.status(500).json({
            message: 'Failed to get health summary.',
            error: error.message
        });
    }
});

// GET /api/admin/monitor/connections - Get connection statistics
router.get('/connections', async (req, res) => {
    try {
        const stats = await getConnectionStats();
        if (!stats) {
            return res.status(503).json({ message: 'Could not retrieve connection stats.' });
        }
        res.status(200).json(stats);
    } catch (error) {
        res.status(500).json({
            message: 'Failed to get connection stats.',
            error: error.message
        });
    }
});

// GET /api/admin/monitor/size - Get database size
router.get('/size', async (req, res) => {
    try {
        const size = await getDatabaseSize();
        if (!size) {
            return res.status(503).json({ message: 'Could not retrieve database size.' });
        }
        res.status(200).json(size);
    } catch (error) {
        res.status(500).json({
            message: 'Failed to get database size.',
            error: error.message
        });
    }
});

module.exports = router;