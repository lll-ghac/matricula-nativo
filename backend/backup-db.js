#!/usr/bin/env node

/**
 * Script de Backup Automático de Base de Datos
 *
 * Crea una copia de seguridad de matricula.db con timestamp
 *
 * USO:
 *   node backend/backup-db.js              # Backup manual
 *   npm run backup                         # Usando npm script
 *
 * AUTOMATIZACIÓN (Linux/Mac con cron):
 *   0 2 * * * cd /ruta/proyecto && node backend/backup-db.js >> logs/backup.log 2>&1
 *
 * AUTOMATIZACIÓN (Windows Task Scheduler):
 *   Programa: node.exe
 *   Argumentos: C:\ruta\proyecto\backend\backup-db.js
 *   Frecuencia: Diaria 2:00 AM
 */

const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, '../matricula.db');
const BACKUP_DIR = path.join(__dirname, '../backups/diarios');
const MANTENER_DIAS = 30; // Mantener últimos 30 backups

// Crear directorio de backups si no existe
if (!fs.existsSync(BACKUP_DIR)) {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
  console.log(`📁 Directorio de backups creado: ${BACKUP_DIR}`);
}

function crearBackup() {
  console.log('═══════════════════════════════════════════════');
  console.log('💾 BACKUP AUTOMÁTICO DE BASE DE DATOS');
  console.log('═══════════════════════════════════════════════\n');

  const timestamp = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  const backupName = `matricula-${timestamp}.db`;
  const backupPath = path.join(BACKUP_DIR, backupName);

  try {
    // Verificar que la BD existe
    if (!fs.existsSync(DB_PATH)) {
      console.error('❌ ERROR: Base de datos no encontrada');
      console.error(`   Ruta esperada: ${DB_PATH}`);
      console.error('   ¿El servidor está en la ubicación correcta?');
      process.exit(1);
    }

    // Verificar si ya existe backup de hoy
    if (fs.existsSync(backupPath)) {
      console.log(`ℹ️  Ya existe backup de hoy: ${backupName}`);
      console.log('   Sobrescribiendo...');
    }

    // Copiar archivo
    console.log('📋 Copiando base de datos...');
    fs.copyFileSync(DB_PATH, backupPath);

    // Obtener información del backup
    const stats = fs.statSync(backupPath);
    const sizeMB = (stats.size / (1024 * 1024)).toFixed(2);

    console.log('\n✅ BACKUP CREADO EXITOSAMENTE');
    console.log(`   📁 Archivo: ${backupName}`);
    console.log(`   📊 Tamaño: ${sizeMB} MB`);
    console.log(`   📍 Ubicación: ${backupPath}`);
    console.log(`   📅 Fecha: ${new Date().toLocaleString('es-CL')}`);

    // Limpiar backups antiguos
    console.log(`\n🧹 Limpiando backups antiguos (mantener últimos ${MANTENER_DIAS})...`);
    limpiarBackupsAntiguos();

    console.log('\n✅ Proceso completado exitosamente\n');

  } catch (error) {
    console.error('\n❌ ERROR CREANDO BACKUP');
    console.error(`   ${error.message}`);
    console.error('\n💡 Posibles causas:');
    console.error('   - Falta de permisos de lectura/escritura');
    console.error('   - Base de datos en uso por otro proceso');
    console.error('   - Espacio en disco insuficiente');
    process.exit(1);
  }
}

function limpiarBackupsAntiguos() {
  try {
    const archivos = fs.readdirSync(BACKUP_DIR);
    const backups = archivos
      .filter(f => f.startsWith('matricula-') && f.endsWith('.db'))
      .map(f => ({
        nombre: f,
        path: path.join(BACKUP_DIR, f),
        fecha: fs.statSync(path.join(BACKUP_DIR, f)).mtime
      }))
      .sort((a, b) => b.fecha - a.fecha); // Más reciente primero

    console.log(`   📊 Total de backups encontrados: ${backups.length}`);

    if (backups.length > MANTENER_DIAS) {
      const eliminar = backups.slice(MANTENER_DIAS);
      console.log(`   🗑️  Eliminando ${eliminar.length} backups antiguos...`);

      eliminar.forEach(backup => {
        fs.unlinkSync(backup.path);
        console.log(`      - ${backup.nombre}`);
      });

      console.log(`   ✅ Backups mantenidos: ${MANTENER_DIAS}`);
    } else {
      console.log(`   ✅ No hay backups antiguos para eliminar`);
    }

  } catch (error) {
    console.warn(`   ⚠️  Error limpiando backups antiguos: ${error.message}`);
    console.warn('   (El backup actual se creó correctamente)');
  }
}

// Función para listar backups disponibles
function listarBackups() {
  console.log('═══════════════════════════════════════════════');
  console.log('📋 BACKUPS DISPONIBLES');
  console.log('═══════════════════════════════════════════════\n');

  try {
    const archivos = fs.readdirSync(BACKUP_DIR);
    const backups = archivos
      .filter(f => f.startsWith('matricula-') && f.endsWith('.db'))
      .map(f => ({
        nombre: f,
        path: path.join(BACKUP_DIR, f),
        fecha: fs.statSync(path.join(BACKUP_DIR, f)).mtime,
        tamano: fs.statSync(path.join(BACKUP_DIR, f)).size
      }))
      .sort((a, b) => b.fecha - a.fecha);

    if (backups.length === 0) {
      console.log('   ⚠️  No hay backups disponibles');
      console.log('   Ejecuta: npm run backup');
      return;
    }

    console.log(`Total: ${backups.length} backups\n`);

    backups.forEach((backup, i) => {
      const sizeMB = (backup.tamano / (1024 * 1024)).toFixed(2);
      const fechaFormato = backup.fecha.toLocaleString('es-CL');
      const marcador = i === 0 ? '👉 (más reciente)' : '';
      console.log(`${i + 1}. ${backup.nombre}`);
      console.log(`   📅 ${fechaFormato}  📊 ${sizeMB} MB  ${marcador}`);
      console.log('');
    });

    console.log('💡 Para restaurar un backup:');
    console.log(`   cp "${BACKUP_DIR}/matricula-YYYY-MM-DD.db" matricula.db`);
    console.log('');

  } catch (error) {
    console.error('❌ Error listando backups:', error.message);
  }
}

// Manejo de argumentos de línea de comandos
const args = process.argv.slice(2);

if (args.includes('--list') || args.includes('-l')) {
  listarBackups();
} else if (args.includes('--help') || args.includes('-h')) {
  console.log('USO: node backend/backup-db.js [opciones]');
  console.log('');
  console.log('Opciones:');
  console.log('  (sin opciones)  Crear backup de la base de datos');
  console.log('  --list, -l      Listar backups disponibles');
  console.log('  --help, -h      Mostrar esta ayuda');
  console.log('');
  console.log('Ejemplos:');
  console.log('  npm run backup           # Crear backup');
  console.log('  npm run backup -- --list # Listar backups');
} else {
  crearBackup();
}
