/**
 * Sistema de Respaldo Automático Programado
 *
 * Características:
 * - Respaldos automáticos en horarios configurables
 * - Respaldo local (siempre)
 * - Respaldo a Google Drive (opcional)
 * - Retención de respaldos (30 días local, 90 días Drive)
 * - Notificaciones de éxito/error
 */

const cron = require('node-cron');
const { createBackup, BACKUP_DIR } = require('./postgresBackup');
const { uploadToGoogleDrive, isGoogleDriveConfigured } = require('./googleDriveBackup');
const fs = require('fs');
const path = require('path');

// Configuración por defecto (puede ser sobrescrita desde la DB)
let backupSchedules = [
  { time: '30 13 * * *', enabled: true, description: 'Respaldo diario 13:30' },  // 13:30 todos los días
  { time: '0 21 * * *', enabled: true, description: 'Respaldo diario 21:00' }   // 21:00 todos los días
];

let tasks = [];
let googleDriveEnabled = false;

/**
 * Inicializa el sistema de respaldos automáticos
 */
async function initializeBackupScheduler() {
  console.log('\n🔄 INICIALIZANDO SISTEMA DE RESPALDOS AUTOMÁTICOS');
  console.log('='.repeat(60));

  try {
    // Verificar si Google Drive está configurado
    googleDriveEnabled = await isGoogleDriveConfigured();

    // Cargar configuración desde la base de datos
    await loadScheduleConfiguration();

    // Programar tareas
    scheduleBackupTasks();

    console.log('\n✅ Sistema de respaldos automáticos iniciado correctamente');
    console.log(`   📅 Horarios programados: ${backupSchedules.filter(s => s.enabled).length}`);
    console.log(`   📁 Respaldo local: ACTIVO`);
    console.log(`   ☁️  Respaldo Google Drive: ${googleDriveEnabled ? 'ACTIVO' : 'INACTIVO'}`);
    console.log('='.repeat(60) + '\n');

  } catch (error) {
    console.error('❌ Error inicializando sistema de respaldos:', error.message);
  }
}

/**
 * Carga la configuración de horarios (usa horarios por defecto)
 */
async function loadScheduleConfiguration() {
  console.log('   ℹ️  Usando horarios por defecto (13:30 y 21:00)');
}

/**
 * Programa las tareas de respaldo según los horarios configurados
 */
function scheduleBackupTasks() {
  // Detener tareas existentes
  tasks.forEach(task => task.stop());
  tasks = [];

  // Crear nuevas tareas
  backupSchedules.forEach((schedule, index) => {
    if (!schedule.enabled) {
      console.log(`   ⏸️  Tarea ${index + 1} deshabilitada: ${schedule.description}`);
      return;
    }

    try {
      const task = cron.schedule(schedule.time, async () => {
        console.log(`\n⏰ [${new Date().toLocaleString('es-CL')}] Ejecutando respaldo programado: ${schedule.description}`);
        await executeScheduledBackup();
      }, {
        scheduled: true,
        timezone: "America/Santiago"  // Zona horaria de Chile
      });

      tasks.push(task);
      console.log(`   ✅ Tarea ${index + 1} programada: ${schedule.description} (${schedule.time})`);

    } catch (error) {
      console.error(`   ❌ Error programando tarea ${index + 1}:`, error.message);
    }
  });
}

/**
 * Ejecuta el respaldo programado (local + Google Drive si está habilitado)
 */
async function executeScheduledBackup() {
  const startTime = Date.now();

  try {
    // PASO 1: Crear respaldo local
    console.log('   📦 Paso 1/3: Creando respaldo local...');
    const backupFilePath = await createBackup();
    console.log(`   ✅ Respaldo local creado: ${path.basename(backupFilePath)}`);

    // PASO 2: Subir a Google Drive (si está habilitado)
    if (googleDriveEnabled) {
      try {
        console.log('   ☁️  Paso 2/3: Subiendo a Google Drive...');
        const driveFileId = await uploadToGoogleDrive(backupFilePath);
        console.log(`   ✅ Subido a Google Drive: ${driveFileId}`);
      } catch (driveError) {
        console.error('   ⚠️  Error subiendo a Google Drive:', driveError.message);
        // Continuar aunque falle Google Drive
      }
    } else {
      console.log('   ⏭️  Paso 2/3: Google Drive no configurado, omitiendo...');
    }

    // PASO 3: Limpiar respaldos antiguos
    console.log('   🧹 Paso 3/3: Limpiando respaldos antiguos...');
    await cleanOldBackups();

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`   ✅ Respaldo automático completado en ${duration}s\n`);

    // Registrar evento en la base de datos
    await logBackupEvent('success', {
      backupFile: path.basename(backupFilePath),
      duration: duration,
      googleDrive: googleDriveEnabled
    });

  } catch (error) {
    console.error(`   ❌ Error en respaldo automático: ${error.message}\n`);

    // Registrar error en la base de datos
    await logBackupEvent('error', {
      error: error.message,
      stack: error.stack
    });
  }
}

/**
 * Limpia respaldos antiguos (mantiene últimos 30 días local)
 */
async function cleanOldBackups() {
  try {
    const RETENTION_DAYS = 30;
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - RETENTION_DAYS);

    const files = await fs.promises.readdir(BACKUP_DIR);
    // Solo backups automáticos (matricula_YYYY-MM-DD_*.sql) — no tocar pre-ops ni dumps manuales
    const backupFiles = files.filter(file => file.startsWith('matricula_') && file.endsWith('.sql'));

    let deletedCount = 0;

    for (const file of backupFiles) {
      const filePath = path.join(BACKUP_DIR, file);
      const stats = await fs.promises.stat(filePath);

      if (stats.mtime < cutoffDate) {
        await fs.promises.unlink(filePath);
        deletedCount++;
        console.log(`      - Eliminado: ${file}`);
      }
    }

    if (deletedCount > 0) {
      console.log(`   ✅ Eliminados ${deletedCount} respaldos antiguos (>${RETENTION_DAYS} días)`);
    } else {
      console.log(`   ✅ No hay respaldos antiguos para eliminar`);
    }

  } catch (error) {
    console.warn(`   ⚠️  Error limpiando respaldos antiguos: ${error.message}`);
  }
}

/**
 * Registra evento de respaldo en el log de consola
 */
async function logBackupEvent(status, details) {
  const timestamp = new Date().toISOString();
  console.log(`   📋 [${timestamp}] Evento backup: ${status}`, JSON.stringify(details));
}

/**
 * Actualiza la configuración de horarios de respaldo (en memoria)
 */
async function updateBackupSchedules(newSchedules) {
  try {
    if (!Array.isArray(newSchedules)) {
      throw new Error('Los horarios deben ser un array');
    }

    for (const schedule of newSchedules) {
      if (!schedule.time || !cron.validate(schedule.time)) {
        throw new Error(`Formato de cron inválido: ${schedule.time}`);
      }
    }

    backupSchedules = newSchedules;
    scheduleBackupTasks();

    console.log('✅ Horarios de respaldo actualizados correctamente');
    return { success: true, schedules: backupSchedules };

  } catch (error) {
    console.error('❌ Error actualizando horarios:', error.message);
    throw error;
  }
}

/**
 * Obtiene la configuración actual de horarios
 */
function getBackupSchedules() {
  return {
    schedules: backupSchedules,
    googleDriveEnabled: googleDriveEnabled,
    activeTasks: tasks.length
  };
}

/**
 * Ejecuta un respaldo manual (inmediato)
 */
async function executeManualBackup() {
  console.log('\n🔧 Ejecutando respaldo manual...\n');
  await executeScheduledBackup();
}

/**
 * Detiene todas las tareas programadas
 */
function stopAllTasks() {
  tasks.forEach(task => task.stop());
  tasks = [];
  console.log('⏸️  Todas las tareas de respaldo detenidas');
}

module.exports = {
  initializeBackupScheduler,
  updateBackupSchedules,
  getBackupSchedules,
  executeManualBackup,
  stopAllTasks
};
