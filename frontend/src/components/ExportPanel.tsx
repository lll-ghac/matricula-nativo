import React, { useState, useEffect } from 'react';
import { Download, FileText, FileSpreadsheet, Database } from 'lucide-react';
import { useToast } from '../context/ToastContext';

interface Course {
  id: number;
  codigo: string;
  grado_nombre: string;
  letra: string;
}

const ExportPanel: React.FC = () => {
  const toast = useToast();
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourse, setSelectedCourse] = useState('');
  const [exportType, setExportType] = useState('csv'); // Default to CSV
  const [loading, setLoading] = useState(false);
  const [loadingComplete, setLoadingComplete] = useState(false);

  useEffect(() => {
    const fetchCourses = async () => {
      try {
        const response = await fetch('/api/courses/v2', { credentials: 'include' });
        if (response.ok) {
          const result = await response.json();
          if (result.success && result.data) {
            setCourses(result.data);
          } else {
            console.error('Error: respuesta no válida del servidor');
          }
        } else {
          console.error('Error al cargar la lista de cursos');
        }
      } catch (error) {
        console.error('Error de red al cargar cursos:', error);
      }
    };

    fetchCourses();
  }, []);

  const handleExport = async (type: 'course' | 'individual' | 'backup') => {
    setLoading(true);
    try {
      let apiUrl = '';
      let filename = '';

      if (type === 'course') {
        if (!selectedCourse) {
          toast.error('Por favor, seleccione un curso para exportar.');
          setLoading(false);
          return;
        }

        // Encontrar el curso seleccionado para construir el nombre completo
        const course = courses.find(c => c.codigo === selectedCourse);
        if (!course) {
          toast.error('Curso no encontrado.');
          setLoading(false);
          return;
        }

        // Construir el nombre completo del curso para la API (formato legacy: "Primero Básico A")
        const fullCourseName = `${course.grado_nombre} ${course.letra}`;

        apiUrl = `/api/students/export?format=${exportType}&courses=${encodeURIComponent(fullCourseName)}`;
        filename = `nomina_${course.codigo}.${exportType}`;
      } else if (type === 'individual') {
        // TODO: Implement individual student export logic
        toast.info('La exportación de fichas individuales aún no está implementada.');
        setLoading(false);
        return;
      } else if (type === 'backup') {
        // TODO: Implement course backup logic
        toast.info('La exportación de respaldo por curso aún no está implementada.');
        setLoading(false);
        return;
      } else {
        setLoading(false);
        return;
      }

      const response = await fetch(apiUrl, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Accept': exportType === 'csv' ? 'text/csv' : 'application/pdf'
        }
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Error del servidor: ${response.status}`);
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      
      window.URL.revokeObjectURL(url);
      document.body.removeChild(link);

      const course = courses.find(c => c.codigo === selectedCourse);
      toast.success(`✅ Exportación de ${course?.codigo || selectedCourse} en formato ${exportType.toUpperCase()} descargada exitosamente.`);
      
    } catch (error) {
      console.error('❌ Error en exportación:', error);
      toast.error(`❌ Error: ${error instanceof Error ? error.message : 'Error desconocido'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleCompleteExport = async () => {
    setLoadingComplete(true);
    try {
      console.log('📊 Iniciando exportación completa de estudiantes con apoderados');
      
      const response = await fetch('/api/students/export-complete?format=csv', {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Accept': 'text/csv'
        }
      });

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('No tienes permisos para realizar exportaciones completas. Inicia sesión con un perfil administrador, inspector o profesor.');
        } else if (response.status === 403) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || 'Acceso denegado. Requiere permisos de administrador/inspector o cursos asignados si eres profesor.');
        } else {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.message || `Error del servidor: ${response.status}`);
        }
      }

      // Obtener el nombre del archivo desde el header Content-Disposition
      const contentDisposition = response.headers.get('Content-Disposition');
      let filename = 'estudiantes_completo.csv';
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="(.+)"/);
        if (filenameMatch) {
          filename = filenameMatch[1];
        }
      }

      // Crear blob y descargar
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      
      // Limpiar
      window.URL.revokeObjectURL(url);
      document.body.removeChild(link);
      
      console.log('✅ Exportación completa descargada exitosamente');
      toast.success('✅ Archivo descargado exitosamente. Contiene todos los datos de estudiantes con sus apoderados principal y suplente.');
      
    } catch (error) {
      console.error('❌ Error en exportación completa:', error);
      toast.error(`❌ Error: ${error instanceof Error ? error.message : 'Error desconocido'}`);
    } finally {
      setLoadingComplete(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-4 mb-6">
        <Download size={32} style={{color: 'var(--color-primary)'}} />
        <h3 className="ios-title">Exportaciones y Reportes</h3>
      </div>

      {/* Course Reports */}
      <div className="ios-card p-6">
        <h4 className="ios-subtitle mb-4">Nóminas por Curso</h4>
        <div className="ios-grid ios-grid-2">
          <div>
            <label className="ios-form-label">Seleccionar Curso</label>
            <select
              value={selectedCourse}
              onChange={(e) => setSelectedCourse(e.target.value)}
              className="ios-form-input"
            >
              <option value="">Seleccione un curso...</option>
              {courses.map(course => (
                <option key={course.id} value={course.codigo}>
                  {course.codigo} - {course.grado_nombre} {course.letra}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="ios-form-label">Formato</label>
            <select
              value={exportType}
              onChange={(e) => setExportType(e.target.value)}
              className="ios-form-input"
            >
              <option value="pdf">PDF</option>
              <option value="csv">CSV</option>
            </select>
          </div>
        </div>
        <button
          onClick={() => handleExport('course')}
          disabled={!selectedCourse || loading}
          className="ios-btn ios-btn-primary mt-4"
        >
          <FileText size={16} className="mr-2" />
          {loading ? 'Generando...' : 'Generar Nómina'}
        </button>
      </div>

      {/* Individual Reports */}
      <div className="ios-card p-6">
        <h4 className="ios-subtitle mb-4">Fichas Individuales</h4>
        <p className="ios-body mb-4" style={{color: 'var(--color-text-light)'}}>
          Generar fichas individuales de estudiantes con todos sus datos y apoderados.
        </p>
        <button
          onClick={() => handleExport('individual')}
          disabled={loading}
          className="ios-btn ios-btn-primary"
        >
          <FileText size={16} className="mr-2" />
          {loading ? 'Generando...' : 'Generar Fichas PDF'}
        </button>
      </div>

      {/* Backup Export */}
      <div className="ios-card p-6">
        <h4 className="ios-subtitle mb-4">Respaldo por Curso</h4>
        <p className="ios-body mb-4" style={{color: 'var(--color-text-light)'}}>
          Exportar archivo ZIP con todos los datos del curso seleccionado.
        </p>
        <button
          onClick={() => handleExport('backup')}
          disabled={!selectedCourse || loading}
          className="ios-btn ios-btn-secondary"
        >
          <FileSpreadsheet size={16} className="mr-2" />
          {loading ? 'Creando...' : 'Crear Respaldo ZIP'}
        </button>
      </div>

      {/* Complete Export */}
      <div className="ios-card p-6" style={{backgroundColor: 'var(--color-primary-light)'}}>
        <h4 className="ios-subtitle mb-4 flex items-center">
          <Database size={20} className="mr-2" style={{color: 'var(--color-primary)'}} />
          📊 Exportación Completa con Apoderados
        </h4>
        <p className="ios-body mb-4" style={{color: 'var(--color-secondary)'}}>
          <strong>Descarga un archivo CSV con TODOS los estudiantes matriculados y retirados</strong> (no incluye eliminados) 
          junto con toda su información personal y datos completos de apoderado principal y suplente.
        </p>
        <div className="mb-4 p-3 rounded" style={{backgroundColor: 'var(--color-background-alt)'}}>
          <h5 className="font-semibold mb-2" style={{color: 'var(--color-primary)'}}>📋 Datos incluidos:</h5>
          <ul className="text-sm space-y-1" style={{color: 'var(--color-text-light)'}}>
            <li>• <strong>Estudiante:</strong> RUT, nombres, apellidos, fecha nacimiento, género, nacionalidad, dirección, curso, estado, PIE, becas, etc.</li>
            <li>• <strong>Apoderado Principal:</strong> RUT, nombres, contacto, dirección, parentesco</li>
            <li>• <strong>Apoderado Suplente:</strong> RUT, nombres, contacto, dirección, parentesco</li>
            <li>• <strong>Formato:</strong> CSV compatible con Excel, LibreOffice y Google Sheets</li>
          </ul>
        </div>
        <button
          onClick={handleCompleteExport}
          disabled={loadingComplete}
          className="ios-btn ios-btn-primary"
        >
          <Database size={16} className="mr-2" />
          {loadingComplete ? 'Generando Exportación Completa...' : 'Descargar Datos Completos (CSV)'}
        </button>
        <p className="text-xs mt-2" style={{color: 'var(--color-text-light)'}}>
          ⚠️ Disponible para administradores, inspectores y profesores (estos últimos solo verán sus cursos asignados).
        </p>
      </div>
    </div>
  );
};

export default ExportPanel;
