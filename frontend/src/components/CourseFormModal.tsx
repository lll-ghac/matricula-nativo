import React, { useState, useEffect } from 'react';
import { X, BookOpen, AlertCircle } from 'lucide-react';
import { useToast } from '../context/ToastContext';

interface Course {
  id?: number;
  codigo?: string;
  nivel_educativo_id: number;
  grado_id: number;
  letra_id: number;
  jornada_id: number;
  anio_academico: number;
  capacidad_maxima: number;
  sala: string | null;
  profesor_jefe_id: number | null;
  estado: string;
}

interface Catalogs {
  niveles_educativos: any[];
  grados: any[];
  letras_curso: any[];
  jornadas: any[];
}

interface CourseFormModalProps {
  course: Course | null;
  catalogs: Catalogs;
  currentYear: number;
  onSuccess: () => void;
  onClose: () => void;
}

const CourseFormModal: React.FC<CourseFormModalProps> = ({
  course,
  catalogs,
  currentYear,
  onSuccess,
  onClose
}) => {
  const toast = useToast();
  const isEditing = !!course;

  const [formData, setFormData] = useState<Course>({
    nivel_educativo_id: course?.nivel_educativo_id || 0,
    grado_id: course?.grado_id || 0,
    letra_id: course?.letra_id || 0,
    jornada_id: course?.jornada_id || 0,
    anio_academico: course?.anio_academico || currentYear,
    capacidad_maxima: course?.capacidad_maxima || 40,
    sala: course?.sala || '',
    profesor_jefe_id: course?.profesor_jefe_id || null,
    estado: course?.estado || 'activo'  // Cambiado de 'planificado' a 'activo'
  });

  const [filteredGrados, setFilteredGrados] = useState<any[]>([]);
  const [previewCode, setPreviewCode] = useState<string>('');
  const [errors, setErrors] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [teachers, setTeachers] = useState<any[]>([]);

  useEffect(() => {
    const fetchTeachers = async () => {
      try {
        const response = await fetch('/api/teachers', { credentials: 'include' });
        if (response.ok) {
          const data = await response.json();
          setTeachers(data || []);
        }
      } catch (error) {
        console.error("Error fetching teachers:", error);
      }
    };

    fetchTeachers();
  }, []);

  useEffect(() => {
    if (formData.nivel_educativo_id) {
      const grados = catalogs.grados.filter(
        g => g.nivel_educativo_id === formData.nivel_educativo_id
      );
      setFilteredGrados(grados);

      // Si el grado actual no pertenece al nuevo nivel, resetear
      if (formData.grado_id) {
        const gradoBelongsToNivel = grados.some(g => g.id === formData.grado_id);
        if (!gradoBelongsToNivel) {
          setFormData(prev => ({ ...prev, grado_id: 0 }));
        }
      }
    } else {
      setFilteredGrados([]);
    }
  }, [formData.nivel_educativo_id, catalogs.grados]);

  useEffect(() => {
    generatePreviewCode();
  }, [formData.nivel_educativo_id, formData.grado_id, formData.letra_id]);

  const generatePreviewCode = () => {
    if (!formData.nivel_educativo_id || !formData.grado_id || !formData.letra_id) {
      setPreviewCode('');
      return;
    }

    const nivel = catalogs.niveles_educativos.find(n => n.id === formData.nivel_educativo_id);
    const grado = catalogs.grados.find(g => g.id === formData.grado_id);
    const letra = catalogs.letras_curso.find(l => l.id === formData.letra_id);

    if (nivel && grado && letra) {
      setPreviewCode(`${nivel.codigo_sige}-${grado.codigo}${letra.letra}`);
    } else {
      setPreviewCode('');
    }
  };

  const validateForm = (): boolean => {
    const newErrors: string[] = [];

    if (!formData.nivel_educativo_id) newErrors.push('Debe seleccionar un nivel educativo');
    if (!formData.grado_id) newErrors.push('Debe seleccionar un grado');
    if (!formData.letra_id) newErrors.push('Debe seleccionar una letra');
    if (!formData.jornada_id) newErrors.push('Debe seleccionar una jornada');
    if (!formData.anio_academico) newErrors.push('Debe especificar el año académico');
    if (formData.capacidad_maxima < 1 || formData.capacidad_maxima > 60) {
      newErrors.push('La capacidad debe estar entre 1 y 60 alumnos');
    }

    setErrors(newErrors);
    return newErrors.length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setSaving(true);

    try {
      const url = isEditing ? `/api/courses/v2/${course.id}` : '/api/courses/v2';
      const method = isEditing ? 'PUT' : 'POST';

      const payload = isEditing
        ? {
            capacidad_maxima: formData.capacidad_maxima,
            sala: formData.sala || null,
            jornada_id: formData.jornada_id,
            profesor_jefe_id: formData.profesor_jefe_id,
            estado: formData.estado,
            actualizado_por: 'sistema' // TODO: obtener usuario actual
          }
        : {
            nivel_educativo_id: formData.nivel_educativo_id,
            grado_id: formData.grado_id,
            letra_id: formData.letra_id,
            jornada_id: formData.jornada_id,
            anio_academico: formData.anio_academico,
            capacidad_maxima: formData.capacidad_maxima,
            sala: formData.sala || null,
            profesor_jefe_id: formData.profesor_jefe_id,
            estado: formData.estado,
            creado_por: 'sistema' // TODO: obtener usuario actual
          };

      console.log('[CourseFormModal] 📤 Enviando petición:', {
        url,
        method,
        payload
      });

      const response = await fetch(url, {
        method,
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      console.log('[CourseFormModal] 📥 Respuesta recibida:', {
        status: response.status,
        ok: response.ok
      });

      if (response.ok) {
        const result = await response.json();
        toast.success(isEditing ? 'Curso actualizado exitosamente' : `Curso ${result.data.codigo} creado exitosamente`);
        onSuccess();
      } else {
        const error = await response.json();
        if (response.status === 409) {
          toast.error(`Ya existe un curso con la misma combinación de grado, letra y año.\nCurso existente: ${error.existing_course?.codigo || 'N/A'}`);
        } else {
          toast.error(`Error: ${error.error || 'No se pudo guardar el curso'}\n${error.details || ''}`);
        }
      }
    } catch (error) {
      console.error('Error guardando curso:', error);
      toast.error('Error al guardar el curso. Por favor, intente nuevamente.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="ios-card max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b" style={{ borderColor: 'var(--color-border)' }}>
          <div className="flex items-center space-x-3">
            <BookOpen size={24} style={{ color: 'var(--color-primary)' }} />
            <h2 className="ios-title">
              {isEditing ? `Editar Curso ${course.codigo}` : 'Crear Nuevo Curso'}
            </h2>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100">
            <X size={24} />
          </button>
        </div>

        {/* Errors */}
        {errors.length > 0 && (
          <div className="mx-6 mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-start space-x-2">
              <AlertCircle size={20} className="text-red-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-semibold text-red-800 mb-1">
                  Por favor corrija los siguientes errores:
                </p>
                <ul className="text-sm text-red-700 list-disc list-inside space-y-1">
                  {errors.map((error, index) => (
                    <li key={index}>{error}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Preview Code */}
          {!isEditing && previewCode && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm font-medium text-blue-800 mb-1">Código del curso:</p>
              <p className="text-2xl font-mono font-bold" style={{ color: 'var(--color-primary)' }}>
                {previewCode}
              </p>
              <p className="text-xs text-blue-600 mt-1">
                El código se generará automáticamente al guardar
              </p>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Nivel Educativo */}
            <div>
              <label className="ios-form-label">
                Nivel Educativo {!isEditing && <span className="text-red-500">*</span>}
              </label>
              <select
                value={formData.nivel_educativo_id}
                onChange={(e) => setFormData({ ...formData, nivel_educativo_id: Number(e.target.value) })}
                className="ios-form-input"
                disabled={isEditing}
              >
                <option value={0}>Seleccione...</option>
                {catalogs.niveles_educativos.filter(n => n.activo).map(nivel => (
                  <option key={nivel.id} value={nivel.id}>
                    [{nivel.codigo_sige}] {nivel.nombre}
                  </option>
                ))}
              </select>
            </div>

            {/* Grado */}
            <div>
              <label className="ios-form-label">
                Grado {!isEditing && <span className="text-red-500">*</span>}
              </label>
              <select
                value={formData.grado_id}
                onChange={(e) => setFormData({ ...formData, grado_id: Number(e.target.value) })}
                className="ios-form-input"
                disabled={isEditing || !formData.nivel_educativo_id}
              >
                <option value={0}>Seleccione...</option>
                {filteredGrados.map(grado => (
                  <option key={grado.id} value={grado.id}>
                    {grado.nombre_completo}
                  </option>
                ))}
              </select>
            </div>

            {/* Letra */}
            <div>
              <label className="ios-form-label">
                Letra {!isEditing && <span className="text-red-500">*</span>}
              </label>
              <select
                value={formData.letra_id}
                onChange={(e) => setFormData({ ...formData, letra_id: Number(e.target.value) })}
                className="ios-form-input"
                disabled={isEditing}
              >
                <option value={0}>Seleccione...</option>
                {catalogs.letras_curso.filter(l => l.activo).map(letra => (
                  <option key={letra.id} value={letra.id}>
                    {letra.letra}
                  </option>
                ))}
              </select>
            </div>

            {/* Jornada */}
            <div>
              <label className="ios-form-label">
                Jornada <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.jornada_id}
                onChange={(e) => setFormData({ ...formData, jornada_id: Number(e.target.value) })}
                className="ios-form-input"
              >
                <option value={0}>Seleccione...</option>
                {catalogs.jornadas.filter(j => j.activo).map(jornada => (
                  <option key={jornada.id} value={jornada.id}>
                    {jornada.nombre} ({jornada.horario_inicio} - {jornada.horario_termino})
                  </option>
                ))}
              </select>
            </div>

            {/* Año Académico */}
            <div>
              <label className="ios-form-label">
                Año Académico {!isEditing && <span className="text-red-500">*</span>}
              </label>
              <select
                value={formData.anio_academico}
                onChange={(e) => setFormData({ ...formData, anio_academico: Number(e.target.value) })}
                className="ios-form-input"
                disabled={isEditing}
              >
                {[2024, 2025, 2026, 2027].map(year => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
            </div>

            {/* Capacidad Máxima */}
            <div>
              <label className="ios-form-label">
                Capacidad Máxima <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                min="1"
                max="60"
                value={formData.capacidad_maxima}
                onChange={(e) => setFormData({ ...formData, capacidad_maxima: Number(e.target.value) })}
                className="ios-form-input"
              />
              <p className="text-xs mt-1" style={{ color: 'var(--color-text-secondary)' }}>
                Entre 1 y 60 alumnos
              </p>
            </div>

            {/* Sala */}
            <div>
              <label className="ios-form-label">Sala</label>
              <input
                type="text"
                placeholder="Ej: Sala 101, Pabellón A-203"
                value={formData.sala || ''}
                onChange={(e) => setFormData({ ...formData, sala: e.target.value })}
                className="ios-form-input"
              />
            </div>

            {/* Profesor Jefe */}
            <div>
              <label className="ios-form-label">Profesor Jefe</label>
              <select
                value={formData.profesor_jefe_id || ''}
                onChange={(e) => setFormData({ ...formData, profesor_jefe_id: e.target.value ? Number(e.target.value) : null })}
                className="ios-form-input"
              >
                <option value="">No asignado</option>
                {teachers.map(teacher => (
                  <option key={teacher.id} value={teacher.id}>
                    {teacher.nombre}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Info sobre campos no editables */}
          {isEditing && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <p className="text-sm text-yellow-800">
                ℹ️ Los campos de nivel educativo, grado, letra y año no pueden modificarse ya que definen la identidad del curso.
                Para cambiar estos datos, debe crear un nuevo curso.
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end space-x-3 pt-4 border-t" style={{ borderColor: 'var(--color-border)' }}>
            <button
              type="button"
              onClick={onClose}
              className="ios-btn ios-btn-secondary"
              disabled={saving}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="ios-btn ios-btn-primary"
              disabled={saving}
            >
              {saving ? 'Guardando...' : (isEditing ? 'Actualizar Curso' : 'Crear Curso')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CourseFormModal;
