const { prisma } = require('../config/db');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const secLog = require('../utils/securityLogger');

const JWT_SECRET = process.env.JWT_SECRET || 'default_secret_key_change_in_production';

async function login(req, res) {
  try {
    const { username, password } = req.body;

    const user = await prisma.usuarios.findFirst({
      where: { username, estado: 'activo' },
      select: { id: true, username: true, password_hash: true, rol: true, nombre: true, estado: true }
    });

    if (!user) {
      secLog.loginFail(req, username, 'usuario_no_existe');
      return res.status(400).json({ message: 'Usuario o contraseña incorrectos' });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    if (!isPasswordValid) {
      secLog.loginFail(req, username, 'contraseña_incorrecta');
      return res.status(400).json({ message: 'Usuario o contraseña incorrectos' });
    }

    let profesorJefeInfo = null;
    if (user.rol === 'profesor') {
      try {
        const cursosAsignados = await prisma.$queryRaw`
          SELECT curso_id, curso_codigo, anio_academico, nivel_educativo_nombre, grado_nombre,
                 letra, capacidad_maxima, alumnos_matriculados, cupos_disponibles, estado,
                 tipo_asignacion, puede_matricular
          FROM cursos_por_profesor
          WHERE usuario_id = ${user.id} AND estado = 'activo' AND puede_matricular = true
        `;

        if (cursosAsignados && cursosAsignados.length > 0) {
          const cursos = cursosAsignados.map(c => ({
            curso_id: Number(c.curso_id),
            curso_codigo: c.curso_codigo,
            curso_nombre: `${c.grado_nombre} ${c.letra}`,
            nivel_educativo: c.nivel_educativo_nombre,
            grado: c.grado_nombre,
            letra: c.letra,
            anio_academico: c.anio_academico,
            alumnos_matriculados: Number(c.alumnos_matriculados) || 0,
            capacidad_maxima: c.capacidad_maxima,
            cupos_disponibles: Number(c.cupos_disponibles) || c.capacidad_maxima,
            tipo_asignacion: c.tipo_asignacion
          }));

          const totalAlumnos = cursos.reduce((sum, c) => sum + c.alumnos_matriculados, 0);
          const totalCapacidad = cursos.reduce((sum, c) => sum + c.capacidad_maxima, 0);
          const totalCupos = cursos.reduce((sum, c) => sum + c.cupos_disponibles, 0);

          profesorJefeInfo = {
            cursos,
            total_cursos: cursos.length,
            total_alumnos: totalAlumnos,
            total_capacidad: totalCapacidad,
            total_cupos_disponibles: totalCupos,
            curso_id: cursos[0].curso_id,
            curso_codigo: cursos[0].curso_codigo,
            curso_nombre: cursos[0].curso_nombre,
            nivel_educativo: cursos[0].nivel_educativo,
            anio_academico: cursos[0].anio_academico,
            alumnos_matriculados: totalAlumnos,
            capacidad_maxima: totalCapacidad,
            cupos_disponibles: totalCupos
          };
        }
      } catch (viewError) {
        console.error('[Auth] ⚠️ Error al buscar cursos del profesor:', viewError.message);
      }
    }

    const normalizedRole = (user.rol || '').toLowerCase().trim();
    const tokenPayload = {
      id: Number(user.id),
      username: user.username,
      rol: normalizedRole,
      nombre: user.nombre,
      profesor_jefe_info: profesorJefeInfo
    };

    const accessToken = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: '8h', issuer: 'matricula-escolar-system' });
    // secure=true solo cuando llega vía HTTPS (NPM/DuckDNS pone X-Forwarded-Proto:https)
    // Permite también el acceso por IP directa en HTTP dentro de la LAN
    const isHttps = req.headers['x-forwarded-proto'] === 'https';
    // Cookie de sesión (sin maxAge): se borra al cerrar el navegador.
    // El JWT sigue teniendo un techo absoluto de 8h mientras el navegador permanezca abierto.
    const cookieOptions = { httpOnly: true, secure: isHttps, sameSite: isHttps ? 'strict' : 'lax' };
    res.cookie('jwtToken', accessToken, cookieOptions);
    secLog.loginOk(req, user.username, normalizedRole);
    res.json({ success: true, token: accessToken, user: tokenPayload, message: 'Login exitoso' });

  } catch (error) {
    console.error('[Auth] ❌ Error en login:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
}

function validateToken(req, res) {
  res.json({
    valid: true,
    user: {
      id: req.user.id,
      username: req.user.username,
      rol: (req.user.rol || '').toLowerCase().trim(),
      nombre: req.user.nombre,
      profesor_jefe_info: req.user.profesor_jefe_info || null
    }
  });
}

function getTokenInfo(req, res) {
  try {
    const exp = req.user.exp;
    if (!exp) return res.status(400).json({ message: 'Token sin información de expiración' });
    const currentTime = Math.floor(Date.now() / 1000);
    const timeUntilExpiry = (exp - currentTime) * 1000;
    res.json({ timeUntilExpiry: Math.max(0, timeUntilExpiry), expiresAt: new Date(exp * 1000).toISOString() });
  } catch (error) {
    console.error('[Auth] ❌ Error obteniendo información del token:', error);
    res.status(500).json({ message: 'Error obteniendo información del token' });
  }
}

function logout(req, res) {
  if (req.user) secLog.logout(req, req.user.username);
  const isHttps = req.headers['x-forwarded-proto'] === 'https';
  res.clearCookie('jwtToken', { httpOnly: true, secure: isHttps, sameSite: isHttps ? 'strict' : 'lax' });
  res.json({ success: true, message: 'Logout exitoso' });
}

module.exports = { login, validateToken, getTokenInfo, logout };
