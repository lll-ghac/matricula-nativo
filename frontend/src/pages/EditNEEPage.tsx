import React, { useState, useEffect } from 'react';
import { ArrowLeft, Save, Heart, AlertCircle } from 'lucide-react';
import NEEForm from '../components/NEEForm';

interface NeeInfo {
  id: number;
  codigo: string;
  descripcion: string;
}

interface Student {
  id: number;
  rut: string;
  dv: string;
  nombres: string;
  apellido_paterno: string;
  apellido_materno: string;
  nees?: NeeInfo[];
  [key: string]: any; // Para otros campos del estudiante
}

interface EditNEEPageProps {
  studentId: string;
  onBack: () => void;
  onUpdate: () => void;
}

const EditNEEPage: React.FC<EditNEEPageProps> = ({ studentId, onBack, onUpdate }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [student, setStudent] = useState<Student | null>(null);
  const [selectedNeeIds, setSelectedNeeIds] = useState<number[]>([]);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  const loadStudentData = async () => {
    if (!studentId) return;

    setIsLoading(true);
    try {
      console.log('❤️ Cargando datos NEE del estudiante ID:', studentId);

      const studentResponse = await fetch(`/api/students/${studentId}`, {
        credentials: 'include'
      });

      if (!studentResponse.ok) {
        throw new Error(`Error ${studentResponse.status}: ${studentResponse.statusText}`);
      }

      const studentData = await studentResponse.json();
      console.log('📋 Datos del estudiante cargados:', studentData);

      // Extraer IDs de las NEEs del array
      const neeIds = (studentData.nees || []).map((nee: NeeInfo) => nee.id);
      console.log('✅ NEEs del estudiante:', studentData.nees?.length || 0, 'encontradas');
      console.log('📌 IDs de NEE seleccionados:', neeIds);

      setStudent(studentData);
      setSelectedNeeIds(neeIds);

    } catch (error) {
      console.error('❌ Error al cargar datos NEE:', error);
      alert('Error al cargar los datos NEE del estudiante');
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
      console.log('💾 Guardando cambios de NEE del estudiante...');
      console.log('📌 NEEs seleccionadas (IDs):', selectedNeeIds);

      // NO enviar apoderados ni el array nees (solo enviar IDs)
      const { apoderados, apoderados_suplentes, nees, ...dataWithoutGuardians } = student as Record<string, any>;

      // Preparar datos para enviar
      const dataToSend = {
        ...dataWithoutGuardians,
        nees: selectedNeeIds  // Enviar array de IDs
      };

      console.log('📡 Enviando al backend:', {
        id: studentId,
        nees: selectedNeeIds
      });

      const response = await fetch(`/api/students/${studentId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(dataToSend),
      });

      console.log('📡 Respuesta del servidor:', response.status, response.statusText);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Error al guardar los datos NEE');
      }

      console.log('✅ Datos NEE guardados exitosamente');
      setShowSuccessModal(true);
      setTimeout(() => {
        setShowSuccessModal(false);
        onUpdate(); // Notificar al componente padre que se actualizó
        onBack(); // Volver a Gestión de Estudiantes
      }, 3500);

    } catch (error) {
      console.error('❌ Error al guardar NEE:', error);
      alert('Error al guardar los datos NEE: ' + (error as Error).message);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen" style={{ backgroundColor: 'var(--color-background)' }}>
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2" style={{ borderColor: 'var(--color-primary)' }}></div>
          <span className="ml-4 ios-body">Cargando datos NEE del estudiante...</span>
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
                  <Heart size={20} style={{ color: 'var(--color-primary)' }} />
                  Editar NEE (Necesidades Educativas Especiales)
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
          <NEEForm
            selectedNees={selectedNeeIds}
            onNeeChange={setSelectedNeeIds}
          />

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
                  Guardar Cambios NEE
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
            <p className="text-lg">Datos NEE actualizados correctamente</p>
            <div className="text-4xl mt-4">❤️</div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EditNEEPage;
