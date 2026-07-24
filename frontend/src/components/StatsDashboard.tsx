import React, { useState, useEffect } from 'react';
import { BarChart3, GraduationCap, Calendar, Globe, User, Loader2 } from 'lucide-react';

interface CourseStats {
  curso_base: string;
  letra: string;
  curso_completo: string;
  total: number;
  masculino: number;
  femenino: number;
  nacionalidades: {
    nacionalidad: string;
    total: number;
    masculino: number;
    femenino: number;
  }[];
}

interface GeneralStats {
  totalEstudiantes: number;
  totalMasculino: number;
  totalFemenino: number;
  porEstado: {
    Matriculado: number;
    Inscrito: number;
    Incompleto: number;
    Retirado: number;
  };
  porNacionalidad: {
    nacionalidad: string;
    total: number;
    masculino: number;
    femenino: number;
  }[];
  anioVigente: number;
}

const StatsDashboard: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [generalStats, setGeneralStats] = useState<GeneralStats | null>(null);
  const [courseStats, setCourseStats] = useState<CourseStats[]>([]);

  useEffect(() => {
    fetchStatistics();
  }, []);

  const fetchStatistics = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch general statistics
      const generalResponse = await fetch('/api/statistics/general', {
        credentials: 'include'
      });
      
      if (!generalResponse.ok) {
        if (generalResponse.status === 401) {
          throw new Error('No tienes permisos para ver estadísticas. Solo administradores pueden acceder.');
        } else if (generalResponse.status === 403) {
          throw new Error('Acceso denegado. Esta función requiere permisos de administrador.');
        } else {
          const errorData = await generalResponse.json().catch(() => ({}));
          throw new Error(errorData.message || `Error del servidor: ${generalResponse.status}`);
        }
      }
      
      const generalData = await generalResponse.json();
      setGeneralStats(generalData);

      // Fetch course statistics
      const courseResponse = await fetch('/api/statistics/courses', {
        credentials: 'include'
      });
      
      if (!courseResponse.ok) {
        if (courseResponse.status === 401) {
          throw new Error('No tienes permisos para ver estadísticas por curso. Solo administradores pueden acceder.');
        } else if (courseResponse.status === 403) {
          throw new Error('Acceso denegado. Esta función requiere permisos de administrador.');
        } else {
          const errorData = await courseResponse.json().catch(() => ({}));
          throw new Error(errorData.message || `Error del servidor: ${courseResponse.status}`);
        }
      }
      
      const courseData = await courseResponse.json();
      console.log('📊 Datos de cursos recibidos:', courseData);
      setCourseStats(courseData);

    } catch (err: any) {
      console.error('Error fetching statistics:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="ios-card p-8 text-center">
        <Loader2 size={48} className="mx-auto mb-4 animate-spin" style={{color: 'var(--color-primary)'}} />
        <p className="ios-title">Cargando estadísticas...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="ios-card p-8 text-center" style={{backgroundColor: 'var(--color-error)', color: 'white'}}>
        <BarChart3 size={48} className="mx-auto mb-4" />
        <h3 className="ios-title">Error al cargar estadísticas</h3>
        <p className="ios-body">{error}</p>
        <button 
          onClick={fetchStatistics}
          className="ios-btn ios-btn-secondary mt-4"
        >
          Reintentar
        </button>
      </div>
    );
  }

  if (!generalStats) return null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-4">
          <BarChart3 size={32} style={{color: 'var(--color-primary)'}} />
          <div>
            <h3 className="ios-title">Estadísticas y Reportes</h3>
            <p className="ios-caption flex items-center" style={{color: 'var(--color-text-light)'}}>
              <Calendar size={16} className="mr-1" />
              Año Vigente: {generalStats.anioVigente}
            </p>
          </div>
        </div>
        <button 
          onClick={fetchStatistics}
          className="ios-btn ios-btn-secondary"
        >
          Actualizar
        </button>
      </div>

      {/* General Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="ios-card p-6 text-center">
          <GraduationCap size={32} className="mx-auto mb-3" style={{color: 'var(--color-primary)'}} />
          <div className="text-3xl font-bold mb-1" style={{color: 'var(--color-primary)'}}>{generalStats.totalEstudiantes}</div>
          <div className="ios-caption" style={{color: 'var(--color-text-light)'}}>Total Estudiantes</div>
        </div>
        <div className="ios-card p-6 text-center">
          <div className="w-8 h-8 mx-auto mb-3 rounded-full flex items-center justify-center" style={{backgroundColor: 'var(--color-success)', color: 'white'}}>
            ✓
          </div>
          <div className="text-3xl font-bold mb-1" style={{color: 'var(--color-success)'}}>{generalStats.porEstado.Matriculado || 0}</div>
          <div className="ios-caption" style={{color: 'var(--color-text-light)'}}>Matriculados</div>
        </div>
        <div className="ios-card p-6 text-center">
          <div className="w-8 h-8 mx-auto mb-3 rounded-full flex items-center justify-center" style={{backgroundColor: 'var(--color-warning)', color: 'white'}}>
            ⏳
          </div>
          <div className="text-3xl font-bold mb-1" style={{color: 'var(--color-warning)'}}>{generalStats.porEstado.Inscrito || 0}</div>
          <div className="ios-caption" style={{color: 'var(--color-text-light)'}}>Inscritos</div>
        </div>
        <div className="ios-card p-6 text-center">
          <div className="w-8 h-8 mx-auto mb-3 rounded-full flex items-center justify-center" style={{backgroundColor: 'var(--color-error)', color: 'white'}}>
            ⚠
          </div>
          <div className="text-3xl font-bold mb-1" style={{color: 'var(--color-error)'}}>{generalStats.porEstado.Incompleto || 0}</div>
          <div className="ios-caption" style={{color: 'var(--color-text-light)'}}>Incompletos</div>
        </div>
      </div>

      {/* General Gender Distribution */}
      <div className="ios-card p-6">
        <h4 className="ios-subtitle mb-6 flex items-center">
          <User size={24} className="mr-3" style={{color: 'var(--color-primary)'}} />
          Distribución General por Género
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div className="text-center p-4 rounded-lg" style={{backgroundColor: 'var(--color-primary-light)'}}>
            <div className="text-4xl mb-2">♂</div>
            <div className="text-2xl font-bold mb-1" style={{color: 'var(--color-primary)'}}>{generalStats.totalMasculino}</div>
            <div className="ios-caption" style={{color: 'var(--color-text-light)'}}>Masculino</div>
          </div>
          <div className="text-center p-4 rounded-lg" style={{backgroundColor: 'var(--color-secondary-light)'}}>
            <div className="text-4xl mb-2">♀</div>
            <div className="text-2xl font-bold mb-1" style={{color: 'var(--color-secondary)'}}>{generalStats.totalFemenino}</div>
            <div className="ios-caption" style={{color: 'var(--color-text-light)'}}>Femenino</div>
          </div>
        </div>
      </div>

      {/* General Nationality Distribution */}
      <div className="ios-card p-6">
        <h4 className="ios-subtitle mb-6 flex items-center">
          <Globe size={24} className="mr-3" style={{color: 'var(--color-primary)'}} />
          Distribución General por Nacionalidad
        </h4>
        <div className="space-y-3">
          {generalStats.porNacionalidad.map((nat, index) => (
            <div key={index} className="flex justify-between items-center p-4 rounded-lg" style={{backgroundColor: 'var(--color-background-alt)'}}>
              <span className="font-medium text-lg">{nat.nacionalidad}</span>
              <div className="flex space-x-6 text-sm">
                <div className="text-center">
                  <div className="text-lg font-bold" style={{color: 'var(--color-primary)'}}>{nat.masculino}</div>
                  <div className="text-xs" style={{color: 'var(--color-text-light)'}}>♂</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold" style={{color: 'var(--color-secondary)'}}>{nat.femenino}</div>
                  <div className="text-xs" style={{color: 'var(--color-text-light)'}}>♀</div>
                </div>
                <div className="text-center">
                  <div className="text-xl font-bold" style={{color: 'var(--color-primary)'}}>{nat.total}</div>
                  <div className="text-xs" style={{color: 'var(--color-text-light)'}}>Total</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Detailed Course Statistics */}
      <div className="ios-card p-4">
        <h4 className="ios-subtitle mb-4 flex items-center">
          <GraduationCap size={20} className="mr-2" style={{color: 'var(--color-primary)'}} />
          Estadísticas Detalladas por Curso
        </h4>
        <div className="space-y-6">
          {courseStats.map((course, index) => (
            <div key={index} className="border rounded-lg p-4" style={{borderColor: 'var(--color-border)'}}>
              <h5 className="font-bold text-lg mb-3" style={{color: 'var(--color-primary)'}}>
                Curso {course.curso_completo}
              </h5>
              
              {/* Course totals */}
              <div className="mb-4 p-3 rounded" style={{backgroundColor: 'var(--color-primary-light)'}}>
                <div className="flex justify-between items-center">
                  <span className="font-medium">Total Curso {course.curso_completo}:</span>
                  <div className="flex space-x-4 text-sm">
                    <span>♂ {course.masculino || 0}</span>
                    <span>♀ {course.femenino || 0}</span>
                    <span className="font-bold">Total: {course.total || 0}</span>
                  </div>
                </div>
              </div>

              {/* Nationality breakdown */}
              <div className="space-y-2">
                {course.nacionalidades && course.nacionalidades.length > 0 ? (
                  course.nacionalidades.map((nat, natIndex) => (
                    <div key={natIndex} className="flex justify-between items-center p-2 text-sm rounded" style={{backgroundColor: 'var(--color-background-alt)'}}>
                      <span className="font-medium">{nat.nacionalidad || 'Sin especificar'}</span>
                      <div className="flex space-x-3">
                        <span>♂ {nat.masculino || 0}</span>
                        <span>♀ {nat.femenino || 0}</span>
                        <span className="font-bold">Total: {nat.total || 0}</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-2 text-sm text-center" style={{color: 'var(--color-text-light)'}}>
                    No hay datos de nacionalidad para este curso
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* School Totals Summary */}
      <div className="ios-card p-8 text-center" style={{backgroundColor: 'var(--color-primary-light)'}}>
        <h4 className="ios-subtitle mb-8 flex items-center justify-center">
          <BarChart3 size={28} className="mr-3" style={{color: 'var(--color-primary)'}} />
          📊 Resumen Total Escuela {generalStats.anioVigente}
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
          <div className="p-4">
            <div className="text-5xl mb-3">♂</div>
            <div className="text-3xl font-bold mb-2" style={{color: 'var(--color-primary)'}}>{generalStats.totalMasculino}</div>
            <div className="ios-caption" style={{color: 'var(--color-secondary)'}}>Total Hombres</div>
          </div>
          <div className="p-4">
            <div className="text-5xl mb-3">♀</div>
            <div className="text-3xl font-bold mb-2" style={{color: 'var(--color-secondary)'}}>{generalStats.totalFemenino}</div>
            <div className="ios-caption" style={{color: 'var(--color-secondary)'}}>Total Mujeres</div>
          </div>
          <div className="p-4">
            <GraduationCap size={48} className="mx-auto mb-3" style={{color: 'var(--color-primary)'}} />
            <div className="text-4xl font-bold mb-2" style={{color: 'var(--color-primary)'}}>{generalStats.totalEstudiantes}</div>
            <div className="ios-caption" style={{color: 'var(--color-secondary)'}}>Total Estudiantes</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StatsDashboard;