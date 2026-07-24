const express = require('express');
const { spawnSync } = require('child_process');
const authMiddleware = require('../middleware/auth');

function runPsql(config, args) {
  const pg = config.postgres;
  const baseArgs = ['-h', pg.host, '-p', String(pg.port), '-U', pg.user, '-d', pg.database];
  return spawnSync('psql', [...baseArgs, ...args], {
    encoding: 'utf8',
    env: { ...process.env, PGPASSWORD: pg.password },
    stdio: 'pipe'
  });
}

function databaseRoutes(config) {
  const router = express.Router();
  const auth = authMiddleware(config);

  // Get database status (record counts)
  router.get('/status', auth, (req, res) => {
    try {
      const countQuery = `
        SELECT 'usuarios' as tabla, COUNT(*) as total FROM usuarios
        UNION ALL SELECT 'alumnos', COUNT(*) FROM alumnos
        UNION ALL SELECT 'apoderados', COUNT(*) FROM apoderados
        UNION ALL SELECT 'cursos', COUNT(*) FROM cursos
        UNION ALL SELECT 'alumno_apoderado', COUNT(*) FROM alumno_apoderado
        ORDER BY tabla;
      `;

      const result = runPsql(config, ['-t', '-c', countQuery]);
      if (result.error) throw result.error;
      if (result.status !== 0) throw new Error(result.stderr || 'psql terminó con error');

      const lines = result.stdout.trim().split('\n');
      const stats = {};

      lines.forEach(line => {
        const parts = line.trim().split('|');
        if (parts.length === 2) {
          const tabla = parts[0].trim();
          const total = parseInt(parts[1].trim());
          stats[tabla] = total;
        }
      });

      res.json({
        success: true,
        stats,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      res.status(500).json({
        error: 'Error al obtener estado de la base de datos',
        details: error.message
      });
    }
  });

  return router;
}

module.exports = databaseRoutes;
