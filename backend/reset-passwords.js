#!/usr/bin/env node

/**
 * Script de emergencia para resetear contraseñas de usuarios administradores.
 * Usar en recuperación de acceso. Ejecutar desde /opt/matricula-e79/backend/
 *
 * Uso: node reset-passwords.js
 */

const { spawnSync } = require('child_process');
const bcrypt = require('bcryptjs');
const path = require('path');

require('dotenv').config({ path: path.join(__dirname, '.env') });

const PG_HOST = process.env.DB_HOST || 'localhost';
const PG_PORT = process.env.DB_PORT || '5432';
const PG_DB   = process.env.DB_NAME || 'matricula';
const PG_USER = process.env.DB_USER || 'matricula_app';
const PG_PASS = process.env.DB_PASSWORD || '';

const pgEnv = { ...process.env, PGPASSWORD: PG_PASS };

const USERS_TO_RESET = [
  { username: 'admin',    password: 'admin123'  },
  { username: '17393845', password: '17393845'  },
  { username: '17885785', password: '17885785'  }
];

function runPsql(sql) {
    const result = spawnSync('psql',
        ['-h', PG_HOST, '-p', PG_PORT, '-U', PG_USER, '-d', PG_DB, '-c', sql],
        { encoding: 'utf8', env: pgEnv, stdio: 'pipe' }
    );
    if (result.error) throw result.error;
    return result;
}

async function resetPasswords() {
    console.log('🔐 Reseteando contraseñas de usuarios...\n');

    for (const user of USERS_TO_RESET) {
        console.log(`   👤 Usuario: ${user.username}`);
        const hash = await bcrypt.hash(user.password, 10);
        // hash bcrypt usa solo [./A-Za-z0-9$] — sin riesgo de inyección SQL
        const sql = `UPDATE usuarios SET password_hash = '${hash}' WHERE username = '${user.username}';`;
        const result = runPsql(sql);
        if (result.status === 0) {
            console.log(`   ✅ Contraseña reseteada → ${user.password}\n`);
        } else {
            console.error(`   ❌ Error: ${result.stderr?.trim()}\n`);
        }
    }

    console.log('═══════════════════════════════════════');
    console.log('📋 CREDENCIALES RESETEADAS:');
    console.log('═══════════════════════════════════════');
    USERS_TO_RESET.forEach(u => console.log(`   ${u.username} → ${u.password}`));
    console.log('═══════════════════════════════════════');
}

resetPasswords().catch(err => {
    console.error('❌ Error fatal:', err);
    process.exit(1);
});
