import { useEffect, useRef, useState } from 'react';

interface AuthUser {
  id: number;
  username: string;
  rol: string;
  nombre: string;
  profesor_jefe_info?: any;
}

interface UseAuthResult {
  isAuthenticated: boolean;
  user: AuthUser | null;
  login: (userData: AuthUser) => Promise<void>;
  logout: () => void;
  checkTokenValidity: () => Promise<boolean>;
  getTimeUntilExpiry: () => Promise<number>;
  isTokenExpiring: () => Promise<boolean>;
  showSessionWarning: boolean;
  sessionMinutesLeft: number;
  handleExtendSession: () => Promise<void>;
  handleCloseSessionWarning: () => void;
}

// Configuración de tiempos (en milisegundos)
const INACTIVITY_TIMEOUT = 30 * 60 * 1000; // 30 minutos
const TOKEN_CHECK_INTERVAL = 5 * 60 * 1000; // 5 minutos
const EXPIRY_WARNING_TIME = 30 * 60 * 1000; // 30 minutos antes de expirar
const WARNING_DISPLAY_INTERVAL = 60 * 1000; // Mostrar warning cada minuto

export const useAuth = (
  onLogout: () => void,
  onSessionExpiring?: (minutesLeft: number) => void
): UseAuthResult => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [showSessionWarning, setShowSessionWarning] = useState<boolean>(false);
  const [sessionMinutesLeft, setSessionMinutesLeft] = useState<number>(0);

  // Referencias para los timers
  const inactivityTimerRef = useRef<NodeJS.Timeout | null>(null);
  const tokenCheckTimerRef = useRef<NodeJS.Timeout | null>(null);
  const warningTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastActivityRef = useRef<number>(Date.now());

  // API call to check token validity (server-side validation)
  const checkTokenValidity = async (): Promise<boolean> => {
    try {
      const response = await fetch('/api/auth/validate-token', {
        method: 'GET',
        credentials: 'include', // Include httpOnly cookies
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      return response.ok;
    } catch (error) {
      console.error('Error validating token:', error);
      return false;
    }
  };

  // API call to get time until token expiry
  const getTimeUntilExpiry = async (): Promise<number> => {
    try {
      const response = await fetch('/api/auth/token-info', {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        return data.timeUntilExpiry || 0;
      }
      return 0;
    } catch (error) {
      console.error('Error getting token info:', error);
      return 0;
    }
  };

  // Verificar si el token está próximo a expirar
  const isTokenExpiring = async (): Promise<boolean> => {
    const timeLeft = await getTimeUntilExpiry();
    return timeLeft > 0 && timeLeft <= EXPIRY_WARNING_TIME;
  };

  // Resetear timer de inactividad
  const resetInactivityTimer = () => {
    lastActivityRef.current = Date.now();
    
    if (inactivityTimerRef.current) {
      clearTimeout(inactivityTimerRef.current);
    }

    inactivityTimerRef.current = setTimeout(() => {
      console.log('🕐 Sesión cerrada por inactividad (30 minutos)');
      logout();
    }, INACTIVITY_TIMEOUT);
  };

  // Configurar verificación periódica de token
  const setupTokenCheck = () => {
    if (tokenCheckTimerRef.current) {
      clearInterval(tokenCheckTimerRef.current);
    }

    tokenCheckTimerRef.current = setInterval(async () => {
      console.log('🔍 Verificando validez del token...');
      
      const isValid = await checkTokenValidity();
      if (!isValid) {
        console.log('❌ Token expirado o inválido, cerrando sesión');
        logout();
        return;
      }

      // Verificar si está próximo a expirar
      const isExpiring = await isTokenExpiring();
      if (isExpiring) {
        const timeLeft = await getTimeUntilExpiry();
        const minutesLeft = Math.floor(timeLeft / (1000 * 60));
        console.log(`⚠️ Token expira en ${minutesLeft} minutos`);
        setShowSessionWarning(true);
        setSessionMinutesLeft(minutesLeft);
        onSessionExpiring?.(minutesLeft);
      }
    }, TOKEN_CHECK_INTERVAL);
  };

  // Configurar warning periódico cuando esté próximo a expirar
  const setupExpirationWarning = () => {
    if (warningTimerRef.current) {
      clearInterval(warningTimerRef.current);
    }

    warningTimerRef.current = setInterval(async () => {
      const isExpiring = await isTokenExpiring();
      if (isExpiring) {
        const timeLeft = await getTimeUntilExpiry();
        const minutesLeft = Math.floor(timeLeft / (1000 * 60));
        if (minutesLeft > 0) {
          setShowSessionWarning(true);
          setSessionMinutesLeft(minutesLeft);
          onSessionExpiring?.(minutesLeft);
        }
      }
    }, WARNING_DISPLAY_INTERVAL);
  };

  // Función de login seguro (sin almacenamiento local)
  const login = async (userData: AuthUser) => {
    setUser(userData);
    setIsAuthenticated(true);
    
    // Configurar timers de seguridad
    resetInactivityTimer();
    setupTokenCheck();
    setupExpirationWarning();
    
    console.log('✅ Sesión iniciada con seguridad mejorada - Token en httpOnly cookie');
  };

  // Función de logout seguro
  const logout = async () => {
    // Limpiar todos los timers
    if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);
    if (tokenCheckTimerRef.current) clearInterval(tokenCheckTimerRef.current);
    if (warningTimerRef.current) clearInterval(warningTimerRef.current);
    
    try {
      // Llamar al endpoint de logout para invalidar la cookie
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });
    } catch (error) {
      console.error('Error during logout:', error);
    }
    
    // Limpiar estado local
    setIsAuthenticated(false);
    setUser(null);
    
    // Notificar a otras pestañas
    localStorage.setItem('user-logout', Date.now().toString());
    localStorage.removeItem('user-logout');
    
    // Ejecutar callback de logout
    onLogout();
    
    console.log('🔒 Sesión cerrada y timers limpiados - Cookie invalidada');
  };

  // Detectar actividad del usuario
  useEffect(() => {
    const handleUserActivity = () => {
      if (isAuthenticated) {
        resetInactivityTimer();
      }
    };

    // Eventos que indican actividad del usuario
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
    
    events.forEach(event => {
      document.addEventListener(event, handleUserActivity, true);
    });

    return () => {
      events.forEach(event => {
        document.removeEventListener(event, handleUserActivity, true);
      });
    };
  }, [isAuthenticated]);

  // Verificar token al cargar el componente
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const isValid = await checkTokenValidity();
        if (isValid) {
          // Obtener datos del usuario del servidor
          const response = await fetch('/api/auth/validate-token', {
            method: 'GET',
            credentials: 'include',
            headers: {
              'Content-Type': 'application/json',
            },
          });
          
          if (response.ok) {
            const data = await response.json();
            const userData = data.user;
            
            setUser(userData);
            setIsAuthenticated(true);
            
            // Configurar timers de seguridad
            resetInactivityTimer();
            setupTokenCheck();
            setupExpirationWarning();
            
            console.log('✅ Sesión restaurada:', userData.username, userData.rol);
          }
        }
      } catch (error) {
        console.log('ℹ️ No hay sesión activa');
      }
    };
    
    initializeAuth();

    // Cleanup al desmontar
    return () => {
      if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);
      if (tokenCheckTimerRef.current) clearInterval(tokenCheckTimerRef.current);
      if (warningTimerRef.current) clearInterval(warningTimerRef.current);
    };
  }, []);

  // Gestión de múltiples pestañas (simplificada para httpOnly cookies)
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'user-logout') {
        // Logout manual en otra pestaña: solo limpiar estado local de esta pestaña.
        // NO llamar a logout() completo — volvería a hacer fetch a /api/auth/logout
        // y a reescribir localStorage, generando un ping-pong infinito entre pestañas.
        console.log('🔄 Logout detectado en otra pestaña');

        if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);
        if (tokenCheckTimerRef.current) clearInterval(tokenCheckTimerRef.current);
        if (warningTimerRef.current) clearInterval(warningTimerRef.current);

        setIsAuthenticated(false);
        setUser(null);
        onLogout();
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const handleExtendSession = async () => {
    setShowSessionWarning(false);
    resetInactivityTimer();
    await checkTokenValidity();
  };

  const handleCloseSessionWarning = () => {
    setShowSessionWarning(false);
  };

  return {
    isAuthenticated,
    user,
    login,
    logout,
    checkTokenValidity,
    getTimeUntilExpiry,
    isTokenExpiring,
    showSessionWarning,
    sessionMinutesLeft,
    handleExtendSession,
    handleCloseSessionWarning
  };
};