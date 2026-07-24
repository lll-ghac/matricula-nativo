import React, { useState, useEffect } from 'react';
import Sidebar from './Sidebar';

interface LayoutProps {
  children: React.ReactNode;
  currentView: string;
  onNavigate: (view: string) => void;
  userRole: string;
  onLogout: () => void;
  userName?: string;
  currentYear: number;
  onRefreshYear: () => void;
}

const Layout: React.FC<LayoutProps> = ({
  children,
  currentView,
  onNavigate,
  userRole,
  onLogout,
  userName,
  currentYear,
  onRefreshYear
}) => {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    const saved = localStorage.getItem('sidebarCollapsed');
    return saved ? JSON.parse(saved) : false;
  });

  useEffect(() => {
    localStorage.setItem('sidebarCollapsed', JSON.stringify(isSidebarCollapsed));
  }, [isSidebarCollapsed]);

  const toggleSidebar = () => {
    setIsSidebarCollapsed(!isSidebarCollapsed);
  };

  return (
    <div className="flex h-screen" style={{ backgroundColor: 'var(--color-background)' }}>
      {/* Sidebar */}
      <Sidebar
        isCollapsed={isSidebarCollapsed}
        onToggle={toggleSidebar}
        currentView={currentView}
        onNavigate={onNavigate}
        userRole={userRole}
        onLogout={onLogout}
        userName={userName}
        currentYear={currentYear}
        onRefreshYear={onRefreshYear}
      />

      {/* Main Content */}
      <div
        className="flex-1 transition-all duration-300 ease-in-out overflow-auto"
        style={{
          marginLeft: isSidebarCollapsed ? '80px' : '260px'
        }}
      >
        <div className="p-6">
          {children}
        </div>
      </div>
    </div>
  );
};

export default Layout;