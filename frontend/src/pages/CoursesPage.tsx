import React, { useState, useEffect } from 'react';
import { BookOpen, Plus, Edit2, Trash2, Users, Search, Filter } from 'lucide-react';
import CourseFormModal from '../components/CourseFormModal';
import CourseTeachersModal from '../components/CourseTeachersModal';

interface Course {
  id: number;
  codigo: string;
  anio_academico: number;
  capacidad_maxima: number;
  estado: string;
  sala: string | null;

  // Nivel educativo
  nivel_educativo_id: number;
  codigo_sige: number;
  nivel_educativo_nombre: string;

  // Grado
  grado_id: number;
  grado_codigo: string;
  grado_nombre: string;
  grado_nombre_corto: string;
  grado_orden: number;

  // Letra
  letra_id: number;
  letra: string;
  letra_orden: number;

  // Jornada
  jornada_id: number;
  jornada: string;
  horario_inicio: string;
  horario_termino: string;

  // Profesor jefe
  profesor_jefe_id: number | null;
  profesor_jefe_nombre: string | null;
  profesor_jefe_username: string | null;

  // Estadísticas
  alumnos_matriculados: number;
  cupos_disponibles: number;
  alumnos_pie: number;
  porcentaje_ocupacion: number;
}

interface Catalogs {
  niveles_educativos: any[];
  grados: any[];
  letras_curso: any[];
  jornadas: any[];
}

interface CoursesPageProps {
  userRole?: string;
  currentYear: number;
}

const CoursesPage: React.FC<CoursesPageProps> = ({ userRole, currentYear }) => {
  const [courses, setCourses] = useState<Course[]>([]);
  const [filteredCourses, setFilteredCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showFormModal, setShowFormModal] = useState(false);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [catalogs, setCatalogs] = useState<Catalogs | null>(null);
  const [selectedCourseForTeachers, setSelectedCourseForTeachers] = useState<Course | null>(null);

  // Filtros
  const [filterYear, setFilterYear] = useState<number>(currentYear || new Date().getFullYear());
  const [filterNivel, setFilterNivel] = useState<number | ''>('');
  const [filterGrado, setFilterGrado] = useState<number | ''>('');
  const [filterLetra, setFilterLetra] = useState<number | ''>('');
  const [filterEstado, setFilterEstado] = useState<string>('activo');  // Por defecto solo cursos activos
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    loadCatalogs();
  }, []);

  useEffect(() => {
    if (currentYear && currentYear !== filterYear) {
      setFilterYear(currentYear);
    }
  }, [currentYear]);

  useEffect(() => {
    if (filterYear) {
      loadCourses();
    }
  }, [filterYear, filterNivel, filterEstado]);

  // Resetear grado cuando cambia nivel
  useEffect(() => {
    setFilterGrado('');
  }, [filterNivel]);

  useEffect(() => {
    applyFilters();
  }, [searchTerm, courses, filterGrado, filterLetra]);

  const loadCatalogs = async () => {
    try {
      const response = await fetch('/api/catalogs/all', {
        credentials: 'include'
      });

      if (response.ok) {
        const result = await response.json();
        setCatalogs(result.data);
      } else {
        console.error('Error cargando catálogos');
      }
    } catch (error) {
      console.error('Error cargando catálogos:', error);
      alert('Error al cargar catálogos del sistema');
    }
  };

  const loadCourses = async () => {
    if (!filterYear) {
      console.warn('loadCourses: filterYear no está definido');
      return;
    }

    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append('anio_academico', filterYear.toString());
      if (filterNivel) params.append('nivel_educativo_id', filterNivel.toString());
      if (filterEstado) params.append('estado', filterEstado);

      const response = await fetch(`/api/courses/v2?${params.toString()}`, {
        credentials: 'include'
      });

      if (response.ok) {
        const result = await response.json();
        setCourses(result.data || []);
      } else {
        console.error('Error cargando cursos');
        setCourses([]);
      }
    } catch (error) {
      console.error('Error cargando cursos:', error);
      alert('Error al cargar la lista de cursos');
      setCourses([]);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = courses;

    // Filtro por término de búsqueda
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(c =>
        c.codigo.toLowerCase().includes(term) ||
        c.grado_nombre.toLowerCase().includes(term) ||
        c.nivel_educativo_nombre.toLowerCase().includes(term) ||
        (c.profesor_jefe_nombre && c.profesor_jefe_nombre.toLowerCase().includes(term)) ||
        (c.sala && c.sala.toLowerCase().includes(term))
      );
    }

    // Filtro por grado
    if (filterGrado) {
      filtered = filtered.filter(c => c.grado_id === filterGrado);
    }

    // Filtro por letra
    if (filterLetra) {
      filtered = filtered.filter(c => c.letra_id === filterLetra);
    }

    setFilteredCourses(filtered);
  };

  const handleNew = () => {
    setEditingCourse(null);
    setShowFormModal(true);
  };

  const handleEdit = (course: Course) => {
    setEditingCourse(course);
    setShowFormModal(true);
  };

  const handleDelete = async (course: Course) => {
    const confirmMessage = course.alumnos_matriculados > 0
      ? `⚠️ El curso ${course.codigo} tiene ${course.alumnos_matriculados} alumno(s) matriculado(s).\n\n¿Está seguro de eliminar este curso?\n(Los alumnos quedarán sin curso asignado)`
      : `¿Está seguro de eliminar el curso ${course.codigo}?`;

    if (!confirm(confirmMessage)) {
      return;
    }

    try {
      const url = course.alumnos_matriculados > 0
        ? `/api/courses/v2/${course.id}?force=true`
        : `/api/courses/v2/${course.id}`;

      const response = await fetch(url, {
        method: 'DELETE',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          actualizado_por: 'sistema' // TODO: usar usuario actual
        })
      });

      if (response.ok) {
        const result = await response.json();
        alert(result.message);
        loadCourses();
      } else {
        const error = await response.json();
        alert(`Error: ${error.error || 'No se pudo eliminar el curso'}`);
      }
    } catch (error) {
      console.error('Error eliminando curso:', error);
      alert('Error al eliminar el curso');
    }
  };

  const handleFormSuccess = () => {
    setShowFormModal(false);
    setEditingCourse(null);
    loadCourses();
  };

  const handleFormClose = () => {
    setShowFormModal(false);
    setEditingCourse(null);
  };

  const getOcupacionColor = (porcentaje: number) => {
    if (porcentaje >= 100) return 'text-red-600 dark:text-red-400 font-bold';
    if (porcentaje >= 90) return 'text-orange-600 dark:text-orange-400';
    if (porcentaje < 30) return 'text-gray-500 dark:text-gray-400';
    return 'text-green-600 dark:text-green-400';
  };

  const canEditCourse = userRole === 'administrador' || userRole === 'inspector';
  const canDeleteCourse = userRole === 'administrador';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="ios-card p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <BookOpen size={32} style={{ color: 'var(--color-primary)' }} />
            <div>
              <h1 className="ios-title">Gestión de Cursos</h1>
              <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                Administración de cursos del año académico
              </p>
            </div>
          </div>
          {canEditCourse && (
            <button
              onClick={handleNew}
              className="ios-btn ios-btn-primary flex items-center space-x-2"
            >
              <Plus size={20} />
              <span>Nuevo Curso</span>
            </button>
          )}
        </div>

        {/* Search and Filters */}
        <div className="space-y-3">
          <div className="flex space-x-2">
            <div className="flex-1 relative">
              <Search
                className="absolute left-3 top-1/2 transform -translate-y-1/2"
                size={20}
                style={{ color: 'var(--color-text-secondary)' }}
              />
              <input
                type="text"
                placeholder="Buscar por código, grado, profesor o sala..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="ios-form-input pl-10 w-full"
              />
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`ios-btn ios-btn-secondary px-4 flex items-center space-x-2 ${showFilters ? 'bg-blue-50 dark:bg-blue-900/20' : ''}`}
            >
              <Filter size={20} />
              <span>Filtros</span>
            </button>
          </div>

          {showFilters && (
            <div className="ios-card bg-gray-50 dark:bg-gray-800 p-4 space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                <div>
                  <label className="ios-form-label">Año Académico</label>
                  <select
                    value={filterYear}
                    onChange={(e) => setFilterYear(Number(e.target.value))}
                    className="ios-form-input"
                  >
                    {[2024, 2025, 2026, 2027].map(year => (
                      <option key={year} value={year}>{year}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="ios-form-label">Nivel Educativo</label>
                  <select
                    value={filterNivel}
                    onChange={(e) => setFilterNivel(e.target.value ? Number(e.target.value) : '')}
                    className="ios-form-input"
                  >
                    <option value="">Todos los niveles</option>
                    {catalogs?.niveles_educativos.map(nivel => (
                      <option key={nivel.id} value={nivel.id}>
                        [{nivel.codigo_sige}] {nivel.nombre}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="ios-form-label">Grado</label>
                  <select
                    value={filterGrado}
                    onChange={(e) => setFilterGrado(e.target.value ? Number(e.target.value) : '')}
                    className="ios-form-input"
                    disabled={!filterNivel}
                  >
                    <option value="">Todos los grados</option>
                    {catalogs?.grados
                      .filter(g => !filterNivel || g.nivel_educativo_id === filterNivel)
                      .map(grado => (
                        <option key={grado.id} value={grado.id}>
                          {grado.nombre_corto}
                        </option>
                      ))}
                  </select>
                </div>

                <div>
                  <label className="ios-form-label">Letra</label>
                  <select
                    value={filterLetra}
                    onChange={(e) => setFilterLetra(e.target.value ? Number(e.target.value) : '')}
                    className="ios-form-input"
                  >
                    <option value="">Todas las letras</option>
                    {catalogs?.letras_curso.map(letra => (
                      <option key={letra.id} value={letra.id}>
                        {letra.letra}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="ios-form-label">Estado</label>
                  <select
                    value={filterEstado}
                    onChange={(e) => setFilterEstado(e.target.value)}
                    className="ios-form-input"
                  >
                    <option value="">Todos los estados</option>
                    <option value="planificado">Planificado</option>
                    <option value="activo">Activo</option>
                    <option value="cerrado">Cerrado</option>
                    <option value="cancelado">Cancelado</option>
                  </select>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Courses Table */}
      <div className="ios-card">
        {loading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 mx-auto mb-4" style={{ borderColor: 'var(--color-primary)' }}></div>
            <p style={{ color: 'var(--color-text-secondary)' }}>Cargando cursos...</p>
          </div>
        ) : filteredCourses.length === 0 ? (
          <div className="p-8 text-center">
            <BookOpen size={48} className="mx-auto mb-4" style={{ color: 'var(--color-text-secondary)' }} />
            <p className="ios-title mb-2">No hay cursos</p>
            <p style={{ color: 'var(--color-text-secondary)' }}>
              {searchTerm ? 'No se encontraron cursos con ese criterio de búsqueda' : 'Aún no se han creado cursos para este año'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--color-border)' }}>
                  <th className="text-left p-4 font-semibold">Código</th>
                  <th className="text-left p-4 font-semibold">Nivel / Grado</th>
                  <th className="text-center p-4 font-semibold">Letra</th>
                  <th className="text-center p-4 font-semibold">Jornada</th>
                  <th className="text-center p-4 font-semibold">Matriculados</th>
                  <th className="text-center p-4 font-semibold">PIE</th>
                  <th className="text-left p-4 font-semibold">Profesor Jefe</th>
                  <th className="text-center p-4 font-semibold">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filteredCourses.map((course) => (
                  <tr
                    key={course.id}
                    style={{ borderBottom: '1px solid var(--color-border)' }}
                    className="hover:bg-gray-50 dark:hover:bg-gray-800/60 transition-colors"
                  >
                    <td className="p-4">
                      <div className="font-mono font-bold" style={{ color: 'var(--color-primary)' }}>
                        {course.codigo}
                      </div>
                      {course.sala && (
                        <div className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                          {course.sala}
                        </div>
                      )}
                    </td>
                    <td className="p-4">
                      <div className="font-medium">{course.grado_nombre_corto}</div>
                      <div className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                        {course.nivel_educativo_nombre}
                      </div>
                    </td>
                    <td className="p-4 text-center">
                      <div className="text-lg font-bold">{course.letra}</div>
                    </td>
                    <td className="p-4 text-center">
                      <div className="text-sm">{course.jornada}</div>
                      <div className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                        {course.horario_inicio} - {course.horario_termino}
                      </div>
                    </td>
                    <td className="p-4 text-center">
                      <div className={`font-semibold ${getOcupacionColor(course.porcentaje_ocupacion)}`}>
                        {course.alumnos_matriculados} / {course.capacidad_maxima}
                      </div>
                      <div className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                        {course.porcentaje_ocupacion}% ocupación
                      </div>
                    </td>
                    <td className="p-4 text-center">
                      {course.alumnos_pie > 0 ? (
                        <span className="text-blue-600 dark:text-blue-400 font-semibold">{course.alumnos_pie}</span>
                      ) : (
                        <span style={{ color: 'var(--color-text-secondary)' }}>-</span>
                      )}
                    </td>
                    <td className="p-4">
                      {course.profesor_jefe_nombre ? (
                        <div className="text-sm">{course.profesor_jefe_nombre}</div>
                      ) : (
                        <span className="text-orange-600 dark:text-orange-400 text-sm">Sin asignar</span>
                      )}
                    </td>
                    <td className="p-4">
                      <div className="flex items-center justify-center space-x-2">
                        {/* Manage Teachers Button */}
                        {(userRole === 'administrador' || userRole === 'inspector') && (
                          <button
                            onClick={() => setSelectedCourseForTeachers(course)}
                            className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg hover:bg-purple-50 dark:hover:bg-purple-900/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 dark:focus-visible:ring-purple-400 transition-colors"
                            title="Gestionar profesores"
                          >
                            <Users size={18} className="text-purple-600 dark:text-purple-400" />
                          </button>
                        )}
                        {canEditCourse && (
                          <button
                            onClick={() => handleEdit(course)}
                            className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:focus-visible:ring-blue-400 transition-colors"
                            title="Editar curso"
                          >
                            <Edit2 size={18} className="text-blue-600 dark:text-blue-400" />
                          </button>
                        )}
                        {canDeleteCourse && (
                          <button
                            onClick={() => handleDelete(course)}
                            className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 dark:focus-visible:ring-red-400 transition-colors"
                            title="Eliminar curso"
                          >
                            <Trash2 size={18} className="text-red-600 dark:text-red-400" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Summary */}
        {filteredCourses.length > 0 && (
          <div className="p-4 bg-gray-50 dark:bg-gray-800 border-t" style={{ borderColor: 'var(--color-border)' }}>
            <div className="flex items-center justify-between text-sm">
              <span style={{ color: 'var(--color-text-secondary)' }}>
                Mostrando {filteredCourses.length} curso(s) del año {filterYear}
              </span>
              <div className="flex items-center space-x-4">
                <span style={{ color: 'var(--color-text-secondary)' }}>
                  Total alumnos: <strong>{filteredCourses.reduce((sum, c) => sum + c.alumnos_matriculados, 0)}</strong>
                </span>
                <span style={{ color: 'var(--color-text-secondary)' }}>
                  Capacidad total: <strong>{filteredCourses.reduce((sum, c) => sum + c.capacidad_maxima, 0)}</strong>
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Form Modal */}
      {showFormModal && catalogs && (
        <CourseFormModal
          course={editingCourse}
          catalogs={catalogs}
          currentYear={currentYear}
          onSuccess={handleFormSuccess}
          onClose={handleFormClose}
        />
      )}

      {/* Teachers Management Modal */}
      {selectedCourseForTeachers && (
        <CourseTeachersModal
          courseId={selectedCourseForTeachers.id}
          courseName={`${selectedCourseForTeachers.codigo} - ${selectedCourseForTeachers.grado_nombre} ${selectedCourseForTeachers.letra}`}
          onClose={() => setSelectedCourseForTeachers(null)}
        />
      )}
    </div>
  );
};

export default CoursesPage;
