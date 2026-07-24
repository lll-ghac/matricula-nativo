import { useState, useEffect, lazy, Suspense } from 'react';
import Login from './components/Login';
import Layout from './components/Layout';
import { useAuth } from './hooks/useAuth';
import { Sun, Loader2 } from 'lucide-react';
import type { StudentData } from './types';
import { useTheme } from './context/ThemeContext';

const StudentForm = lazy(() => import('./components/StudentForm'));
const StudentList = lazy(() => import('./components/StudentList'));
const AdminDashboard = lazy(() => import('./components/AdminDashboard'));
const StudentCheck = lazy(() => import('./components/StudentCheck'));
const SessionWarningModal = lazy(() => import('./components/SessionWarningModal'));
const GuardiansPage = lazy(() => import('./pages/GuardiansPage'));
const CoursesPage = lazy(() => import('./pages/CoursesPage'));
const AgendaEscolar = lazy(() => import('./components/AgendaEscolar'));
const MatriculaV2Form = lazy(() => import('./components/MatriculaV2Form'));
const ExportPanel = lazy(() => import('./components/ExportPanel'));
const EditGuardiansPage = lazy(() => import('./pages/EditGuardiansPage'));

type ViewType = 'home' | 'student' | 'students-list' | 'admin' | 'guardians' | 'courses' | 'agenda' | 'matricula-v2' | 'exports' | 'login';

const LoadingFallback = () => (
  <div className="ios-card p-8 text-center">
    <Loader2 size={48} className="mx-auto mb-4 animate-spin" style={{ color: 'var(--color-primary)' }} />
    <p className="ios-title">Cargando...</p>
  </div>
);

function App() {
  const [student, setStudent] = useState<StudentData | null>(null);
  const [currentView, setCurrentView] = useState<ViewType>('login');
  const [studentListKey, setStudentListKey] = useState(0);
  const [editingGuardiansStudentId, setEditingGuardiansStudentId] = useState<string | null>(null);
  const [currentYear, setCurrentYear] = useState<number>(new Date().getFullYear());
  const { toggleTheme } = useTheme();

  const { isAuthenticated, user: authUser, login, logout: authLogout, showSessionWarning, sessionMinutesLeft, handleExtendSession, handleCloseSessionWarning } = useAuth(
    () => {
      setCurrentView('login');
      setStudent(null);
    }
  );

  const userRole = authUser?.rol;
  const isProfesorJefe = userRole === 'profesor' && authUser?.profesor_jefe_info;

  // Obtener año vigente de la API
  const fetchCurrentYear = async () => {
    try {
      const response = await fetch('/api/year/current', {
        credentials: 'include'
      });
      if (response.ok) {
        const data = await response.json();
        setCurrentYear(data.year); // Backend devuelve { year: 2026 }
      }
    } catch (error) {
      console.error('Error al obtener año vigente:', error);
    }
  };

  // Cargar año vigente al iniciar sesión
  useEffect(() => {
    if (isAuthenticated) {
      fetchCurrentYear();
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (isAuthenticated) {
      if (isProfesorJefe) {
        setCurrentView('students-list');
      } else {
        setCurrentView('home');
      }
    } else {
      setCurrentView('login');
    }
  }, [isAuthenticated, isProfesorJefe]);

  const handleLoginSuccess = (userData: any) => {
    login(userData);
  };

  const handleLogout = () => {
    authLogout();
    setStudent(null);
  };

  const handleStudentFound = (data: StudentData) => {
    setStudent(data);
    setCurrentView('student');
  };

  const handleBackToStudentSearch = () => {
    setStudent(null);
    setCurrentView(isProfesorJefe ? 'students-list' : 'student');
  };

  const mainContent = () => {
    if (isProfesorJefe) {
      switch (currentView) {
        case 'home':
          return (
            <div className="ios-card p-8">
              <h1 className="text-3xl font-bold mb-4" style={{ color: 'var(--color-primary)' }}>Bienvenido al Sistema de Matrícula</h1>
              <p>Selecciona una opción del menú para comenzar.</p>
            </div>
          );
        case 'students-list':
          if (editingGuardiansStudentId) {
            return (
              <Suspense fallback={<LoadingFallback />}>
                <EditGuardiansPage
                  studentId={editingGuardiansStudentId}
                  onBack={() => {
                    setEditingGuardiansStudentId(null);
                    setStudentListKey(prev => prev + 1);
                  }}
                />
              </Suspense>
            );
          }
          return (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <div>
                  {authUser.profesor_jefe_info.cursos && authUser.profesor_jefe_info.cursos.length > 1 ? (
                    <>
                      <h1 className="ios-title-large">Mis Cursos ({authUser.profesor_jefe_info.total_cursos})</h1>
                      <div className="mt-2 space-y-1">
                        {authUser.profesor_jefe_info.cursos.map((curso: any) => (
                          <div key={curso.curso_id} className="text-sm" style={{ color: 'var(--color-text-light)' }}>
                            <span className="font-semibold" style={{ color: 'var(--color-foreground)' }}>
                              {curso.curso_nombre}
                            </span>
                            {' • '}
                            {curso.alumnos_matriculados} de {curso.capacidad_maxima} estudiantes
                            {curso.cupos_disponibles > 0 && ` • ${curso.cupos_disponibles} cupos`}
                          </div>
                        ))}
                      </div>
                      <p className="text-sm mt-2 font-semibold" style={{ color: 'var(--color-primary)' }}>
                        Total: {authUser.profesor_jefe_info.total_alumnos} de {authUser.profesor_jefe_info.total_capacidad} estudiantes
                      </p>
                    </>
                  ) : (
                    <>
                      <h1 className="ios-title-large">{authUser.profesor_jefe_info.curso_nombre}</h1>
                      <p className="text-sm mt-1" style={{ color: 'var(--color-text-light)' }}>
                        {authUser.profesor_jefe_info.alumnos_matriculados || 0} de {authUser.profesor_jefe_info.capacidad_maxima} estudiantes
                        {authUser.profesor_jefe_info.cupos_disponibles > 0 &&
                          ` • ${authUser.profesor_jefe_info.cupos_disponibles} cupos disponibles`
                        }
                      </p>
                    </>
                  )}
                </div>
                <button
                  className="ios-button-primary"
                  onClick={() => { setStudent(null); setCurrentView('student'); }}
                >
                  Nueva Matrícula
                </button>
              </div>
              <Suspense fallback={<LoadingFallback />}>
                <StudentList
                  key={studentListKey}
                  onStudentSelect={(studentData) => {
                    setStudent(studentData);
                    setCurrentView('student');
                  }}
                  onEditStudent={(studentId) => setEditingGuardiansStudentId(studentId)}
                />
              </Suspense>
            </div>
          );
        case 'student':
          return !student ? (
            <StudentCheck onStudentFound={handleStudentFound} />
          ) : (
            <Suspense fallback={<LoadingFallback />}>
              <StudentForm
                student={student || undefined}
                userRole={userRole as 'profesor'}
                userId={authUser?.id}
                onBackToStudentSearch={handleBackToStudentSearch}
                currentYear={currentYear}
                onStudentSaved={() => setStudentListKey(prev => prev + 1)}
                isProfesorJefe={true}
                cursoAsignado={authUser.profesor_jefe_info}
              />
            </Suspense>
          );
        case 'agenda':
          return (
            <Suspense fallback={<LoadingFallback />}><AgendaEscolar /></Suspense>
          );
        case 'guardians':
          return (
            <Suspense fallback={<LoadingFallback />}><GuardiansPage /></Suspense>
          );
        case 'exports':
          return (
            <Suspense fallback={<LoadingFallback />}><ExportPanel /></Suspense>
          );
        default:
          return <div />;
      }
    } else {
      switch (currentView) {
        case 'home':
           return (
            <div className="ios-card p-8">
              <h1 className="text-3xl font-bold mb-4" style={{ color: 'var(--color-primary)' }}>Bienvenido al Sistema de Matrícula</h1>
              <p>Selecciona una opción del menú para comenzar.</p>
            </div>
          );
        case 'student':
          return !student ? (
            <StudentCheck onStudentFound={handleStudentFound} />
          ) : (
            <Suspense fallback={<LoadingFallback />}>
              <StudentForm
                student={student || undefined}
                userRole={userRole as 'inspector' | 'administrador'}
                userId={authUser?.id}
                onBackToStudentSearch={handleBackToStudentSearch}
                currentYear={currentYear}
                onStudentSaved={() => setStudentListKey(prev => prev + 1)}
              />
            </Suspense>
          );
        case 'students-list':
          if (editingGuardiansStudentId) {
            return (
              <Suspense fallback={<LoadingFallback />}>
                <EditGuardiansPage
                  studentId={editingGuardiansStudentId}
                  onBack={() => {
                    setEditingGuardiansStudentId(null);
                    setStudentListKey(prev => prev + 1);
                  }}
                />
              </Suspense>
            );
          }
          return (
            <Suspense fallback={<LoadingFallback />}>
              <StudentList
                key={studentListKey}
                onStudentSelect={(studentData) => {
                  setStudent(studentData);
                  setCurrentView('student');
                }}
                onEditStudent={(studentId) => setEditingGuardiansStudentId(studentId)}
              />
            </Suspense>
          );
        case 'admin':
          return userRole === 'administrador' ? (
            <Suspense fallback={<LoadingFallback />}><AdminDashboard /></Suspense>
          ) : null;
        case 'guardians':
          return (
            <Suspense fallback={<LoadingFallback />}><GuardiansPage /></Suspense>
          );
        case 'courses':
          return (
            <Suspense fallback={<LoadingFallback />}>
              <CoursesPage userRole={userRole} currentYear={currentYear} />
            </Suspense>
          );
        case 'agenda':
          return (
            <Suspense fallback={<LoadingFallback />}><AgendaEscolar /></Suspense>
          );
        case 'exports':
          return (
            <Suspense fallback={<LoadingFallback />}><ExportPanel /></Suspense>
          );
        case 'matricula-v2':
          return (
            <Suspense fallback={<LoadingFallback />}><MatriculaV2Form currentYear={currentYear} /></Suspense>
          );
        default:
          return <div />;
      }
    }
  };

  return (
    <div className="min-h-screen" style={{backgroundColor: 'var(--color-background)', color: 'var(--color-foreground)'}}>
      {!isAuthenticated ? (
         <div className="ios-container py-3 sm:py-6">
          <div className="ios-card p-3 sm:p-6 relative">
            <div className="mb-4 sm:mb-6">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 sm:gap-4">
                  <img src="/InsigniaEcuador.png" alt="Insignia" className="h-10 w-10 sm:h-16 sm:w-16"/>
                  <h1 className="text-xs sm:text-base md:text-lg font-bold leading-tight" style={{color: 'var(--color-primary)'}}>ESCUELA REPUBLICA DEL<br className="sm:hidden" /> ECUADOR E-79</h1>
                </div>
                <button onClick={toggleTheme} className="p-2 sm:p-3 rounded-full" style={{ backgroundColor: 'var(--color-surface)' }}><Sun className="sm:w-5 sm:h-5" /></button>
              </div>
            </div>
            <Login onLoginSuccess={handleLoginSuccess} />
          </div>
        </div>
      ) : (
        <Layout
          currentView={currentView}
          onNavigate={(view) => {
            setCurrentView(view as ViewType);
            setStudent(null);
            setEditingGuardiansStudentId(null);
            if(view === 'students-list') setStudentListKey(prev => prev + 1);
          }}
          userRole={userRole || ''}
          onLogout={handleLogout}
          userName={authUser?.nombre || authUser?.username}
          currentYear={currentYear}
          onRefreshYear={fetchCurrentYear}
        >
          {mainContent()}
        </Layout>
      )}

      {showSessionWarning && (
        <Suspense fallback={null}>
          <SessionWarningModal
            isOpen={showSessionWarning}
            minutesLeft={sessionMinutesLeft}
            onExtendSession={handleExtendSession}
            onLogout={handleLogout}
            onClose={handleCloseSessionWarning}
          />
        </Suspense>
      )}
    </div>
  );
}

export default App;
