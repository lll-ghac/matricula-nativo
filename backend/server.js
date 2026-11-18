// Cargar variables de entorno primero
require('dotenv').config();

const { Prisma } = require('@prisma/client');

// Serialización global de BigInt en JSON (Prisma retorna BigInt para campos id)
BigInt.prototype.toJSON = function () { return Number(this); };

// Convierte objetos Date de campos @db.Date a string YYYY-MM-DD usando UTC,
// evitando que el cliente en UTC-4 interprete medianoche UTC como el día anterior.
function fixDatesForResponse(obj) {
  if (obj === null || obj === undefined) return obj;
  if (obj instanceof Date) {
    // Fecha inválida en origen (ej. año con typo tipo "19872" o "1086" en la BD):
    // getTime() da NaN y toISOString() tira RangeError, tumbando toda la respuesta
    // por un solo registro con dato sucio. Se devuelve null en vez de romper el endpoint.
    if (isNaN(obj.getTime())) return null;
    // Campos @db.Time (ej. horario_inicio/horario_termino): Prisma los representa como
    // Date anclado al epoch Unix (1970-01-01) + la hora real en UTC, sin desfase de zona
    // horaria (TIME no tiene tz). Se formatean como "HH:MM".
    if (obj.getUTCFullYear() === 1970 && obj.getUTCMonth() === 0 && obj.getUTCDate() === 1) {
      const h = String(obj.getUTCHours()).padStart(2, '0');
      const min = String(obj.getUTCMinutes()).padStart(2, '0');
      return `${h}:${min}`;
    }
    // Horas UTC ≤ 4 → campo date-only interpretado como medianoche hora local del servidor
    if (obj.getUTCHours() <= 4 && obj.getUTCMinutes() === 0 && obj.getUTCSeconds() === 0) {
      const y = obj.getUTCFullYear();
      const m = String(obj.getUTCMonth() + 1).padStart(2, '0');
      const d = String(obj.getUTCDate()).padStart(2, '0');
      return `${y}-${m}-${d}`;
    }
    return obj.toISOString();
  }
  // Prisma.Decimal (columnas numeric/decimal, ej. porcentaje_ocupacion): la reconstrucción
  // de objeto plano de abajo pierde el prototipo (y su toJSON), dejando {s, e, d} crudos.
  if (obj instanceof Prisma.Decimal) return Number(obj);
  if (Array.isArray(obj)) return obj.map(fixDatesForResponse);
  if (typeof obj === 'object') {
    const out = {};
    for (const [k, v] of Object.entries(obj)) out[k] = fixDatesForResponse(v);
    return out;
  }
  return obj;
}

const { exec } = require('child_process');
const express = require('express');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const cookieParser = require('cookie-parser');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const { body, validationResult } = require('express-validator');
const path = require('path');
const secLog = require('./utils/securityLogger');

// Rutas del backend (PostgreSQL 16 + Prisma)
const students = require('./routes/students');
const users = require('./routes/users');
const years = require('./routes/years');
const statistics = require('./routes/statistics');
const courses = require('./routes/courses');
const auth = require('./routes/auth');
const admin = require('./routes/admin');
const guardians = require('./routes/guardians');
const backups = require('./routes/backups');
const backupConfig = require('./routes/backup-config');
const monitor = require('./routes/monitor');
const nee = require('./routes/nee');

// Sistema de Cursos V2 (Normalizado)
const catalogs = require('./routes/catalogs');
const coursesV2 = require('./routes/courses_v2');
const reports = require('./routes/reports');
const courseTeachers = require('./routes/course-teachers');

const app = express();
const port = process.env.PORT || 5003;

// Confiar en nginx (loopback) y en NPM (192.16.1.140) para obtener IP real del cliente
// Con X-Forwarded-For: <client>, 192.16.1.140 → req.ip = <client>
app.set('trust proxy', 'loopback, 192.16.1.140');

// Middleware global: normaliza campos Date de @db.Date a string YYYY-MM-DD en todas las respuestas
app.use((req, res, next) => {
  const _json = res.json.bind(res);
  res.json = (data) => _json(fixDatesForResponse(data));
  next();
});

// Validar variables de entorno críticas
if (!process.env.JWT_SECRET) {
  console.error('❌ ERROR CRÍTICO: JWT_SECRET no está definido');
  process.exit(1);
}

const JWT_SECRET = process.env.JWT_SECRET;
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';
const FRONTEND_URL_PUBLIC = process.env.FRONTEND_URL_PUBLIC;

// --- MIDDLEWARE DE SEGURIDAD ---
app.use(helmet({
  crossOriginEmbedderPolicy: false,
}));

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 150,
  message: { error: 'Demasiadas solicitudes' },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', apiLimiter);

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: 'Demasiados intentos de login. Intenta de nuevo en 15 minutos.' },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
});

app.use(express.json({ limit: '10mb' }));
app.use(cookieParser());

// CORS seguro
app.use((req, res, next) => {
  const allowedOrigins = [FRONTEND_URL, 'http://localhost:3000', 'http://localhost:5173', 'http://localhost:5174', 'http://localhost:5175', ...(FRONTEND_URL_PUBLIC ? [FRONTEND_URL_PUBLIC] : [])];
  const origin = req.headers.origin;

  if (allowedOrigins.includes(origin)) {
    res.header('Access-Control-Allow-Origin', origin);
  }
  
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  res.header('Access-Control-Allow-Credentials', 'true');
  
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
});

// --- Middleware de Autenticación y Autorización ---
const authenticateToken = (req, res, next) => {
  // Intentar obtener token del header Authorization primero
  let token = null;
  const authHeader = req.headers.authorization;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7); // Remover "Bearer " del inicio
  } else {
    // Si no hay header Authorization, intentar obtener de cookie
    token = req.cookies.jwtToken;
  }

  if (!token) {
    return res.status(401).json({ message: 'Token de acceso requerido' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ message: 'Token inválido o expirado' });
    }
    req.user = user;
    next();
  });
};

const authorizeRole = (roles) => {
  return (req, res, next) => {
    const userRole = (req.user?.rol || '').toLowerCase();
    if (!req.user || !roles.includes(userRole)) {
      secLog.accessDenied(req, req.user?.username || 'anon', `${req.method} ${req.path}`);
      return res.status(403).json({ message: 'Acceso denegado. No tiene los permisos necesarios.' });
    }
    next();
  };
};

// --- RUTAS ---

// Auth
app.post('/api/auth/register', authenticateToken, authorizeRole(['administrador']), users.registerUser);
app.post('/api/auth/login', loginLimiter, [body('username').trim().isLength({ min: 3 }), body('password').isLength({ min: 6 })], auth.login);
app.post('/api/auth/logout', auth.logout);
app.get('/api/auth/validate-token', authenticateToken, auth.validateToken);
app.get('/api/auth/token-info', authenticateToken, auth.getTokenInfo);

// Users
app.get('/api/users/teachers', authenticateToken, authorizeRole(['administrador', 'inspector']), users.getTeachers);
app.get('/api/users', authenticateToken, authorizeRole(['administrador', 'inspector']), users.getUsers);
app.put('/api/users/:id', authenticateToken, authorizeRole(['administrador']), users.updateUser);
app.put('/api/users/:id/password', authenticateToken, authorizeRole(['administrador']), users.updateUserPassword);
app.delete('/api/users/:id', authenticateToken, authorizeRole(['administrador']), users.deleteUser);
app.get('/api/users/export', authenticateToken, authorizeRole(['administrador']), users.exportUsers);
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 1 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['text/csv', 'application/vnd.ms-excel', 'text/plain'];
    if (allowed.includes(file.mimetype) || file.originalname.toLowerCase().endsWith('.csv')) {
      cb(null, true);
    } else {
      cb(new Error('Solo se permiten archivos CSV.'));
    }
  }
});
app.post('/api/users/import', authenticateToken, authorizeRole(['administrador']), upload.single('csvFile'), users.importUsers);


// Students
app.get('/api/students', authenticateToken, authorizeRole(['profesor', 'inspector', 'administrador', 'sololectura']), students.getStudents);
app.post('/api/students', authenticateToken, authorizeRole(['profesor', 'inspector', 'administrador']), students.createStudent);
app.get('/api/students/export', authenticateToken, authorizeRole(['profesor', 'inspector', 'administrador', 'sololectura']), students.exportStudents);
app.get('/api/students/export-complete', authenticateToken, authorizeRole(['administrador', 'inspector', 'profesor']), students.exportStudentsComplete);
app.get('/api/students/search', authenticateToken, authorizeRole(['profesor', 'inspector', 'administrador', 'sololectura']), students.searchStudents);
app.get('/api/students/agenda', authenticateToken, authorizeRole(['profesor', 'inspector', 'administrador', 'sololectura']), students.getStudentsAgenda);
app.get('/api/students/:id/apoderados', authenticateToken, authorizeRole(['profesor', 'inspector', 'administrador', 'sololectura']), students.getStudentGuardians);
app.get('/api/students/:id', authenticateToken, authorizeRole(['profesor', 'inspector', 'administrador', 'sololectura']), students.getStudentById);
app.put('/api/students/:id', authenticateToken, authorizeRole(['profesor', 'inspector', 'administrador']), students.updateStudent);
app.delete('/api/students/:id', authenticateToken, authorizeRole(['administrador', 'inspector']), students.deleteStudent);
app.put('/api/students/:id/retire', authenticateToken, authorizeRole(['administrador', 'inspector']), students.retireStudent);
app.patch('/api/students/:id/documentos-impresos', authenticateToken, authorizeRole(['profesor', 'inspector', 'administrador']), students.markDocumentsPrinted);
app.get('/api/student/check/:rut', authenticateToken, authorizeRole(['profesor', 'inspector', 'administrador']), students.checkStudentByRut);


// Guardians
app.get('/api/guardians', authenticateToken, authorizeRole(['profesor', 'inspector', 'administrador', 'sololectura']), guardians.getGuardians);
app.post('/api/guardians', authenticateToken, authorizeRole(['profesor', 'inspector', 'administrador']), guardians.createGuardian);
app.get('/api/guardians/check/:rut', authenticateToken, authorizeRole(['profesor', 'inspector', 'administrador', 'sololectura']), students.checkGuardianByRut);
app.get('/api/guardians/:id', authenticateToken, authorizeRole(['profesor', 'inspector', 'administrador', 'sololectura']), guardians.getGuardianById);
app.put('/api/guardians/:id', authenticateToken, authorizeRole(['profesor', 'inspector', 'administrador']), guardians.updateGuardian);
app.delete('/api/guardians/:id', authenticateToken, authorizeRole(['administrador', 'inspector']), guardians.deleteGuardian);
app.get('/api/guardians/:id/students', authenticateToken, authorizeRole(['profesor', 'inspector', 'administrador', 'sololectura']), guardians.getGuardianStudents);
app.put('/api/students/:id/guardians', authenticateToken, authorizeRole(['profesor', 'inspector', 'administrador']), students.updateStudentGuardians);


// Courses & Teachers
app.get('/api/courses', authenticateToken, authorizeRole(['administrador', 'inspector']), courses.getCourses);
app.get('/api/teachers', authenticateToken, authorizeRole(['administrador', 'inspector']), courses.getTeachers);
app.get('/api/teachers/:id/courses', authenticateToken, authorizeRole(['administrador']), courses.getTeacherCourses);
app.post('/api/teachers/:id/courses', authenticateToken, authorizeRole(['administrador']), courses.assignCoursesToTeacher);
app.get('/api/user/assigned-courses', authenticateToken, courses.getUserAssignedCourses);
app.get('/api/user/courses-with-enroll-permission', authenticateToken, courses.getUserCoursesWithEnrollPermission);

// Course Teachers Management (Gestión de Profesores por Curso)
app.get('/api/courses/:id/teachers', authenticateToken, authorizeRole(['administrador', 'inspector']), courseTeachers.getCourseTeachers);
app.post('/api/courses/:id/teachers', authenticateToken, authorizeRole(['administrador', 'inspector']), courseTeachers.addCourseTeacher);
app.put('/api/courses/:courseId/teachers/:teacherId', authenticateToken, authorizeRole(['administrador', 'inspector']), courseTeachers.updateCourseTeacher);
app.delete('/api/courses/:courseId/teachers/:teacherId', authenticateToken, authorizeRole(['administrador', 'inspector']), courseTeachers.removeCourseTeacher);

// NEE (Necesidades Educativas Especiales)
app.get('/api/nee/tipos', authenticateToken, nee.getTiposNee);
app.get('/api/nee/categorias', authenticateToken, nee.getCategoriasNee);

// Sistema de Cursos V2 (Normalizado)
// Catálogos - Acceso para todos los usuarios autenticados
app.use('/api/catalogs', authenticateToken, catalogs);

// Cursos V2 - Lectura para todos los roles autenticados, escritura solo admin/inspector
// Nota: Los profesores necesitan leer cursos para poder matricular estudiantes
app.use('/api/courses/v2', authenticateToken, authorizeRole(['administrador', 'inspector', 'profesor']), coursesV2);

// Reportes de cursos - Múltiples roles pueden ver reportes
app.use('/api/reports', authenticateToken, authorizeRole(['administrador', 'inspector', 'profesor', 'sololectura']), reports);

// Years
app.get('/api/years', authenticateToken, authorizeRole(['administrador']), years.getYears);
app.post('/api/years', authenticateToken, authorizeRole(['administrador']), years.createYear);
app.put('/api/years/:id/activate', authenticateToken, authorizeRole(['administrador']), years.activateYear);
app.get('/api/year/current', years.getCurrentYear);

// Statistics
app.get('/api/statistics/general', authenticateToken, authorizeRole(['administrador', 'inspector']), statistics.getGeneralStatistics);
app.get('/api/statistics/courses', authenticateToken, authorizeRole(['administrador', 'inspector']), statistics.getCourseStatistics);
app.get('/api/statistics/autorizaciones-imagen', authenticateToken, authorizeRole(['administrador', 'inspector']), statistics.getImageAuthorizationStatistics);

// Admin & System
app.get('/api/health', admin.healthCheck);
app.get('/api/health/detailed', authenticateToken, authorizeRole(['administrador']), admin.healthCheckDetailed);
app.get('/api/admin/security/users', authenticateToken, authorizeRole(['administrador']), admin.usersAudit);
app.get('/api/admin/security/log', authenticateToken, authorizeRole(['administrador']), admin.securityLogTail);
app.get('/api/admin/validate-ruts', authenticateToken, authorizeRole(['administrador']), admin.validateRuts);
app.use('/api/admin/backup', authenticateToken, authorizeRole(['administrador']), backups);
app.use('/api/admin/backup-config', authenticateToken, authorizeRole(['administrador']), backupConfig);
app.use('/api/admin/monitor', authenticateToken, authorizeRole(['administrador']), monitor);

// Version
app.get('/api/version', (req, res) => {
    const fs = require('fs');
    const path = require('path');
    try {
        const packageJson = fs.readFileSync(path.join(__dirname, 'package.json'), 'utf8');
        const { version } = JSON.parse(packageJson);
        res.json({ version });
    } catch (error) {
        console.error('Error reading package.json:', error);
        res.status(500).json({ error: 'Could not retrieve version' });
    }
});

// --- Punto de Entrada ---
app.listen(port, async () => {
  console.log('🚀 Servidor iniciado (PostgreSQL 16 + Prisma)');
  console.log(`   📡 Puerto: ${port}`);
  console.log(`   🛡️ CORS: Restringido`);
  console.log('✅ Sistema listo.');

  // Inicializar sistema de respaldos automáticos
  try {
    const { initializeBackupScheduler } = require('./utils/backupScheduler');
    await initializeBackupScheduler();
  } catch (error) {
    console.warn('⚠️  Error inicializando respaldos automáticos:', error.message);
  }
});
