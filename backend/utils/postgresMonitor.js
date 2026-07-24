const { prisma } = require('../config/db');

async function getHealthSummary() {
    try {
        const rows = await prisma.$queryRaw`SELECT * FROM get_basic_health_check()`;
        return rows[0] || null;
    } catch (error) {
        console.error('Error fetching DB health summary:', error.message);
        return null;
    }
}

async function getConnectionStats() {
    try {
        const rows = await prisma.$queryRaw`SELECT * FROM get_active_connections()`;
        return rows[0] || null;
    } catch (error) {
        console.error('Error fetching connection stats:', error.message);
        return null;
    }
}

async function getDatabaseSize() {
    try {
        const rows = await prisma.$queryRaw`SELECT * FROM get_database_size()`;
        return rows[0] || null;
    } catch (error) {
        console.error('Error fetching database size:', error.message);
        return null;
    }
}

module.exports = { getHealthSummary, getConnectionStats, getDatabaseSize };
