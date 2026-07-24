const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

// Cargar .env manualmente (sin dependencia de dotenv): secretos NUNCA en config.json versionado
const envPath = path.join(__dirname, '.env');
if (fs.existsSync(envPath)) {
  fs.readFileSync(envPath, 'utf8').split('\n').forEach(line => {
    const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
    if (match && !process.env[match[1]]) {
      process.env[match[1]] = (match[2] || '').trim();
    }
  });
}

// Load config
const configPath = path.join(__dirname, 'config.json');
let config = require(configPath);

// Secretos vienen de variables de entorno (.env local, no versionado)
config.auth = {
  username: process.env.RESTORE_USERNAME,
  password: process.env.RESTORE_PASSWORD,
  jwtSecret: process.env.RESTORE_JWT_SECRET
};
config.postgres = {
  host: process.env.PG_HOST || 'localhost',
  port: Number(process.env.PG_PORT) || 5432,
  user: process.env.PG_USER,
  password: process.env.PG_PASSWORD,
  database: process.env.PG_DATABASE
};

if (!config.auth.username || !config.auth.password || !config.auth.jwtSecret) {
  console.error('❌ ERROR CRÍTICO: faltan RESTORE_USERNAME/RESTORE_PASSWORD/RESTORE_JWT_SECRET en tools/restore-app/server/.env');
  process.exit(1);
}

// Set default backup directory if not configured
if (!config.backups.directory) {
  config.backups.directory = path.join(__dirname, '..', '..', '..', 'backups', 'postgres');
}

// Routes
const authRoutes = require('./routes/auth');
const databaseRoutes = require('./routes/database');
const backupsRoutes = require('./routes/backups');

const app = express();

// Middleware
app.use(express.json());
app.use(cors({
  origin: config.cors.allowedOrigins,
  credentials: true
}));

// Health check (no auth required)
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

// Routes
app.use('/api/auth', authRoutes(config));
app.use('/api/database', databaseRoutes(config));
app.use('/api/backups', backupsRoutes(config));

// Error handler
app.use((err, req, res, next) => {
  console.error('Error:', err.message);
  res.status(500).json({ error: err.message });
});

// Start server
const PORT = process.env.RESTORE_PORT || config.port || 5181;
app.listen(PORT, '127.0.0.1', () => {
  console.log(`\n🚀 Restore App Server iniciado`);
  console.log(`   Puerto: ${PORT}`);
  console.log(`   Backups: ${config.backups.directory}`);
  console.log(`   PostgreSQL: ${config.postgres.user}@${config.postgres.host}:${config.postgres.port}/${config.postgres.database}`);
  console.log(`\n   Endpoints:`);
  console.log(`   - POST /api/auth/login`);
  console.log(`   - GET  /api/health`);
  console.log(`   - GET  /api/database/status`);
  console.log(`   - GET  /api/backups`);
  console.log(`   - POST /api/backups/upload`);
  console.log(`   - POST /api/backups/restore`);
  console.log(`\n   Usuario: ${config.auth.username} (credenciales en tools/restore-app/server/.env)\n`);
});

module.exports = app;
