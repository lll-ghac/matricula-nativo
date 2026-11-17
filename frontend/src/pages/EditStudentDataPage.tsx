import React, { useState, useEffect } from 'react';
import { ArrowLeft, Save, User, AlertCircle } from 'lucide-react';
import { etnias, conQuienViveOptions } from '../utils/chilean-data';
import { useToast } from '../context/ToastContext';

interface Student {
  id: number;
  rut: string;
  dv: string;
  nombres: string;
  nombre_social?: string;
  apellido_paterno: string;
  apellido_materno: string;
  fecha_nacimiento: string;
  genero: string;
  nacionalidad?: string;
  etnia?: string;
  telefono?: string;
  telefono_fijo?: string;
  direccion?: string;
  complemento_direccion?: string;
  comuna?: string;
  region?: string;
  con_quien_vive?: string;
}

interface EditStudentDataPageProps {
  studentId: string;
  onBack: () => void;
  onUpdate: () => void;
}

const EditStudentDataPage: React.FC<EditStudentDataPageProps> = ({ studentId, onBack, onUpdate }) => {
  const toast = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [student, setStudent] = useState<Student | null>(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  // Función para formatear teléfono automáticamente
  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value;

    // Si está vacío, limpiar
    if (value === '') {
      setStudent({ ...student!, telefono: '' });
      return;
    }

    // Remover todo lo que no sean números o el símbolo +
    value = value.replace(/[^\d+]/g, '');

    // Lógica mejorada para formatear automáticamente
    if (!value.startsWith('+56')) {
      if (value.startsWith('+')) {
        // Si empieza con + pero no es +56
        value = '+56' + value.slice(1).replace(/[^\d]/g, '');
      } else if (value.startsWith('569')) {
        // Si empieza con 569, agregar +
        value = '+' + value;
      } else if (value.startsWith('56')) {
        // Si empieza con 56, agregar +
        value = '+' + value;
      } else if (value.startsWith('9')) {
        // Si empieza con 9 (número móvil), agregar +56
        value = '+56' + value;
      } else if (value.length > 0) {
        // Para cualquier otro número, asumir que es el número sin el 9
        value = '+569' + value;
      }
    }

    // Limitar a máximo 12 caracteres (+56 seguido de 9 dígitos)
    if (value.length > 12) {
      value = value.substring(0, 12);
    }

    // Validar que después del +56 tengamos al menos el 9
    if (value.length >= 4 && value.charAt(3) !== '9') {
      value = value.substring(0, 3) + '9' + value.substring(4);
    }

    setStudent({ ...student!, telefono: value });
  };

  const loadStudentData = async () => {
    if (!studentId) return;

    setIsLoading(true);
    try {
      console.log('👤 Cargando datos personales del estudiante ID:', studentId);

      const studentResponse = await fetch(`/api/students/${studentId}`, {
        credentials: 'include'
      });

      if (!studentResponse.ok) {
        throw new Error(`Error ${studentResponse.status}: ${studentResponse.statusText}`);
      }

      const studentData = await studentResponse.json();
      console.log('📋 Datos del estudiante cargados:', studentData);

      // Mapear valores de género de la BD (F/M) a formato de UI (Femenino/Masculino)
      if (studentData.genero === 'F') {
        studentData.genero = 'Femenino';
      } else if (studentData.genero === 'M') {
        studentData.genero = 'Masculino';
      }

      setStudent(studentData);

    } catch (error) {
      console.error('❌ Error al cargar datos:', error);
      toast.error('Error al cargar los datos del estudiante');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadStudentData();
  }, [studentId]);

  const handleSave = async () => {
    if (!student || !studentId) return;

    setIsSaving(true);
    try {
      console.log('💾 Guardando cambios de datos personales del estudiante...', student);

      // Preparar datos para enviar - convertir género de UI (Femenino/Masculino) a BD (F/M)
      const studentToSave = { ...student };
      if (studentToSave.genero === 'Femenino') {
        studentToSave.genero = 'F';
      } else if (studentToSave.genero === 'Masculino') {
        studentToSave.genero = 'M';
      }

      // NO enviar apoderados para evitar que se borren
      const { apoderados, apoderados_suplentes, ...dataWithoutGuardians } = studentToSave as Record<string, any>;

      const response = await fetch(`/api/students/${studentId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(dataWithoutGuardians),
      });

      console.log('📡 Respuesta del servidor:', response.status, response.statusText);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Error al guardar los datos');
      }

      console.log('✅ Datos personales guardados exitosamente');
      setShowSuccessModal(true);
      setTimeout(() => {
        setShowSuccessModal(false);
        onUpdate(); // Notificar al componente padre que se actualizó
      }, 3500);

    } catch (error) {
      console.error('❌ Error al guardar:', error);
      toast.error('Error al guardar los datos: ' + (error as Error).message);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen" style={{ backgroundColor: 'var(--color-background)' }}>
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2" style={{ borderColor: 'var(--color-primary)' }}></div>
          <span className="ml-4 ios-body">Cargando datos del estudiante...</span>
        </div>
      </div>
    );
  }

  if (!student) {
    return (
      <div className="min-h-screen" style={{ backgroundColor: 'var(--color-background)' }}>
        <div className="p-8 text-center">
          <AlertCircle size={48} style={{ color: 'var(--color-error)' }} className="mx-auto mb-4" />
          <h2 className="ios-title mb-4">Estudiante no encontrado</h2>
          <button onClick={onBack} className="ios-btn ios-btn-secondary">
            Volver a la lista
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--color-background)' }}>
      {/* Header */}
      <div className="sticky top-0 z-20" style={{ backgroundColor: 'var(--color-background)', borderBottom: '1px solid var(--color-border)' }}>
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={onBack}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm"
                style={{ backgroundColor: 'var(--color-surface)' }}
              >
                <ArrowLeft size={16} />
                Volver
              </button>
              <div>
                <h1 className="ios-title text-xl flex items-center gap-2">
                  <User size={20} style={{ color: 'var(--color-primary)' }} />
                  Editar Datos del Estudiante
                </h1>
                <p className="ios-caption text-sm" style={{ color: 'var(--color-secondary)' }}>
                  {student.nombres} {student.apellido_paterno} - RUT: {student.rut}-{student.dv}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="ios-card p-6">
          <h3 className="ios-title mb-6 flex items-center gap-2">
            <User size={20} style={{ color: 'var(--color-primary)' }} />
            Datos Personales
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* RUT - Solo lectura */}
            <div>
              <label className="ios-form-label">RUT (No editable)</label>
              <input
                type="text"
                value={`${student.rut}-${student.dv}`}
                disabled
                className="ios-form-input opacity-60 cursor-not-allowed"
                title="El RUT no se puede modificar"
              />
            </div>

            {/* Nombres */}
            <div>
              <label className="ios-form-label">Nombres *</label>
              <input
                type="text"
                value={student.nombres || ''}
                onChange={(e) => setStudent({ ...student, nombres: e.target.value })}
                className="ios-form-input"
                required
              />
            </div>

            {/* Nombre Social */}
            <div>
              <label className="ios-form-label">Nombre Social</label>
              <input
                type="text"
                value={student.nombre_social || ''}
                onChange={(e) => setStudent({ ...student, nombre_social: e.target.value })}
                className="ios-form-input"
                placeholder="Opcional"
              />
            </div>

            {/* Apellido Paterno */}
            <div>
              <label className="ios-form-label">Apellido Paterno *</label>
              <input
                type="text"
                value={student.apellido_paterno || ''}
                onChange={(e) => setStudent({ ...student, apellido_paterno: e.target.value })}
                className="ios-form-input"
                required
              />
            </div>

            {/* Apellido Materno */}
            <div>
              <label className="ios-form-label">Apellido Materno *</label>
              <input
                type="text"
                value={student.apellido_materno || ''}
                onChange={(e) => setStudent({ ...student, apellido_materno: e.target.value })}
                className="ios-form-input"
                required
              />
            </div>

            {/* Fecha de Nacimiento */}
            <div>
              <label className="ios-form-label">Fecha de Nacimiento *</label>
              <input
                type="date"
                value={student.fecha_nacimiento || ''}
                onChange={(e) => setStudent({ ...student, fecha_nacimiento: e.target.value })}
                className="ios-form-input"
                required
              />
            </div>

            {/* Género */}
            <div>
              <label className="ios-form-label">Género *</label>
              <select
                value={student.genero || ''}
                onChange={(e) => setStudent({ ...student, genero: e.target.value })}
                className="ios-form-input"
                required
              >
                <option value="">Seleccionar</option>
                <option value="Masculino">Masculino</option>
                <option value="Femenino">Femenino</option>
              </select>
            </div>

            {/* Nacionalidad */}
            <div>
              <label className="ios-form-label">Nacionalidad</label>
              <input
                type="text"
                value={student.nacionalidad || ''}
                onChange={(e) => setStudent({ ...student, nacionalidad: e.target.value })}
                className="ios-form-input"
                placeholder="Chile"
              />
            </div>

            {/* Etnia */}
            <div>
              <label className="ios-form-label">Etnia / Pueblo Originario</label>
              <select
                value={student.etnia || ''}
                onChange={(e) => setStudent({ ...student, etnia: e.target.value })}
                className="ios-form-input"
              >
                <option value="">Seleccionar</option>
                {etnias.map((etnia) => (
                  <option key={etnia} value={etnia}>
                    {etnia}
                  </option>
                ))}
              </select>
            </div>

            {/* Teléfono */}
            <div>
              <label className="ios-form-label">Teléfono Celular</label>
              <input
                type="tel"
                value={student.telefono || ''}
                onChange={handlePhoneChange}
                className="ios-form-input"
                placeholder="+56912345678"
              />
              <p className="ios-caption mt-1" style={{color: 'var(--color-text-light)'}}>
                Formato: +56912345678 (se formatea automáticamente)
              </p>
            </div>

            {/* Teléfono Fijo */}
            <div>
              <label className="ios-form-label">Teléfono Fijo</label>
              <input
                type="tel"
                value={student.telefono_fijo || ''}
                onChange={(e) => setStudent({ ...student, telefono_fijo: e.target.value })}
                className="ios-form-input"
                placeholder="22 123 4567"
              />
            </div>

            {/* Con quién vive */}
            <div>
              <label className="ios-form-label">¿Con quién vive?</label>
              <select
                value={student.con_quien_vive || ''}
                onChange={(e) => setStudent({ ...student, con_quien_vive: e.target.value })}
                className="ios-form-input"
              >
                <option value="">Seleccionar</option>
                {conQuienViveOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>

            {/* Dirección */}
            <div className="md:col-span-2">
              <label className="ios-form-label">Dirección Completa - Calle y Numero</label>
              <input
                type="text"
                value={student.direccion || ''}
                onChange={(e) => setStudent({ ...student, direccion: e.target.value })}
                className="ios-form-input"
              />
            </div>

            {/* Complemento Dirección */}
            <div>
              <label className="ios-form-label">Complemento Dirección</label>
              <input
                type="text"
                value={student.complemento_direccion || ''}
                onChange={(e) => setStudent({ ...student, complemento_direccion: e.target.value })}
                className="ios-form-input"
                placeholder="Ej: Depto 305, Block B, Villa Los Robles"
              />
            </div>

            {/* Región */}
            <div>
              <label className="ios-form-label">Región</label>
              <input
                type="text"
                value={student.region || ''}
                onChange={(e) => setStudent({ ...student, region: e.target.value })}
                className="ios-form-input"
                placeholder="Región Metropolitana"
              />
            </div>

            {/* Comuna */}
            <div>
              <label className="ios-form-label">Comuna</label>
              <input
                type="text"
                value={student.comuna || ''}
                onChange={(e) => setStudent({ ...student, comuna: e.target.value })}
                className="ios-form-input"
                placeholder="Santiago"
              />
            </div>
          </div>

          {/* Botón Guardar */}
          <div className="flex justify-end mt-8 pt-6 border-t" style={{ borderColor: 'var(--color-border)' }}>
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="ios-btn ios-btn-primary flex items-center gap-2"
            >
              {isSaving ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Guardando...
                </>
              ) : (
                <>
                  <Save size={16} />
                  Guardar Cambios
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Modal de éxito */}
      {showSuccessModal && (
        <div
          className="fixed inset-0 flex items-center justify-center z-50"
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
        >
          <div
            className="ios-card p-8 text-center max-w-md mx-4 animate-bounce"
            style={{
              backgroundColor: '#10b981',
              color: 'white',
              boxShadow: '0 20px 60px rgba(16, 185, 129, 0.4)'
            }}
          >
            <div className="text-6xl mb-4">✅</div>
            <h3 className="text-2xl font-bold mb-2">¡Excelente!</h3>
            <p className="text-lg">Datos personales actualizados</p>
            <div className="text-4xl mt-4">👤</div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EditStudentDataPage;