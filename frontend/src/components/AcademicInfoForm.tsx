import React, { useState, useEffect } from 'react';

interface AcademicInfoData {
  tipo_religion?: string;
  curso_id?: number | null;  // Ahora usamos curso_id en lugar de curso_base + letra
  curso_base?: string;  // Legacy - se mantiene para compatibilidad
  letra?: string;       // Legacy - se mantiene para compatibilidad
  estado?: string;
}

interface Course {
  id: number;
  codigo: string;                    // "110-1A", "10-PKA", "299-1A"
  codigo_sige: number;              // 10, 110, 299
  nivel_educativo_nombre: string;   // "Educación Parvularia", "Enseñanza Básica"
  grado_nombre: string;             // "1° Básico", "Pre-Kinder"
  letra: string;                    // "A", "B"
  capacidad_maxima: number;
  alumnos_matriculados: number;
  cupos_disponibles: number;
  estado: string;                   // "activo", "planificado", "cerrado"
  jornada: string;                  // "Mañana", "Tarde", "Completa"
  sala: string | null;
  profesor_jefe_id: number | null;  // ID del profesor asignado al curso
  profesor_jefe_nombre: string | null;
}

interface AcademicInfoFormProps {
  academicInfo: AcademicInfoData;
  onAcademicInfoChange: (field: keyof AcademicInfoData, value: string | number | null) => void;
  userRole: 'profesor' | 'inspector' | 'administrador';
  userId?: number;  // ID del usuario logueado (profesor)
  disabled?: boolean; // NUEVO: para deshabilitar el formulario
}

const AcademicInfoForm: React.FC<AcademicInfoFormProps> = ({
  academicInfo,
  onAcademicInfoChange,
  userRole,
  userId,
  disabled = false // NUEVO
}) => {
  const [allCourses, setAllCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentYear, setCurrentYear] = useState<number>(2026);
  const [enrollPermissionCourseIds, setEnrollPermissionCourseIds] = useState<number[]>([]);  // NUEVO: IDs de cursos donde puede matricular

  // Cargar año vigente
  useEffect(() => {
    const fetchCurrentYear = async () => {
      try {
        const response = await fetch('/api/year/current', {
          credentials: 'include'
        });
        if (response.ok) {
          const data = await response.json();
          setCurrentYear(data.year);
        }
      } catch (err) {
        console.error('Error al obtener año vigente:', err);
      }
    };

    fetchCurrentYear();
  }, []);

  // NUEVO: Cargar IDs de cursos donde el profesor puede matricular
  useEffect(() => {
    const fetchEnrollPermissions = async () => {
      // Solo cargar para profesores
      if (userRole !== 'profesor' || !userId) {
        return;
      }

      try {
        const response = await fetch('/api/user/courses-with-enroll-permission', {
          credentials: 'include'
        });

        if (response.ok) {
          const courseIds = await response.json();
          setEnrollPermissionCourseIds(courseIds);
          console.log(`🎓 Profesor ${userId}: Puede matricular en ${courseIds.length} curso(s): [${courseIds.join(', ')}]`);
        }
      } catch (err) {
        console.error('Error al cargar permisos de matrícula:', err);
      }
    };

    fetchEnrollPermissions();
  }, [userRole, userId]);

  // Cargar cursos desde la API
  useEffect(() => {
    const fetchCourses = async () => {
      // No cargar si currentYear no está definido todavía
      if (!currentYear) {
        console.log('⏳ Esperando año vigente...');
        return;
      }

      setLoading(true);
      setError(null);

      try {
        // Construir URL con filtros
        const params = new URLSearchParams();
        params.append('anio_academico', currentYear.toString());
        params.append('estado', 'activo');  // Solo cursos activos (todos los cursos deben ser activos)

        const response = await fetch(`/api/courses/v2?${params.toString()}`, {
          credentials: 'include'
        });

        if (!response.ok) {
          throw new Error('Error al cargar cursos');
        }

        const result = await response.json();

        if (result.success) {
          setAllCourses(result.data);
          console.log(`📚 Cursos cargados: ${result.data.length} cursos para año ${currentYear}`);
        } else {
          throw new Error(result.error || 'Error desconocido');
        }
      } catch (err) {
        console.error('Error al cargar cursos:', err);
        setError(err instanceof Error ? err.message : 'Error al cargar cursos');
      } finally {
        setLoading(false);
      }
    };

    fetchCourses();
  }, [currentYear]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { id, value } = e.target;
    console.log(`AcademicInfoForm - Changing ${id} to: ${value}`);

    if (id === 'curso_id') {
      const cursoId = value ? parseInt(value) : null;
      onAcademicInfoChange('curso_id', cursoId);

      // Actualizar también curso_base y letra para compatibilidad
      if (cursoId) {
        const curso = allCourses.find(c => c.id === cursoId);
        if (curso) {
          onAcademicInfoChange('curso_base', curso.grado_nombre);
          onAcademicInfoChange('letra', curso.letra);
        }
      }
    } else {
      onAcademicInfoChange(id as keyof AcademicInfoData, value);
    }
  };

  console.log('AcademicInfoForm - userRole:', userRole);
  console.log('AcademicInfoForm - userId:', userId);
  console.log('AcademicInfoForm - allCourses length:', allCourses.length);

  // Filtrar cursos según rol
  const coursesToShow = React.useMemo(() => {
    if (userRole === 'profesor' && userId) {
      // NUEVO: Para profesores: solo mostrar cursos donde PUEDE MATRICULAR (según tabla profesor_curso)
      // Esto incluye: profesor jefe + otros cursos asignados con permiso de matrícula
      const filteredCourses = allCourses.filter(curso =>
        enrollPermissionCourseIds.includes(curso.id)
      );
      console.log(`🎓 Profesor ${userId}: ${filteredCourses.length} cursos con permiso de matrícula de ${allCourses.length} totales`);
      return filteredCourses;
    }
    // Para admin e inspector: todos los cursos activos
    return allCourses;
  }, [userRole, allCourses, userId, enrollPermissionCourseIds]);

  console.log('AcademicInfoForm - coursesToShow:', coursesToShow.length);

  // Agrupar cursos por nivel educativo
  const coursesByLevel = React.useMemo(() => {
    const grouped = coursesToShow.reduce((acc, curso) => {
      const key = `${curso.codigo_sige} - ${curso.nivel_educativo_nombre}`;
      if (!acc[key]) {
        acc[key] = [];
      }
      acc[key].push(curso);
      return acc;
    }, {} as Record<string, Course[]>);

    // Ordenar cursos dentro de cada grupo
    Object.keys(grouped).forEach(key => {
      grouped[key].sort((a, b) => a.codigo.localeCompare(b.codigo));
    });

    return grouped;
  }, [coursesToShow]);

  const selectedCourse = allCourses.find(c => c.id === academicInfo.curso_id);

  if (loading) {
    return (
      <div className="text-center py-8">
        <p className="ios-caption">Cargando cursos...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="border border-red-200 dark:border-red-600 rounded-lg p-4 mb-6 bg-red-50 dark:bg-red-900/20">
        <p className="font-medium text-red-800 dark:text-red-300">⚠️ Error al cargar cursos</p>
        <p className="ios-caption mt-1 text-red-600 dark:text-red-400">{error}</p>
      </div>
    );
  }

  return (
    <div>
      {/* Título removido - se muestra en el padre */}

      {userRole === 'profesor' && coursesToShow.length === 0 && (
        <div className="border border-yellow-200 dark:border-yellow-600 rounded-lg p-4 mb-6" style={{backgroundColor: 'var(--color-warning)'}}>
          <p className="font-medium" style={{color: 'var(--color-foreground)'}}>⚠️ No tienes cursos asignados</p>
          <p className="ios-caption mt-1">
            Contacta al administrador para que te asigne cursos antes de poder matricular estudiantes.
          </p>
        </div>
      )}

      {coursesToShow.length === 0 && userRole !== 'profesor' && (
        <div className="border border-yellow-200 dark:border-yellow-600 rounded-lg p-4 mb-6" style={{backgroundColor: 'var(--color-warning)'}}>
          <p className="font-medium" style={{color: 'var(--color-foreground)'}}>⚠️ No hay cursos activos</p>
          <p className="ios-caption mt-1">
            No existen cursos activos para el año académico {currentYear}. Contacta al administrador.
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="md:col-span-2">
          <div>
            <label htmlFor="tipo_religion" className="ios-form-label">
              Religión <span style={{color: 'var(--color-error)'}}>*</span>
            </label>
            <select
              id="tipo_religion"
              value={academicInfo.tipo_religion || ''}
              onChange={handleInputChange}
              className="ios-form-input max-w-md"
              required
              disabled={disabled}
            >
              <option value="">Seleccione...</option>
              <option value="Católica">Católica</option>
              <option value="Evangélica">Evangélica</option>
              <option value="Ninguna">Ninguna</option>
            </select>
          </div>
        </div>

        <div className="md:col-span-2">
          <label htmlFor="curso_id" className="ios-form-label">
            Curso <span style={{color: 'var(--color-error)'}}>*</span>
          </label>
          <select
            id="curso_id"
            value={academicInfo.curso_id || ''}
            onChange={handleInputChange}
            className="ios-form-input"
            required
            disabled={disabled || coursesToShow.length === 0}
          >
            <option value="">Seleccione un curso...</option>

            {Object.entries(coursesByLevel).map(([levelName, courses]) => (
              <optgroup key={levelName} label={levelName}>
                {courses.map(curso => {
                  const isDisabled = curso.cupos_disponibles === 0;

                  return (
                    <option
                      key={curso.id}
                      value={curso.id}
                      disabled={isDisabled}
                    >
                      {curso.grado_nombre} {curso.letra}
                    </option>
                  );
                })}
              </optgroup>
            ))}
          </select>

          {/* Información del curso seleccionado */}
          {selectedCourse && (
            <div className="mt-3 p-3 rounded-lg border" style={{
              borderColor: 'var(--color-border)',
              backgroundColor: 'var(--color-card)'
            }}>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="ios-caption">Código:</span>
                  <p className="font-semibold" style={{color: 'var(--color-primary)'}}>
                    {selectedCourse.codigo}
                  </p>
                </div>
                <div>
                  <span className="ios-caption">Nivel:</span>
                  <p className="font-medium">{selectedCourse.nivel_educativo_nombre}</p>
                </div>
                <div>
                  <span className="ios-caption">Jornada:</span>
                  <p className="font-medium">{selectedCourse.jornada}</p>
                </div>
                <div>
                  <span className="ios-caption">Sala:</span>
                  <p className="font-medium">{selectedCourse.sala || 'No asignada'}</p>
                </div>
                <div>
                  <span className="ios-caption">Capacidad:</span>
                  <p className="font-medium">
                    {selectedCourse.alumnos_matriculados}/{selectedCourse.capacidad_maxima}
                    {selectedCourse.cupos_disponibles > 0 && (
                      <span className="text-green-600 dark:text-green-400 ml-2">
                        ({selectedCourse.cupos_disponibles} cupos)
                      </span>
                    )}
                    {selectedCourse.cupos_disponibles === 0 && (
                      <span className="text-red-600 dark:text-red-400 ml-2">
                        (LLENO)
                      </span>
                    )}
                  </p>
                </div>
                {selectedCourse.profesor_jefe_nombre && (
                  <div>
                    <span className="ios-caption">Profesor Jefe:</span>
                    <p className="font-medium">{selectedCourse.profesor_jefe_nombre}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          <p className="ios-caption mt-2">
            Se mostrarán solo cursos activos del año académico {currentYear}
            {userRole === 'profesor' && ' asignados a tu cuenta'}
          </p>
        </div>
      </div>
    </div>
  );
};

export default AcademicInfoForm;
