import React, { useEffect, useState } from 'react';
import { UserPlus, Edit, Trash2, Lock, Save, X, Search, Upload, FileText, Download, Check, AlertTriangle, Loader2 } from 'lucide-react';
import { useToast } from '../context/ToastContext';
import { useConfirm } from '../context/ConfirmContext';

interface UserData {
  id: number;
  username: string;
  nombre: string;
  rol: string;
  estado: string;
  assignedCourses?: { base: string; letra: string; }[];
}

interface ImportResult {
  success: boolean;
  created: number;
  errors: string[];
  duplicates: string[];
}

const UserManagement: React.FC = () => {
  const toast = useToast();
  const confirm = useConfirm();
  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState<boolean>(false);
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newNombre, setNewNombre] = useState('');
  const [newRol, setNewRol] = useState('profesor'); // Valor por defecto
  const [createError, setCreateError] = useState<string | null>(null);
  const [createSuccess, setCreateSuccess] = useState<string | null>(null);

  const [editingUser, setEditingUser] = useState<UserData | null>(null);
  const [editNombre, setEditNombre] = useState('');
  const [editRol, setEditRol] = useState('');
  const [editEstado, setEditEstado] = useState('');
  const [editError, setEditError] = useState<string | null>(null);
  const [editSuccess, setEditSuccess] = useState<string | null>(null);

  const [changingPasswordUser, setChangingPasswordUser] = useState<UserData | null>(null);
  const [newPasswordForUser, setNewPasswordForUser] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);

  const [searchTerm, setSearchTerm] = useState<string>('');
  const [roleFilter, setRoleFilter] = useState<string>('all');

  // Import functionality state
  const [showImportSection, setShowImportSection] = useState<boolean>(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const fetchUsers = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/users', {
        credentials: 'include',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Error al cargar usuarios.');
      }

      const data: UserData[] = await response.json();
      setUsers(data);
    } catch (err: any) {
      console.error('Error al obtener usuarios:', err);
      setError(err.message || 'Error desconocido al cargar usuarios.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError(null);
    setCreateSuccess(null);

    if (!newUsername || !newPassword || !newNombre || !newRol) {
      setCreateError('Todos los campos son obligatorios.');
      return;
    }

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          username: newUsername,
          password: newPassword,
          nombre: newNombre,
          rol: newRol,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setCreateError(data.message || 'Error al crear usuario.');
        return;
      }

      setCreateSuccess('Usuario creado exitosamente!');
      setNewUsername('');
      setNewPassword('');
      setNewNombre('');
      setNewRol('profesor');
      setShowCreateForm(false);
      fetchUsers();

    } catch (err: any) {
      console.error('Error al crear usuario:', err);
      setCreateError('Error de red o del servidor al crear usuario.');
    }
  };

  const handleEditClick = (user: UserData) => {
    setEditingUser(user);
    setEditNombre(user.nombre);
    setEditRol(user.rol);
    setEditEstado(user.estado);
    setEditError(null);
    setEditSuccess(null);
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;

    setEditError(null);
    setEditSuccess(null);

    if (!editNombre || !editRol || !editEstado) {
      setEditError('Nombre, rol y estado son obligatorios.');
      return;
    }

    try {
      const response = await fetch(`/api/users/${editingUser.id}`, {
        method: 'PUT',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          username: editingUser.username,
          nombre: editNombre,
          rol: editRol,
          estado: editEstado,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setEditError(data.message || 'Error al actualizar usuario.');
        return;
      }

      setEditSuccess('Usuario actualizado exitosamente!');
      setEditingUser(null);
      fetchUsers();

    } catch (err: any) {
      console.error('Error al actualizar usuario:', err);
      setEditError('Error de red o del servidor al actualizar usuario.');
    }
  };

  const handleDeleteUser = async (userId: number) => {
    if (!(await confirm('¿Estás seguro de que quieres desactivar este usuario?'))) {
      return;
    }

    try {
      const response = await fetch(`/api/users/${userId}`, {
        method: 'DELETE',
        credentials: 'include'
      });

      const data = await response.json();

      if (!response.ok) {
        toast.error(data.message || 'Error al desactivar usuario.');
        return;
      }

      toast.success('Usuario desactivado exitosamente!');
      fetchUsers();

    } catch (err: any) {
      console.error('Error al desactivar usuario:', err);
      toast.error('Error de red o del servidor al desactivar usuario.');
    }
  };

  const handleChangePasswordClick = (user: UserData) => {
    setChangingPasswordUser(user);
    setNewPasswordForUser('');
    setConfirmPassword('');
    setPasswordError(null);
    setPasswordSuccess(null);
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!changingPasswordUser) return;

    setPasswordError(null);
    setPasswordSuccess(null);

    if (!newPasswordForUser || newPasswordForUser.length < 6) {
      setPasswordError('La contraseña debe tener al menos 6 caracteres.');
      return;
    }

    if (newPasswordForUser !== confirmPassword) {
      setPasswordError('Las contraseñas no coinciden.');
      return;
    }

    try {
      const response = await fetch(`/api/users/${changingPasswordUser.id}/password`, {
        method: 'PUT',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          newPassword: newPasswordForUser,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setPasswordError(data.message || 'Error al cambiar contraseña.');
        return;
      }

      setPasswordSuccess(data.message);
      setChangingPasswordUser(null);
      setNewPasswordForUser('');
      setConfirmPassword('');

    } catch (err: any) {
      console.error('Error al cambiar contraseña:', err);
      setPasswordError('Error de red o del servidor al cambiar contraseña.');
    }
  };

  // Import functionality methods
  const handleImportFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      if (selectedFile.type === 'text/csv' || selectedFile.name.toLowerCase().endsWith('.csv')) {
        // Additional file size check (5MB limit)
        if (selectedFile.size > 5 * 1024 * 1024) {
          toast.error('El archivo es demasiado grande. El tamaño máximo permitido es 5MB.');
          return;
        }
        setImportFile(selectedFile);
        setImportResult(null);
      } else {
        toast.error('Por favor seleccione un archivo CSV válido (.csv).\n\nFormato requerido:\n• Archivo con extensión .csv\n• Separado por comas\n• Codificación UTF-8');
      }
    }
  };

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragOver(false);
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragOver(false);
    
    const droppedFile = event.dataTransfer.files[0];
    if (droppedFile) {
      if (droppedFile.type === 'text/csv' || droppedFile.name.toLowerCase().endsWith('.csv')) {
        // Additional file size check (5MB limit)
        if (droppedFile.size > 5 * 1024 * 1024) {
          toast.error('El archivo es demasiado grande. El tamaño máximo permitido es 5MB.');
          return;
        }
        setImportFile(droppedFile);
        setImportResult(null);
      } else {
        toast.error('Por favor seleccione un archivo CSV válido (.csv).\n\nFormato requerido:\n• Archivo con extensión .csv\n• Separado por comas\n• Codificación UTF-8');
      }
    }
  };

  const handleImportUpload = async () => {
    if (!importFile) return;

    console.log('🔄 Iniciando importación de usuarios');
    console.log('📁 Archivo seleccionado:', {
      name: importFile.name,
      size: importFile.size,
      type: importFile.type,
      lastModified: new Date(importFile.lastModified)
    });

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('csvFile', importFile);

      console.log('📤 FormData creado, enviando petición...');

      const response = await fetch('/api/users/import', {
        method: 'POST',
        credentials: 'include',
        body: formData
      });

      console.log('📥 Respuesta recibida:', {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok,
        headers: Object.fromEntries(response.headers.entries())
      });

      // Verificar si la respuesta es JSON válido antes de parsearlo
      const contentType = response.headers.get('content-type');
      console.log('📋 Content-Type:', contentType);
      
      const responseText = await response.text();
      console.log('📄 Respuesta como texto:', responseText.substring(0, 500) + (responseText.length > 500 ? '...' : ''));
      
      let data;
      try {
        data = JSON.parse(responseText);
        console.log('✅ JSON parseado exitosamente:', data);
      } catch (parseError) {
        console.error('❌ Error al parsear JSON:', parseError);
        console.error('📄 Texto completo de la respuesta:', responseText);
        throw new Error(`El servidor devolvió una respuesta no-JSON: "${responseText.substring(0, 200)}..."`);
      }

      if (response.ok) {
        setImportResult(data);
        fetchUsers(); // Refresh the user list
      } else {
        // Better error handling with specific messages
        let errorMessage = 'Error desconocido al importar usuarios';
        
        if (response.status === 400) {
          errorMessage = data.message || 'Error de formato en el archivo CSV. Verifique que el archivo tenga el formato correcto y los datos requeridos.';
        } else if (response.status === 401) {
          errorMessage = 'No tiene autorización para realizar esta operación.';
        } else if (response.status === 413) {
          errorMessage = 'El archivo es demasiado grande. El tamaño máximo permitido es 5MB.';
        } else if (response.status >= 500) {
          errorMessage = 'Error interno del servidor. Inténtelo de nuevo más tarde.';
        } else if (data.message) {
          errorMessage = data.message;
        }
        
        toast.error(`Error al importar usuarios:\n\n${errorMessage}`);
      }
    } catch (error) {
      console.error('Error importing users:', error);
      console.error('Error type:', typeof error);
      console.error('Error details:', {
        message: error instanceof Error ? error.message : String(error),
        name: error instanceof Error ? error.name : 'Unknown',
        stack: error instanceof Error ? error.stack : 'No stack trace'
      });
      
      let errorMessage = 'Error de conexión al servidor.';
      
      if (error instanceof TypeError && error.message.includes('fetch')) {
        errorMessage = 'No se pudo conectar al servidor. Verifique su conexión a internet.';
      } else if (error instanceof SyntaxError && error.message.includes('JSON.parse')) {
        errorMessage = 'El servidor devolvió una respuesta inválida. Esto podría indicar:\n• Un error interno del servidor\n• Problemas con el formato del archivo\n• El archivo no se reconoce como CSV válido';
      } else if (error instanceof Error) {
        errorMessage = `Error de red: ${error.message}`;
      }
      
      toast.error(`Error al importar usuarios:\n\n${errorMessage}\n\nDetalles técnicos:\n• Error: ${error instanceof Error ? error.name : 'Unknown'}\n• Mensaje: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsUploading(false);
    }
  };

  const downloadTemplate = () => {
    const csvContent = `usuario,contraseña,nombre_completo,rol
12345678,31-01-1980,Juan Pérez González,profesor
87654321,15-06-1975,María Rodríguez López,inspector
23456789,10-12-1985,Ana Silva Martínez,administrador
34567890,22-03-1990,Carlos López Torres,sololectura`;

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'plantilla_usuarios.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const handleExportUsers = async () => {
    try {
      const response = await fetch('/api/users/export', {
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error('Error al exportar usuarios');
      }

      // Obtener el blob del CSV
      const blob = await response.blob();

      // Crear URL para descarga
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;

      // Obtener nombre del archivo de los headers o usar uno por defecto
      const contentDisposition = response.headers.get('Content-Disposition');
      const filename = contentDisposition
        ? contentDisposition.split('filename=')[1].replace(/"/g, '')
        : `usuarios_${new Date().toISOString().split('T')[0]}.csv`;

      a.download = filename;
      document.body.appendChild(a);
      a.click();

      // Limpiar
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Error al exportar usuarios:', error);
      toast.error('Error al exportar usuarios. Por favor, inténtelo de nuevo.');
    }
  };

  // Filter users based on search term and role
  const filteredUsers = users.filter(user => {
    const matchesSearch = user.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.username.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = roleFilter === 'all' || user.rol === roleFilter;
    return matchesSearch && matchesRole;
  });

  if (loading) {
    return (
      <div className="ios-form-section">
        <div className="ios-card p-8 text-center">
          <UserPlus size={48} className="mx-auto mb-4" style={{color: 'var(--color-primary)'}} />
          <p className="ios-title">Cargando usuarios...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return <div className="ios-container py-8"><div className="ios-card p-8 text-center" style={{backgroundColor: 'var(--color-error)', color: 'white'}}><p className="ios-title">Error: {error}</p></div></div>;
  }

  return (
    <div className="ios-form-section">
      <div className="flex items-center space-x-4 mb-6">
        <img 
          src="/InsigniaEcuador.png" 
          alt="Escuela Ecuador" 
          className="h-10 w-10 object-contain"
        />
        <UserPlus size={32} style={{color: 'var(--color-primary)'}} />
        <h3 className="ios-title">Gestión de Usuarios</h3>
      </div>

      <div className="mb-4 flex justify-end space-x-3">
        <button
          onClick={handleExportUsers}
          className="ios-btn ios-btn-secondary"
          title="Exportar lista de usuarios a CSV"
        >
          <Download size={16} className="mr-2" />
          Exportar CSV
        </button>
        <button
          onClick={() => setShowImportSection(!showImportSection)}
          className="ios-btn ios-btn-secondary"
        >
          {showImportSection ? (
            <>
              <X size={16} className="mr-2" />
              Cerrar Importar
            </>
          ) : (
            <>
              <Upload size={16} className="mr-2" />
              Importación Masiva
            </>
          )}
        </button>
        <button
          onClick={() => setShowCreateForm(!showCreateForm)}
          className="ios-btn ios-btn-primary"
        >
          {showCreateForm ? (
            <>
              <X size={16} className="mr-2" />
              Cancelar
            </>
          ) : (
            <>
              <UserPlus size={16} className="mr-2" />
              Crear Nuevo Usuario
            </>
          )}
        </button>
      </div>

      {/* Filtros de búsqueda */}
      <div className="ios-card p-4 mb-6">
        <div className="ios-grid ios-grid-2">
          <div className="relative">
            <Search size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2" style={{color: 'var(--color-text-light)'}} />
            <input
              type="text"
              placeholder="Buscar por nombre o usuario..."
              className="ios-form-input pl-10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div>
            <select
              className="ios-form-input"
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
            >
              <option value="all">Todos los roles</option>
              <option value="administrador">Administradores</option>
              <option value="inspector">Inspectores</option>
              <option value="profesor">Profesores</option>
              <option value="sololectura">Solo Lectura</option>
            </select>
          </div>
        </div>
      </div>

      {showImportSection && (
        <div className="space-y-6 mb-8">
          {/* Template Download */}
          <div className="ios-card p-6">
            <h4 className="ios-subtitle mb-4">📋 Plantilla CSV</h4>
            <p className="ios-body mb-4" style={{color: 'var(--color-secondary)'}}>
              Descarga la plantilla con el formato correcto para importar usuarios.
            </p>
            
            <div className="ios-card p-4 mb-4" style={{backgroundColor: 'var(--color-background-alt)'}}>
              <h5 className="ios-subtitle mb-2">Formato requerido:</h5>
              <ul className="text-sm space-y-1 mb-3" style={{color: 'var(--color-secondary)'}}>
                <li><strong>Usuario:</strong> RUT sin puntos, sin guión, sin DV (ej: 12345678)</li>
                <li><strong>Contraseña:</strong> Fecha de nacimiento DD-MM-YYYY (ej: 31-01-1980)</li>
                <li><strong>Nombre Completo:</strong> Nombre completo del usuario (mín. 3 caracteres)</li>
                <li><strong>Rol:</strong> profesor, inspector, administrador, sololectura</li>
              </ul>
              
              <div className="text-xs" style={{color: 'var(--color-text-light)'}}>
                <p className="font-semibold mb-1">⚠️ Validaciones importantes:</p>
                <ul className="space-y-0.5 ml-4">
                  <li>• RUT debe tener 7-8 dígitos</li>
                  <li>• Fecha debe ser válida y estar entre 1900-2100</li>
                  <li>• No se crearán usuarios duplicados</li>
                  <li>• Archivo máximo: 5MB</li>
                  <li>• Codificación: UTF-8</li>
                </ul>
              </div>
            </div>

            <button
              onClick={downloadTemplate}
              className="ios-btn ios-btn-secondary flex items-center gap-2"
            >
              <Download size={18} />
              Descargar Plantilla CSV
            </button>
          </div>

          {/* File Upload */}
          <div className="ios-card p-6">
            <h4 className="ios-subtitle mb-4">📁 Subir Archivo CSV</h4>
            
            <div
              className="border-2 border-dashed rounded-lg p-8 text-center transition-colors"
              style={{
                borderColor: dragOver ? 'var(--color-primary)' : 'var(--color-border)',
                backgroundColor: dragOver ? 'var(--color-primary-light)' : 'var(--color-card-elevated)'
              }}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              <Upload size={48} className="mx-auto mb-4" style={{color: dragOver ? 'var(--color-primary)' : 'var(--color-text-light)'}} />
              <p className="ios-body mb-2">
                Arrastra tu archivo CSV aquí o
              </p>
              <label className="ios-btn ios-btn-primary cursor-pointer">
                <FileText size={18} className="mr-2" />
                Seleccionar Archivo
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleImportFileChange}
                  className="hidden"
                />
              </label>
            </div>

            {importFile && (
              <div className="mt-4 ios-card p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <FileText size={20} style={{color: 'var(--color-primary)'}} />
                    <div>
                      <p className="ios-subtitle">{importFile.name}</p>
                      <p className="ios-caption" style={{color: 'var(--color-secondary)'}}>
                        {(importFile.size / 1024).toFixed(1)} KB
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={handleImportUpload}
                    disabled={isUploading}
                    className={`ios-btn flex items-center gap-2 ${
                      isUploading ? 'ios-btn-secondary' : 'ios-btn-primary'
                    }`}
                  >
                    {isUploading ? (
                      <>
                        <Loader2 size={18} className="animate-spin" />
                        Importando...
                      </>
                    ) : (
                      <>
                        <Upload size={18} />
                        Importar Usuarios
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Results */}
          {importResult && (
            <div className="ios-card p-6">
              <div className="flex items-center gap-3 mb-4">
                {importResult.success ? (
                  <Check size={24} style={{color: 'var(--color-success)'}} />
                ) : (
                  <X size={24} style={{color: 'var(--color-error)'}} />
                )}
                <h4 className="ios-subtitle">
                  {importResult.success ? 'Importación Completada' : 'Importación con Errores'}
                </h4>
              </div>

              <div className="space-y-4">
                {importResult.created > 0 && (
                  <div className="ios-card p-4" style={{backgroundColor: 'var(--color-success)', color: 'white'}}>
                    <div className="flex items-center gap-2">
                      <Check size={20} />
                      <span className="ios-subtitle">
                        {importResult.created} usuario{importResult.created !== 1 ? 's' : ''} creado{importResult.created !== 1 ? 's' : ''} exitosamente
                      </span>
                    </div>
                  </div>
                )}

                {importResult.duplicates.length > 0 && (
                  <div className="ios-card p-4" style={{backgroundColor: 'var(--color-warning)', color: 'white'}}>
                    <div className="flex items-center gap-2 mb-2">
                      <AlertTriangle size={20} />
                      <span className="ios-subtitle">Usuarios Duplicados (No Creados):</span>
                    </div>
                    <ul className="text-sm space-y-1 ml-6">
                      {importResult.duplicates.map((dup, index) => (
                        <li key={index}>• {dup}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {importResult.errors.length > 0 && (
                  <div className="ios-card p-4" style={{backgroundColor: 'var(--color-error)', color: 'white'}}>
                    <div className="flex items-center gap-2 mb-2">
                      <X size={20} />
                      <span className="ios-subtitle">Errores de Validación:</span>
                    </div>
                    <ul className="text-sm space-y-1 ml-6">
                      {importResult.errors.map((error, index) => (
                        <li key={index}>• {error}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              <button
                onClick={() => {
                  setImportResult(null);
                  setImportFile(null);
                }}
                className="ios-btn ios-btn-secondary mt-4"
              >
                Importar Otro Archivo
              </button>
            </div>
          )}
        </div>
      )}

      {showCreateForm && (
        <div className="ios-card mb-8 p-6">
          <h3 className="ios-title mb-4">Crear Nuevo Usuario</h3>
          <form onSubmit={handleCreateUser} className="ios-grid ios-grid-2">
            <div>
              <label htmlFor="newUsername" className="ios-form-label">Usuario</label>
              <input
                type="text"
                id="newUsername"
                className="ios-form-input"
                value={newUsername}
                onChange={(e) => setNewUsername(e.target.value)}
                required
              />
            </div>
            <div>
              <label htmlFor="newPassword" className="ios-form-label">Contraseña</label>
              <input
                type="password"
                id="newPassword"
                className="ios-form-input"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
              />
            </div>
            <div>
              <label htmlFor="newNombre" className="ios-form-label">Nombre Completo</label>
              <input
                type="text"
                id="newNombre"
                className="ios-form-input"
                value={newNombre}
                onChange={(e) => setNewNombre(e.target.value)}
                required
              />
            </div>
            <div>
              <label htmlFor="newRol" className="ios-form-label">Rol</label>
              <select
                id="newRol"
                className="ios-form-input"
                value={newRol}
                onChange={(e) => setNewRol(e.target.value)}
                required
              >
                <option value="profesor">Profesor</option>
                <option value="inspector">Inspector</option>
                <option value="administrador">Administrador</option>
                <option value="sololectura">Solo Lectura</option>
              </select>
            </div>
            <div className="md:col-span-2 flex justify-end">
              <button
                type="submit"
                className="ios-btn ios-btn-primary"
              >
                <UserPlus size={16} className="mr-2" />
                Crear Usuario
              </button>
            </div>
          </form>
          {createError && <div className="ios-card p-3 mt-4" style={{backgroundColor: 'var(--color-error)', color: 'white'}}><p className="text-sm">{createError}</p></div>}
          {createSuccess && <div className="ios-card p-3 mt-4" style={{backgroundColor: 'var(--color-success)', color: 'white'}}><p className="text-sm">{createSuccess}</p></div>}
        </div>
      )}

      {editingUser && (
        <div className="ios-card mb-8 p-6" style={{backgroundColor: 'var(--color-primary-light)'}}>
          <h3 className="ios-title mb-4">Editar Usuario: {editingUser.username}</h3>
          <form onSubmit={handleUpdateUser} className="ios-grid ios-grid-2">
            <div>
              <label htmlFor="editNombre" className="ios-form-label">Nombre Completo</label>
              <input
                type="text"
                id="editNombre"
                className="ios-form-input"
                value={editNombre}
                onChange={(e) => setEditNombre(e.target.value)}
                required
              />
            </div>
            <div>
              <label htmlFor="editRol" className="ios-form-label">Rol</label>
              <select
                id="editRol"
                className="ios-form-input"
                value={editRol}
                onChange={(e) => setEditRol(e.target.value)}
                required
              >
                <option value="profesor">Profesor</option>
                <option value="inspector">Inspector</option>
                <option value="administrador">Administrador</option>
                <option value="sololectura">Solo Lectura</option>
              </select>
            </div>
            <div>
              <label htmlFor="editEstado" className="ios-form-label">Estado</label>
              <select
                id="editEstado"
                className="ios-form-input"
                value={editEstado}
                onChange={(e) => setEditEstado(e.target.value)}
                required
              >
                <option value="activo">Activo</option>
                <option value="inactivo">Inactivo</option>
              </select>
            </div>
            <div className="md:col-span-2 flex justify-end space-x-2">
              <button
                type="button"
                onClick={() => setEditingUser(null)}
                className="ios-btn ios-btn-secondary"
              >
                <X size={16} className="mr-2" />
                Cancelar
              </button>
              <button
                type="submit"
                className="ios-btn ios-btn-primary"
              >
                <Save size={16} className="mr-2" />
                Actualizar Usuario
              </button>
            </div>
          </form>
          {editError && <div className="ios-card p-3 mt-4" style={{backgroundColor: 'var(--color-error)', color: 'white'}}><p className="text-sm">{editError}</p></div>}
          {editSuccess && <div className="ios-card p-3 mt-4" style={{backgroundColor: 'var(--color-success)', color: 'white'}}><p className="text-sm">{editSuccess}</p></div>}
        </div>
      )}

      {changingPasswordUser && (
        <div className="ios-card mb-8 p-6" style={{backgroundColor: 'var(--color-warning)', color: 'white'}}>
          <h3 className="ios-title mb-4">🔒 Cambiar Contraseña: {changingPasswordUser.nombre} (@{changingPasswordUser.username})</h3>
          <form onSubmit={handleChangePassword} className="space-y-4">
            <div>
              <label htmlFor="newPasswordForUser" className="ios-form-label">Nueva Contraseña</label>
              <input
                type="password"
                id="newPasswordForUser"
                className="ios-form-input"
                value={newPasswordForUser}
                onChange={(e) => setNewPasswordForUser(e.target.value)}
                placeholder="Mínimo 6 caracteres"
                required
              />
            </div>
            <div>
              <label htmlFor="confirmPassword" className="ios-form-label">Confirmar Contraseña</label>
              <input
                type="password"
                id="confirmPassword"
                className="ios-form-input"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repita la nueva contraseña"
                required
              />
            </div>
            <div className="flex justify-end space-x-2">
              <button
                type="button"
                onClick={() => setChangingPasswordUser(null)}
                className="ios-btn ios-btn-secondary"
              >
                <X size={16} className="mr-2" />
                Cancelar
              </button>
              <button
                type="submit"
                className="ios-btn ios-btn-danger"
              >
                <Lock size={16} className="mr-2" />
                Cambiar Contraseña
              </button>
            </div>
          </form>
          {passwordError && <div className="ios-card p-3 mt-4" style={{backgroundColor: 'var(--color-error)', color: 'white'}}><p className="text-sm">{passwordError}</p></div>}
          {passwordSuccess && <div className="ios-card p-3 mt-4" style={{backgroundColor: 'var(--color-success)', color: 'white'}}><p className="text-sm">{passwordSuccess}</p></div>}
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full ios-card">
          <thead>
            <tr style={{backgroundColor: 'var(--color-card)'}}>
              <th className="py-3 px-5 text-left ios-caption font-semibold uppercase tracking-wider border-b-2" style={{color: 'var(--color-text-light)', borderColor: 'var(--color-border)'}}>ID</th>
              <th className="py-3 px-5 text-left ios-caption font-semibold uppercase tracking-wider border-b-2" style={{color: 'var(--color-text-light)', borderColor: 'var(--color-border)'}}>Usuario</th>
              <th className="py-3 px-5 text-left ios-caption font-semibold uppercase tracking-wider border-b-2" style={{color: 'var(--color-text-light)', borderColor: 'var(--color-border)'}}>Nombre</th>
              <th className="py-3 px-5 text-left ios-caption font-semibold uppercase tracking-wider border-b-2" style={{color: 'var(--color-text-light)', borderColor: 'var(--color-border)'}}>Rol</th>
              <th className="py-3 px-5 text-left ios-caption font-semibold uppercase tracking-wider border-b-2" style={{color: 'var(--color-text-light)', borderColor: 'var(--color-border)'}}>Estado</th>
              <th className="py-3 px-5 text-left ios-caption font-semibold uppercase tracking-wider border-b-2 w-32" style={{color: 'var(--color-text-light)', borderColor: 'var(--color-border)'}}>Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y" style={{borderColor: 'var(--color-border)'}}>
            {filteredUsers.map((user) => (
              <tr key={user.id} className="hover:bg-opacity-50 transition-colors" style={{color: 'var(--color-foreground)'}}>
                <td className="py-4 px-5 ios-body">{user.id}</td>
                <td className="py-4 px-5 ios-body">{user.username}</td>
                <td className="py-4 px-5 ios-body">{user.nombre}</td>
                <td className="py-4 px-5 ios-body">{user.rol}</td>
                <td className="py-4 px-5 ios-body">
                  <span
                    className="px-2 inline-flex ios-caption font-semibold rounded-full text-white"
                    style={{
                      backgroundColor: user.estado === 'activo' ? 'var(--color-success)' : 'var(--color-error)'
                    }}
                  >
                    {user.estado}
                  </span>
                </td>
                <td className="py-4 px-5 text-sm">
                  <div className="flex flex-col space-y-1 min-w-max">
                    <button
                      onClick={() => handleEditClick(user)}
                      className="ios-btn ios-btn-primary text-xs py-1 px-2 w-full"
                    >
                      <Edit size={12} className="mr-1" />
                      Editar
                    </button>
                    <div className="flex space-x-1">
                      <button
                        onClick={() => handleChangePasswordClick(user)}
                        className="ios-btn ios-btn-secondary text-xs py-1 px-1 flex-1"
                        title="Cambiar contraseña"
                      >
                        <Lock size={12} />
                      </button>
                      <button
                        onClick={() => handleDeleteUser(user.id)}
                        className="ios-btn ios-btn-danger text-xs py-1 px-1 flex-1"
                        title="Desactivar usuario"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default UserManagement;
