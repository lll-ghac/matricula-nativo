import React, { useState, useEffect } from 'react';
import { ArrowLeft, Save, BookOpen, AlertCircle } from 'lucide-react';

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
  tipo_religion?: string;
  religion?: boolean;
  curso_base?: string;
  letra?: string;
  estado?: string;
  pie?: boolean;
  beca?: boolean;
  tipo_beca?: string;
  pae?: boolean;
  observaciones?: string;
}

interface EditAcademicInfoPageProps {
  studentId: string;
  onBack: () => void;
  onUpdate: () => void;
}

const EditAcademicInfoPage: React.FC<EditAcademicInfoPageProps> = ({ studentId, onBack, onUpdate }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [student, setStudent] = useState<Student | null>(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  const loadStudentData = async () => {
    if (!studentId) return;

    setIsLoading(true);
    try {
      console.log('📚 Cargando datos académicos para estudiante ID:', studentId);

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
      alert('Error al cargar los datos del estudiante');
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
      console.log('💾 Guardando cambios académicos del estudiante...', student);

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

      console.log('✅ Datos académicos guardados exitosamente');
      setShowSuccessModal(true);
      setTimeout(() => {
        setShowSuccessModal(false);
        onUpdate(); // Notificar al componente padre que se actualizó
      }, 3500);

    } catch (error) {
      console.error('❌ Error al guardar:', error);
      alert('Error al guardar los datos: ' + (error as Error).message);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen" style={{ backgroundColor: 'var(--color-background)' }}>
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2" style={{ borderColor: 'var(--color-primary)' }}></div>
          <span className="ml-4 ios-body">Cargando datos académicos...</span>
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
                  <BookOpen size={20} style={{ color: 'var(--color-primary)' }} />
                  Editar Datos Académicos
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
            <BookOpen size={20} style={{ color: 'var(--color-primary)' }} />
            Información Académica
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div>
              <label className="ios-form-label">Curso Base *</label>
              <select
                value={student.curso_base || ''}
                onChange={(e) => setStudent({ ...student, curso_base: e.target.value })}
                className="ios-form-input"
              >
                <option value="">Seleccionar</option>
                <option value="Pre-Kinder">Pre-Kinder</option>
                <option value="Kinder">Kinder</option>
                <option value="1° Básico">1° Básico</option>
                <option value="2° Básico">2° Básico</option>
                <option value="3° Básico">3° Básico</option>
                <option value="4° Básico">4° Básico</option>
                <option value="5° Básico">5° Básico</option>
                <option value="6° Básico">6° Básico</option>
                <option value="7° Básico">7° Básico</option>
                <option value="8° Básico">8° Básico</option>
                <option value="1° Medio">1° Medio</option>
                <option value="2° Medio">2° Medio</option>
                <option value="3° Medio">3° Medio</option>
                <option value="4° Medio">4° Medio</option>
                <option value="OP4 - 1° Básico">OP4 - 1° Básico</option>
                <option value="OP4 - 2° Básico">OP4 - 2° Básico</option>
                <option value="OP4 - 3° Básico">OP4 - 3° Básico</option>
                <option value="OP4 - 4° Básico">OP4 - 4° Básico</option>
              </select>
            </div>

            <div>
              <label className="ios-form-label">Letra *</label>
              <select
                value={student.letra || ''}
                onChange={(e) => setStudent({ ...student, letra: e.target.value })}
                className="ios-form-input"
              >
                <option value="">Seleccionar</option>
                <option value="A">A</option>
                <option value="B">B</option>
                <option value="C">C</option>
                <option value="D">D</option>
              </select>
            </div>

            <div>
              <label className="ios-form-label">Estado</label>
              <select
                value={student.estado || ''}
                disabled={true}
                className="ios-form-input opacity-60 cursor-not-allowed"
                title="El estado del estudiante se gestiona desde otra sección de la aplicación"
              >
                <option value="matriculado">Matriculado</option>
                <option value="Inscrito">Inscrito</option>
                <option value="Retirado">Retirado</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="pie"
                checked={student.pie || false}
                onChange={(e) => setStudent({ ...student, pie: e.target.checked })}
                className="ios-checkbox"
              />
              <label htmlFor="pie" className="ios-form-label">PIE (Programa de Integración Escolar)</label>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="beca"
                checked={student.beca || false}
                onChange={(e) => setStudent({ ...student, beca: e.target.checked })}
                className="ios-checkbox"
              />
              <label htmlFor="beca" className="ios-form-label">Beca</label>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="pae"
                checked={student.pae || false}
                onChange={(e) => setStudent({ ...student, pae: e.target.checked })}
                className="ios-checkbox"
              />
              <label htmlFor="pae" className="ios-form-label">PAE (Programa de Alimentación Escolar)</label>
            </div>

            <div>
              <label className="ios-form-label">Religión *</label>
              <select
                value={student.tipo_religion || ''}
                onChange={(e) => {
                  const value = e.target.value;
                  setStudent({
                    ...student,
                    tipo_religion: value,
                    religion: value !== '' && value !== 'Ninguna'
                  });
                }}
                className="ios-form-input"
              >
                <option value="">Seleccione...</option>
                <option value="Católica">Católica</option>
                <option value="Evangélica">Evangélica</option>
                <option value="Ninguna">Ninguna</option>
              </select>
            </div>

            {student.beca && (
              <div>
                <label className="ios-form-label">Tipo de Beca</label>
                <input
                  type="text"
                  value={student.tipo_beca || ''}
                  onChange={(e) => setStudent({ ...student, tipo_beca: e.target.value })}
                  className="ios-form-input"
                />
              </div>
            )}

            <div className="md:col-span-2 lg:col-span-3">
              <label className="ios-form-label">Observaciones</label>
              <textarea
                value={student.observaciones || ''}
                onChange={(e) => setStudent({ ...student, observaciones: e.target.value })}
                className="ios-form-input min-h-20"
                rows={3}
                placeholder="Observaciones generales del estudiante..."
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
            <p className="text-lg">Datos académicos actualizados</p>
            <div className="text-4xl mt-4">🎓</div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EditAcademicInfoPage;