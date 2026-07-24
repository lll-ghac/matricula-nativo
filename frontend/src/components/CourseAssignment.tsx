import React, { useState, useEffect } from 'react';
import { BookOpen, User, Plus, Save, Trash2, Search, ChevronDown, ChevronUp } from 'lucide-react';

interface User {
  id: number;
  username: string;
  nombre: string;
  rol: string;
  assignedCourses?: { base: string; letra: string; }[];
}

const CourseAssignment: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [savingUserId, setSavingUserId] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [showInfo, setShowInfo] = useState(false);

  const [courses, setCourses] = useState<string[]>([]);
  const [letters, setLetters] = useState<string[]>([]);

  useEffect(() => {
    fetchCourses();
    fetchUsers();
  }, []);

  const fetchCourses = async () => {
    try {
      const response = await fetch('/api/courses', {
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error('Error al cargar cursos disponibles');
      }

      const data = await response.json();
      setCourses(data.courses);
      setLetters(data.letters);
    } catch (err: any) {
      console.error('Error fetching courses:', err);
      // Set default courses if API fails
      setCourses([
        'Pre-Kinder', 'Kinder', 
        '1° Básico', '2° Básico', '3° Básico', '4° Básico', '5° Básico', '6° Básico', '7° Básico', '8° Básico',
        '1° Medio', '2° Medio', '3° Medio', '4° Medio',
        'OP4 - 1° Básico', 'OP4 - 2° Básico', 'OP4 - 3° Básico', 'OP4 - 4° Básico'
      ]);
      setLetters(['A', 'B', 'C', 'D']);
    }
  };

  const fetchUsers = async () => {
    try {
      const response = await fetch('/api/teachers', {
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error('Error al cargar profesores');
      }

      const data = await response.json();
      setUsers(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const addCourseToUser = (userId: number) => {
    setUsers(users.map(user => {
      if (user.id === userId) {
        const newCourses = [...(user.assignedCourses || []), { base: '', letra: '' }];
        return { ...user, assignedCourses: newCourses };
      }
      return user;
    }));
  };

  const removeCourseFromUser = (userId: number, courseIndex: number) => {
    setUsers(users.map(user => {
      if (user.id === userId) {
        const newCourses = (user.assignedCourses || []).filter((_, index) => index !== courseIndex);
        return { ...user, assignedCourses: newCourses };
      }
      return user;
    }));
  };

  const updateCourse = (userId: number, courseIndex: number, field: 'base' | 'letra', value: string) => {
    setUsers(users.map(user => {
      if (user.id === userId) {
        const newCourses = [...(user.assignedCourses || [])];
        newCourses[courseIndex] = { ...newCourses[courseIndex], [field]: value };
        return { ...user, assignedCourses: newCourses };
      }
      return user;
    }));
  };

  const saveUserCourses = async (user: User) => {
    try {
      setError(null);
      setSuccess(null);
      setSavingUserId(user.id);

      const response = await fetch(`/api/teachers/${user.id}/courses`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          assignedCourses: user.assignedCourses || []
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Error al guardar cursos');
      }

      const result = await response.json();
      setSuccess(result.message);
      setTimeout(() => setSuccess(null), 5000);
      
      // Refresh the user list to show updated data
      fetchUsers();
    } catch (err: any) {
      setError(err.message);
      setTimeout(() => setError(null), 5000);
    } finally {
      setSavingUserId(null);
    }
  };

  // Filter teachers based on search term
  const filteredUsers = users.filter(user => {
    const searchLower = searchTerm.toLowerCase();
    return user.nombre.toLowerCase().includes(searchLower) || 
           user.username.toLowerCase().includes(searchLower);
  });

  if (loading) {
    return (
      <div className="ios-card p-8 text-center">
        <BookOpen size={48} className="mx-auto mb-4" style={{color: 'var(--color-primary)'}} />
        <p className="ios-title">Cargando profesores...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <BookOpen size={28} style={{color: 'var(--color-primary)'}} />
          <h3 className="ios-title-large">Asignación de Cursos a Profesores</h3>
        </div>
        <button
          onClick={() => setShowInfo(!showInfo)}
          className="ios-btn ios-btn-secondary text-sm"
        >
          {showInfo ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          <span className="ml-1">Info</span>
        </button>
      </div>

      {error && (
        <div className="ios-card p-3" style={{backgroundColor: 'var(--color-error)', color: 'white'}}>
          <p className="ios-body">{error}</p>
        </div>
      )}

      {success && (
        <div className="ios-card p-3" style={{backgroundColor: 'var(--color-success)', color: 'white'}}>
          <p className="ios-body">{success}</p>
        </div>
      )}

      {/* Info Panel - Colapsable */}
      {showInfo && (
        <div className="ios-card p-4" style={{backgroundColor: 'var(--color-primary-light)'}}>
          <h4 className="ios-subtitle mb-2">ℹ️ Información</h4>
          <ul className="space-y-1 ios-caption" style={{color: 'var(--color-secondary)'}}>
            <li>• Los profesores solo ven estudiantes en sus cursos asignados</li>
            <li>• Inspectores y administradores ven todos los cursos</li>
            <li>• Un curso puede tener múltiples profesores</li>
            <li>• Guarde los cambios después de modificar las asignaciones</li>
          </ul>
        </div>
      )}

      {/* Search Bar */}
      <div className="ios-card p-3">
        <div className="relative">
          <Search size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2" style={{color: 'var(--color-text-light)'}} />
          <input
            type="text"
            placeholder="Buscar profesor por nombre o RUT..."
            className="ios-form-input pl-10"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        {searchTerm && (
          <p className="ios-caption mt-2" style={{color: 'var(--color-text-light)'}}>
            Mostrando {filteredUsers.length} de {users.length} profesores
          </p>
        )}
      </div>

      {/* Teachers List */}
      <div className="space-y-3">
        {users.length === 0 ? (
          <div className="ios-card p-6 text-center">
            <User size={40} className="mx-auto mb-3" style={{color: 'var(--color-text-light)'}} />
            <p className="ios-body" style={{color: 'var(--color-text-light)'}}>
              No hay profesores registrados en el sistema
            </p>
          </div>
        ) : filteredUsers.length === 0 && searchTerm ? (
          <div className="ios-card p-6 text-center">
            <Search size={40} className="mx-auto mb-3" style={{color: 'var(--color-text-light)'}} />
            <p className="ios-body" style={{color: 'var(--color-text-light)'}}>
              No se encontraron profesores que coincidan con "{searchTerm}"
            </p>
            <button
              onClick={() => setSearchTerm('')}
              className="ios-btn ios-btn-secondary mt-2"
            >
              Limpiar Búsqueda
            </button>
          </div>
        ) : (
          filteredUsers.map((user) => (
            <div key={user.id} className="ios-card p-4">
              {/* Header compacto */}
              <div className="flex items-center justify-between mb-3 pb-3 border-b" style={{borderColor: 'var(--color-border)'}}>
                <div className="flex items-center space-x-2">
                  <User size={20} style={{color: 'var(--color-primary)'}} />
                  <div>
                    <h4 className="ios-body font-semibold">{user.nombre}</h4>
                    <p className="ios-caption" style={{color: 'var(--color-text-light)'}}>
                      RUT: {user.username}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => addCourseToUser(user.id)}
                  className="ios-btn ios-btn-secondary text-sm"
                >
                  <Plus size={14} className="mr-1" />
                  Agregar
                </button>
              </div>

              {/* Cursos */}
              {(!user.assignedCourses || user.assignedCourses.length === 0) ? (
                <div className="text-center py-2">
                  <p className="ios-caption" style={{color: 'var(--color-text-light)'}}>
                    Sin cursos asignados
                  </p>
                </div>
              ) : (
                <div className="space-y-2 mb-3">
                  {user.assignedCourses.map((course, index) => (
                    <div key={index} className="grid grid-cols-[1fr_120px_auto] gap-2 items-end">
                      <div>
                        <label className="ios-caption block mb-1" style={{color: 'var(--color-text-light)'}}>Curso</label>
                        <select
                          value={course.base}
                          onChange={(e) => updateCourse(user.id, index, 'base', e.target.value)}
                          className="ios-form-input text-sm py-2"
                        >
                          <option value="">Seleccione...</option>
                          {courses.map(courseOption => (
                            <option key={courseOption} value={courseOption}>
                              {courseOption}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="ios-caption block mb-1" style={{color: 'var(--color-text-light)'}}>Letra</label>
                        <select
                          value={course.letra}
                          onChange={(e) => updateCourse(user.id, index, 'letra', e.target.value)}
                          className="ios-form-input text-sm py-2"
                        >
                          <option value="">-</option>
                          {letters.map(letter => (
                            <option key={letter} value={letter}>
                              {letter}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <button
                          onClick={() => removeCourseFromUser(user.id, index)}
                          className="ios-btn ios-btn-danger py-2 px-3"
                          title="Eliminar curso"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Botón Guardar al final */}
              {user.assignedCourses && user.assignedCourses.length > 0 && (
                <div className="pt-2 border-t" style={{borderColor: 'var(--color-border)'}}>
                  <button
                    onClick={() => saveUserCourses(user)}
                    disabled={savingUserId === user.id}
                    className="ios-btn ios-btn-primary w-full text-sm"
                  >
                    <Save size={14} className="mr-1" />
                    {savingUserId === user.id ? 'Guardando...' : 'Guardar Cambios'}
                  </button>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default CourseAssignment;