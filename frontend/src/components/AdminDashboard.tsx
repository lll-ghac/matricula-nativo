import React, { useState, useEffect } from 'react';
import {
  Users,
  Calendar,
  GraduationCap,
  Upload,
  Download,
  BarChart3,
  Trash2,
  Database,
  Settings,
  UserPlus,
  BookOpen,
  Shield,
  ArrowLeft,
  Camera
} from 'lucide-react';
import YearManagement from './YearManagement';
import StudentList from './StudentList';
import UserManagement from './UserManagement';
// import CourseAssignment from './CourseAssignment'; // ⚠️ DESHABILITADO - Reemplazado por gestión de profesores en página de Cursos
import MassUpload from './MassUpload';
import ExportPanel from './ExportPanel';
import StatsDashboard from './StatsDashboard';
import BackupPanel from './BackupPanel';
import TrashManagement from './TrashManagement';
import RutValidator from './RutValidator';
import StudentForm from './StudentForm';
import DatabaseMonitor from './DatabaseMonitor';
import AutorizacionesImagenStats from './AutorizacionesImagenStats';

type AdminSection =
  | 'overview'
  | 'year-management'
  | 'students'
  | 'user-management'
  | 'course-assignment'
  | 'mass-upload'
  | 'exports'
  | 'statistics'
  | 'trash'
  | 'backups'
  | 'rut-validator'
  | 'database-monitor'
  | 'image-authorizations';

const AdminDashboard: React.FC = () => {
  const [activeSection, setActiveSection] = useState<AdminSection>('overview');
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalStudents: 0,
    currentYear: new Date().getFullYear()
  });

  // Estados para edición de estudiantes
  const [editingStudentId, setEditingStudentId] = useState<string | null>(null);
  const [showStudentEdit, setShowStudentEdit] = useState(false);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      console.log('📊 Fetching admin dashboard stats...');
      
      // Fetch users count
      console.log('👥 Fetching users...');
      const usersResponse = await fetch('/api/users', {
        method: 'GET',
        credentials: 'include',
        headers: { 
          'Content-Type': 'application/json'
        }
      });
      if (usersResponse.ok) {
        const users = await usersResponse.json();
        console.log('✅ Users fetched:', users.length);
        setStats(prev => ({ ...prev, totalUsers: users.length }));
      } else {
        console.error('❌ Users fetch failed:', usersResponse.status, await usersResponse.text());
      }

      // Fetch current year
      console.log('📅 Fetching current year...');
      const yearResponse = await fetch('/api/year/current', {
        method: 'GET',
        credentials: 'include',
        headers: { 
          'Content-Type': 'application/json' 
        }
      });
      if (yearResponse.ok) {
        const yearData = await yearResponse.json();
        console.log('✅ Year fetched:', yearData.year);
        setStats(prev => ({ ...prev, currentYear: yearData.year }));
      } else {
        console.error('❌ Year fetch failed:', yearResponse.status, await yearResponse.text());
      }

      // Fetch students count
      console.log('🎓 Fetching students...');
      const studentsResponse = await fetch('/api/students', {
        method: 'GET',
        credentials: 'include',
        headers: { 
          'Content-Type': 'application/json'
        }
      });
      if (studentsResponse.ok) {
        const students = await studentsResponse.json();
        console.log('✅ Students fetched:', students.length);
        setStats(prev => ({ ...prev, totalStudents: students.length }));
      } else {
        console.error('❌ Students fetch failed:', studentsResponse.status, await studentsResponse.text());
      }
    } catch (error) {
      console.error('❌ Error fetching stats:', error);
    }
  };

  // Funciones para manejar edición de estudiantes
  const handleEditStudent = (studentId: string) => {
    setEditingStudentId(studentId);
    setShowStudentEdit(true);
  };

  const handleBackFromEdit = () => {
    setShowStudentEdit(false);
    setEditingStudentId(null);
    setActiveSection('students'); // Volver a la lista de estudiantes
  };

  const menuItems = [
    {
      id: 'overview' as AdminSection,
      label: 'Panel Principal',
      icon: Settings,
      description: 'Resumen general del sistema'
    },
    {
      id: 'year-management' as AdminSection,
      label: 'Gestión de Año',
      icon: Calendar,
      description: 'Definir año vigente'
    },
    {
      id: 'students' as AdminSection,
      label: 'Estudiantes',
      icon: GraduationCap,
      description: 'Listado y gestión de matrículas'
    },
    {
      id: 'user-management' as AdminSection,
      label: 'Gestión de Usuarios',
      icon: UserPlus,
      description: 'Crear y administrar usuarios del sistema'
    },
    // ⚠️ DESHABILITADO - Reemplazado por gestión de profesores en página de Cursos (botón Users en cada curso)
    // {
    //   id: 'course-assignment' as AdminSection,
    //   label: 'Asignar Cursos',
    //   icon: BookOpen,
    //   description: 'Asignar cursos a profesores'
    // },
    {
      id: 'mass-upload' as AdminSection,
      label: 'Carga Masiva',
      icon: Upload,
      description: 'Importar estudiantes desde CSV'
    },
    {
      id: 'exports' as AdminSection,
      label: 'Exportaciones',
      icon: Download,
      description: 'Generar nóminas y fichas PDF/CSV'
    },
    {
      id: 'statistics' as AdminSection,
      label: 'Estadísticas',
      icon: BarChart3,
      description: 'Reportes y métricas por curso'
    },
    {
      id: 'trash' as AdminSection,
      label: 'Papelera',
      icon: Trash2,
      description: 'Estudiantes eliminados'
    },
    {
      id: 'backups' as AdminSection,
      label: 'Respaldos',
      icon: Database,
      description: 'Gestión de backups'
    },
    {
      id: 'rut-validator' as AdminSection,
      label: 'Validador de RUT',
      icon: Shield,
      description: 'Identificar RUTs mal digitados'
    },
    {
      id: 'database-monitor' as AdminSection,
      label: 'Monitor de BD',
      icon: Database,
      description: 'Monitoreo en tiempo real de la base de datos'
    },
    {
      id: 'image-authorizations' as AdminSection,
      label: 'Autorizaciones de Imagen',
      icon: Camera,
      description: 'Estadística de uso de fotografías y videos por curso'
    }
  ];

  const renderActiveSection = () => {
    // Si estamos editando un estudiante, mostrar StudentForm
    if (showStudentEdit && editingStudentId) {
      return (
        <div>
          <div className="mb-4">
            <button
              onClick={handleBackFromEdit}
              className="ios-btn ios-btn-secondary ios-btn-small"
            >
              <ArrowLeft size={16} />
              Volver a Lista de Estudiantes
            </button>
          </div>
          <StudentForm
            editStudentId={editingStudentId}
            userRole="administrador"
            onBackToHome={handleBackFromEdit}
            currentYear={stats.currentYear}
          />
        </div>
      );
    }

    switch (activeSection) {
      case 'year-management':
        return <YearManagement />;
      case 'students':
        return <StudentList onEditStudent={handleEditStudent} />;
      case 'user-management':
        return <UserManagement />;
      // ⚠️ DESHABILITADO - Reemplazado por gestión de profesores en página de Cursos
      // case 'course-assignment':
      //   return <CourseAssignment />;
      case 'mass-upload':
        return <MassUpload />;
      case 'exports':
        return <ExportPanel />;
      case 'statistics':
        return <StatsDashboard />;
      case 'trash':
        return <TrashManagement />;
      case 'backups':
        return <BackupPanel />;
      case 'rut-validator':
        return <RutValidator />;
      case 'database-monitor':
        return <DatabaseMonitor />;
      case 'image-authorizations':
        return <AutorizacionesImagenStats />;
      default:
        return <OverviewSection menuItems={menuItems} onSectionChange={setActiveSection} />;
    }
  };

  return (
    <div className="ios-form-section">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center space-x-4">
          <img 
            src="/InsigniaEcuador.png" 
            alt="Escuela Ecuador" 
            className="h-12 w-12 object-contain"
          />
          <h2 className="ios-title-large">Panel de Administración</h2>
        </div>
        {activeSection !== 'overview' && (
          <button
            onClick={() => setActiveSection('overview')}
            className="ios-btn ios-btn-secondary"
          >
            ← Volver al Panel
          </button>
        )}
      </div>

      {activeSection === 'overview' ? (
        <div className="space-y-6">
          {/* Quick Stats */}
          <div className="ios-grid ios-grid-3">
            <div className="ios-card p-6 text-center">
              <Users className="mx-auto mb-3 text-4xl" style={{color: 'var(--color-primary)'}} />
              <h3 className="ios-subtitle">{stats.totalUsers} Usuarios</h3>
              <p className="ios-caption" style={{color: 'var(--color-text-light)'}}>Sistema multirol</p>
            </div>
            <div className="ios-card p-6 text-center">
              <GraduationCap className="mx-auto mb-3 text-4xl" style={{color: 'var(--color-primary)'}} />
              <h3 className="ios-subtitle">{stats.totalStudents} Estudiantes</h3>
              <p className="ios-caption" style={{color: 'var(--color-text-light)'}}>Matrículas activas</p>
            </div>
            <div className="ios-card p-6 text-center">
              <Calendar className="mx-auto mb-3 text-4xl" style={{color: 'var(--color-primary)'}} />
              <h3 className="ios-subtitle">Año {stats.currentYear}</h3>
              <p className="ios-caption" style={{color: 'var(--color-text-light)'}}>Período académico vigente</p>
            </div>
          </div>

          {/* Menu Grid */}
          <div className="ios-grid ios-grid-2">
            {menuItems.slice(1).map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveSection(item.id)}
                  className="ios-card p-6 text-left hover:shadow-lg transition-all duration-200 border-0 bg-transparent cursor-pointer"
                  style={{backgroundColor: 'var(--color-card-elevated)'}}
                >
                  <div className="flex items-start space-x-4">
                    <Icon size={32} style={{color: 'var(--color-primary)', flexShrink: 0}} />
                    <div>
                      <h3 className="ios-subtitle mb-2">{item.label}</h3>
                      <p className="ios-body" style={{color: 'var(--color-text-light)'}}>{item.description}</p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      ) : (
        <div>
          {renderActiveSection()}
        </div>
      )}
    </div>
  );
};

// Overview Section Component
interface OverviewSectionProps {
  menuItems: Array<{
    id: AdminSection;
    label: string;
    icon: any;
    description: string;
  }>;
  onSectionChange: (section: AdminSection) => void;
}

const OverviewSection: React.FC<OverviewSectionProps> = ({ onSectionChange }) => {
  return (
    <div className="space-y-8">
      {/* Welcome Message */}
      <div className="ios-card p-8 text-center" style={{backgroundColor: 'var(--color-primary-light)'}}>
        <Settings size={48} className="mx-auto mb-4" style={{color: 'var(--color-primary)'}} />
        <h3 className="ios-title mb-3">Bienvenido al Panel de Administración</h3>
        <p className="ios-body" style={{color: 'var(--color-secondary)'}}>
          Desde aquí puedes gestionar usuarios, estudiantes, cursos y todas las funciones avanzadas del sistema.
        </p>
      </div>

      {/* Quick Actions */}
      <div>
        <h3 className="ios-title mb-6">Acciones Rápidas</h3>
        <div className="ios-grid ios-grid-2">
          {/* Most used actions */}
          <button
            onClick={() => onSectionChange('students')}
            className="ios-card p-6 text-left hover:shadow-lg transition-all duration-200 border-0 bg-transparent cursor-pointer"
            style={{backgroundColor: 'var(--color-card-elevated)'}}
          >
            <div className="flex items-center space-x-4">
              <GraduationCap size={24} style={{color: 'var(--color-primary)'}} />
              <div>
                <h4 className="ios-subtitle">Ver Estudiantes</h4>
                <p className="ios-caption" style={{color: 'var(--color-text-light)'}}>Gestionar matrículas</p>
              </div>
            </div>
          </button>

          <button
            onClick={() => onSectionChange('course-assignment')}
            className="ios-card p-6 text-left hover:shadow-lg transition-all duration-200 border-0 bg-transparent cursor-pointer"
            style={{backgroundColor: 'var(--color-card-elevated)'}}
          >
            <div className="flex items-center space-x-4">
              <BookOpen size={24} style={{color: 'var(--color-primary)'}} />
              <div>
                <h4 className="ios-subtitle">Asignar Cursos</h4>
                <p className="ios-caption" style={{color: 'var(--color-text-light)'}}>A profesores</p>
              </div>
            </div>
          </button>

          <button
            onClick={() => onSectionChange('mass-upload')}
            className="ios-card p-6 text-left hover:shadow-lg transition-all duration-200 border-0 bg-transparent cursor-pointer"
            style={{backgroundColor: 'var(--color-card-elevated)'}}
          >
            <div className="flex items-center space-x-4">
              <Upload size={24} style={{color: 'var(--color-primary)'}} />
              <div>
                <h4 className="ios-subtitle">Carga Masiva</h4>
                <p className="ios-caption" style={{color: 'var(--color-text-light)'}}>Importar CSV</p>
              </div>
            </div>
          </button>

          <button
            onClick={() => onSectionChange('statistics')}
            className="ios-card p-6 text-left hover:shadow-lg transition-all duration-200 border-0 bg-transparent cursor-pointer"
            style={{backgroundColor: 'var(--color-card-elevated)'}}
          >
            <div className="flex items-center space-x-4">
              <BarChart3 size={24} style={{color: 'var(--color-primary)'}} />
              <div>
                <h4 className="ios-subtitle">Estadísticas</h4>
                <p className="ios-caption" style={{color: 'var(--color-text-light)'}}>Ver reportes</p>
              </div>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;