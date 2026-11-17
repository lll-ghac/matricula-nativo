import React, { useState, useEffect } from 'react';
import { X, Users, Plus, Trash2, AlertCircle, Check } from 'lucide-react';
import { useConfirm } from '../context/ConfirmContext';

interface CourseTeacher {
  asignacion_id: number;
  curso_id: number;
  curso_codigo: string;
  usuario_id: number;
  profesor_nombre: string;
  tipo_asignacion: 'profesor_jefe' | 'asignatura' | 'apoyo' | 'reemplazo';
  puede_matricular: boolean;
  asignatura: string | null;
}

interface Teacher {
  id: number;
  nombre: string;
  username: string;
  rol: string;
}

interface CourseTeachersModalProps {
  courseId: number;
  courseName: string;
  onClose: () => void;
}

const CourseTeachersModal: React.FC<CourseTeachersModalProps> = ({
  courseId,
  courseName,
  onClose
}) => {
  const confirm = useConfirm();
  const [teachers, setTeachers] = useState<CourseTeacher[]>([]);
  const [allTeachers, setAllTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Form state for adding new teacher
  const [newTeacher, setNewTeacher] = useState({
    usuario_id: 0,
    tipo_asignacion: 'asignatura' as const,
    puede_matricular: true,
    asignatura: ''
  });

  useEffect(() => {
    fetchCourseTeachers();
    fetchAllTeachers();
  }, [courseId]);

  const fetchCourseTeachers = async () => {
    try {
      const response = await fetch(`/api/courses/${courseId}/teachers`, {
        credentials: 'include'
      });

      if (response.ok) {
        const result = await response.json();
        setTeachers(result.data || []);
      } else {
        setError('Error al cargar profesores del curso');
      }
    } catch (err) {
      console.error('Error fetching course teachers:', err);
      setError('Error al cargar profesores del curso');
    } finally {
      setLoading(false);
    }
  };

  const fetchAllTeachers = async () => {
    try {
      const response = await fetch('/api/teachers', { credentials: 'include' });
      if (response.ok) {
        const data = await response.json();
        setAllTeachers(data || []);
      }
    } catch (err) {
      console.error('Error fetching teachers:', err);
    }
  };

  const handleAddTeacher = async () => {
    if (!newTeacher.usuario_id) {
      setError('Debe seleccionar un profesor');
      return;
    }

    setAdding(true);
    setError(null);

    try {
      const response = await fetch(`/api/courses/${courseId}/teachers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          usuario_id: newTeacher.usuario_id,
          tipo_asignacion: newTeacher.tipo_asignacion,
          puede_matricular: newTeacher.puede_matricular,
          asignatura: newTeacher.asignatura || null
        })
      });

      if (response.ok) {
        setSuccessMessage('Profesor agregado exitosamente');
        setNewTeacher({
          usuario_id: 0,
          tipo_asignacion: 'asignatura',
          puede_matricular: true,
          asignatura: ''
        });
        await fetchCourseTeachers();
        setTimeout(() => setSuccessMessage(null), 3000);
      } else {
        const result = await response.json();
        setError(result.error || 'Error al agregar profesor');
      }
    } catch (err) {
      console.error('Error adding teacher:', err);
      setError('Error al agregar profesor');
    } finally {
      setAdding(false);
    }
  };

  const handleRemoveTeacher = async (teacherId: number, tipoAsignacion: string) => {
    if (!(await confirm('¿Está seguro de quitar este profesor del curso?'))) {
      return;
    }

    try {
      const response = await fetch(
        `/api/courses/${courseId}/teachers/${teacherId}?tipo_asignacion=${tipoAsignacion}`,
        {
          method: 'DELETE',
          credentials: 'include'
        }
      );

      if (response.ok) {
        setSuccessMessage('Profesor removido exitosamente');
        await fetchCourseTeachers();
        setTimeout(() => setSuccessMessage(null), 3000);
      } else {
        const result = await response.json();
        setError(result.error || 'Error al remover profesor');
      }
    } catch (err) {
      console.error('Error removing teacher:', err);
      setError('Error al remover profesor');
    }
  };

  const getTipoAsignacionLabel = (tipo: string) => {
    const labels: Record<string, string> = {
      profesor_jefe: 'Profesor Jefe',
      asignatura: 'Asignatura',
      apoyo: 'Apoyo',
      reemplazo: 'Reemplazo'
    };
    return labels[tipo] || tipo;
  };

  const getTipoAsignacionColor = (tipo: string) => {
    const colors: Record<string, string> = {
      profesor_jefe: 'var(--color-primary)',
      asignatura: 'var(--color-success)',
      apoyo: 'var(--color-warning)',
      reemplazo: 'var(--color-text-light)'
    };
    return colors[tipo] || 'var(--color-text-light)';
  };

  // Filter out teachers already assigned to this course
  const availableTeachers = allTeachers.filter(
    t => !teachers.some(ct => ct.usuario_id === t.id)
  );

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="ios-card max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6 pb-4" style={{ borderBottom: '1px solid var(--color-border)' }}>
          <div className="flex items-center gap-3">
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center"
              style={{ backgroundColor: 'var(--color-primary-light)' }}
            >
              <Users size={24} style={{ color: 'var(--color-primary)' }} />
            </div>
            <div>
              <h2 className="ios-title">Gestión de Profesores</h2>
              <p className="text-sm" style={{ color: 'var(--color-text-light)' }}>
                {courseName}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="ios-btn ios-btn-secondary p-2"
            style={{ minWidth: 'auto' }}
          >
            <X size={24} />
          </button>
        </div>

        {/* Success Message */}
        {successMessage && (
          <div
            className="mb-4 p-4 rounded-lg flex items-center gap-2"
            style={{ backgroundColor: 'var(--color-success-light)', color: 'var(--color-success)' }}
          >
            <Check size={20} />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div
            className="mb-4 p-4 rounded-lg flex items-center gap-2"
            style={{ backgroundColor: 'var(--color-error-light)', color: 'var(--color-error)' }}
          >
            <AlertCircle size={20} />
            <span>{error}</span>
          </div>
        )}

        {/* Current Teachers List */}
        <div className="mb-6">
          <h3 className="ios-subtitle mb-3">Profesores Asignados ({teachers.length})</h3>

          {loading ? (
            <div className="text-center py-8" style={{ color: 'var(--color-text-light)' }}>
              Cargando...
            </div>
          ) : teachers.length === 0 ? (
            <div
              className="text-center py-8 rounded-lg"
              style={{ backgroundColor: 'var(--color-card)', color: 'var(--color-text-light)' }}
            >
              No hay profesores asignados a este curso
            </div>
          ) : (
            <div className="space-y-2">
              {teachers.map((teacher) => (
                <div
                  key={`${teacher.asignacion_id}`}
                  className="flex items-center justify-between p-4 rounded-lg"
                  style={{ backgroundColor: 'var(--color-card)' }}
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold" style={{ color: 'var(--color-foreground)' }}>
                        {teacher.profesor_nombre}
                      </span>
                      <span
                        className="text-xs px-2 py-1 rounded"
                        style={{
                          backgroundColor: `${getTipoAsignacionColor(teacher.tipo_asignacion)}20`,
                          color: getTipoAsignacionColor(teacher.tipo_asignacion)
                        }}
                      >
                        {getTipoAsignacionLabel(teacher.tipo_asignacion)}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-sm" style={{ color: 'var(--color-text-light)' }}>
                      {teacher.asignatura && (
                        <span>📚 {teacher.asignatura}</span>
                      )}
                      {teacher.puede_matricular && (
                        <span className="flex items-center gap-1">
                          <Check size={14} style={{ color: 'var(--color-success)' }} />
                          Puede matricular
                        </span>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => handleRemoveTeacher(teacher.usuario_id, teacher.tipo_asignacion)}
                    className="ios-btn ios-btn-danger p-2"
                    style={{ minWidth: 'auto' }}
                    title="Quitar profesor"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Add New Teacher Form */}
        <div
          className="p-4 rounded-lg"
          style={{ backgroundColor: 'var(--color-card)', border: '2px solid var(--color-border)' }}
        >
          <h3 className="ios-subtitle mb-4 flex items-center gap-2">
            <Plus size={20} style={{ color: 'var(--color-primary)' }} />
            Agregar Profesor
          </h3>

          <div className="space-y-4">
            {/* Teacher Selection */}
            <div>
              <label className="ios-form-label">Profesor *</label>
              <select
                value={newTeacher.usuario_id}
                onChange={(e) => setNewTeacher({ ...newTeacher, usuario_id: Number(e.target.value) })}
                className="ios-form-input"
                disabled={adding}
              >
                <option value={0}>Seleccionar profesor...</option>
                {availableTeachers.map((teacher) => (
                  <option key={teacher.id} value={teacher.id}>
                    {teacher.nombre} ({teacher.username})
                  </option>
                ))}
              </select>
            </div>

            {/* Assignment Type */}
            <div>
              <label className="ios-form-label">Tipo de Asignación *</label>
              <select
                value={newTeacher.tipo_asignacion}
                onChange={(e) => setNewTeacher({ ...newTeacher, tipo_asignacion: e.target.value as any })}
                className="ios-form-input"
                disabled={adding}
              >
                <option value="profesor_jefe">Profesor Jefe</option>
                <option value="asignatura">Asignatura</option>
                <option value="apoyo">Apoyo</option>
                <option value="reemplazo">Reemplazo</option>
              </select>
            </div>

            {/* Subject (if asignatura type) */}
            {newTeacher.tipo_asignacion === 'asignatura' && (
              <div>
                <label className="ios-form-label">Asignatura</label>
                <input
                  type="text"
                  value={newTeacher.asignatura}
                  onChange={(e) => setNewTeacher({ ...newTeacher, asignatura: e.target.value })}
                  className="ios-form-input"
                  placeholder="Ej: Matemáticas, Lenguaje, etc."
                  disabled={adding}
                />
              </div>
            )}

            {/* Can Enroll Permission */}
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="puede_matricular"
                checked={newTeacher.puede_matricular}
                onChange={(e) => setNewTeacher({ ...newTeacher, puede_matricular: e.target.checked })}
                disabled={adding}
                className="w-5 h-5 rounded"
                style={{ accentColor: 'var(--color-primary)' }}
              />
              <label htmlFor="puede_matricular" className="ios-form-label mb-0">
                Puede matricular estudiantes en este curso
              </label>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-2">
              <button
                onClick={handleAddTeacher}
                disabled={adding || !newTeacher.usuario_id}
                className="ios-btn ios-btn-primary flex-1"
              >
                {adding ? 'Agregando...' : 'Agregar Profesor'}
              </button>
            </div>
          </div>
        </div>

        {/* Close Button */}
        <div className="mt-6 pt-4" style={{ borderTop: '1px solid var(--color-border)' }}>
          <button onClick={onClose} className="ios-btn ios-btn-secondary w-full">
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};

export default CourseTeachersModal;
