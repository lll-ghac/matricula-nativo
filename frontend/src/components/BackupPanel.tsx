import React, { useState, useEffect, useRef } from 'react';
import { Database, Download, Plus, Trash2, Clock, RefreshCw, AlertCircle, RotateCcw, Upload, FileText, ExternalLink, Key } from 'lucide-react';
import { useToast } from '../context/ToastContext';
import { useConfirm } from '../context/ConfirmContext';

interface BackupData {
  filename: string;
  size: number;
  createdAt: string;
}

// The stats interface is kept for structure, but the functionality will be disabled for now.
interface BackupStats {
  backups: {
    total: number;
    totalSize: number;
    totalSizeFormatted: string;
    oldest: string | null;
    newest: string | null;
  };
  database: {
    path: string;
    exists: boolean;
    size: number;
    sizeFormatted: string;
    modified: string | null;
  };
  system: {
    backupsDir: string;
    uptime: number;
    memory: any;
  };
}

const BackupPanel: React.FC = () => {
  const toast = useToast();
  const confirm = useConfirm();
  const [backups, setBackups] = useState<BackupData[]>([]);
  const [stats] = useState<BackupStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [restoring] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchBackups = async () => {
    try {
      const response = await fetch('/api/admin/backup/list', {
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        setBackups(data);
      } else {
        if (response.status === 401) {
          throw new Error('No tienes permisos para acceder a los respaldos. Solo administradores pueden ver esta sección.');
        } else if (response.status === 403) {
          throw new Error('Acceso denegado. Esta función requiere permisos de administrador.');
        } else if (response.status === 404) {
          throw new Error('Endpoint de respaldos no encontrado. Verifica que el servidor esté actualizado.');
        } else {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.message || `Error del servidor: ${response.status}`);
        }
      }
    } catch (error) {
      console.error('Error fetching backups:', error);
      setError(error instanceof Error ? error.message : 'Error cargando la lista de respaldos');
    }
  };

  const loadData = async () => {
    setLoading(true);
    setError(null);
    console.log('🔄 Cargando datos de respaldos...');
    try {
      await fetchBackups();
      console.log('✅ Datos de respaldos cargados exitosamente');
    } catch (error) {
      console.error('❌ Error cargando datos de respaldos:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('es-CL', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleCreateBackup = async () => {
    setCreating(true);
    try {
      const response = await fetch('/api/admin/backup/create', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        toast.success(`✅ Respaldo de PostgreSQL creado exitosamente: ${data.filename}`);
        await loadData(); // Recargar la lista
      } else {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Error creando respaldo');
      }
    } catch (error) {
      console.error('Error creating backup:', error);
      toast.error(`❌ Error: ${error instanceof Error ? error.message : 'Error desconocido'}`);
    } finally {
      setCreating(false);
    }
  };

  const handleDownload = (filename: string) => {
    window.location.href = `/api/admin/backup/download/${filename}`;
    console.log(`📥 Iniciando descarga: ${filename}`);
  };

  const handleDelete = async (filename: string) => {
    if (!(await confirm(`¿Está seguro de que desea eliminar el respaldo "${filename}"?\n\nEsta acción no se puede deshacer.`))) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/backup/delete/${filename}`, {
        method: 'DELETE',
        credentials: 'include'
      });

      if (response.ok) {
        toast.success('✅ Respaldo eliminado exitosamente');
        await loadData(); // Recargar la lista
      } else {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Error eliminando respaldo');
      }
    } catch (error) {
      console.error('Error deleting backup:', error);
      toast.error(`❌ Error: ${error instanceof Error ? error.message : 'Error desconocido'}`);
    }
  };

  const handleRestore = async (_filename: string) => {
    toast.info('La restauración desde PostgreSQL aún no está implementada.');
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validar nombre de archivo
    if (!file.name.match(/^backup_matricula_[\d\-_]+\.zip$/)) {
      toast.error('❌ Nombre de archivo inválido.\n\nEl archivo debe tener el formato: backup_matricula_YYYYMMDD_HHMMSS.zip');
      event.target.value = '';
      return;
    }

    // Validar tamaño (100MB)
    if (file.size > 100 * 1024 * 1024) {
      toast.error('❌ El archivo es demasiado grande.\n\nTamaño máximo permitido: 100MB');
      event.target.value = '';
      return;
    }

    const confirmUpload = (await confirm(
      `¿Desea subir el siguiente respaldo al servidor?\n\n` +
      `Archivo: ${file.name}\n` +
      `Tamaño: ${(file.size / 1024 / 1024).toFixed(2)} MB\n\n` +
      `El archivo será validado y guardado en el directorio de respaldos.`
    ));

    if (!confirmUpload) {
      event.target.value = '';
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('backupFile', file);

      const response = await fetch('/api/admin/backup/upload', {
        method: 'POST',
        credentials: 'include',
        body: formData
      });

      if (response.ok) {
        const data = await response.json();
        toast.success(
          `✅ ¡Respaldo subido exitosamente!\n\n` +
          `Archivo: ${data.filename}\n` +
          `Tamaño: ${data.sizeFormatted}\n\n` +
          `El respaldo está ahora disponible en la lista y puede ser restaurado cuando lo necesite.`
        );
        await loadData(); // Recargar la lista de respaldos
      } else {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Error subiendo respaldo');
      }
    } catch (error) {
      console.error('Error uploading backup:', error);
      toast.error(`❌ Error subiendo respaldo:\n\n${error instanceof Error ? error.message : 'Error desconocido'}`);
    } finally {
      setUploading(false);
      event.target.value = ''; // Limpiar el input
    }
  };

  const handleDownloadDocumentation = () => {
    const documentation = `
═══════════════════════════════════════════════════════════════
     SISTEMA DE RESTAURACIÓN DE RESPALDOS
     Sistema de Matrícula Escolar - PostgreSQL
═══════════════════════════════════════════════════════════════

📅 FECHA: ${new Date().toLocaleDateString('es-CL')}
🔧 VERSIÓN: 1.0
📄 DOCUMENTO: Guía de uso del sistema de restauración

───────────────────────────────────────────────────────────────
  1. ACCESO AL SISTEMA DE RESTAURACIÓN
───────────────────────────────────────────────────────────────

🌐 URL de Acceso (solo red local del colegio):
   • http://192.16.1.14:5180

🔐 CREDENCIALES DE ACCESO:
   • Configuradas por el administrador del sistema.
   • Ver tools/restore-app/server/.env (o consultar al admin).

⚠️  IMPORTANTE: Este acceso está restringido a la red LAN del
    colegio (192.16.1.0/24) por configuración de nginx.

───────────────────────────────────────────────────────────────
  2. ¿CÓMO USAR EL SISTEMA DE RESTAURACIÓN?
───────────────────────────────────────────────────────────────

El servicio ya está corriendo permanentemente (PM2, proceso
"restore-app", con autostart configurado). No hace falta
iniciar nada manualmente.

PASO 1: Acceder a la interfaz web
   Abrir navegador en: http://192.16.1.14:5180

PASO 2: Iniciar sesión
   Con las credenciales configuradas por el administrador.

PASO 3: Seleccionar y restaurar backup
   • Seleccionar archivo .sql del listado
   • Hacer clic en "Restaurar Backup"
   • Confirmar la operación
   • Esperar la restauración completa

───────────────────────────────────────────────────────────────
  3. TABLAS RESPALDADAS Y RESTAURADAS
───────────────────────────────────────────────────────────────

Durante la restauración, se limpian y restauran las siguientes
tablas de PostgreSQL:

📋 TABLAS PRINCIPALES:
   ✓ usuarios             - Usuarios del sistema
   ✓ anio_vigente         - Año académico activo
   ✓ cursos               - Cursos y niveles
   ✓ alumnos              - Estudiantes matriculados
   ✓ apoderados           - Apoderados y tutores

📋 TABLAS DE RELACIÓN:
   ✓ alumno_apoderado     - Relación estudiante-apoderado
   ✓ alumno_nee           - NEE de estudiantes
   ✓ cursos_asignados     - Asignación de cursos (legacy)
   ✓ profesor_curso       - Profesores asignados a cursos

📋 TABLAS OPERACIONALES:
   ✓ logs_importacion     - Registros de importaciones
   ✓ documentos_pendientes - Documentos por procesar
   ✓ backups              - Registro de respaldos

⚠️  LIMPIEZA: Todas estas tablas se VACÍAN completamente
    (TRUNCATE) antes de restaurar los datos del backup.

⚠️  CASCADA: El vaciado se hace con CASCADE, eliminando
    también las relaciones dependientes.

───────────────────────────────────────────────────────────────
  4. PROCESO DE RESTAURACIÓN AUTOMÁTICA
───────────────────────────────────────────────────────────────

El sistema ejecuta los siguientes pasos automáticamente:

1️⃣  LIMPIEZA DE DATOS
    • Vacía todas las tablas listadas arriba
    • Resetea secuencias de IDs (RESTART IDENTITY)
    • Aplica CASCADE para dependencias

2️⃣  RESTAURACIÓN DEL BACKUP
    • Ejecuta el archivo .sql vía psql directo sobre
      PostgreSQL 16 nativo (sin Docker)
    • Reporta errores si los hay

3️⃣  RESETEO DE CONTRASEÑAS
    • admin → admin123
    • 17393845 → 17393845
    • 17885785 → 17885785

4️⃣  VERIFICACIÓN DE INTEGRIDAD
    • Cuenta registros en: usuarios, alumnos, apoderados, cursos
    • Muestra totales restaurados
    • Confirma éxito de la operación

───────────────────────────────────────────────────────────────
  5. CONFIGURACIÓN TÉCNICA
───────────────────────────────────────────────────────────────

🐘 POSTGRESQL (nativo, sin Docker):
   Usuario DB: matricula_app
   Base de Datos: matricula

📁 DIRECTORIOS:
   Backups: ./backups/postgres/
   Config: tools/restore-app/server/config.json

🔐 SEGURIDAD:
   JWT Secret y credenciales: ver tools/restore-app/server/.env
   CORS Origins: red LAN del colegio (192.16.1.0/24)

───────────────────────────────────────────────────────────────
  6. TABLAS NO INCLUIDAS EN RESTAURACIÓN
───────────────────────────────────────────────────────────────

Las siguientes tablas NO se vacían ni restauran:

   • grados, letras_curso, previsiones_salud (catálogos)
   • nee (catálogo de necesidades educativas)
   • regiones, comunas (catálogos geográficos)
   • Cualquier tabla nueva que no esté en la lista del punto 3

⚠️  Si agregaste nuevas tablas al sistema, debes actualizar
    manualmente el script de restauración en:
    backend/utils/restoreBackupAutomatic.js

───────────────────────────────────────────────────────────────
  7. CREDENCIALES POST-RESTAURACIÓN
───────────────────────────────────────────────────────────────

Después de restaurar un backup, los usuarios principales
tendrán estas credenciales:

👤 ADMINISTRADOR:
   Usuario: admin
   Contraseña: admin123

👤 PROFESORES:
   Usuario: 17393845
   Contraseña: 17393845

   Usuario: 17885785
   Contraseña: 17885785

⚠️  Recomiende a los usuarios cambiar sus contraseñas
    después de la restauración.

───────────────────────────────────────────────────────────────
  8. SOLUCIÓN DE PROBLEMAS
───────────────────────────────────────────────────────────────

❌ Error: "No se puede conectar al servidor"
   Solución: Verificar que el proceso "restore-app" esté online
            (pm2 status) y reiniciarlo si hace falta
            (pm2 restart restore-app)

❌ Error: "Credenciales inválidas"
   Solución: Confirmar las credenciales con el administrador
            del sistema (ver tools/restore-app/server/.env)

❌ Error: "No se puede conectar a la base de datos"
   Solución: Verificar que PostgreSQL esté activo
            (systemctl status postgresql)

❌ Error: "Archivo de backup no encontrado"
   Solución: Verificar que el archivo .sql exista en
            ./backups/postgres/

───────────────────────────────────────────────────────────────
  9. NOTAS IMPORTANTES
───────────────────────────────────────────────────────────────

🔴 ADVERTENCIAS:
   • La restauración BORRA TODOS los datos actuales
   • Esta operación NO SE PUEDE DESHACER
   • Crear un backup antes de restaurar otro backup
   • No interrumpir el proceso de restauración

✅ BUENAS PRÁCTICAS:
   • Programar backups automáticos semanalmente
   • Mantener al menos 3 backups históricos
   • Probar restauraciones en ambiente de desarrollo
   • Documentar cada restauración realizada

───────────────────────────────────────────────────────────────
  10. CONTACTO Y SOPORTE
───────────────────────────────────────────────────────────────

📧 Para soporte técnico o consultas:
   • Consultar documentación en ./tools/restore-app/README.md
   • Revisar logs con: pm2 logs restore-app
   • Verificar estado de PostgreSQL con: systemctl status postgresql

═══════════════════════════════════════════════════════════════
     FIN DEL DOCUMENTO
═══════════════════════════════════════════════════════════════
`.trim();

    const blob = new Blob([documentation], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Sistema_Restauracion_Documentacion_${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (loading && !stats) {
    return (
      <div className="flex items-center justify-center p-8">
        <RefreshCw size={24} className="animate-spin mr-2" style={{color: 'var(--color-primary)'}} />
        <span>Cargando información de respaldos...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-4">
          <Database size={32} style={{color: 'var(--color-primary)'}} />
          <h3 className="ios-title">Gestión de Respaldos</h3>
        </div>
        <button
          onClick={loadData}
          disabled={loading}
          className="ios-btn ios-btn-secondary"
          title="Actualizar"
        >
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {error && (
        <div className="ios-card p-4 border-l-4 border-red-500 bg-red-50">
          <div className="flex items-center">
            <AlertCircle size={20} className="text-red-500 mr-2" />
            <p className="text-red-700">{error}</p>
          </div>
        </div>
      )}

      {/* Statistics Panel - DISABLED FOR NOW */}
      {/* {stats && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="ios-card p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="ios-caption text-gray-500">Total Respaldos</p>
                <p className="ios-title-2 text-blue-600">{stats.backups.total}</p>
              </div>
              <Database size={24} className="text-blue-500" />
            </div>
            <p className="ios-caption text-gray-500 mt-1">
              {stats.backups.totalSizeFormatted}
            </p>
          </div>

          <div className="ios-card p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="ios-caption text-gray-500">Base de Datos</p>
                <p className="ios-title-2 text-green-600">{stats.database.sizeFormatted}</p>
              </div>
              <HardDrive size={24} className="text-green-500" />
            </div>
            <div className="flex items-center mt-1">
              <CheckCircle size={12} className="text-green-500 mr-1" />
              <p className="ios-caption text-gray-500">Activa</p>
            </div>
          </div>

          <div className="ios-card p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="ios-caption text-gray-500">Último Respaldo</p>
                <p className="ios-title-2 text-purple-600">
                  {stats.backups.newest ? formatDate(stats.backups.newest) : 'Ninguno'}
                </p>
              </div>
              <Clock size={24} className="text-purple-500" />
            </div>
          </div>
        </div>
      )} */}

      {/* Create and Upload Backups */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Create Manual Backup */}
        <div className="ios-card p-6">
          <h4 className="ios-subtitle mb-4">Crear Respaldo Manual</h4>
          <p className="ios-body mb-4" style={{color: 'var(--color-text-light)'}}>
            Genere un respaldo completo de la base de datos PostgreSQL en formato .sql.gz.
          </p>
          <button
            onClick={handleCreateBackup}
            disabled={creating || uploading}
            className="ios-btn ios-btn-primary w-full"
          >
            <Plus size={16} className="mr-2" />
            {creating ? 'Creando Respaldo...' : 'Crear Respaldo Manual'}
          </button>
        </div>

        {/* Upload Backup - DISABLED FOR NOW */}
        <div className="ios-card p-6 bg-gray-50 opacity-60">
          <h4 className="ios-subtitle mb-4">Subir Respaldo</h4>
          <p className="ios-body mb-4" style={{color: 'var(--color-text-light)'}}>
            Funcionalidad para subir y restaurar respaldos no está disponible en esta versión.
          </p>
          <input
            ref={fileInputRef}
            type="file"
            accept=".zip"
            onChange={handleFileSelect}
            style={{ display: 'none' }}
          />
          <button
            disabled={true}
            className="ios-btn ios-btn-secondary w-full"
          >
            <Upload size={16} className="mr-2" />
            Subir Respaldo (Deshabilitado)
          </button>
        </div>
      </div>

      {/* Backup List */}
      <div className="ios-card">
        <div className="p-6 border-b">
          <h4 className="ios-subtitle">Respaldos Disponibles</h4>
          <p className="ios-caption text-gray-500">
            {backups.length > 0 ? `${backups.length} respaldo(s) disponible(s)` : 'No hay respaldos disponibles'}
          </p>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-neutral-100">
                <th className="py-3 px-4 text-left text-xs font-semibold text-neutral-600 uppercase">Archivo (.sql.gz)</th>
                <th className="py-3 px-4 text-left text-xs font-semibold text-neutral-600 uppercase">Tamaño</th>
                <th className="py-3 px-4 text-left text-xs font-semibold text-neutral-600 uppercase">Creado</th>
                <th className="py-3 px-4 text-left text-xs font-semibold text-neutral-600 uppercase">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200">
              {backups.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-8 text-center">
                    <Database size={48} className="mx-auto mb-4" style={{color: 'var(--color-text-light)'}} />
                    <p className="ios-body" style={{color: 'var(--color-text-light)'}}>
                      No hay respaldos disponibles
                    </p>
                    <p className="ios-caption" style={{color: 'var(--color-text-light)'}}>
                      Cree su primer respaldo usando el botón de arriba
                    </p>
                  </td>
                </tr>
              ) : (
                backups.map((backup) => (
                    <tr key={backup.filename} className="hover:bg-neutral-50">
                      <td className="py-4 px-4">
                        <div className="font-mono text-sm break-all">{backup.filename}</div>
                      </td>
                      <td className="py-4 px-4 text-sm">{formatSize(backup.size)}</td>
                      <td className="py-4 px-4 text-sm">
                        <div className="flex items-center space-x-1">
                          <Clock size={14} style={{color: 'var(--color-text-light)'}} />
                          <span>{formatDate(backup.createdAt)}</span>
                        </div>
                      </td>
                      <td className="py-4 px-4 text-sm">
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleRestore(backup.filename)}
                            disabled={restoring !== null}
                            className={`ios-btn text-xs py-1 px-2 ios-btn-secondary opacity-50 cursor-not-allowed`}
                            title="Restaurar (No implementado)"
                          >
                            <RotateCcw size={14} />
                          </button>
                          <button
                            onClick={() => handleDownload(backup.filename)}
                            disabled={restoring !== null}
                            className="ios-btn ios-btn-secondary text-xs py-1 px-2"
                            title="Descargar"
                          >
                            <Download size={14} />
                          </button>
                          <button
                            onClick={() => handleDelete(backup.filename)}
                            disabled={restoring !== null}
                            className="ios-btn ios-btn-danger text-xs py-1 px-2"
                            title="Eliminar"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                )
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Restoration System Documentation */}
      <div className="ios-card p-6" style={{backgroundColor: '#fff7ed', borderLeft: '4px solid #f59e0b'}}>
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <RotateCcw size={28} style={{color: '#f59e0b'}} />
            <div>
              <h4 className="ios-subtitle" style={{color: '#92400e'}}>Sistema de Restauración de Respaldos</h4>
              <p className="ios-caption" style={{color: '#78350f'}}>Aplicación dedicada en puerto 5180</p>
            </div>
          </div>
          <button
            onClick={handleDownloadDocumentation}
            className="ios-btn ios-btn-secondary text-xs"
            title="Descargar documentación completa"
          >
            <FileText size={14} className="mr-1" />
            Descargar Guía .TXT
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          {/* Credentials Card */}
          <div className="bg-white rounded-lg p-4 border border-orange-200">
            <div className="flex items-center gap-2 mb-3">
              <Key size={18} style={{color: '#f59e0b'}} />
              <h5 className="font-semibold text-sm" style={{color: '#92400e'}}>Credenciales de Acceso</h5>
            </div>
            <div className="space-y-2 text-sm">
              <p style={{color: '#78350f'}}>
                Configuradas por el administrador del sistema — ver{' '}
                <code className="font-mono bg-orange-100 px-2 py-0.5 rounded text-orange-800">tools/restore-app/server/.env</code>
              </p>
            </div>
          </div>

          {/* URL Access Card */}
          <div className="bg-white rounded-lg p-4 border border-orange-200">
            <div className="flex items-center gap-2 mb-3">
              <ExternalLink size={18} style={{color: '#f59e0b'}} />
              <h5 className="font-semibold text-sm" style={{color: '#92400e'}}>URL de Acceso</h5>
            </div>
            <div className="space-y-2 text-sm">
              <div>
                <span style={{color: '#78350f'}} className="font-medium block mb-1">Solo red local del colegio:</span>
                <a
                  href="http://192.16.1.14:5180"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-mono bg-orange-100 px-2 py-1 rounded text-orange-800 hover:bg-orange-200 inline-flex items-center gap-1 transition-colors"
                >
                  http://192.16.1.14:5180
                  <ExternalLink size={12} />
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Guide */}
        <div className="bg-white rounded-lg p-4 border border-orange-200">
          <h5 className="font-semibold text-sm mb-3" style={{color: '#92400e'}}>📋 Guía Rápida de Uso</h5>
          <ol className="space-y-2 text-sm" style={{color: '#78350f'}}>
            <li className="flex gap-2">
              <span className="font-bold">1.</span>
              <span>El servicio ya corre permanentemente (PM2, proceso "restore-app") — no hace falta iniciar nada</span>
            </li>
            <li className="flex gap-2">
              <span className="font-bold">2.</span>
              <span>Abrir navegador en <strong>http://192.16.1.14:5180</strong></span>
            </li>
            <li className="flex gap-2">
              <span className="font-bold">3.</span>
              <span>Iniciar sesión con las credenciales configuradas por el administrador</span>
            </li>
            <li className="flex gap-2">
              <span className="font-bold">4.</span>
              <span>Seleccionar backup (.sql) y hacer clic en "Restaurar"</span>
            </li>
            <li className="flex gap-2">
              <span className="font-bold">5.</span>
              <span>Esperar confirmación de restauración exitosa</span>
            </li>
          </ol>
        </div>

        {/* Tables Info */}
        <div className="mt-4 p-3 bg-orange-50 rounded-lg border border-orange-200">
          <h5 className="font-semibold text-xs mb-2" style={{color: '#92400e'}}>📊 Tablas Respaldadas y Restauradas</h5>
          <p className="text-xs mb-2" style={{color: '#78350f'}}>El sistema limpia (TRUNCATE) y restaura las siguientes 12 tablas:</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs" style={{color: '#78350f'}}>
            <div>✓ usuarios</div>
            <div>✓ anio_vigente</div>
            <div>✓ cursos</div>
            <div>✓ alumnos</div>
            <div>✓ apoderados</div>
            <div>✓ alumno_apoderado</div>
            <div>✓ alumno_nee</div>
            <div>✓ cursos_asignados</div>
            <div>✓ profesor_curso</div>
            <div>✓ logs_importacion</div>
            <div>✓ documentos_pendientes</div>
            <div>✓ backups</div>
          </div>
        </div>

        {/* Warning */}
        <div className="mt-4 p-3 bg-red-50 rounded-lg border-l-4 border-red-500">
          <div className="flex items-start gap-2">
            <AlertCircle size={16} className="text-red-600 mt-0.5 flex-shrink-0" />
            <div className="text-xs" style={{color: '#991b1b'}}>
              <strong>⚠️ ADVERTENCIA:</strong> La restauración ELIMINA TODOS los datos actuales de las tablas listadas. Esta operación NO se puede deshacer. Siempre cree un backup antes de restaurar.
            </div>
          </div>
        </div>
      </div>

      {/* Info Panel */}
      <div className="ios-card p-6" style={{backgroundColor: 'var(--color-primary-light)'}}>
        <h4 className="ios-subtitle mb-3">ℹ️ Información sobre Respaldos de PostgreSQL</h4>
        <ul className="space-y-2 ios-body" style={{color: 'var(--color-secondary)'}}>
          <li>• Los respaldos se generan usando `pg_dump` y se comprimen en formato <strong>.sql.gz</strong>.</li>
          <li>• Estos respaldos contienen únicamente los datos de la base de datos de PostgreSQL.</li>
          <li>• La restauración de estos respaldos debe hacerse manualmente por un administrador de sistemas.</li>
          <li><strong>• La funcionalidad de subir y restaurar desde la interfaz está deshabilitada para PostgreSQL.</strong></li>
        </ul>
      </div>
    </div>
  );
};

export default BackupPanel;