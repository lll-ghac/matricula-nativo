import React, { useState, useEffect } from 'react';
import { Clock, AlertTriangle, RotateCcw, LogOut } from 'lucide-react';

interface SessionWarningModalProps {
  isOpen: boolean;
  minutesLeft: number;
  onExtendSession: () => void;
  onLogout: () => void;
  onClose: () => void;
}

const SessionWarningModal: React.FC<SessionWarningModalProps> = ({
  isOpen,
  minutesLeft,
  onExtendSession,
  onLogout,
  onClose
}) => {
  const [timeDisplay, setTimeDisplay] = useState('');

  useEffect(() => {
    if (minutesLeft > 0) {
      if (minutesLeft === 1) {
        setTimeDisplay('1 minuto');
      } else if (minutesLeft < 60) {
        setTimeDisplay(`${minutesLeft} minutos`);
      } else {
        const hours = Math.floor(minutesLeft / 60);
        const mins = minutesLeft % 60;
        if (mins === 0) {
          setTimeDisplay(`${hours} ${hours === 1 ? 'hora' : 'horas'}`);
        } else {
          setTimeDisplay(`${hours}h ${mins}m`);
        }
      }
    }
  }, [minutesLeft]);

  if (!isOpen) return null;

  const getUrgencyLevel = () => {
    if (minutesLeft <= 5) return 'critical';
    if (minutesLeft <= 15) return 'warning';
    return 'info';
  };

  const urgencyLevel = getUrgencyLevel();

  const getModalStyles = () => {
    switch (urgencyLevel) {
      case 'critical':
        return 'border-red-500 bg-red-50';
      case 'warning':
        return 'border-yellow-500 bg-yellow-50';
      default:
        return 'border-blue-500 bg-blue-50';
    }
  };

  const getIconColor = () => {
    switch (urgencyLevel) {
      case 'critical':
        return 'text-red-600';
      case 'warning':
        return 'text-yellow-600';
      default:
        return 'text-blue-600';
    }
  };

  const getTitleColor = () => {
    switch (urgencyLevel) {
      case 'critical':
        return 'text-red-800';
      case 'warning':
        return 'text-yellow-800';
      default:
        return 'text-blue-800';
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className={`bg-white rounded-lg shadow-2xl max-w-md w-full mx-4 border-2 ${getModalStyles()}`}>
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <div className={`p-2 rounded-full ${urgencyLevel === 'critical' ? 'bg-red-100' : urgencyLevel === 'warning' ? 'bg-yellow-100' : 'bg-blue-100'}`}>
                {urgencyLevel === 'critical' ? (
                  <AlertTriangle className={`h-6 w-6 ${getIconColor()}`} />
                ) : (
                  <Clock className={`h-6 w-6 ${getIconColor()}`} />
                )}
              </div>
              <div>
                <h3 className={`text-lg font-semibold ${getTitleColor()}`}>
                  {urgencyLevel === 'critical' ? '🚨 Sesión Por Expirar' : '⏰ Aviso de Sesión'}
                </h3>
                <p className="text-gray-600 text-sm">
                  {urgencyLevel === 'critical' 
                    ? 'Su sesión expirará muy pronto'
                    : 'Su sesión expirará pronto'
                  }
                </p>
              </div>
            </div>
            <img 
              src="/InsigniaEcuador.png" 
              alt="Escuela Ecuador" 
              className="h-8 w-8 object-contain opacity-70"
            />
          </div>

          {/* Content */}
          <div className="mb-6">
            <div className={`text-center p-4 rounded-lg ${urgencyLevel === 'critical' ? 'bg-red-100' : urgencyLevel === 'warning' ? 'bg-yellow-100' : 'bg-blue-100'}`}>
              <div className="text-2xl font-bold mb-1" style={{color: 'var(--color-primary)'}}>
                {timeDisplay}
              </div>
              <div className="text-sm text-gray-600">
                {urgencyLevel === 'critical' 
                  ? 'restantes antes del cierre automático'
                  : 'hasta el cierre automático de sesión'
                }
              </div>
            </div>
            
            <div className="mt-4 text-sm text-gray-700">
              <p className="mb-2">
                <strong>💾 Sus datos se han guardado automáticamente</strong>
              </p>
              <p>
                Por seguridad, las sesiones se cierran automáticamente después de períodos de inactividad o cuando el token expira.
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex space-x-3">
            <button
              onClick={onExtendSession}
              className="flex-1 ios-btn ios-btn-primary flex items-center justify-center space-x-2 py-3"
            >
              <RotateCcw size={16} />
              <span>Continuar Trabajando</span>
            </button>
            <button
              onClick={onLogout}
              className="flex-1 ios-btn ios-btn-secondary flex items-center justify-center space-x-2 py-3"
            >
              <LogOut size={16} />
              <span>Cerrar Sesión</span>
            </button>
          </div>

          {/* Auto-close info */}
          {urgencyLevel !== 'critical' && (
            <div className="mt-4 text-center">
              <button
                onClick={onClose}
                className="text-sm text-gray-500 hover:text-gray-700 underline"
              >
                Recordar más tarde (se mostrará cada minuto)
              </button>
            </div>
          )}
        </div>

        {/* Progress bar for critical state */}
        {urgencyLevel === 'critical' && (
          <div className="px-6 pb-4">
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-red-500 h-2 rounded-full transition-all duration-1000"
                style={{width: `${Math.max(0, (minutesLeft / 5) * 100)}%`}}
              ></div>
            </div>
            <p className="text-xs text-gray-500 mt-1 text-center">
              Tiempo restante antes del cierre automático
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default SessionWarningModal;