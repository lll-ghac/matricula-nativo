const fs = require('fs');
const path = require('path');
const { prisma } = require('../config/db');
const { getErrorMessage, getAnioVigente } = require('../utils/helpers');

const SECURITY_LOG = path.join(__dirname, '..', '..', 'logs', 'security.log');

async function validateRuts(req, res) {
  try {
    const anioVigente = await getAnioVigente();
    if (!anioVigente) {
      return res.status(500).json({
        error: 'No se encontró año vigente',
        message: 'Debe existir un año académico activo'
      });
    }

    const [students, guardians] = await Promise.all([
      prisma.alumnos.findMany({
        where: {
          anio_matricula: anioVigente,
          OR: [{ eliminado: false }, { eliminado: null }]
        },
        select: { id: true, rut: true, dv: true, nombres: true, apellido_paterno: true }
      }),
      prisma.apoderados.findMany({
        where: { rut: { not: null }, dv: { not: null } },
        select: { id: true, rut: true, dv: true, nombre: true, apellido_paterno: true }
      })
    ]);

    res.json({
      students,
      guardians,
      message: `Datos obtenidos: ${students.length} estudiantes y ${guardians.length} apoderados para validación`
    });
  } catch (error) {
    console.error('[Admin] ❌ Error en validateRuts:', error);
    res.status(500).json({
      error: 'Error al obtener datos para validación de RUTs',
      message: error.message
    });
  }
}

async function healthCheck(req, res) {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({
      status: 'ok',
      message: 'System operational',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('[Admin] ❌ Error en health check:', error);
    res.status(500).json({ status: 'error', message: 'Health check failed', timestamp: new Date().toISOString() });
  }
}

async function healthCheckDetailed(req, res) {
  try {
    const [usuariosCount, alumnosCount, apoderadosCount] = await Promise.all([
      prisma.usuarios.count(),
      prisma.alumnos.count(),
      prisma.apoderados.count()
    ]);
    res.json({
      status: 'ok',
      message: 'System operational',
      database: {
        type: 'PostgreSQL 16',
        connected: true,
        counts: { usuarios: usuariosCount, alumnos: alumnosCount, apoderados: apoderadosCount }
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('[Admin] ❌ Error en health check detallado:', error);
    res.status(500).json({ status: 'error', message: 'Health check failed', timestamp: new Date().toISOString() });
  }
}

async function usersAudit(req, res) {
  try {
    const users = await prisma.usuarios.findMany({
      select: { id: true, username: true, nombre: true, rol: true, estado: true, creado_en: true },
      orderBy: { creado_en: 'asc' }
    });

    // Parse last login from security log
    const lastLogins = {};
    if (fs.existsSync(SECURITY_LOG)) {
      const lines = fs.readFileSync(SECURITY_LOG, 'utf8').split('\n').filter(Boolean);
      for (const line of lines) {
        try {
          const entry = JSON.parse(line);
          if (entry.event === 'LOGIN_OK' && entry.username) {
            lastLogins[entry.username] = entry.ts;
          }
        } catch {}
      }
    }

    const STALE_DAYS = 90;
    const cutoff = new Date(Date.now() - STALE_DAYS * 86400 * 1000);

    const report = users.map(u => {
      const lastLogin = lastLogins[u.username] || null;
      const stale = !lastLogin || new Date(lastLogin) < cutoff;
      return {
        id: u.id,
        username: u.username,
        nombre: u.nombre,
        rol: u.rol,
        estado: u.estado,
        creado_en: u.creado_en,
        ultimo_login: lastLogin,
        alerta_inactivo: u.estado === 'activo' && stale
      };
    });

    const alertas = report.filter(u => u.alerta_inactivo);
    res.json({
      total: users.length,
      alertas_inactivos: alertas.length,
      nota: `Usuarios activos sin login registrado en los últimos ${STALE_DAYS} días`,
      users: report
    });
  } catch (error) {
    console.error('[Admin] Error en usersAudit:', error);
    res.status(500).json({ error: error.message });
  }
}

async function securityLogTail(req, res) {
  try {
    const lines = parseInt(req.query.lines) || 50;
    if (!fs.existsSync(SECURITY_LOG)) {
      return res.json({ entries: [], message: 'Log de seguridad aún vacío' });
    }
    const content = fs.readFileSync(SECURITY_LOG, 'utf8').split('\n').filter(Boolean);
    const recent = content.slice(-Math.min(lines, 200)).map(l => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean);
    res.json({ total_entries: content.length, showing: recent.length, entries: recent.reverse() });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

module.exports = { validateRuts, healthCheck, healthCheckDetailed, usersAudit, securityLogTail };
