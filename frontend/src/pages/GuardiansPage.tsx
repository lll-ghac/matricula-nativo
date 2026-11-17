import React, { useState, useEffect } from 'react';
import { calculateDV } from '../utils/rutUtils';
import { nacionalidades } from '../utils/chilean-data';
import { convertToISO, convertFromISO } from '../utils/dateUtils';
import { useToast } from '../context/ToastContext';
import { useConfirm } from '../context/ConfirmContext';

interface Guardian {
  id?: number;
  tipo_documento?: string;
  rut?: number;
  dv?: string;
  dni?: string;
  pasaporte?: string;
  nombre?: string;
  apellido_paterno?: string;
  apellido_materno?: string;
  parentesco?: string;
  fecha_nacimiento?: string;
  genero?: string;
  nacionalidad?: string;
  direccion?: string;
  complemento_direccion?: string;
  celular?: string;
  email?: string;
}

interface Student {
  id: number;
  rut: number;
  dv: string;
  nombres: string;
  apellido_paterno: string;
  apellido_materno: string;
  curso_base: string;
  letra: string;
  anio_matricula: number;
  estado: string;
  es_apoderado_principal: boolean;
}

interface GuardiansPageProps {
  userRole?: string;
}

const GuardiansPage: React.FC<GuardiansPageProps> = ({ userRole }) => {
  const toast = useToast();
  const confirm = useConfirm();
  const [guardians, setGuardians] = useState<Guardian[]>([]);
  const [filteredGuardians, setFilteredGuardians] = useState<Guardian[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingGuardian, setEditingGuardian] = useState<Guardian | null>(null);
  const [selectedGuardian, setSelectedGuardian] = useState<Guardian | null>(null);
  const [guardianStudents, setGuardianStudents] = useState<Student[]>([]);

  const [formData, setFormData] = useState<Guardian>({
    tipo_documento: 'RUT',
    nombre: '',
    apellido_paterno: '',
    apellido_materno: '',
    genero: '',
    nacionalidad: 'Chilena',
    direccion: '',
    celular: '',
    fecha_nacimiento: ''
  });

  useEffect(() => {
    loadGuardians();
  }, []);

  useEffect(() => {
    if (searchTerm.trim() === '') {
      setFilteredGuardians(guardians);
    } else {
      const term = searchTerm.toLowerCase();
      const filtered = guardians.filter(g =>
        (g.nombre ?? '').toLowerCase().includes(term) ||
        (g.apellido_paterno ?? '').toLowerCase().includes(term) ||
        (g.apellido_materno ?? '').toLowerCase().includes(term) ||
        (g.rut && g.rut.toString().includes(term)) ||
        (g.dni && g.dni.toLowerCase().includes(term)) ||
        (g.pasaporte && g.pasaporte.toLowerCase().includes(term))
      );
      setFilteredGuardians(filtered);
    }
  }, [searchTerm, guardians]);

  const loadGuardians = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/guardians', {
        credentials: 'include'
      });
      if (response.ok) {
        const data = await response.json();
        setGuardians(data);
        setFilteredGuardians(data);
      }
    } catch (error) {
      console.error('Error cargando apoderados:', error);
      toast.error('Error al cargar la lista de apoderados');
    } finally {
      setLoading(false);
    }
  };

  const loadGuardianStudents = async (guardianId: number) => {
    try {
      const response = await fetch(`/api/guardians/${guardianId}/students`, {
        credentials: 'include'
      });
      if (response.ok) {
        const data = await response.json();
        setGuardianStudents(data);
      }
    } catch (error) {
      console.error('Error cargando estudiantes:', error);
    }
  };

  const handleNew = () => {
    setEditingGuardian(null);
    setFormData({
      tipo_documento: 'RUT',
      nombre: '',
      apellido_paterno: '',
      apellido_materno: '',
      genero: '',
      nacionalidad: 'Chilena',
      direccion: '',
      celular: '',
      fecha_nacimiento: ''
    });
    setShowForm(true);
  };

  const handleEdit = (guardian: Guardian) => {
    setEditingGuardian(guardian);
    setFormData({ ...guardian });
    setShowForm(true);
  };

  const handleView = async (guardian: Guardian) => {
    setSelectedGuardian(guardian);
    if (guardian.id) {
      await loadGuardianStudents(guardian.id);
    }
  };

  const handleDelete = async (guardian: Guardian) => {
    if (!(await confirm(`¿Está seguro de eliminar al apoderado ${guardian.nombre} ${guardian.apellido_paterno}?`))) {
      return;
    }

    try {
      const response = await fetch(`/api/guardians/${guardian.id}`, {
        method: 'DELETE',
        credentials: 'include'
      });

      if (response.ok) {
        toast.success('Apoderado eliminado exitosamente');
        loadGuardians();
      } else {
        const error = await response.json();
        toast.error(error.message || 'Error al eliminar apoderado');
      }
    } catch (error) {
      console.error('Error eliminando apoderado:', error);
      toast.error('Error al eliminar apoderado');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validaciones
    if (!formData.nombre || !formData.apellido_paterno || !formData.apellido_materno) {
      toast.error('Complete los campos obligatorios: Nombre, Apellidos');
      return;
    }

    if (formData.tipo_documento === 'RUT' && (!formData.rut || !formData.dv)) {
      toast.error('El RUT es obligatorio');
      return;
    }

    if (formData.tipo_documento === 'DNI' && !formData.dni) {
      toast.error('El DNI es obligatorio');
      return;
    }

    if (formData.tipo_documento === 'Pasaporte' && !formData.pasaporte) {
      toast.error('El Pasaporte es obligatorio');
      return;
    }

    if (!formData.fecha_nacimiento || (typeof formData.fecha_nacimiento === 'string' && formData.fecha_nacimiento.trim() === '')) {
      toast.error('La fecha de nacimiento es obligatoria');
      return;
    }

    if (!formData.genero) {
      toast.error('El género es obligatorio');
      return;
    }

    if (!formData.direccion) {
      toast.error('Complete el campo de dirección');
      return;
    }

    if (!formData.celular) {
      toast.error('El celular es obligatorio');
      return;
    }

    try {
      const url = editingGuardian
        ? `/api/guardians/${editingGuardian.id}`
        : '/api/guardians';

      const method = editingGuardian ? 'PUT' : 'POST';

      // Preparar datos con fecha en formato ISO (YYYY-MM-DD) para la base de datos
      const dataToSend = { ...formData };

      // Convertir campos de texto a mayúsculas
      if (dataToSend.nombre) dataToSend.nombre = dataToSend.nombre.toUpperCase();
      if (dataToSend.apellido_paterno) dataToSend.apellido_paterno = dataToSend.apellido_paterno.toUpperCase();
      if (dataToSend.apellido_materno) dataToSend.apellido_materno = dataToSend.apellido_materno.toUpperCase();
      if (dataToSend.direccion) dataToSend.direccion = dataToSend.direccion.toUpperCase();
      if (dataToSend.complemento_direccion) dataToSend.complemento_direccion = dataToSend.complemento_direccion.toUpperCase();
      if (dataToSend.email) dataToSend.email = dataToSend.email.toUpperCase();
      if (dataToSend.dni) dataToSend.dni = dataToSend.dni.toUpperCase();
      if (dataToSend.pasaporte) dataToSend.pasaporte = dataToSend.pasaporte.toUpperCase();

      // Convertir fecha de DD-MM-YYYY a YYYY-MM-DD si existe
      if (dataToSend.fecha_nacimiento) {
        const isoDate = convertToISO(dataToSend.fecha_nacimiento);
        if (isoDate && isoDate.trim() !== '') {
          dataToSend.fecha_nacimiento = isoDate;
        } else {
          toast.error('Error al procesar la fecha de nacimiento');
          return;
        }
      }

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(dataToSend)
      });

      if (response.ok) {
        toast.success(editingGuardian ? 'Apoderado actualizado exitosamente' : 'Apoderado creado exitosamente');
        setShowForm(false);
        loadGuardians();
      } else {
        const error = await response.json();
        toast.error(error.message || 'Error al guardar apoderado');
      }
    } catch (error) {
      console.error('Error guardando apoderado:', error);
      toast.error('Error al guardar apoderado');
    }
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value;

    if (value === '') {
      setFormData({ ...formData, celular: '' });
      return;
    }

    value = value.replace(/[^\d+]/g, '');

    if (!value.startsWith('+56')) {
      if (value.startsWith('+')) {
        value = '+56' + value.slice(1).replace(/[^\d]/g, '');
      } else if (value.startsWith('569')) {
        value = '+' + value;
      } else if (value.startsWith('56')) {
        value = '+' + value;
      } else if (value.startsWith('9')) {
        value = '+56' + value;
      } else if (value.length > 0) {
        value = '+569' + value;
      }
    }

    if (value.length > 12) {
      value = value.substring(0, 12);
    }

    if (value.length >= 4 && value.charAt(3) !== '9') {
      value = value.substring(0, 3) + '9' + value.substring(4);
    }

    setFormData({ ...formData, celular: value });
  };

  const handleRutChange = (value: string) => {
    const numericRut = parseInt(value.replace(/[^0-9]/g, ''));
    if (!isNaN(numericRut)) {
      const dv = calculateDV(numericRut.toString());
      setFormData({ ...formData, rut: numericRut, dv });
    } else {
      setFormData({ ...formData, rut: undefined, dv: '' });
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-6">
      {/* Encabezado */}
      <div className="flex justify-between items-center mb-6 pb-4" style={{ borderBottom: '2px solid var(--color-border)' }}>
        <div>
          <h2 className="text-2xl font-bold mb-1" style={{ color: 'var(--color-foreground)' }}>
            Gestión de Apoderados
          </h2>
          <p className="text-sm" style={{ color: 'var(--color-secondary)' }}>
            Administre la información de apoderados principales y suplentes
          </p>
        </div>
        {userRole !== 'sololectura' && (
          <button
            onClick={handleNew}
            className="px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            style={{
              backgroundColor: 'var(--color-primary)',
              color: 'white'
            }}
          >
            ➕ Nuevo Apoderado
          </button>
        )}
      </div>

      {/* Buscador */}
      <div className="mb-6">
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Buscar por nombre, apellido, RUT, DNI o Pasaporte..."
          className="w-full px-4 py-3 rounded-lg border"
          style={{
            backgroundColor: 'var(--color-input-bg)',
            color: 'var(--color-text)',
            borderColor: 'var(--color-border)'
          }}
        />
      </div>

      {/* Tabla de Apoderados */}
      {loading ? (
        <div className="text-center py-8">Cargando apoderados...</div>
      ) : (
        <div className="overflow-x-auto rounded-lg border" style={{ borderColor: 'var(--color-border)' }}>
          <table className="w-full">
            <thead style={{ backgroundColor: 'var(--color-surface)' }}>
              <tr>
                <th className="px-4 py-3 text-left text-sm font-semibold" style={{ color: 'var(--color-text)' }}>ID</th>
                <th className="px-4 py-3 text-left text-sm font-semibold" style={{ color: 'var(--color-text)' }}>RUT/DNI/Pasaporte</th>
                <th className="px-4 py-3 text-left text-sm font-semibold" style={{ color: 'var(--color-text)' }}>Nombre Completo</th>
                <th className="px-4 py-3 text-left text-sm font-semibold" style={{ color: 'var(--color-text)' }}>Celular</th>
                <th className="px-4 py-3 text-left text-sm font-semibold" style={{ color: 'var(--color-text)' }}>Email</th>
                <th className="px-4 py-3 text-center text-sm font-semibold" style={{ color: 'var(--color-text)' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filteredGuardians.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center" style={{ color: 'var(--color-text-light)' }}>
                    No se encontraron apoderados
                  </td>
                </tr>
              ) : (
                filteredGuardians.map((guardian) => (
                  <tr
                    key={guardian.id}
                    className="border-t hover:bg-opacity-50 transition-colors"
                    style={{ borderColor: 'var(--color-border)' }}
                  >
                    <td className="px-4 py-3 text-sm" style={{ color: 'var(--color-text)' }}>{guardian.id}</td>
                    <td className="px-4 py-3 text-sm" style={{ color: 'var(--color-text)' }}>
                      {guardian.tipo_documento === 'RUT' && guardian.rut
                        ? `${guardian.rut}-${guardian.dv}`
                        : guardian.tipo_documento === 'DNI'
                        ? guardian.dni
                        : guardian.pasaporte}
                    </td>
                    <td className="px-4 py-3 text-sm" style={{ color: 'var(--color-text)' }}>
                      {guardian.nombre} {guardian.apellido_paterno} {guardian.apellido_materno}
                    </td>
                    <td className="px-4 py-3 text-sm" style={{ color: 'var(--color-text)' }}>{guardian.celular}</td>
                    <td className="px-4 py-3 text-sm" style={{ color: 'var(--color-text)' }}>{guardian.email || '-'}</td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex justify-center gap-2">
                        <button
                          onClick={() => handleView(guardian)}
                          className="px-3 py-1 rounded text-xs font-medium transition-colors"
                          style={{
                            backgroundColor: 'var(--color-info)',
                            color: 'white'
                          }}
                          title="Ver detalles"
                        >
                          👁️ Ver
                        </button>
                        {userRole !== 'sololectura' && (
                          <button
                            onClick={() => handleEdit(guardian)}
                            className="px-3 py-1 rounded text-xs font-medium transition-colors"
                            style={{
                              backgroundColor: 'var(--color-warning)',
                              color: 'white'
                            }}
                            title="Editar"
                          >
                            ✏️ Editar
                          </button>
                        )}
                        {userRole !== 'sololectura' && userRole !== 'profesor' && (
                          <button
                            onClick={() => handleDelete(guardian)}
                            className="px-3 py-1 rounded text-xs font-medium transition-colors"
                            style={{
                              backgroundColor: 'var(--color-error)',
                              color: 'white'
                            }}
                            title="Eliminar"
                          >
                            🗑️ Eliminar
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal de Formulario */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="rounded-lg p-6 max-w-4xl w-full my-8" style={{ backgroundColor: 'var(--color-background)' }}>
            <h3 className="text-xl font-bold mb-4" style={{ color: 'var(--color-text)' }}>
              {editingGuardian ? 'Editar Apoderado' : 'Nuevo Apoderado'}
            </h3>

            <form onSubmit={handleSubmit}>
              {/* Tipo de Documento y Documento */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-text)' }}>
                    Tipo Documento <span style={{ color: 'var(--color-error)' }}>*</span>
                  </label>
                  <select
                    value={formData.tipo_documento}
                    onChange={(e) => setFormData({ ...formData, tipo_documento: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border"
                    style={{
                      backgroundColor: 'var(--color-input-bg)',
                      color: 'var(--color-text)',
                      borderColor: 'var(--color-border)'
                    }}
                    required
                  >
                    <option value="RUT">RUT</option>
                    <option value="DNI">DNI</option>
                    <option value="Pasaporte">Pasaporte</option>
                  </select>
                </div>

                {formData.tipo_documento === 'RUT' ? (
                  <>
                    <div>
                      <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-text)' }}>
                        RUT <span style={{ color: 'var(--color-error)' }}>*</span>
                      </label>
                      <input
                        type="text"
                        value={formData.rut || ''}
                        onChange={(e) => handleRutChange(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border"
                        style={{
                          backgroundColor: 'var(--color-input-bg)',
                          color: 'var(--color-text)',
                          borderColor: 'var(--color-border)'
                        }}
                        placeholder="12345678"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-text)' }}>
                        DV <span style={{ color: 'var(--color-error)' }}>*</span>
                      </label>
                      <input
                        type="text"
                        value={formData.dv || ''}
                        readOnly
                        className="w-full px-3 py-2 rounded-lg border"
                        style={{
                          backgroundColor: 'var(--color-surface)',
                          color: 'var(--color-text)',
                          borderColor: 'var(--color-border)'
                        }}
                        maxLength={1}
                      />
                    </div>
                  </>
                ) : formData.tipo_documento === 'DNI' ? (
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-text)' }}>
                      DNI <span style={{ color: 'var(--color-error)' }}>*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.dni || ''}
                      onChange={(e) => setFormData({ ...formData, dni: e.target.value.toUpperCase() })}
                      className="w-full px-3 py-2 rounded-lg border"
                      style={{
                        backgroundColor: 'var(--color-input-bg)',
                        color: 'var(--color-text)',
                        borderColor: 'var(--color-border)'
                      }}
                      required
                    />
                  </div>
                ) : (
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-text)' }}>
                      Pasaporte <span style={{ color: 'var(--color-error)' }}>*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.pasaporte || ''}
                      onChange={(e) => setFormData({ ...formData, pasaporte: e.target.value.toUpperCase() })}
                      className="w-full px-3 py-2 rounded-lg border"
                      style={{
                        backgroundColor: 'var(--color-input-bg)',
                        color: 'var(--color-text)',
                        borderColor: 'var(--color-border)'
                      }}
                      required
                    />
                  </div>
                )}
              </div>

              {/* Nombres */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-text)' }}>
                    Nombres <span style={{ color: 'var(--color-error)' }}>*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.nombre}
                    onChange={(e) => setFormData({ ...formData, nombre: e.target.value.toUpperCase() })}
                    className="w-full px-3 py-2 rounded-lg border"
                    style={{
                      backgroundColor: 'var(--color-input-bg)',
                      color: 'var(--color-text)',
                      borderColor: 'var(--color-border)'
                    }}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-text)' }}>
                    Apellido Paterno <span style={{ color: 'var(--color-error)' }}>*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.apellido_paterno}
                    onChange={(e) => setFormData({ ...formData, apellido_paterno: e.target.value.toUpperCase() })}
                    className="w-full px-3 py-2 rounded-lg border"
                    style={{
                      backgroundColor: 'var(--color-input-bg)',
                      color: 'var(--color-text)',
                      borderColor: 'var(--color-border)'
                    }}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-text)' }}>
                    Apellido Materno <span style={{ color: 'var(--color-error)' }}>*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.apellido_materno}
                    onChange={(e) => setFormData({ ...formData, apellido_materno: e.target.value.toUpperCase() })}
                    className="w-full px-3 py-2 rounded-lg border"
                    style={{
                      backgroundColor: 'var(--color-input-bg)',
                      color: 'var(--color-text)',
                      borderColor: 'var(--color-border)'
                    }}
                    required
                  />
                </div>
              </div>

              {/* Fecha Nacimiento, Género, Nacionalidad */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-text)' }}>
                    Fecha Nacimiento <span style={{ color: 'var(--color-error)' }}>*</span>
                  </label>
                  <input
                    type="date"
                    value={convertToISO(formData.fecha_nacimiento) || ''}
                    onChange={(e) => setFormData({ ...formData, fecha_nacimiento: convertFromISO(e.target.value) })}
                    className="w-full px-3 py-2 rounded-lg border"
                    required
                    style={{
                      backgroundColor: 'var(--color-input-bg)',
                      color: 'var(--color-text)',
                      borderColor: 'var(--color-border)'
                    }}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-text)' }}>
                    Género <span style={{ color: 'var(--color-error)' }}>*</span>
                  </label>
                  <select
                    value={formData.genero}
                    onChange={(e) => setFormData({ ...formData, genero: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border"
                    style={{
                      backgroundColor: 'var(--color-input-bg)',
                      color: 'var(--color-text)',
                      borderColor: 'var(--color-border)'
                    }}
                    required
                  >
                    <option value="">Seleccione...</option>
                    <option value="Masculino">Masculino</option>
                    <option value="Femenino">Femenino</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-text)' }}>
                    Nacionalidad <span style={{ color: 'var(--color-error)' }}>*</span>
                  </label>
                  <select
                    value={formData.nacionalidad}
                    onChange={(e) => setFormData({ ...formData, nacionalidad: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border"
                    style={{
                      backgroundColor: 'var(--color-input-bg)',
                      color: 'var(--color-text)',
                      borderColor: 'var(--color-border)'
                    }}
                    required
                  >
                    {nacionalidades.map(n => <option key={n} value={n}>{n}</option>)}
                  </select>
                </div>
              </div>

              {/* Dirección */}
              <div className="mb-4">
                <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-text)' }}>
                  Dirección <span style={{ color: 'var(--color-error)' }}>*</span>
                </label>
                <input
                  type="text"
                  value={formData.direccion}
                  onChange={(e) => setFormData({ ...formData, direccion: e.target.value.toUpperCase() })}
                  className="w-full px-3 py-2 rounded-lg border"
                  style={{
                    backgroundColor: 'var(--color-input-bg)',
                    color: 'var(--color-text)',
                    borderColor: 'var(--color-border)'
                  }}
                  required
                />
              </div>

              {/* Celular y Email */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-text)' }}>
                    Celular <span style={{ color: 'var(--color-error)' }}>*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.celular}
                    onChange={handlePhoneChange}
                    className="w-full px-3 py-2 rounded-lg border"
                    style={{
                      backgroundColor: 'var(--color-input-bg)',
                      color: 'var(--color-text)',
                      borderColor: 'var(--color-border)'
                    }}
                    placeholder="+569XXXXXXXX"
                    maxLength={12}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-text)' }}>
                    Email
                  </label>
                  <input
                    type="email"
                    value={formData.email || ''}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value.toUpperCase() })}
                    className="w-full px-3 py-2 rounded-lg border"
                    style={{
                      backgroundColor: 'var(--color-input-bg)',
                      color: 'var(--color-text)',
                      borderColor: 'var(--color-border)'
                    }}
                    placeholder="correo@ejemplo.com"
                  />
                </div>
              </div>

              {/* Botones */}
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="px-4 py-2 rounded-lg font-medium transition-colors"
                  style={{
                    backgroundColor: 'var(--color-border)',
                    color: 'var(--color-text)'
                  }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg font-medium transition-colors"
                  style={{
                    backgroundColor: 'var(--color-primary)',
                    color: 'white'
                  }}
                >
                  {editingGuardian ? 'Actualizar' : 'Crear'} Apoderado
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Detalles */}
      {selectedGuardian && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="rounded-lg p-6 max-w-3xl w-full my-8" style={{ backgroundColor: 'var(--color-background)' }}>
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-xl font-bold" style={{ color: 'var(--color-text)' }}>
                Detalles del Apoderado
              </h3>
              <button
                onClick={() => {
                  setSelectedGuardian(null);
                  setGuardianStudents([]);
                }}
                className="text-2xl"
                style={{ color: 'var(--color-text)' }}
              >
                ×
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div>
                <p className="text-sm font-semibold" style={{ color: 'var(--color-text-light)' }}>Nombre Completo</p>
                <p style={{ color: 'var(--color-text)' }}>
                  {selectedGuardian.nombre} {selectedGuardian.apellido_paterno} {selectedGuardian.apellido_materno}
                </p>
              </div>
              <div>
                <p className="text-sm font-semibold" style={{ color: 'var(--color-text-light)' }}>
                  {selectedGuardian.tipo_documento}
                </p>
                <p style={{ color: 'var(--color-text)' }}>
                  {selectedGuardian.tipo_documento === 'RUT' && selectedGuardian.rut
                    ? `${selectedGuardian.rut}-${selectedGuardian.dv}`
                    : selectedGuardian.tipo_documento === 'DNI'
                    ? selectedGuardian.dni
                    : selectedGuardian.pasaporte}
                </p>
              </div>
              <div>
                <p className="text-sm font-semibold" style={{ color: 'var(--color-text-light)' }}>Celular</p>
                <p style={{ color: 'var(--color-text)' }}>{selectedGuardian.celular}</p>
              </div>
              <div>
                <p className="text-sm font-semibold" style={{ color: 'var(--color-text-light)' }}>Email</p>
                <p style={{ color: 'var(--color-text)' }}>{selectedGuardian.email || '-'}</p>
              </div>
              <div className="md:col-span-2">
                <p className="text-sm font-semibold" style={{ color: 'var(--color-text-light)' }}>Dirección</p>
                <p style={{ color: 'var(--color-text)' }}>{selectedGuardian.direccion}</p>
              </div>
            </div>

            {/* Estudiantes asociados */}
            <div className="mt-6 pt-6" style={{ borderTop: '1px solid var(--color-border)' }}>
              <h4 className="font-bold mb-3" style={{ color: 'var(--color-text)' }}>
                Estudiantes Asociados ({guardianStudents.length})
              </h4>
              {guardianStudents.length === 0 ? (
                <p className="text-sm" style={{ color: 'var(--color-text-light)' }}>
                  No tiene estudiantes asociados
                </p>
              ) : (
                <div className="space-y-2">
                  {guardianStudents.map((student) => (
                    <div
                      key={student.id}
                      className="p-3 rounded-lg flex justify-between items-center"
                      style={{ backgroundColor: 'var(--color-surface)' }}
                    >
                      <div>
                        <p className="font-medium" style={{ color: 'var(--color-text)' }}>
                          {student.nombres} {student.apellido_paterno} {student.apellido_materno}
                        </p>
                        <p className="text-sm" style={{ color: 'var(--color-text-light)' }}>
                          {student.rut}-{student.dv} | {student.curso_base} {student.letra} | {student.estado}
                        </p>
                      </div>
                      {student.es_apoderado_principal && (
                        <span className="px-2 py-1 rounded text-xs font-semibold" style={{
                          backgroundColor: 'var(--color-primary)',
                          color: 'white'
                        }}>
                          Principal
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="mt-6 flex justify-end">
              <button
                onClick={() => {
                  setSelectedGuardian(null);
                  setGuardianStudents([]);
                }}
                className="px-4 py-2 rounded-lg font-medium transition-colors"
                style={{
                  backgroundColor: 'var(--color-border)',
                  color: 'var(--color-text)'
                }}
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GuardiansPage;
