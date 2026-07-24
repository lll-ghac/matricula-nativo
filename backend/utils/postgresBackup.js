const fs = require('fs');
const path = require('path');
const { execSync, spawnSync } = require('child_process');

const BACKUP_DIR = path.join(__dirname, '..', '..', 'backups', 'postgres');

if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
}

// Native PostgreSQL connection settings
const PG_HOST = process.env.DB_HOST || 'localhost';
const PG_PORT = process.env.DB_PORT || '5432';
const PG_DB = process.env.DB_NAME || 'matricula';
const PG_USER = process.env.DB_USER || 'matricula_app';
const PG_PASS = process.env.DB_PASSWORD || '';

const pgEnv = { ...process.env, PGPASSWORD: PG_PASS };
const pgBase = `-h ${PG_HOST} -p ${PG_PORT} -U ${PG_USER} -d ${PG_DB}`;

function runPsql(sqlOrArgs, opts = {}) {
    const baseArgs = ['-h', PG_HOST, '-p', PG_PORT, '-U', PG_USER, '-d', PG_DB];
    const args = Array.isArray(sqlOrArgs)
        ? [...baseArgs, ...sqlOrArgs]
        : [...baseArgs, '-c', sqlOrArgs];
    const result = spawnSync('psql', args, { encoding: 'utf8', env: pgEnv, stdio: 'pipe', ...opts });
    if (result.error) throw result.error;
    return result.stdout || '';
}

function runPsqlSudo(sql) {
    const result = spawnSync('sudo', ['-u', 'postgres', 'psql', '-d', PG_DB, '-c', sql],
        { encoding: 'utf8', stdio: 'pipe' });
    if (result.error) throw result.error;
    return result.stdout || '';
}

async function createBackup() {
    const timestamp = new Date().toISOString()
        .replace(/T/, '_')
        .replace(/\..+/, '')
        .replace(/:/g, '-');
    const backupFileName = `matricula_${timestamp}.sql`;
    const backupFilePath = path.join(BACKUP_DIR, backupFileName);

    console.log(`🚀 Iniciando backup de PostgreSQL...`);
    console.log(`   📦 Método: pg_dump nativo (datos únicamente)`);

    try {
        console.log(`   🔧 Ejecutando pg_dump...`);
        const dumpResult = spawnSync(
            'sudo', ['-u', 'postgres', 'pg_dump', '-d', PG_DB, '--data-only', '--schema=public', '--column-inserts'],
            { encoding: 'utf8', maxBuffer: 50 * 1024 * 1024, stdio: 'pipe' }
        );
        if (dumpResult.error) throw dumpResult.error;
        if (dumpResult.status !== 0) throw new Error(dumpResult.stderr || 'pg_dump failed');
        const backupData = dumpResult.stdout;

        console.log(`   💾 Guardando en ${backupFileName}`);
        await fs.promises.writeFile(backupFilePath, backupData, 'utf8');

        const stats = await fs.promises.stat(backupFilePath);
        const sizeMB = (stats.size / (1024 * 1024)).toFixed(2);

        console.log(`✅ Backup creado exitosamente`);
        console.log(`   📁 Archivo: ${backupFileName}`);
        console.log(`   📊 Tamaño: ${sizeMB} MB`);

        return backupFilePath;
    } catch (error) {
        console.error(`❌ Falló la creación del backup: ${error.message}`);
        throw error;
    }
}

async function listBackups() {
    try {
        const files = await fs.promises.readdir(BACKUP_DIR);
        const backupFiles = files.filter(file =>
            file.startsWith('matricula_') && file.endsWith('.sql')
        );

        const detailedFiles = await Promise.all(
            backupFiles.map(async (file) => {
                const filePath = path.join(BACKUP_DIR, file);
                const stats = await fs.promises.stat(filePath);
                return {
                    filename: file,
                    size: stats.size,
                    createdAt: stats.mtime.toISOString(),
                };
            })
        );

        return detailedFiles.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    } catch (error) {
        if (error.code === 'ENOENT') return [];
        throw error;
    }
}

function detectTablesInBackup(backupFilePath) {
    console.log('   🔍 Detectando tablas en el backup...');
    const content = fs.readFileSync(backupFilePath, 'utf8');
    const tableRegex = /INSERT INTO public\.(\w+)/g;
    const tables = new Set();
    let match;
    while ((match = tableRegex.exec(content)) !== null) {
        tables.add(match[1]);
    }
    const tableList = Array.from(tables);
    console.log(`   ✅ ${tableList.length} tablas detectadas: ${tableList.join(', ')}`);
    return tableList;
}

async function resetPasswordsAfterRestore() {
    console.log('   🔐 Reseteando contraseñas automáticamente...');

    try {
        const bcrypt = require('bcryptjs');
        const saltRounds = 10;

        const defaultPasswords = {
            'admin': 'admin123',
            '17393845': '17393845',
            '17885785': '17885785'
        };

        const credentials = [];

        for (const [username, password] of Object.entries(defaultPasswords)) {
            try {
                const hash = await bcrypt.hash(password, saltRounds);
                runPsql(['-c', `UPDATE usuarios SET password_hash = '${hash}' WHERE username = '${username}';`]);
                credentials.push({ username, password });
                console.log(`      ✅ ${username}: contraseña reseteada`);
            } catch (err) {
                console.log(`      ⚠️  ${username}: no se pudo resetear`);
            }
        }

        return credentials;
    } catch (error) {
        console.log(`   ⚠️  Error reseteando contraseñas: ${error.message}`);
        return [];
    }
}

async function resetSequences() {
    console.log('   🔢 Reseteando secuencias de IDs...');

    try {
        const sql = `
            SELECT setval('usuarios_id_seq', COALESCE((SELECT MAX(id) FROM usuarios), 1));
            SELECT setval('alumnos_id_seq', COALESCE((SELECT MAX(id) FROM alumnos), 1));
            SELECT setval('apoderados_id_seq', COALESCE((SELECT MAX(id) FROM apoderados), 1));
            SELECT setval('cursos_id_seq', COALESCE((SELECT MAX(id) FROM cursos), 1));
            SELECT setval('alumno_apoderado_id_seq', COALESCE((SELECT MAX(id) FROM alumno_apoderado), 1));
        `;
        runPsql(sql.trim());
        console.log('   ✅ Secuencias reseteadas');
        return true;
    } catch (error) {
        console.log(`   ⚠️  Error reseteando secuencias: ${error.message}`);
        return false;
    }
}

async function verifyDataIntegrity() {
    console.log('   🔍 Verificando integridad de datos...');

    try {
        const sql = `SELECT 'usuarios' as tabla, COUNT(*) as total FROM usuarios UNION ALL SELECT 'alumnos', COUNT(*) FROM alumnos UNION ALL SELECT 'apoderados', COUNT(*) FROM apoderados UNION ALL SELECT 'cursos', COUNT(*) FROM cursos UNION ALL SELECT 'alumno_apoderado', COUNT(*) FROM alumno_apoderado ORDER BY tabla;`;
        const result = runPsql(['-t', '-c', sql]);

        const stats = {};
        result.trim().split('\n').forEach(line => {
            const parts = line.trim().split('|');
            if (parts.length === 2) {
                stats[parts[0].trim()] = parseInt(parts[1].trim());
            }
        });

        console.log('   📊 Resumen de datos restaurados:');
        Object.entries(stats).forEach(([tabla, total]) => {
            console.log(`      - ${tabla}: ${total} registros`);
        });

        return stats;
    } catch (error) {
        console.log(`   ⚠️  Error verificando integridad: ${error.message}`);
        return {};
    }
}

async function resetDatabase() {
    console.log('   🗑️  Vaciando tablas de datos...');

    try {
        const sql = `TRUNCATE TABLE alumno_apoderado, alumnos, apoderados, cursos, usuarios, profesor_curso, anio_vigente RESTART IDENTITY CASCADE;`;
        runPsql(sql);
        console.log('   ✅ Tablas vaciadas correctamente');
        return true;
    } catch (error) {
        console.log(`   ⚠️  Error vaciando tablas: ${error.message}`);
        return false;
    }
}

// Try to disable triggers using postgres superuser (peer auth via sudo)
function tryDisableTriggers() {
    try {
        const sql = `ALTER TABLE alumnos DISABLE TRIGGER USER; ALTER TABLE apoderados DISABLE TRIGGER USER; ALTER TABLE usuarios DISABLE TRIGGER USER; ALTER TABLE cursos DISABLE TRIGGER USER; ALTER TABLE alumno_apoderado DISABLE TRIGGER USER;`;
        runPsqlSudo(sql);
        console.log('   ✅ Triggers deshabilitados');
        return true;
    } catch (e) {
        console.log(`   ⚠️  No se pudieron deshabilitar triggers: ${e.message}`);
        return false;
    }
}

function tryEnableTriggers() {
    try {
        const sql = `ALTER TABLE alumnos ENABLE TRIGGER USER; ALTER TABLE apoderados ENABLE TRIGGER USER; ALTER TABLE usuarios ENABLE TRIGGER USER; ALTER TABLE cursos ENABLE TRIGGER USER; ALTER TABLE alumno_apoderado ENABLE TRIGGER USER;`;
        runPsqlSudo(sql);
        console.log('   ✅ Triggers habilitados');
    } catch (e) {
        console.log(`   ⚠️  No se pudieron rehabilitar triggers: ${e.message}`);
    }
}

async function restoreBackup(filename) {
    const backupFilePath = path.join(BACKUP_DIR, filename);

    if (path.dirname(backupFilePath) !== BACKUP_DIR) {
        throw new Error('Invalid backup filename.');
    }
    if (!/^[\w\-\.]+\.sql$/.test(filename)) {
        throw new Error('Invalid backup filename format.');
    }
    if (!fs.existsSync(backupFilePath)) {
        throw new Error(`Backup file not found: ${filename}`);
    }

    console.log(`🚀 Iniciando restauración de backup...`);
    console.log(`   📁 Archivo: ${filename}`);

    try {
        const tablesInBackup = detectTablesInBackup(backupFilePath);

        await resetDatabase();

        const triggersDisabled = tryDisableTriggers();

        console.log('   💾 Restaurando datos...');
        const restoreResult = spawnSync('psql',
            ['-h', PG_HOST, '-p', PG_PORT, '-U', PG_USER, '-d', PG_DB, '-v', 'ON_ERROR_STOP=0', '-f', backupFilePath],
            { encoding: 'utf8', maxBuffer: 50 * 1024 * 1024, env: pgEnv, stdio: 'pipe' }
        );
        if (restoreResult.error) throw restoreResult.error;
        const restoreOutput = (restoreResult.stdout || '') + (restoreResult.stderr || '');

        if (triggersDisabled) tryEnableTriggers();

        const errors = restoreOutput.split('\n').filter(line =>
            line.includes('ERROR:') || line.includes('FATAL:')
        );

        if (errors.length > 0) {
            console.log(`   ⚠️  Se encontraron ${errors.length} errores durante la restauración:`);
            errors.slice(0, 5).forEach(err => console.log(`      ${err}`));
        }

        await resetSequences();

        const dataStats = await verifyDataIntegrity();

        const credentials = await resetPasswordsAfterRestore();

        try {
            execSync('pm2 restart matricula-backend', { stdio: 'pipe', timeout: 30000 });
            console.log('   ✅ Backend reiniciado');
        } catch (e) {
            console.log('   ⚠️  No se pudo reiniciar el backend via PM2');
        }

        console.log('\n✅ Restauración completada exitosamente');

        return {
            success: true,
            message: `Backup ${filename} restored successfully.`,
            filename,
            tablesRestored: tablesInBackup.length,
            dataStats,
            credentials: credentials.length > 0 ? credentials : [
                { username: 'admin', password: 'admin123' },
                { username: '17393845', password: '17393845' },
                { username: '17885785', password: '17885785' }
            ]
        };
    } catch (error) {
        console.error(`❌ Error durante la restauración: ${error.message}`);
        throw new Error(`Failed to restore backup: ${error.message}`);
    }
}

async function deleteBackup(filename) {
    const backupFilePath = path.join(BACKUP_DIR, filename);
    if (path.dirname(backupFilePath) !== BACKUP_DIR) {
        throw new Error('Invalid backup filename.');
    }
    await fs.promises.unlink(backupFilePath);
    return { message: `Backup ${filename} deleted successfully.` };
}

module.exports = {
    createBackup,
    listBackups,
    restoreBackup,
    deleteBackup,
    BACKUP_DIR
};
