/**
 * Endpoints de Configuración de Respaldos
 *
 * Permite configurar:
 * - Horarios de respaldo automático
 * - Integración con Google Drive
 * - Ejecución manual de respaldos
 */

const express = require('express');
const router = express.Router();
const {
  updateBackupSchedules,
  getBackupSchedules,
  executeManualBackup
} = require('../utils/backupScheduler');
const {
  generateAuthUrl,
  saveAuthToken,
  isGoogleDriveConfigured,
  listDriveBackups,
  deleteFromGoogleDrive
} = require('../utils/googleDriveBackup');

// GET /api/admin/backup-config/schedules - Obtener horarios configurados
router.get('/schedules', async (req, res) => {
  try {
    const config = getBackupSchedules();
    res.status(200).json({
      success: true,
      data: config
    });
  } catch (error) {
    console.error('Error obteniendo configuración:', error);
    res.status(500).json({
      success: false,
      message: 'Error obteniendo configuración de respaldos',
      error: error.message
    });
  }
});

// POST /api/admin/backup-config/schedules - Actualizar horarios
router.post('/schedules', async (req, res) => {
  try {
    const { schedules } = req.body;

    if (!schedules || !Array.isArray(schedules)) {
      return res.status(400).json({
        success: false,
        message: 'Se requiere un array de horarios'
      });
    }

    const result = await updateBackupSchedules(schedules);

    res.status(200).json({
      success: true,
      message: 'Horarios actualizados correctamente',
      data: result
    });

  } catch (error) {
    console.error('Error actualizando horarios:', error);
    res.status(500).json({
      success: false,
      message: 'Error actualizando horarios',
      error: error.message
    });
  }
});

// POST /api/admin/backup-config/execute - Ejecutar respaldo manual
router.post('/execute', async (req, res) => {
  try {
    // Ejecutar en segundo plano
    executeManualBackup().catch(err => {
      console.error('Error en respaldo manual:', err);
    });

    res.status(202).json({
      success: true,
      message: 'Respaldo manual iniciado. Esto puede tomar varios minutos.'
    });

  } catch (error) {
    console.error('Error iniciando respaldo manual:', error);
    res.status(500).json({
      success: false,
      message: 'Error iniciando respaldo manual',
      error: error.message
    });
  }
});

// GET /api/admin/backup-config/gdrive/status - Verificar estado de Google Drive
router.get('/gdrive/status', async (req, res) => {
  try {
    const configured = await isGoogleDriveConfigured();

    res.status(200).json({
      success: true,
      data: {
        configured: configured,
        message: configured
          ? 'Google Drive está configurado y listo'
          : 'Google Drive no está configurado'
      }
    });

  } catch (error) {
    console.error('Error verificando Google Drive:', error);
    res.status(500).json({
      success: false,
      message: 'Error verificando estado de Google Drive',
      error: error.message
    });
  }
});

// GET /api/admin/backup-config/gdrive/auth-url - Obtener URL de autenticación
router.get('/gdrive/auth-url', async (req, res) => {
  try {
    const authUrl = generateAuthUrl();

    res.status(200).json({
      success: true,
      data: {
        authUrl: authUrl,
        instructions: [
          '1. Abra la URL en su navegador',
          '2. Autorice la aplicación en su cuenta de Google',
          '3. Copie el código de autorización',
          '4. Envíe el código al endpoint /gdrive/save-token'
        ]
      }
    });

  } catch (error) {
    console.error('Error generando URL de autenticación:', error);
    res.status(500).json({
      success: false,
      message: 'Error generando URL de autenticación. Verifique que google-credentials.json exista.',
      error: error.message
    });
  }
});

// POST /api/admin/backup-config/gdrive/save-token - Guardar token de autenticación
router.post('/gdrive/save-token', async (req, res) => {
  try {
    const { code } = req.body;

    if (!code) {
      return res.status(400).json({
        success: false,
        message: 'Se requiere el código de autorización'
      });
    }

    await saveAuthToken(code);

    res.status(200).json({
      success: true,
      message: 'Google Drive configurado exitosamente. Los respaldos automáticos ahora se subirán a Drive.'
    });

  } catch (error) {
    console.error('Error guardando token:', error);
    res.status(500).json({
      success: false,
      message: 'Error guardando token de autenticación',
      error: error.message
    });
  }
});

// GET /api/admin/backup-config/gdrive/backups - Listar respaldos en Google Drive
router.get('/gdrive/backups', async (req, res) => {
  try {
    const configured = await isGoogleDriveConfigured();

    if (!configured) {
      return res.status(400).json({
        success: false,
        message: 'Google Drive no está configurado'
      });
    }

    const backups = await listDriveBackups();

    res.status(200).json({
      success: true,
      data: backups
    });

  } catch (error) {
    console.error('Error listando respaldos de Drive:', error);
    res.status(500).json({
      success: false,
      message: 'Error listando respaldos de Google Drive',
      error: error.message
    });
  }
});

// DELETE /api/admin/backup-config/gdrive/backups/:fileId - Eliminar respaldo de Google Drive
router.delete('/gdrive/backups/:fileId', async (req, res) => {
  try {
    const { fileId } = req.params;

    if (!fileId) {
      return res.status(400).json({
        success: false,
        message: 'Se requiere el ID del archivo'
      });
    }

    await deleteFromGoogleDrive(fileId);

    res.status(200).json({
      success: true,
      message: 'Respaldo eliminado de Google Drive exitosamente'
    });

  } catch (error) {
    console.error('Error eliminando respaldo de Drive:', error);
    res.status(500).json({
      success: false,
      message: 'Error eliminando respaldo de Google Drive',
      error: error.message
    });
  }
});

module.exports = router;
