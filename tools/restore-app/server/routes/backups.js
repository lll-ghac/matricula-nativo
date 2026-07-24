const express = require('express');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const { spawnSync, execSync } = require('child_process');
const authMiddleware = require('../middleware/auth');

function runPsql(config, args, opts = {}) {
  const pg = config.postgres;
  const baseArgs = ['-h', pg.host, '-p', String(pg.port), '-U', pg.user, '-d', pg.database, '-v', 'ON_ERROR_STOP=0'];
  const result = spawnSync('psql', [...baseArgs, ...args], {
    encoding: 'utf8',
    env: { ...process.env, PGPASSWORD: pg.password },
    stdio: 'pipe',
    ...opts
  });
  if (result.error) throw result.error;
  return result;
}

function backupsRoutes(config) {
  const router = express.Router();
  const auth = authMiddleware(config);

  // Configure multer for file uploads
  const storage = multer.diskStorage({
    destination: (req, file, cb) => {
      if (!fs.existsSync(config.backups.directory)) {
        fs.mkdirSync(config.backups.directory, { recursive: true });
      }
      cb(null, config.backups.directory);
    },
    filename: (req, file, cb) => {
      // Sanitize filename
      const safeName = file.originalname.replace(/[^a-zA-Z0-9_\-\.]/g, '_');
      cb(null, safeName);
    }
  });

  const upload = multer({
    storage,
    limits: { fileSize: 100 * 1024 * 1024 }, // 100MB
    fileFilter: (req, file, cb) => {
      if (path.extname(file.originalname).toLowerCase() !== '.sql') {
        return cb(new Error('Solo se permiten archivos .sql'));
      }
      cb(null, true);
    }
  });

  // List available backups
  router.get('/', auth, async (req, res) => {
    try {
      if (!fs.existsSync(config.backups.directory)) {
        return res.json({ success: true, backups: [] });
      }

      const files = await fs.promises.readdir(config.backups.directory);
      const backupFiles = files.filter(file =>
        file.startsWith('matricula_') && file.endsWith('.sql')
      );

      const backups = await Promise.all(
        backupFiles.map(async (file) => {
          const filePath = path.join(config.backups.directory, file);
          const stats = await fs.promises.stat(filePath);
          return {
            filename: file,
            size: stats.size,
            sizeFormatted: formatSize(stats.size),
            createdAt: stats.mtime.toISOString()
          };
        })
      );

      // Sort by date, newest first
      backups.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

      res.json({ success: true, backups });
    } catch (error) {
      res.status(500).json({
        error: 'Error al listar backups',
        details: error.message
      });
    }
  });

  // Upload a backup file
  router.post('/upload', auth, upload.single('backup'), (req, res) => {
    if (!req.file) {
      return res.status(400).json({ error: 'No se recibió archivo' });
    }

    res.json({
      success: true,
      message: 'Backup subido exitosamente',
      filename: req.file.filename,
      size: req.file.size
    });
  });

  // Restore a backup
  router.post('/restore', auth, async (req, res) => {
    const { filename } = req.body;

    if (!filename) {
      return res.status(400).json({ error: 'Nombre de archivo requerido' });
    }

    const backupFilePath = path.join(config.backups.directory, filename);

    // Security validation
    if (path.dirname(backupFilePath) !== config.backups.directory) {
      return res.status(400).json({ error: 'Nombre de archivo inválido' });
    }

    if (!fs.existsSync(backupFilePath)) {
      return res.status(404).json({ error: 'Archivo no encontrado' });
    }

    try {
      console.log(`🚀 Iniciando restauración de ${filename}...`);

      // 1. Detect tables in backup
      console.log('   🔍 Detectando tablas en el backup...');
      const content = fs.readFileSync(backupFilePath, 'utf8');
      const tableRegex = /INSERT INTO public\.(\w+)/g;
      const tables = new Set();
      let match;
      while ((match = tableRegex.exec(content)) !== null) {
        tables.add(match[1]);
      }
      const tableList = Array.from(tables);
      console.log(`   ✅ ${tableList.length} tablas detectadas`);

      // 2. Truncate tables (NO usamos db reset porque borra la estructura)
      // RESTART IDENTITY ya deja las secuencias en 1, no hace falta un paso aparte.
      console.log('   🗑️  Vaciando tablas de datos...');
      const truncateSQL = `TRUNCATE TABLE alumno_apoderado, alumnos, apoderados, cursos, usuarios, profesor_curso, anio_vigente, niveles_educativos, grados, jornadas, letras_curso, previsiones_salud, tipos_nee, alumno_nee RESTART IDENTITY CASCADE;`;
      let result = runPsql(config, ['-c', truncateSQL]);
      if (result.status !== 0) throw new Error(`Error vaciando tablas: ${result.stderr}`);
      console.log('   ✅ Tablas vaciadas');

      // 3. Execute restore directly against local PostgreSQL (sin Docker)
      console.log('   💾 Restaurando datos (esto puede tardar varios minutos)...');
      result = runPsql(config, ['-f', backupFilePath], { maxBuffer: 50 * 1024 * 1024, timeout: 300000 });
      const restoreOutput = (result.stdout || '') + (result.stderr || '');
      const restoreErrors = restoreOutput.split('\n').filter(line => line.includes('ERROR:'));
      if (restoreErrors.length > 0) {
        console.log(`   ⚠️  Se encontraron ${restoreErrors.length} errores durante la restauración:`);
        restoreErrors.slice(0, 10).forEach(err => console.log(`      ${err}`));
      } else {
        console.log('   ✅ Datos restaurados');
      }

      // 4. Verify data
      console.log('   🔍 Verificando datos...');
      const countQuery = `
        SELECT 'usuarios' as tabla, COUNT(*) as total FROM usuarios
        UNION ALL SELECT 'alumnos', COUNT(*) FROM alumnos
        UNION ALL SELECT 'apoderados', COUNT(*) FROM apoderados
        UNION ALL SELECT 'cursos', COUNT(*) FROM cursos
        UNION ALL SELECT 'alumno_apoderado', COUNT(*) FROM alumno_apoderado
        ORDER BY tabla;
      `;

      result = runPsql(config, ['-t', '-c', countQuery]);
      if (result.status !== 0) throw new Error(`Error verificando datos: ${result.stderr}`);

      const lines = result.stdout.trim().split('\n');
      const dataStats = {};
      lines.forEach(line => {
        const parts = line.trim().split('|');
        if (parts.length === 2) {
          dataStats[parts[0].trim()] = parseInt(parts[1].trim());
        }
      });

      // 5. Post-procesamiento: Corregir duplicados y relaciones huérfanas
      console.log('   🔧 Consolidando apoderados duplicados y corrigiendo relaciones...');
      const cleanupScript = `
        -- 1. Consolidar apoderados duplicados por RUT (PRIMERO)
        DO $$
        DECLARE
          duplicate_rut RECORD;
          main_apoderado_id INTEGER;
          duplicate_count INTEGER := 0;
        BEGIN
          FOR duplicate_rut IN
            SELECT rut, dv
            FROM apoderados
            WHERE rut IS NOT NULL AND dv IS NOT NULL
            GROUP BY rut, dv
            HAVING COUNT(*) > 1
          LOOP
            -- Obtener el apoderado con ID más bajo (el primero insertado)
            SELECT MIN(id) INTO main_apoderado_id
            FROM apoderados
            WHERE rut = duplicate_rut.rut AND dv = duplicate_rut.dv;

            -- Actualizar todas las relaciones que apuntan a los duplicados
            UPDATE alumno_apoderado
            SET apoderado_id = main_apoderado_id
            WHERE apoderado_id IN (
              SELECT id FROM apoderados
              WHERE rut = duplicate_rut.rut AND dv = duplicate_rut.dv
              AND id != main_apoderado_id
            );

            -- Eliminar los apoderados duplicados
            DELETE FROM apoderados
            WHERE rut = duplicate_rut.rut AND dv = duplicate_rut.dv
            AND id != main_apoderado_id;

            duplicate_count := duplicate_count + 1;
          END LOOP;

          RAISE NOTICE 'RUTs duplicados consolidados: %', duplicate_count;
        END $$;

        -- 2. Limpiar relaciones huérfanas que no se pudieron corregir
        DO $$
        DECLARE
          orphan_count INTEGER := 0;
        BEGIN
          -- Eliminar relaciones que apuntan a apoderados inexistentes
          DELETE FROM alumno_apoderado
          WHERE apoderado_id NOT IN (SELECT id FROM apoderados);

          GET DIAGNOSTICS orphan_count = ROW_COUNT;
          RAISE NOTICE 'Relaciones huérfanas eliminadas: %', orphan_count;
        END $$;
      `;

      result = runPsql(config, ['-c', cleanupScript]);
      if (result.status !== 0) throw new Error(`Error en post-procesamiento: ${result.stderr}`);
      console.log('   ✅ Correcciones aplicadas');

      // 6. Reset passwords
      console.log('   🔐 Reseteando contraseñas...');
      const bcrypt = require('bcryptjs');
      const defaultPasswords = {
        'admin': 'admin123',
        '17393845': '17393845',
        '17885785': '17885785'
      };

      const credentials = [];
      for (const [username, password] of Object.entries(defaultPasswords)) {
        try {
          const hash = await bcrypt.hash(password, 10);
          // hash es bcrypt ($2b$10$...) — solo contiene [./A-Za-z0-9$], sin comillas simples
          const updateSQL = `UPDATE usuarios SET password_hash = '${hash}' WHERE username = '${username}';`;
          const updateResult = runPsql(config, ['-c', updateSQL]);
          if (updateResult.status === 0) {
            credentials.push({ username, password });
          }
        } catch (err) {
          // User may not exist
        }
      }

      // 7. Reiniciar el backend principal (el frontend es un build estático servido por nginx,
      // no un proceso PM2, así que no necesita reinicio)
      console.log('   🔄 Reiniciando backend...');
      let pm2Restarted = false;
      try {
        execSync('pm2 restart matricula-backend', { stdio: 'pipe', timeout: 30000 });
        console.log('   ✅ Backend reiniciado');
        pm2Restarted = true;
      } catch (e) {
        console.log('   ⚠️  Proceso "matricula-backend" no encontrado o PM2 no disponible');
      }

      console.log('✅ Restauración completada');

      res.json({
        success: true,
        message: `Backup ${filename} restaurado exitosamente`,
        tablesRestored: tableList.length,
        dataStats,
        pm2Restarted,
        credentials: credentials.length > 0 ? credentials : [
          { username: 'admin', password: 'admin123' },
          { username: '17393845', password: '17393845' },
          { username: '17885785', password: '17885785' }
        ]
      });
    } catch (error) {
      console.error('❌ Error:', error.message);
      res.status(500).json({
        error: 'Error durante la restauración',
        details: error.message
      });
    }
  });

  return router;
}

function formatSize(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
}

module.exports = backupsRoutes;
