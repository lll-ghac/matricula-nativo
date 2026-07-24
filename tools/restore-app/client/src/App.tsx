import { useState, useEffect } from 'react'
import { Database, RefreshCw, Upload, AlertTriangle, CheckCircle, LogOut, Server, HardDrive } from 'lucide-react'
import { api, setApiConfig } from './services/api'

interface Backup {
  filename: string
  size: number
  sizeFormatted: string
  createdAt: string
}

interface DatabaseStats {
  [key: string]: number
}

interface Credentials {
  username: string
  password: string
}

function App() {
  // Auth state
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [serverHost, setServerHost] = useState('localhost')
  const [serverPort, setServerPort] = useState('5181')
  const [username, setUsername] = useState('admin')
  const [password, setPassword] = useState('restore123')
  const [loginError, setLoginError] = useState('')
  const [isConnecting, setIsConnecting] = useState(false)

  // App state
  const [dbStats, setDbStats] = useState<DatabaseStats>({})
  const [backups, setBackups] = useState<Backup[]>([])
  const [selectedBackup, setSelectedBackup] = useState<string>('')
  const [logs, setLogs] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isRestoring, setIsRestoring] = useState(false)
  const [showRestoreModal, setShowRestoreModal] = useState(false)
  const [restoreResult, setRestoreResult] = useState<{
    success: boolean
    dataStats?: DatabaseStats
    credentials?: Credentials[]
  } | null>(null)

  // Load saved connection
  useEffect(() => {
    const saved = localStorage.getItem('restoreAppConnection')
    if (saved) {
      const conn = JSON.parse(saved)
      setServerHost(conn.host || 'localhost')
      setServerPort(conn.port || '5181')
      setUsername(conn.username || 'admin')
    }
  }, [])

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString()
    setLogs(prev => [...prev, `[${timestamp}] ${message}`])
  }

  const handleLogin = async () => {
    setLoginError('')
    setIsConnecting(true)

    try {
      const baseUrl = `http://${serverHost}:${serverPort}`
      setApiConfig(baseUrl)

      const response = await api.login(username, password)

      if (response.success) {
        setIsAuthenticated(true)
        addLog(`Conectado a ${serverHost}:${serverPort}`)

        // Save connection
        localStorage.setItem('restoreAppConnection', JSON.stringify({
          host: serverHost,
          port: serverPort,
          username
        }))

        // Load initial data
        await loadData()
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Error de conexion'
      setLoginError(errorMessage)
      addLog(`Error: ${errorMessage}`)
    } finally {
      setIsConnecting(false)
    }
  }

  const handleLogout = () => {
    setIsAuthenticated(false)
    setDbStats({})
    setBackups([])
    setSelectedBackup('')
    setLogs([])
    api.setToken('')
    addLog('Desconectado')
  }

  const loadData = async () => {
    setIsLoading(true)
    try {
      // Load database status
      const statusResponse = await api.getDatabaseStatus()
      if (statusResponse.success) {
        setDbStats(statusResponse.stats)
        const total = Object.values(statusResponse.stats).reduce((a: number, b: unknown) => a + (b as number), 0)
        addLog(`Base de datos: ${total} registros totales`)
      }

      // Load backups
      const backupsResponse = await api.getBackups()
      if (backupsResponse.success) {
        setBackups(backupsResponse.backups)
        addLog(`${backupsResponse.backups.length} backups encontrados`)
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido'
      addLog(`Error cargando datos: ${errorMessage}`)
    } finally {
      setIsLoading(false)
    }
  }

  const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    if (!file.name.endsWith('.sql')) {
      addLog('Error: Solo se permiten archivos .sql')
      return
    }

    setIsLoading(true)
    addLog(`Subiendo ${file.name}...`)

    try {
      const response = await api.uploadBackup(file)
      if (response.success) {
        addLog(`Backup subido: ${response.filename}`)
        await loadData()
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido'
      addLog(`Error subiendo backup: ${errorMessage}`)
    } finally {
      setIsLoading(false)
      event.target.value = ''
    }
  }

  const handleRestore = async () => {
    if (!selectedBackup) return

    setIsRestoring(true)
    setRestoreResult(null)
    addLog(`Iniciando restauracion de ${selectedBackup}...`)

    try {
      const response = await api.restoreBackup(selectedBackup)

      if (response.success) {
        addLog('Restauracion completada exitosamente')
        setRestoreResult({
          success: true,
          dataStats: response.dataStats,
          credentials: response.credentials
        })
        await loadData()
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido'
      addLog(`Error en restauracion: ${errorMessage}`)
      setRestoreResult({ success: false })
    } finally {
      setIsRestoring(false)
    }
  }

  const formatDate = (isoString: string) => {
    return new Date(isoString).toLocaleString('es-CL')
  }

  // Login screen
  if (!isAuthenticated) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#f3f4f6'
      }}>
        <div style={{
          backgroundColor: 'white',
          padding: '2rem',
          borderRadius: '8px',
          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
          width: '100%',
          maxWidth: '400px'
        }}>
          <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
            <Database size={48} color="#10b981" />
            <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginTop: '0.5rem' }}>
              App Restauracion
            </h1>
            <p style={{ color: '#6b7280', fontSize: '0.875rem' }}>
              Sistema de Matricula Escolar
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <label style={{ fontSize: '0.875rem', fontWeight: '500' }}>Servidor</label>
              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.25rem' }}>
                <input
                  type="text"
                  value={serverHost}
                  onChange={(e) => setServerHost(e.target.value)}
                  placeholder="IP o hostname"
                  style={{
                    flex: 1,
                    padding: '0.5rem',
                    border: '1px solid #d1d5db',
                    borderRadius: '4px'
                  }}
                />
                <input
                  type="text"
                  value={serverPort}
                  onChange={(e) => setServerPort(e.target.value)}
                  placeholder="Puerto"
                  style={{
                    width: '80px',
                    padding: '0.5rem',
                    border: '1px solid #d1d5db',
                    borderRadius: '4px'
                  }}
                />
              </div>
            </div>

            <div>
              <label style={{ fontSize: '0.875rem', fontWeight: '500' }}>Usuario</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '4px',
                  marginTop: '0.25rem'
                }}
              />
            </div>

            <div>
              <label style={{ fontSize: '0.875rem', fontWeight: '500' }}>Contrasena</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '4px',
                  marginTop: '0.25rem'
                }}
              />
            </div>

            {loginError && (
              <div style={{
                backgroundColor: '#fef2f2',
                color: '#dc2626',
                padding: '0.5rem',
                borderRadius: '4px',
                fontSize: '0.875rem'
              }}>
                {loginError}
              </div>
            )}

            <button
              onClick={handleLogin}
              disabled={isConnecting}
              style={{
                backgroundColor: '#10b981',
                color: 'white',
                padding: '0.75rem',
                borderRadius: '4px',
                border: 'none',
                cursor: isConnecting ? 'not-allowed' : 'pointer',
                fontWeight: '500',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem'
              }}
            >
              {isConnecting ? (
                <>
                  <RefreshCw size={16} className="animate-spin" />
                  Conectando...
                </>
              ) : (
                <>
                  <Server size={16} />
                  Conectar
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Main panel
  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f3f4f6' }}>
      {/* Header */}
      <div style={{
        backgroundColor: '#10b981',
        color: 'white',
        padding: '1rem',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Database size={24} />
          <span style={{ fontWeight: 'bold' }}>App Restauracion</span>
          <span style={{ fontSize: '0.875rem', opacity: 0.9 }}>
            - Conectado a {serverHost}:{serverPort}
          </span>
        </div>
        <button
          onClick={handleLogout}
          style={{
            backgroundColor: 'transparent',
            border: '1px solid white',
            color: 'white',
            padding: '0.5rem 1rem',
            borderRadius: '4px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.25rem'
          }}
        >
          <LogOut size={16} />
          Desconectar
        </button>
      </div>

      <div style={{ padding: '1rem', maxWidth: '1200px', margin: '0 auto' }}>
        {/* Database Status */}
        <div style={{
          backgroundColor: 'white',
          borderRadius: '8px',
          padding: '1rem',
          marginBottom: '1rem',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h2 style={{ fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <HardDrive size={20} />
              Estado de la Base de Datos
            </h2>
            <button
              onClick={loadData}
              disabled={isLoading}
              style={{
                backgroundColor: '#f3f4f6',
                border: 'none',
                padding: '0.5rem',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
            </button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '1rem' }}>
            {Object.entries(dbStats).map(([tabla, total]) => (
              <div key={tabla} style={{
                backgroundColor: '#f9fafb',
                padding: '0.75rem',
                borderRadius: '4px',
                textAlign: 'center'
              }}>
                <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#10b981' }}>{total}</div>
                <div style={{ fontSize: '0.75rem', color: '#6b7280', textTransform: 'capitalize' }}>{tabla}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Backups List */}
        <div style={{
          backgroundColor: 'white',
          borderRadius: '8px',
          padding: '1rem',
          marginBottom: '1rem',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
        }}>
          <h2 style={{ fontWeight: 'bold', marginBottom: '1rem' }}>Backups Disponibles</h2>

          {backups.length === 0 ? (
            <p style={{ color: '#6b7280', textAlign: 'center', padding: '2rem' }}>
              No hay backups disponibles
            </p>
          ) : (
            <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
              {backups.map((backup) => (
                <div
                  key={backup.filename}
                  onClick={() => setSelectedBackup(backup.filename)}
                  style={{
                    padding: '0.75rem',
                    borderRadius: '4px',
                    marginBottom: '0.5rem',
                    cursor: 'pointer',
                    backgroundColor: selectedBackup === backup.filename ? '#d1fae5' : '#f9fafb',
                    border: selectedBackup === backup.filename ? '2px solid #10b981' : '2px solid transparent'
                  }}
                >
                  <div style={{ fontWeight: '500' }}>{backup.filename}</div>
                  <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                    {backup.sizeFormatted} - {formatDate(backup.createdAt)}
                  </div>
                </div>
              ))}
            </div>
          )}

          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
            <label style={{
              backgroundColor: '#f3f4f6',
              padding: '0.5rem 1rem',
              borderRadius: '4px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.25rem',
              fontSize: '0.875rem'
            }}>
              <Upload size={16} />
              Subir Backup
              <input
                type="file"
                accept=".sql"
                onChange={handleUpload}
                style={{ display: 'none' }}
              />
            </label>

            <button
              onClick={() => setShowRestoreModal(true)}
              disabled={!selectedBackup || isRestoring}
              style={{
                backgroundColor: selectedBackup ? '#10b981' : '#d1d5db',
                color: 'white',
                padding: '0.5rem 1rem',
                borderRadius: '4px',
                border: 'none',
                cursor: selectedBackup ? 'pointer' : 'not-allowed',
                display: 'flex',
                alignItems: 'center',
                gap: '0.25rem',
                fontSize: '0.875rem'
              }}
            >
              <RefreshCw size={16} />
              Restaurar Seleccionado
            </button>
          </div>
        </div>

        {/* Logs */}
        <div style={{
          backgroundColor: 'white',
          borderRadius: '8px',
          padding: '1rem',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
        }}>
          <h2 style={{ fontWeight: 'bold', marginBottom: '1rem' }}>Logs</h2>
          <div style={{
            backgroundColor: '#1f2937',
            color: '#10b981',
            padding: '1rem',
            borderRadius: '4px',
            fontFamily: 'monospace',
            fontSize: '0.75rem',
            maxHeight: '200px',
            overflowY: 'auto'
          }}>
            {logs.length === 0 ? (
              <span style={{ color: '#6b7280' }}>Esperando acciones...</span>
            ) : (
              logs.map((log, index) => (
                <div key={index}>&gt; {log}</div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Restore Modal */}
      {showRestoreModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '8px',
            padding: '1.5rem',
            maxWidth: '500px',
            width: '90%',
            maxHeight: '80vh',
            overflowY: 'auto'
          }}>
            {!isRestoring && !restoreResult ? (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                  <AlertTriangle size={24} color="#f59e0b" />
                  <h3 style={{ fontWeight: 'bold' }}>Confirmar Restauracion</h3>
                </div>

                <p style={{ marginBottom: '1rem' }}>
                  Vas a restaurar el backup:
                </p>
                <p style={{ fontWeight: 'bold', marginBottom: '1rem', wordBreak: 'break-all' }}>
                  {selectedBackup}
                </p>

                <div style={{
                  backgroundColor: '#fef3c7',
                  padding: '0.75rem',
                  borderRadius: '4px',
                  marginBottom: '1rem'
                }}>
                  <strong>Advertencia:</strong> Esto reemplazara todos los datos actuales de la base de datos.
                </div>

                <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                  <button
                    onClick={() => setShowRestoreModal(false)}
                    style={{
                      padding: '0.5rem 1rem',
                      borderRadius: '4px',
                      border: '1px solid #d1d5db',
                      backgroundColor: 'white',
                      cursor: 'pointer'
                    }}
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleRestore}
                    style={{
                      padding: '0.5rem 1rem',
                      borderRadius: '4px',
                      border: 'none',
                      backgroundColor: '#dc2626',
                      color: 'white',
                      cursor: 'pointer'
                    }}
                  >
                    Restaurar
                  </button>
                </div>
              </>
            ) : isRestoring ? (
              <div style={{ textAlign: 'center', padding: '2rem' }}>
                <RefreshCw size={48} color="#10b981" style={{ animation: 'spin 1s linear infinite' }} />
                <p style={{ marginTop: '1rem', fontWeight: 'bold' }}>Restaurando backup...</p>
                <p style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                  Esto puede tardar varios minutos
                </p>
              </div>
            ) : restoreResult ? (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                  {restoreResult.success ? (
                    <CheckCircle size={24} color="#10b981" />
                  ) : (
                    <AlertTriangle size={24} color="#dc2626" />
                  )}
                  <h3 style={{ fontWeight: 'bold' }}>
                    {restoreResult.success ? 'Restauracion Exitosa' : 'Error en Restauracion'}
                  </h3>
                </div>

                {restoreResult.success && restoreResult.dataStats && (
                  <>
                    <p style={{ fontWeight: '500', marginBottom: '0.5rem' }}>Datos restaurados:</p>
                    <div style={{ marginBottom: '1rem' }}>
                      {Object.entries(restoreResult.dataStats).map(([tabla, total]) => (
                        <div key={tabla} style={{ fontSize: '0.875rem' }}>
                          - {tabla}: {total} registros
                        </div>
                      ))}
                    </div>

                    {restoreResult.credentials && (
                      <>
                        <p style={{ fontWeight: '500', marginBottom: '0.5rem' }}>Credenciales reseteadas:</p>
                        <div style={{
                          backgroundColor: '#f3f4f6',
                          padding: '0.5rem',
                          borderRadius: '4px',
                          fontSize: '0.875rem'
                        }}>
                          {restoreResult.credentials.map((cred) => (
                            <div key={cred.username}>
                              {cred.username}: {cred.password}
                            </div>
                          ))}
                        </div>
                      </>
                    )}
                  </>
                )}

                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem' }}>
                  <button
                    onClick={() => {
                      setShowRestoreModal(false)
                      setRestoreResult(null)
                    }}
                    style={{
                      padding: '0.5rem 1rem',
                      borderRadius: '4px',
                      border: 'none',
                      backgroundColor: '#10b981',
                      color: 'white',
                      cursor: 'pointer'
                    }}
                  >
                    Cerrar
                  </button>
                </div>
              </>
            ) : null}
          </div>
        </div>
      )}

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .animate-spin {
          animation: spin 1s linear infinite;
        }
      `}</style>
    </div>
  )
}

export default App
