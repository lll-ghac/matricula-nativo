import React from 'react';
import {
  Home,
  Phone,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
  GraduationCap,
  Moon,
  Sun,
  Users,
  BookOpen,
  Database
} from 'lucide-react';
import pkg from '../../../package.json';
import { useTheme } from '../context/ThemeContext';

interface SidebarProps {
  isCollapsed: boolean;
  onToggle: () => void;
  currentView: string;
  onNavigate: (view: string) => void;
  userRole: string;
  onLogout: () => void;
  userName?: string;
  currentYear: number;
  onRefreshYear: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({
  isCollapsed,
  onToggle,
  currentView,
  onNavigate,
  userRole,
  onLogout,
  userName,
  currentYear,
  onRefreshYear
}) => {
  const { theme, toggleTheme } = useTheme();

  const menuItems = [
    {
      id: 'home',
      label: 'Inicio',
      icon: Home,
      roles: ['profesor', 'inspector', 'administrador', 'sololectura']
    },
    {
      id: 'student',
      label: 'Matrícula',
      icon: GraduationCap,
      roles: ['profesor', 'inspector', 'administrador', 'sololectura']
    },
    // NOTA: "Matrícula v2" está deshabilitada para evitar confusiones
    // Solo se usa el componente "Matrícula" (StudentForm.tsx)
    // Ver COMPONENTES_MATRICULA.md para más información
    // {
    //   id: 'matricula-v2',
    //   label: 'Matrícula v2',
    //   icon: GraduationCap,
    //   roles: ['profesor', 'inspector', 'administrador']
    // },
    {
      id: 'agenda',
      label: 'Agenda',
      icon: Phone,
      roles: ['profesor', 'inspector', 'administrador', 'sololectura']
    },
    {
      id: 'students-list',
      label: userRole === 'profesor' ? 'Mis Estudiantes' : userRole === 'sololectura' ? 'Ver Estudiantes' : 'Estudiantes',
      icon: GraduationCap,
      roles: ['profesor', 'inspector', 'administrador', 'sololectura']
    },
    {
      id: 'exports',
      label: 'Exportaciones',
      icon: Database,
      roles: ['profesor', 'inspector', 'administrador']
    },
    {
      id: 'guardians',
      label: 'Apoderados',
      icon: Users,
      roles: ['profesor', 'inspector', 'administrador', 'sololectura']
    },
    {
      id: 'courses',
      label: 'Cursos',
      icon: BookOpen,
      roles: ['administrador', 'inspector', 'sololectura']
    },
    {
      id: 'admin',
      label: 'Administración',
      icon: Settings,
      roles: ['administrador']
    }
  ];

  const filteredMenuItems = menuItems.filter(item => item.roles.includes(userRole));

  return (
    <div
      className={`fixed left-0 top-0 h-full transition-all duration-300 ease-in-out z-30 flex flex-col`}
      style={{
        width: isCollapsed ? '80px' : '260px',
        backgroundColor: 'var(--color-surface)',
        borderRight: '1px solid var(--color-border)',
        boxShadow: '2px 0 8px rgba(0, 0, 0, 0.05)'
      }}
    >
      {/* Logo, Info y Controles */}
      <div className="p-4 border-b" style={{ borderColor: 'var(--color-border)' }}>
        {!isCollapsed ? (
          <>
            {/* Logo y título */}
            <div className="flex items-center gap-3 mb-3">
              <img
                src="/InsigniaEcuador.png"
                alt="Escuela Ecuador"
                className="h-10 w-10 object-contain"
              />
              <div>
                <h2 className="font-bold text-sm" style={{ color: 'var(--color-text)' }}>
                  Escuela Ecuador
                </h2>
              </div>
            </div>

            {/* Usuario y Rol */}
            {userName && (
              <div className="mb-3 px-2">
                <p className="text-xs font-medium" style={{ color: 'var(--color-text)' }}>
                  {userName}
                </p>
                <p className="text-xs capitalize" style={{ color: 'var(--color-text-light)' }}>
                  {userRole}
                </p>
              </div>
            )}

            {/* Año vigente y botones */}
            <div className="flex items-center gap-2 px-2">
              <div className="flex-1">
                <p className="text-xs" style={{ color: 'var(--color-text-light)' }}>
                  Año vigente
                </p>
                <p className="text-lg font-bold" style={{ color: 'var(--color-primary)' }}>
                  {currentYear}
                </p>
              </div>
              <button
                onClick={onRefreshYear}
                className="p-2 rounded-lg hover:bg-opacity-10 transition-colors"
                style={{ backgroundColor: 'var(--color-surface)' }}
                title="Actualizar año vigente"
              >
                🔄
              </button>
              <button
                onClick={toggleTheme}
                className="p-2 rounded-lg hover:bg-opacity-10 transition-colors"
                style={{ backgroundColor: 'var(--color-surface)' }}
                title={`Cambiar a modo ${theme === 'light' ? 'oscuro' : 'claro'}`}
              >
                {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
              </button>
            </div>
          </>
        ) : (
          <img
            src="/InsigniaEcuador.png"
            alt="Escuela Ecuador"
            className="h-10 w-10 object-contain mx-auto"
          />
        )}
      </div>

      {/* Toggle Button */}
      <button
        onClick={onToggle}
        className="absolute -right-3 top-20 rounded-full p-1 shadow-md"
        style={{
          backgroundColor: 'var(--color-primary)',
          color: 'white',
          zIndex: 40
        }}
        title={isCollapsed ? 'Expandir' : 'Colapsar'}
      >
        {isCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
      </button>

      {/* Menu Items */}
      <nav className="flex-1 py-6 overflow-y-auto">
        <ul className="space-y-2 px-3">
          {filteredMenuItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentView === item.id;

            return (
              <li key={item.id}>
                <button
                  onClick={() => onNavigate(item.id)}
                  className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg transition-all duration-200 ${
                    isActive
                      ? 'shadow-sm'
                      : 'hover:bg-opacity-50'
                  }`}
                  style={{
                    backgroundColor: isActive ? 'var(--color-primary)' : 'transparent',
                    color: isActive ? 'white' : 'var(--color-text)',
                  }}
                  title={isCollapsed ? item.label : ''}
                >
                  <Icon size={20} className="flex-shrink-0" />
                  {!isCollapsed && (
                    <span className="text-sm font-medium truncate">{item.label}</span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* User Info & Logout */}
      <div className="border-t p-4" style={{ borderColor: 'var(--color-border)' }}>
        <button
          onClick={onLogout}
          className="w-full flex items-center gap-3 px-3 py-3 rounded-lg transition-all duration-200 hover:bg-red-50"
          style={{ color: 'var(--color-error)' }}
          title={isCollapsed ? 'Cerrar Sesión' : ''}
        >
          <LogOut size={20} className="flex-shrink-0" />
          {!isCollapsed && (
            <span className="text-sm font-medium">Cerrar Sesión</span>
          )}
        </button>
        {!isCollapsed && (
          <p className="text-center text-xs mt-2" style={{ color: 'var(--color-text-light)' }}>
            v.{pkg.version}
          </p>
        )}
      </div>
    </div>
  );
};

export default Sidebar;
