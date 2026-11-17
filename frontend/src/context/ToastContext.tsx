import React, { createContext, useCallback, useContext, useRef, useState } from 'react';
import { CheckCircle, XCircle, Info, X } from 'lucide-react';

type ToastType = 'success' | 'error' | 'info';

interface ToastItem {
  id: number;
  type: ToastType;
  message: string;
}

interface ToastContextType {
  success: (message: string, durationMs?: number) => void;
  error: (message: string, durationMs?: number) => void;
  info: (message: string, durationMs?: number) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

const DEFAULT_DURATION: Record<ToastType, number> = {
  success: 4000,
  info: 4000,
  error: 7000,
};

const ICONS: Record<ToastType, React.ReactNode> = {
  success: <CheckCircle size={20} />,
  error: <XCircle size={20} />,
  info: <Info size={20} />,
};

const COLORS: Record<ToastType, { border: string; icon: string; bg: string }> = {
  success: { border: 'var(--color-success)', icon: 'var(--color-success)', bg: 'var(--color-success-light)' },
  error: { border: 'var(--color-error)', icon: 'var(--color-error)', bg: 'var(--color-error-light)' },
  info: { border: 'var(--color-info)', icon: 'var(--color-info)', bg: 'var(--color-info-light)' },
};

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const nextId = useRef(0);

  const dismiss = useCallback((id: number) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const show = useCallback((type: ToastType, message: string, durationMs?: number) => {
    const id = nextId.current++;
    setToasts(prev => [...prev, { id, type, message }]);
    window.setTimeout(() => dismiss(id), durationMs ?? DEFAULT_DURATION[type]);
  }, [dismiss]);

  const value: ToastContextType = {
    success: (message, durationMs) => show('success', message, durationMs),
    error: (message, durationMs) => show('error', message, durationMs),
    info: (message, durationMs) => show('info', message, durationMs),
  };

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        data-testid="toast-container"
        className="fixed top-4 right-4 z-[100] flex flex-col gap-2 w-[calc(100%-2rem)] max-w-sm"
        aria-live="polite"
      >
        {toasts.map(t => (
          <div
            key={t.id}
            data-testid={`toast-${t.type}`}
            data-toast-type={t.type}
            role={t.type === 'error' ? 'alert' : 'status'}
            className="ios-card flex items-start gap-3 p-4 shadow-lg border-l-4 animate-in"
            style={{ borderLeftColor: COLORS[t.type].border, backgroundColor: 'var(--color-card-elevated)' }}
          >
            <span style={{ color: COLORS[t.type].icon }} className="shrink-0 mt-0.5">
              {ICONS[t.type]}
            </span>
            <p className="flex-1 text-sm whitespace-pre-line" style={{ color: 'var(--color-foreground)' }}>
              {t.message}
            </p>
            <button
              data-testid="toast-close"
              aria-label="Cerrar aviso"
              onClick={() => dismiss(t.id)}
              className="shrink-0"
              style={{ color: 'var(--color-text-light)' }}
            >
              <X size={16} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = (): ToastContextType => {
  const context = useContext(ToastContext);
  if (context === undefined) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};
