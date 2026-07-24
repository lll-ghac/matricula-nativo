/**
 * Sistema de Respaldo a Google Drive
 *
 * Características:
 * - Autenticación OAuth2 con Google
 * - Subida automática de respaldos
 * - Gestión de archivos antiguos (retención 90 días)
 * - Carpeta dedicada "Respaldos Matrícula Escolar"
 */

const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');

// Configuración de Google Drive
const SCOPES = ['https://www.googleapis.com/auth/drive.file'];
const CREDENTIALS_PATH = path.join(__dirname, '..', 'config', 'google-credentials.json');
const TOKEN_PATH = path.join(__dirname, '..', 'config', 'google-token.json');
const BACKUP_FOLDER_NAME = 'Respaldos Matrícula Escolar';

let drive = null;
let isConfigured = false;

/**
 * Verifica si Google Drive está configurado
 */
async function isGoogleDriveConfigured() {
  try {
    // Verificar que existan las credenciales
    if (!fs.existsSync(CREDENTIALS_PATH)) {
      return false;
    }

    // Verificar que exista el token (usuario autenticado)
    if (!fs.existsSync(TOKEN_PATH)) {
      return false;
    }

    // Intentar inicializar el cliente
    if (!drive) {
      await initializeDriveClient();
    }

    return isConfigured;

  } catch (error) {
    console.warn('   ⚠️  Google Drive no configurado:', error.message);
    return false;
  }
}

/**
 * Inicializa el cliente de Google Drive
 */
async function initializeDriveClient() {
  try {
    // Leer credenciales
    const credentials = JSON.parse(fs.readFileSync(CREDENTIALS_PATH, 'utf8'));
    const { client_secret, client_id, redirect_uris } = credentials.installed || credentials.web;

    // Crear cliente OAuth2
    const oAuth2Client = new google.auth.OAuth2(
      client_id,
      client_secret,
      redirect_uris[0]
    );

    // Leer token guardado
    if (fs.existsSync(TOKEN_PATH)) {
      const token = JSON.parse(fs.readFileSync(TOKEN_PATH, 'utf8'));
      oAuth2Client.setCredentials(token);
    } else {
      throw new Error('Token de autenticación no encontrado. Ejecute la configuración de Google Drive.');
    }

    // Crear cliente de Drive
    drive = google.drive({ version: 'v3', auth: oAuth2Client });
    isConfigured = true;

    console.log('   ✅ Cliente de Google Drive inicializado');

  } catch (error) {
    console.error('   ❌ Error inicializando Google Drive:', error.message);
    isConfigured = false;
    throw error;
  }
}

/**
 * Obtiene o crea la carpeta de respaldos en Google Drive
 */
async function getOrCreateBackupFolder() {
  try {
    if (!drive) {
      await initializeDriveClient();
    }

    // Buscar carpeta existente
    const response = await drive.files.list({
      q: `name='${BACKUP_FOLDER_NAME}' and mimeType='application/vnd.google-apps.folder' and trashed=false`,
      fields: 'files(id, name)',
      spaces: 'drive'
    });

    // Si existe, devolver ID
    if (response.data.files && response.data.files.length > 0) {
      return response.data.files[0].id;
    }

    // Si no existe, crear carpeta
    const folderMetadata = {
      name: BACKUP_FOLDER_NAME,
      mimeType: 'application/vnd.google-apps.folder'
    };

    const folder = await drive.files.create({
      resource: folderMetadata,
      fields: 'id'
    });

    console.log(`   ✅ Carpeta creada en Google Drive: ${BACKUP_FOLDER_NAME}`);
    return folder.data.id;

  } catch (error) {
    console.error('   ❌ Error obteniendo/creando carpeta:', error.message);
    throw error;
  }
}

/**
 * Sube un archivo de respaldo a Google Drive
 */
async function uploadToGoogleDrive(localFilePath) {
  try {
    if (!drive) {
      await initializeDriveClient();
    }

    if (!fs.existsSync(localFilePath)) {
      throw new Error(`Archivo no encontrado: ${localFilePath}`);
    }

    // Obtener carpeta de respaldos
    const folderId = await getOrCreateBackupFolder();

    // Preparar metadata del archivo
    const fileName = path.basename(localFilePath);
    const fileMetadata = {
      name: fileName,
      parents: [folderId]
    };

    // Preparar contenido del archivo
    const media = {
      mimeType: 'application/gzip',
      body: fs.createReadStream(localFilePath)
    };

    // Subir archivo
    console.log(`      Subiendo ${fileName}...`);
    const response = await drive.files.create({
      resource: fileMetadata,
      media: media,
      fields: 'id, name, size, createdTime'
    });

    const sizeMB = (response.data.size / (1024 * 1024)).toFixed(2);
    console.log(`      ✅ Subido: ${response.data.name} (${sizeMB} MB)`);

    // Limpiar archivos antiguos en Drive (retención 90 días)
    await cleanOldDriveBackups(folderId);

    return response.data.id;

  } catch (error) {
    console.error('   ❌ Error subiendo a Google Drive:', error.message);
    throw error;
  }
}

/**
 * Limpia respaldos antiguos en Google Drive (retención 90 días)
 */
async function cleanOldDriveBackups(folderId) {
  try {
    const RETENTION_DAYS = 90;
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - RETENTION_DAYS);

    // Listar archivos en la carpeta de respaldos
    const response = await drive.files.list({
      q: `'${folderId}' in parents and trashed=false`,
      fields: 'files(id, name, createdTime)',
      orderBy: 'createdTime desc'
    });

    const files = response.data.files || [];
    let deletedCount = 0;

    for (const file of files) {
      const fileDate = new Date(file.createdTime);

      if (fileDate < cutoffDate) {
        await drive.files.delete({ fileId: file.id });
        deletedCount++;
        console.log(`      - Eliminado de Drive: ${file.name}`);
      }
    }

    if (deletedCount > 0) {
      console.log(`   ✅ Eliminados ${deletedCount} respaldos antiguos de Drive (>${RETENTION_DAYS} días)`);
    }

  } catch (error) {
    console.warn(`   ⚠️  Error limpiando respaldos antiguos de Drive: ${error.message}`);
  }
}

/**
 * Lista todos los respaldos en Google Drive
 */
async function listDriveBackups() {
  try {
    if (!drive) {
      await initializeDriveClient();
    }

    const folderId = await getOrCreateBackupFolder();

    const response = await drive.files.list({
      q: `'${folderId}' in parents and trashed=false`,
      fields: 'files(id, name, size, createdTime, modifiedTime)',
      orderBy: 'createdTime desc'
    });

    const files = response.data.files || [];

    return files.map(file => ({
      id: file.id,
      name: file.name,
      size: file.size,
      createdAt: file.createdTime,
      modifiedAt: file.modifiedTime
    }));

  } catch (error) {
    console.error('❌ Error listando respaldos de Drive:', error.message);
    throw error;
  }
}

/**
 * Descarga un respaldo desde Google Drive
 */
async function downloadFromGoogleDrive(fileId, destinationPath) {
  try {
    if (!drive) {
      await initializeDriveClient();
    }

    const dest = fs.createWriteStream(destinationPath);

    const response = await drive.files.get(
      { fileId: fileId, alt: 'media' },
      { responseType: 'stream' }
    );

    return new Promise((resolve, reject) => {
      response.data
        .on('end', () => {
          console.log(`✅ Descargado desde Google Drive: ${path.basename(destinationPath)}`);
          resolve(destinationPath);
        })
        .on('error', err => {
          console.error('❌ Error descargando:', err);
          reject(err);
        })
        .pipe(dest);
    });

  } catch (error) {
    console.error('❌ Error descargando de Google Drive:', error.message);
    throw error;
  }
}

/**
 * Elimina un respaldo de Google Drive
 */
async function deleteFromGoogleDrive(fileId) {
  try {
    if (!drive) {
      await initializeDriveClient();
    }

    await drive.files.delete({ fileId: fileId });
    console.log(`✅ Eliminado de Google Drive: ${fileId}`);

    return { success: true };

  } catch (error) {
    console.error('❌ Error eliminando de Google Drive:', error.message);
    throw error;
  }
}

/**
 * Genera URL de autenticación para OAuth2
 */
function generateAuthUrl() {
  try {
    const credentials = JSON.parse(fs.readFileSync(CREDENTIALS_PATH, 'utf8'));
    const { client_secret, client_id, redirect_uris } = credentials.installed || credentials.web;

    const oAuth2Client = new google.auth.OAuth2(
      client_id,
      client_secret,
      redirect_uris[0]
    );

    const authUrl = oAuth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: SCOPES,
    });

    return authUrl;

  } catch (error) {
    console.error('❌ Error generando URL de autenticación:', error.message);
    throw error;
  }
}

/**
 * Guarda el token de autenticación desde el código de autorización
 */
async function saveAuthToken(code) {
  try {
    const credentials = JSON.parse(fs.readFileSync(CREDENTIALS_PATH, 'utf8'));
    const { client_secret, client_id, redirect_uris } = credentials.installed || credentials.web;

    const oAuth2Client = new google.auth.OAuth2(
      client_id,
      client_secret,
      redirect_uris[0]
    );

    const { tokens } = await oAuth2Client.getToken(code);
    fs.writeFileSync(TOKEN_PATH, JSON.stringify(tokens, null, 2));

    console.log('✅ Token de autenticación guardado correctamente');

    // Reinicializar cliente
    await initializeDriveClient();

    return { success: true };

  } catch (error) {
    console.error('❌ Error guardando token:', error.message);
    throw error;
  }
}

module.exports = {
  isGoogleDriveConfigured,
  uploadToGoogleDrive,
  listDriveBackups,
  downloadFromGoogleDrive,
  deleteFromGoogleDrive,
  generateAuthUrl,
  saveAuthToken
};
