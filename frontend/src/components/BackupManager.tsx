import React, { useState, useEffect } from 'react';
import {
  Database,
  Download,
  Trash2,
  Clock,
  Cloud,
  CloudOff,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  Settings,
  Play,
  Calendar,
  HardDrive,
  Save,
  ExternalLink,
  Info
} from 'lucide-react';
import { useToast } from '../context/ToastContext';
import { useConfirm } from '../context/ConfirmContext';

interface BackupFile {
  filename: string;
  size: number;
  createdAt: string;
}

interface ScheduleConfig {
  time: string;
  enabled: boolean;
  description: string;
}

interface BackupConfig {
  schedules: ScheduleConfig[];
  googleDriveEnabled: boolean;
  activeTasks: number;
}

interface GoogleDriveBackup {
  id: string;
  name: string;
  size: string;
  createdAt: string;
}

type TabType = 'local' | 'google-drive';
type ViewType = 'dashboard' | 'schedules' | 'google-drive-setup';

const BackupManager: React.FC = () => {
  const toast = useToast();
  const confirm = useConfirm();
  // Estados principales
  const [currentView, setCurrentView] = useState<ViewType>('dashboard');
  const [activeTab, setActiveTab] = useState<TabType>('local');

  // Datos
  const [localBackups, setLocalBackups] = useState<BackupFile[]>([]);
  const [driveBackups, setDriveBackups] = useState<GoogleDriveBackup[]>([]);
  const [config, setConfig] = useState<BackupConfig | null>(null);

  // Estados de operación
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Google Drive
  const [driveConfigured, setDriveConfigured] = useState(false);
  const [authUrl, setAuthUrl] = useState<string>('');
  const [authCode, setAuthCode] = useState('');
  const [configuringDrive, setConfiguringDrive] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    setError(null);

    try {
      await Promise.all([
        fetchLocalBackups(),
        fetchConfig(),
        fetchDriveStatus()
      ]);
    } catch (err) {
      console.error('Error loading data:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchLocalBackups = async () => {
    try {
      const response = await fetch('/api/admin/backup/list', {
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        setLocalBackups(data);
      }
    } catch (error) {
      console.error('Error fetching local backups:', error);
    }
  };

  const fetchConfig = async () => {
    try {
      const response = await fetch('/api/admin/backup-config/schedules', {
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        setConfig(data.data);
      }
    } catch (error) {
      console.error('Error fetching config:', error);
    }
  };

  const fetchDriveStatus = async () => {
    try {
      const response = await fetch('/api/admin/backup-config/gdrive/status', {
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        setDriveConfigured(data.data.configured);

        // Si está configurado, obtener lista de backups
        if (data.data.configured) {
          fetchDriveBackups();
        }
      }
    } catch (error) {
      console.error('Error fetching drive status:', error);
    }
  };

  const fetchDriveBackups = async () => {
    try {
      const response = await fetch('/api/admin/backup-config/gdrive/backups', {
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        setDriveBackups(data.data);
      }
    } catch (error) {
      console.error('Error fetching drive backups:', error);
    }
  };

  const handleCreateBackup = async () => {
    setCreating(true);
    try {
      const response = await fetch('/api/admin/backup-config/execute', {
        method: 'POST',
        credentials: 'include'
      });

      if (response.ok) {
        toast.success('✅ Respaldo iniciado correctamente.\n\nEsto puede tomar varios minutos. El respaldo aparecerá en la lista cuando se complete.');

        // Recargar después de un delay
        setTimeout(() => loadData(), 3000);
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

  const handleDownloadLocal = (filename: string) => {
    window.location.href = `/api/admin/backup/download/${filename}`;
  };

  const handleDeleteLocal = async (filename: string) => {
    if (!(await confirm(`¿Eliminar el respaldo "${filename}"?\n\nEsta acción no se puede deshacer.`))) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/backup/delete/${filename}`, {
        method: 'DELETE',
        credentials: 'include'
      });

      if (response.ok) {
        toast.success('✅ Respaldo eliminado');
        fetchLocalBackups();
      } else {
        throw new Error('Error eliminando respaldo');
      }
    } catch (error) {
      toast.error(`❌ Error: ${error instanceof Error ? error.message : 'Error desconocido'}`);
    }
  };

  const handleDeleteDrive = async (fileId: string) => {
    if (!(await confirm('¿Eliminar este respaldo de Google Drive?\n\nEsta acción no se puede deshacer.'))) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/backup-config/gdrive/backups/${fileId}`, {
        method: 'DELETE',
        credentials: 'include'
      });

      if (response.ok) {
        toast.success('✅ Respaldo eliminado de Google Drive');
        fetchDriveBackups();
      }
    } catch (error) {
      toast.error(`❌ Error: ${error instanceof Error ? error.message : 'Error desconocido'}`);
    }
  };

  const handleGetAuthUrl = async () => {
    try {
      const response = await fetch('/api/admin/backup-config/gdrive/auth-url', {
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        setAuthUrl(data.data.authUrl);
      } else {
        throw new Error('Error obteniendo URL de autenticación');
      }
    } catch (error) {
      toast.error(`❌ Error: ${error instanceof Error ? error.message : 'Verifique que google-credentials.json existe'}`);
    }
  };

  const handleSaveAuthCode = async () => {
    if (!authCode.trim()) {
      toast.error('⚠️ Por favor ingrese el código de autorización');
      return;
    }

    setConfiguringDrive(true);
    try {
      const response = await fetch('/api/admin/backup-config/gdrive/save-token', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: authCode })
      });

      if (response.ok) {
        toast.success('✅ Google Drive configurado exitosamente!\n\nLos respaldos automáticos ahora se subirán a Drive.');
        setDriveConfigured(true);
        setCurrentView('dashboard');
        setAuthCode('');
        setAuthUrl('');
        loadData();
      } else {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Error guardando token');
      }
    } catch (error) {
      toast.error(`❌ Error: ${error instanceof Error ? error.message : 'Error desconocido'}`);
    } finally {
      setConfiguringDrive(false);
    }
  };

  const formatSize = (bytes: number | string) => {
    const numBytes = typeof bytes === 'string' ? parseInt(bytes) : bytes;
    if (isNaN(numBytes) || numBytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(numBytes) / Math.log(k));
    return parseFloat((numBytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

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

  const parseCronTime = (cron: string) => {
    const parts = cron.split(' ');
    if (parts.length >= 2) {
      const hour = parts[1].padStart(2, '0');
      const minute = parts[0].padStart(2, '0');
      return `${hour}:${minute}`;
    }
    return cron;
  };

  // VISTA: Dashboard Principal (estilo UpdraftPlus)
  const renderDashboard = () => (
    <div className="space-y-6">
      {/* Header con botón de respaldo grande */}
      <div className="ios-card p-8 text-center" style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
        <h2 className="text-3xl font-bold text-white mb-4">Sistema de Respaldos</h2>
        <p className="text-white opacity-90 mb-6">
          Proteja sus datos con respaldos automáticos locales y en la nube
        </p>
        <button
          onClick={handleCreateBackup}
          disabled={creating}
          className="bg-white text-purple-700 px-8 py-4 rounded-lg font-semibold hover:bg-purple-50 transition-colors disabled:opacity-50 shadow-lg text-lg"
        >
          {creating ? (
            <>
              <RefreshCw size={24} className="inline mr-2 animate-spin" />
              Creando Respaldo...
            </>
          ) : (
            <>
              <Play size={24} className="inline mr-2" />
              Respaldar Ahora
            </>
          )}
        </button>
      </div>

      {/* Panel de Estado */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="ios-card p-6">
          <div className="flex items-center justify-between mb-4">
            <HardDrive size={32} className="text-blue-600" />
            <span className="text-sm font-semibold text-blue-600 bg-blue-100 px-3 py-1 rounded-full">
              Local
            </span>
          </div>
          <h4 className="text-2xl font-bold mb-1">{localBackups.length}</h4>
          <p className="text-gray-600 text-sm">Respaldos Locales</p>
          <p className="text-xs text-gray-500 mt-2">Retención: 30 días</p>
        </div>

        <div className="ios-card p-6">
          <div className="flex items-center justify-between mb-4">
            {driveConfigured ? (
              <Cloud size={32} className="text-green-600" />
            ) : (
              <CloudOff size={32} className="text-gray-400" />
            )}
            <span className={`text-sm font-semibold px-3 py-1 rounded-full ${driveConfigured ? 'text-green-600 bg-green-100' : 'text-gray-600 bg-gray-100'}`}>
              {driveConfigured ? 'Activo' : 'Inactivo'}
            </span>
          </div>
          <h4 className="text-2xl font-bold mb-1">
            {driveConfigured ? driveBackups.length : '—'}
          </h4>
          <p className="text-gray-600 text-sm">Google Drive</p>
          <p className="text-xs text-gray-500 mt-2">Retención: 90 días</p>
        </div>

        <div className="ios-card p-6">
          <div className="flex items-center justify-between mb-4">
            <Calendar size={32} className="text-purple-600" />
            <span className="text-sm font-semibold text-purple-600 bg-purple-100 px-3 py-1 rounded-full">
              Automático
            </span>
          </div>
          <h4 className="text-2xl font-bold mb-1">
            {config?.schedules.filter(s => s.enabled).length || 0}
          </h4>
          <p className="text-gray-600 text-sm">Horarios Activos</p>
          {config && config.schedules.length > 0 && (
            <p className="text-xs text-gray-500 mt-2">
              Próximo: {parseCronTime(config.schedules.find(s => s.enabled)?.time || '')}
            </p>
          )}
        </div>
      </div>

      {/* Horarios Programados */}
      {config && config.schedules.length > 0 && (
        <div className="ios-card p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold flex items-center">
              <Clock size={20} className="mr-2 text-purple-600" />
              Horarios Programados
            </h3>
            <button
              onClick={() => setCurrentView('schedules')}
              className="ios-btn ios-btn-secondary text-sm"
            >
              <Settings size={16} className="mr-1" />
              Configurar
            </button>
          </div>
          <div className="space-y-3">
            {config.schedules.map((schedule, idx) => (
              <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center">
                  {schedule.enabled ? (
                    <CheckCircle size={18} className="text-green-500 mr-3" />
                  ) : (
                    <AlertCircle size={18} className="text-gray-400 mr-3" />
                  )}
                  <div>
                    <p className="font-medium">{schedule.description}</p>
                    <p className="text-sm text-gray-500">Hora: {parseCronTime(schedule.time)}</p>
                  </div>
                </div>
                <span className={`text-xs font-semibold px-3 py-1 rounded-full ${schedule.enabled ? 'text-green-700 bg-green-100' : 'text-gray-600 bg-gray-200'}`}>
                  {schedule.enabled ? 'Activo' : 'Deshabilitado'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Acción Rápida Google Drive */}
      {!driveConfigured && (
        <div className="ios-card p-6 border-2 border-blue-200 bg-blue-50">
          <div className="flex items-start">
            <Info size={24} className="text-blue-600 mr-3 flex-shrink-0" />
            <div className="flex-grow">
              <h4 className="font-semibold text-blue-900 mb-2">
                Respaldos en la Nube con Google Drive
              </h4>
              <p className="text-blue-800 text-sm mb-4">
                Configure Google Drive para tener una copia adicional de seguridad en la nube.
                Los respaldos se subirán automáticamente después de cada respaldo local.
              </p>
              <button
                onClick={() => setCurrentView('google-drive-setup')}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
              >
                <Cloud size={16} className="inline mr-2" />
                Configurar Google Drive
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tabs de Respaldos */}
      <div className="ios-card">
        <div className="border-b">
          <div className="flex">
            <button
              onClick={() => setActiveTab('local')}
              className={`px-6 py-4 font-medium transition-colors ${activeTab === 'local' ? 'text-purple-600 border-b-2 border-purple-600' : 'text-gray-600 hover:text-gray-900'}`}
            >
              <HardDrive size={18} className="inline mr-2" />
              Respaldos Locales ({localBackups.length})
            </button>
            <button
              onClick={() => setActiveTab('google-drive')}
              disabled={!driveConfigured}
              className={`px-6 py-4 font-medium transition-colors ${activeTab === 'google-drive' ? 'text-purple-600 border-b-2 border-purple-600' : 'text-gray-600 hover:text-gray-900'} ${!driveConfigured ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <Cloud size={18} className="inline mr-2" />
              Google Drive ({driveConfigured ? driveBackups.length : '—'})
            </button>
          </div>
        </div>

        <div className="p-6">
          {activeTab === 'local' ? renderLocalBackups() : renderDriveBackups()}
        </div>
      </div>
    </div>
  );

  const renderLocalBackups = () => (
    <div className="space-y-3">
      {localBackups.length === 0 ? (
        <div className="text-center py-12">
          <Database size={48} className="mx-auto mb-4 text-gray-400" />
          <p className="text-gray-600 mb-2">No hay respaldos locales</p>
          <p className="text-sm text-gray-500">Cree su primer respaldo usando el botón "Respaldar Ahora"</p>
        </div>
      ) : (
        localBackups.map((backup) => (
          <div key={backup.filename} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
            <div className="flex-grow">
              <p className="font-medium text-sm break-all mb-1">{backup.filename}</p>
              <div className="flex items-center text-sm text-gray-600 space-x-4">
                <span className="flex items-center">
                  <Clock size={14} className="mr-1" />
                  {formatDate(backup.createdAt)}
                </span>
                <span>{formatSize(backup.size)}</span>
              </div>
            </div>
            <div className="flex space-x-2 ml-4">
              <button
                onClick={() => handleDownloadLocal(backup.filename)}
                className="ios-btn ios-btn-secondary text-sm"
                title="Descargar"
              >
                <Download size={16} />
              </button>
              <button
                onClick={() => handleDeleteLocal(backup.filename)}
                className="ios-btn ios-btn-danger text-sm"
                title="Eliminar"
              >
                <Trash2 size={16} />
              </button>
            </div>
          </div>
        ))
      )}
    </div>
  );

  const renderDriveBackups = () => {
    if (!driveConfigured) {
      return (
        <div className="text-center py-12">
          <CloudOff size={48} className="mx-auto mb-4 text-gray-400" />
          <p className="text-gray-600 mb-2">Google Drive no configurado</p>
          <button
            onClick={() => setCurrentView('google-drive-setup')}
            className="mt-4 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm"
          >
            Configurar Ahora
          </button>
        </div>
      );
    }

    return (
      <div className="space-y-3">
        {driveBackups.length === 0 ? (
          <div className="text-center py-12">
            <Cloud size={48} className="mx-auto mb-4 text-gray-400" />
            <p className="text-gray-600 mb-2">No hay respaldos en Google Drive</p>
            <p className="text-sm text-gray-500">Los respaldos se subirán automáticamente</p>
          </div>
        ) : (
          driveBackups.map((backup) => (
            <div key={backup.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
              <div className="flex-grow">
                <p className="font-medium text-sm break-all mb-1">{backup.name}</p>
                <div className="flex items-center text-sm text-gray-600 space-x-4">
                  <span className="flex items-center">
                    <Clock size={14} className="mr-1" />
                    {formatDate(backup.createdAt)}
                  </span>
                  <span>{backup.size}</span>
                </div>
              </div>
              <button
                onClick={() => handleDeleteDrive(backup.id)}
                className="ios-btn ios-btn-danger text-sm ml-4"
                title="Eliminar"
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))
        )}
      </div>
    );
  };

  // VISTA: Configuración de Horarios
  const renderSchedules = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-2xl font-bold">Configuración de Horarios</h3>
        <button
          onClick={() => setCurrentView('dashboard')}
          className="ios-btn ios-btn-secondary"
        >
          Volver
        </button>
      </div>

      <div className="ios-card p-6 border-l-4 border-yellow-500 bg-yellow-50">
        <p className="text-yellow-800">
          <strong>Próximamente:</strong> Interfaz visual para configurar horarios personalizados.
          <br />
          Por ahora, los horarios se configuran por defecto a las 13:30 y 21:00 hrs diarios.
        </p>
      </div>

      {config && (
        <div className="ios-card p-6">
          <h4 className="font-semibold mb-4">Horarios Actuales</h4>
          <div className="space-y-3">
            {config.schedules.map((schedule, idx) => (
              <div key={idx} className="p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{schedule.description}</p>
                    <p className="text-sm text-gray-600">Hora: {parseCronTime(schedule.time)}</p>
                    <p className="text-xs text-gray-500 mt-1">Cron: {schedule.time}</p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-sm ${schedule.enabled ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
                    {schedule.enabled ? 'Activo' : 'Deshabilitado'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  // VISTA: Wizard de Google Drive
  const renderGoogleDriveSetup = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-2xl font-bold">Configurar Google Drive</h3>
        <button
          onClick={() => {
            setCurrentView('dashboard');
            setAuthUrl('');
            setAuthCode('');
          }}
          className="ios-btn ios-btn-secondary"
        >
          Volver
        </button>
      </div>

      {driveConfigured ? (
        <div className="ios-card p-8 text-center">
          <CheckCircle size={64} className="mx-auto mb-4 text-green-500" />
          <h4 className="text-2xl font-bold mb-2">¡Google Drive Configurado!</h4>
          <p className="text-gray-600 mb-6">
            Los respaldos automáticos se están subiendo a Google Drive correctamente.
          </p>
          <button
            onClick={() => setCurrentView('dashboard')}
            className="ios-btn ios-btn-primary"
          >
            Volver al Dashboard
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Paso 1 */}
          <div className="ios-card p-6">
            <div className="flex items-start mb-4">
              <div className="bg-purple-600 text-white w-8 h-8 rounded-full flex items-center justify-center font-bold mr-4 flex-shrink-0">
                1
              </div>
              <div className="flex-grow">
                <h4 className="font-semibold text-lg mb-2">Credenciales de Google Cloud</h4>
                <p className="text-gray-600 text-sm mb-4">
                  Primero, asegúrese de tener el archivo <code className="bg-gray-100 px-2 py-1 rounded">google-credentials.json</code> en la carpeta <code className="bg-gray-100 px-2 py-1 rounded">backend/config/</code>
                </p>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm">
                  <p className="font-medium text-blue-900 mb-2">📖 ¿No tienes las credenciales?</p>
                  <p className="text-blue-800">
                    Consulta el archivo <code>CONFIGURACION_RESPALDOS.md</code> en la raíz del proyecto para instrucciones detalladas sobre cómo crear las credenciales en Google Cloud Console.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Paso 2 */}
          <div className="ios-card p-6">
            <div className="flex items-start mb-4">
              <div className="bg-purple-600 text-white w-8 h-8 rounded-full flex items-center justify-center font-bold mr-4 flex-shrink-0">
                2
              </div>
              <div className="flex-grow">
                <h4 className="font-semibold text-lg mb-2">Obtener URL de Autorización</h4>
                <p className="text-gray-600 text-sm mb-4">
                  Haga clic en el botón para generar la URL de autorización de Google.
                </p>
                <button
                  onClick={handleGetAuthUrl}
                  disabled={!!authUrl}
                  className="ios-btn ios-btn-primary"
                >
                  {authUrl ? <CheckCircle size={16} className="mr-2" /> : <ExternalLink size={16} className="mr-2" />}
                  {authUrl ? 'URL Generada' : 'Generar URL de Autorización'}
                </button>
                {authUrl && (
                  <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                    <p className="text-sm font-medium mb-2">URL de Autorización:</p>
                    <div className="flex items-center space-x-2">
                      <input
                        type="text"
                        value={authUrl}
                        readOnly
                        className="flex-grow p-2 border rounded text-xs font-mono"
                      />
                      <a
                        href={authUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="ios-btn ios-btn-primary whitespace-nowrap"
                      >
                        <ExternalLink size={16} className="mr-1" />
                        Abrir
                      </a>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Paso 3 */}
          {authUrl && (
            <div className="ios-card p-6">
              <div className="flex items-start mb-4">
                <div className="bg-purple-600 text-white w-8 h-8 rounded-full flex items-center justify-center font-bold mr-4 flex-shrink-0">
                  3
                </div>
                <div className="flex-grow">
                  <h4 className="font-semibold text-lg mb-2">Ingresar Código de Autorización</h4>
                  <p className="text-gray-600 text-sm mb-4">
                    Después de autorizar la aplicación en Google, copie el código de autorización y péguelo aquí:
                  </p>
                  <div className="space-y-3">
                    <input
                      type="text"
                      value={authCode}
                      onChange={(e) => setAuthCode(e.target.value)}
                      placeholder="Pegue el código de autorización aquí"
                      className="w-full p-3 border rounded-lg font-mono text-sm"
                    />
                    <button
                      onClick={handleSaveAuthCode}
                      disabled={!authCode.trim() || configuringDrive}
                      className="ios-btn ios-btn-primary w-full"
                    >
                      {configuringDrive ? (
                        <>
                          <RefreshCw size={16} className="mr-2 animate-spin" />
                          Guardando...
                        </>
                      ) : (
                        <>
                          <Save size={16} className="mr-2" />
                          Guardar y Activar Google Drive
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <RefreshCw size={32} className="animate-spin mr-3 text-purple-600" />
        <span className="text-lg">Cargando sistema de respaldos...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Navegación superior */}
      <div className="flex items-center space-x-4 mb-6">
        <Database size={32} className="text-purple-600" />
        <h2 className="text-3xl font-bold">
          {currentView === 'dashboard' && 'Gestión de Respaldos'}
          {currentView === 'schedules' && 'Horarios Automáticos'}
          {currentView === 'google-drive-setup' && 'Configurar Google Drive'}
        </h2>
        <button
          onClick={loadData}
          disabled={loading}
          className="ios-btn ios-btn-secondary ml-auto"
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

      {/* Contenido según vista actual */}
      {currentView === 'dashboard' && renderDashboard()}
      {currentView === 'schedules' && renderSchedules()}
      {currentView === 'google-drive-setup' && renderGoogleDriveSetup()}
    </div>
  );
};

export default BackupManager;
