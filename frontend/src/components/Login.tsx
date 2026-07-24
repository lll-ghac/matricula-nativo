import React, { useState } from 'react';
import { User, Lock, LogIn, Eye, EyeOff } from 'lucide-react'; // Import icons

interface AuthUser {
  id: number;
  username: string;
  rol: string;
  nombre: string;
}

interface LoginProps {
  onLoginSuccess: (user: AuthUser) => void;
}

const Login: React.FC<LoginProps> = ({ onLoginSuccess }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include', // Include httpOnly cookies
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.message || 'Error al iniciar sesión.');
        return;
      }

      // No need to store token in localStorage - it's in httpOnly cookie
      // Pass user data instead of token
      onLoginSuccess(data.user);

    } catch (err) {
      console.error('Error de red o del servidor:', err);
      setError('No se pudo conectar con el servidor. Inténtelo de nuevo más tarde.');
    }
  };

  return (
    <div className="ios-card max-w-4xl mx-auto p-4 sm:p-6 lg:p-8">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 lg:gap-8">
        {/* Columna izquierda: Formulario */}
        <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
          <div className="text-center mb-4 sm:mb-6">
            <h2 className="text-2xl sm:text-3xl font-bold mb-2" style={{ color: 'var(--color-primary)' }}>Iniciar Sesión</h2>
          </div>

          <div>
            <label htmlFor="username" className="block text-sm font-medium mb-2" style={{ color: 'var(--color-text)' }}>Usuario</label>
            <div className="relative">
              <User
                className="absolute left-3 top-1/2 transform -translate-y-1/2"
                size={18}
                style={{ color: 'var(--color-secondary)' }}
              />
              <input
                type="text"
                id="username"
                className="w-full pl-10 pr-4 py-3 sm:py-3.5 text-base sm:text-lg rounded-lg border-2 focus:outline-none focus:ring-2"
                style={{
                  borderColor: 'var(--color-border)',
                  backgroundColor: 'var(--color-surface)',
                  color: 'var(--color-text)'
                }}
                placeholder="RUT sin dígito verificador"
                value={username}
                onChange={(e) => setUsername(e.target.value.replace(/\./g, ''))}
                required
                autoComplete="username"
              />
            </div>
          </div>
          <div>
            <label htmlFor="password" className="block text-sm font-medium mb-2" style={{ color: 'var(--color-text)' }}>Contraseña</label>
            <div className="relative">
              <Lock
                className="absolute left-3 top-1/2 transform -translate-y-1/2"
                size={18}
                style={{ color: 'var(--color-secondary)' }}
              />
              <input
                type={showPassword ? "text" : "password"}
                id="password"
                className="w-full pl-10 pr-12 py-3 sm:py-3.5 text-base sm:text-lg rounded-lg border-2 focus:outline-none focus:ring-2"
                style={{
                  borderColor: 'var(--color-border)',
                  backgroundColor: 'var(--color-surface)',
                  color: 'var(--color-text)'
                }}
                placeholder="DD-MM-AAAA"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 focus:outline-none p-1"
                title={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
              >
                {showPassword ? (
                  <EyeOff size={20} style={{ color: 'var(--color-secondary)' }} />
                ) : (
                  <Eye size={20} style={{ color: 'var(--color-secondary)' }} />
                )}
              </button>
            </div>
          </div>
          {error && (
            <div className="rounded-lg p-3 sm:p-4" style={{ backgroundColor: 'var(--color-error)', color: 'white' }}>
              <p className="text-center font-medium text-sm sm:text-base">{error}</p>
            </div>
          )}
          <button
            type="submit"
            className="w-full py-3 sm:py-4 text-base sm:text-lg font-semibold rounded-lg flex items-center justify-center gap-2 transition-colors"
            style={{
              backgroundColor: 'var(--color-primary)',
              color: 'white'
            }}
          >
            <LogIn size={20} /> Entrar
          </button>
        </form>

        {/* Columna derecha: Ejemplo de credenciales - Oculto en móvil */}
        <div className="hidden lg:flex items-center">
          <div className="rounded-lg p-6 w-full border-2" style={{
            backgroundColor: 'var(--color-primary-light)',
            borderColor: 'var(--color-primary)'
          }}>
            <p className="text-xl font-bold mb-4 text-center" style={{ color: 'var(--color-primary)' }}>
              📋 Ejemplo de credenciales
            </p>
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <User size={20} style={{ color: 'var(--color-primary)', marginTop: '2px' }} />
                <div>
                  <p className="font-semibold mb-1">Usuario:</p>
                  <p className="font-mono mb-1">RUT sin dígito verificador</p>
                  <p className="text-sm" style={{ color: 'var(--color-secondary)' }}>
                    Ejemplo: <span className="font-mono font-semibold">12345678</span>
                  </p>
                  <p className="text-sm" style={{ color: 'var(--color-secondary)' }}>
                    (si tu RUT es 12345678-9)
                  </p>
                </div>
              </div>
              <div className="h-px" style={{ backgroundColor: 'var(--color-border)' }}></div>
              <div className="flex items-start gap-3">
                <Lock size={20} style={{ color: 'var(--color-primary)', marginTop: '2px' }} />
                <div>
                  <p className="font-semibold mb-1">Contraseña:</p>
                  <p className="font-mono mb-1">Fecha de nacimiento DD-MM-AAAA</p>
                  <p className="text-sm" style={{ color: 'var(--color-secondary)' }}>
                    Ejemplo: <span className="font-mono font-semibold">15-03-1990</span>
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Ayuda compacta en móvil */}
        <div className="lg:hidden mt-4 p-4 rounded-lg border" style={{
          backgroundColor: 'var(--color-primary-light)',
          borderColor: 'var(--color-primary)'
        }}>
          <p className="text-sm text-center font-medium mb-2" style={{ color: 'var(--color-primary)' }}>
            💡 Ayuda
          </p>
          <p className="text-xs text-center" style={{ color: 'var(--color-secondary)' }}>
            Usuario: <span className="font-mono font-semibold">RUT sin guión</span> |
            Contraseña: <span className="font-mono font-semibold">DD-MM-AAAA</span>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;