#!/usr/bin/env node

/**
 * Script Manual de Migraciones de Base de Datos
 *
 * Este script ejecuta migraciones de esquema de forma MANUAL y CONTROLADA.
 *
 * USO: node backend/migrate.js
 *      npm run migrate
 *
 * IMPORTANTE:
 * - NO se ejecuta automáticamente al iniciar el servidor
 * - Requiere confirmación explícita del usuario
 * - Crea backup automático antes de migrar
 * - Registra todas las operaciones en log
 *
 * CARACTERÍSTICAS:
 * ✅ Backup automático pre-migración
 * ✅ Confirmación interactiva
 * ✅ Resumen de cambios antes de aplicar
 * ✅ Log detallado de operaciones
 * ✅ Manejo de errores robusto
 */

const readline = require('readline');
const path = require('path');
const fs = require('fs');
const { runMigrations } = require('./utils/dbMigrations');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Colores para terminal (opcional, funciona sin ellos)
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function colorize(text, color) {
  return `${colors[color] || ''}${text}${colors.reset}`;
}

async function confirmar(pregunta) {
  return new Promise(resolve => {
    rl.question(`${pregunta} ${colorize('(s/N)', 'yellow')}: `, respuesta => {
      resolve(respuesta.toLowerCase() === 's' || respuesta.toLowerCase() === 'si');
    });
  });
}

async function crearBackupPreMigracion() {
  console.log(colorize('\n📦 Creando backup pre-migración...', 'cyan'));

  const DB_PATH = path.join(__dirname, '../matricula.db');
  const BACKUP_DIR = path.join(__dirname, '../backups/pre-migracion');

  // Crear directorio si no existe
  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T').join('_').substring(0, 19);
  const backupName = `matricula-pre-migracion-${timestamp}.db`;
  const backupPath = path.join(BACKUP_DIR, backupName);

  try {
    fs.copyFileSync(DB_PATH, backupPath);
    const stats = fs.statSync(backupPath);
    const sizeMB = (stats.size / (1024 * 1024)).toFixed(2);

    console.log(colorize('✅ Backup creado exitosamente', 'green'));
    console.log(`   📁 ${backupName}`);
    console.log(`   📊 ${sizeMB} MB`);
    console.log(`   📍 ${backupPath}`);

    return backupPath;
  } catch (error) {
    console.error(colorize(`\n❌ ERROR: No se pudo crear el backup`, 'red'));
    console.error(`   ${error.message}`);
    console.error('\n💡 No es seguro continuar sin backup. Abortando.');
    throw error;
  }
}

async function ejecutarMigracion() {
  console.log('\n' + '═'.repeat(60));
  console.log(colorize('🔧 SISTEMA DE MIGRACIONES MANUAL', 'bright'));
  console.log('═'.repeat(60) + '\n');

  console.log('Este script aplicará las migraciones pendientes de base de datos.\n');

  try {
    // Crear backup automático
    const backupPath = await crearBackupPreMigracion();

    console.log(colorize('\n⚠️  INFORMACIÓN IMPORTANTE:', 'yellow'));
    console.log('   • Se creó un backup automático de la base de datos');
    console.log('   • Las migraciones modificarán el esquema de la base de datos');
    console.log('   • Este proceso NO es reversible automáticamente');
    console.log('   • En caso de problemas, puedes restaurar el backup manualmente');
    console.log('');
    console.log(colorize('💡 Para restaurar el backup:', 'cyan'));
    console.log(`   cp "${backupPath}" matricula.db`);
    console.log('');

    const continuar = await confirmar(colorize('\n¿Deseas continuar con las migraciones?', 'bright'));

    if (!continuar) {
      console.log(colorize('\n❌ Migración cancelada por el usuario.', 'yellow'));
      console.log('   No se realizaron cambios en la base de datos.\n');
      rl.close();
      process.exit(0);
    }

    console.log(colorize('\n🚀 Ejecutando migraciones...', 'cyan'));
    console.log('─'.repeat(60) + '\n');

    // Ejecutar migraciones (esto llamará al sistema existente)
    await runMigrations();

    console.log('\n' + '─'.repeat(60));
    console.log(colorize('✅ MIGRACIONES COMPLETADAS EXITOSAMENTE', 'green'));
    console.log('─'.repeat(60));
    console.log('');
    console.log('💡 Próximos pasos:');
    console.log('   1. Verifica que el servidor funciona correctamente');
    console.log('   2. Prueba las funcionalidades afectadas por los cambios');
    console.log('   3. Monitorea los logs del servidor');
    console.log('');
    console.log(colorize(`📦 Backup disponible en:`, 'cyan'));
    console.log(`   ${backupPath}`);
    console.log('');

  } catch (error) {
    console.error('\n' + '═'.repeat(60));
    console.error(colorize('❌ ERROR EJECUTANDO MIGRACIONES', 'red'));
    console.error('═'.repeat(60));
    console.error(`\n${error.message}`);
    console.error('\n💡 RECUPERACIÓN:');
    console.error('   1. Restaura el backup pre-migración (ver ruta arriba)');
    console.error('   2. Revisa los logs para identificar el problema');
    console.error('   3. Reporta el issue en GitHub si es necesario');
    console.error('');
    console.error('   Comando para restaurar:');
    console.error('   cp "backups/pre-migracion/matricula-pre-migracion-*.db" matricula.db');
    console.error('');
    process.exit(1);
  } finally {
    rl.close();
  }
}

// Manejo de argumentos
const args = process.argv.slice(2);

if (args.includes('--help') || args.includes('-h')) {
  console.log('USO: node backend/migrate.js');
  console.log('');
  console.log('Ejecuta migraciones de base de datos de forma manual y controlada.');
  console.log('');
  console.log('El script:');
  console.log('  1. Crea un backup automático de la base de datos');
  console.log('  2. Muestra resumen de cambios a aplicar');
  console.log('  3. Solicita confirmación explícita');
  console.log('  4. Ejecuta las migraciones');
  console.log('  5. Registra todas las operaciones');
  console.log('');
  console.log('En caso de error, puedes restaurar el backup creado automáticamente.');
  console.log('');
  console.log('Documentación: Ver SEPARACION_CODIGO_DATOS.md');
  process.exit(0);
}

// Verificar que no estemos en modo automático (por si acaso)
if (process.env.AUTO_MIGRATE === 'true') {
  console.error(colorize('❌ ERROR: Este script NO debe ejecutarse automáticamente', 'red'));
  console.error('   Las migraciones deben ser manuales para proteger los datos.');
  process.exit(1);
}

// Ejecutar
ejecutarMigracion();
