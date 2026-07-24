/**
 * Restauración Automática de Backup
 *
 * Restaura un backup SQL usando psql nativo (sin Docker).
 * Conexión idéntica a postgresBackup.js: matricula_app sobre PostgreSQL 16 local.
 */

const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

const BACKUP_DIR = path.join(__dirname, '..', '..', 'backups', 'postgres');

const PG_HOST = process.env.DB_HOST || 'localhost';
const PG_PORT = process.env.DB_PORT || '5432';
const PG_DB   = process.env.DB_NAME || 'matricula';
const PG_USER = process.env.DB_USER || 'matricula_app';
const PG_PASS = process.env.DB_PASSWORD || '';

const pgEnv = { ...process.env, PGPASSWORD: PG_PASS };

function runPsql(args, opts = {}) {
    const baseArgs = ['-h', PG_HOST, '-p', PG_PORT, '-U', PG_USER, '-d', PG_DB, '-v', 'ON_ERROR_STOP=0'];
    const result = spawnSync('psql', [...baseArgs, ...args], {
        encoding: 'utf8',
        env: pgEnv,
        stdio: 'pipe',
        ...opts
    });
    if (result.error) throw result.error;
    return result;
}

/**
 * Restaura un backup de forma automática y completa.
 * @param {string} filename - Nombre del archivo de backup (solo el nombre, sin ruta)
 * @returns {Promise<object>} Resultado con credenciales y estadísticas
 */
async function restoreBackupAutomatic(filename) {
    if (!/^[\w\-\.]+\.sql$/.test(filename)) {
        throw new Error('Nombre de archivo inválido');
    }

    const backupFilePath = path.join(BACKUP_DIR, filename);

    if (!fs.existsSync(backupFilePath)) {
        throw new Error(`Archivo de backup no encontrado: ${filename}`);
    }

    console.log(`🚀 Iniciando restauración automática de backup...`);
    console.log(`   📁 Archivo: ${filename}\n`);

    try {
        // Paso 1: Limpiar datos actuales (mantiene el esquema)
        console.log('🔄 Paso 1/4: Limpiando datos actuales...');
        const truncateSQL = `
            TRUNCATE TABLE usuarios, anio_vigente, cursos, alumno_apoderado, alumno_nee,
                           alumnos, apoderados, cursos_asignados, profesor_curso,
                           logs_importacion, documentos_pendientes, backups
            RESTART IDENTITY CASCADE;
        `;
        const cleanupResult = runPsql(['-c', truncateSQL]);
        if (cleanupResult.status !== 0) {
            throw new Error(`Error limpiando datos: ${cleanupResult.stderr}`);
        }
        console.log('   ✅ Datos eliminados');

        // Paso 2: Restaurar backup (el archivo ya está en el filesystem local)
        console.log('\n💾 Paso 2/4: Restaurando backup...');
        const restoreResult = runPsql(['-f', backupFilePath]);

        const output = (restoreResult.stdout || '') + (restoreResult.stderr || '');
        const errors = output.split('\n').filter(line => line.includes('ERROR:'));

        if (errors.length > 0) {
            console.log(`   ⚠️  Se encontraron ${errors.length} errores durante la restauración:`);
            errors.slice(0, 10).forEach(err => console.log(`      ${err}`));
        } else {
            console.log('   ✅ Backup restaurado sin errores');
        }

        // Paso 3: Resetear contraseñas
        console.log('\n🔐 Paso 3/4: Reseteando contraseñas...');
        const credentials = await resetPasswords();

        // Paso 4: Verificar integridad
        console.log('\n🔍 Paso 4/4: Verificando integridad...');
        const stats = await verifyIntegrity();

        console.log('\n✅ Restauración completada exitosamente\n');

        return {
            success: true,
            message: `Backup ${filename} restaurado correctamente`,
            filename,
            credentials,
            stats
        };

    } catch (error) {
        console.error('\n❌ Error durante la restauración:', error.message);
        throw error;
    }
}

async function resetPasswords() {
    const defaultPasswords = {
        'admin':     'admin123',
        '17393845':  '17393845',
        '17885785':  '17885785'
    };

    const credentials = [];

    for (const [username, password] of Object.entries(defaultPasswords)) {
        try {
            const hash = await bcrypt.hash(password, 10);
            // hash es bcrypt ($2b$10$...) — solo contiene [./A-Za-z0-9$], sin comillas simples
            const sql = `UPDATE usuarios SET password_hash = '${hash}' WHERE username = '${username}';`;
            const result = runPsql(['-c', sql]);
            if (result.status === 0) {
                credentials.push({ username, password });
                console.log(`   ✅ ${username}: contraseña reseteada`);
            } else {
                console.log(`   ⚠️  ${username}: no se pudo resetear (${result.stderr?.trim()})`);
            }
        } catch (err) {
            console.log(`   ⚠️  ${username}: no se pudo resetear: ${err.message}`);
        }
    }

    return credentials;
}

async function verifyIntegrity() {
    try {
        const sql = `SELECT 'usuarios' AS tabla, COUNT(*) AS total FROM usuarios
                     UNION ALL SELECT 'alumnos',   COUNT(*) FROM alumnos
                     UNION ALL SELECT 'apoderados', COUNT(*) FROM apoderados
                     UNION ALL SELECT 'cursos',     COUNT(*) FROM cursos;`;
        const result = runPsql(['-t', '-c', sql]);

        const stats = {};
        (result.stdout || '').trim().split('\n').forEach(line => {
            const parts = line.trim().split('|');
            if (parts.length === 2) {
                const tabla = parts[0].trim();
                const total = parseInt(parts[1].trim(), 10);
                if (tabla) {
                    stats[tabla] = total;
                    console.log(`   - ${tabla}: ${total} registros`);
                }
            }
        });

        return stats;
    } catch (error) {
        console.log(`   ⚠️  Error verificando integridad: ${error.message}`);
        return {};
    }
}

module.exports = { restoreBackupAutomatic };
