import React, { createContext, useCallback, useContext, useRef, useState } from 'react';
import { AlertTriangle, HelpCircle } from 'lucide-react';

interface ConfirmOptions {
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  danger?: boolean;
}

type ConfirmFn = (options: ConfirmOptions | string) => Promise<boolean>;

const ConfirmContext = createContext<ConfirmFn | undefined>(undefined);

interface PendingConfirm extends ConfirmOptions {
  resolve: (value: boolean) => void;
}

export const ConfirmProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [pending, setPending] = useState<PendingConfirm | null>(null);
  const resolverRef = useRef<((value: boolean) => void) | null>(null);

  const confirm = useCallback<ConfirmFn>((options) => {
    const normalized: ConfirmOptions = typeof options === 'string' ? { message: options } : options;
    return new Promise<boolean>((resolve) => {
      resolverRef.current = resolve;
      setPending({ ...normalized, resolve });
    });
  }, []);

  const close = (result: boolean) => {
    resolverRef.current?.(result);
    resolverRef.current = null;
    setPending(null);
  };

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {pending && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[200] p-4">
          <div
            data-testid="confirm-dialog"
            className="ios-card w-full max-w-sm p-6"
            style={{ backgroundColor: 'var(--color-card-elevated)' }}
            role="alertdialog"
            aria-modal="true"
          >
            <div className="flex items-start gap-3 mb-4">
              <span style={{ color: pending.danger ? 'var(--color-error)' : 'var(--color-info)' }} className="shrink-0 mt-0.5">
                {pending.danger ? <AlertTriangle size={22} /> : <HelpCircle size={22} />}
              </span>
              <div>
                {pending.title && (
                  <h3 className="font-semibold mb-1" style={{ color: 'var(--color-foreground)' }}>
                    {pending.title}
                  </h3>
                )}
                <p data-testid="confirm-dialog-message" className="text-sm whitespace-pre-line" style={{ color: 'var(--color-foreground)' }}>
                  {pending.message}
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-3">
              <button
                data-testid="confirm-dialog-cancel"
                className="ios-btn ios-btn-secondary"
                onClick={() => close(false)}
              >
                {pending.cancelText || 'Cancelar'}
              </button>
              <button
                data-testid="confirm-dialog-accept"
                className={`ios-btn ${pending.danger ? 'ios-btn-danger' : 'ios-btn-primary'}`}
                onClick={() => close(true)}
                autoFocus
              >
                {pending.confirmText || 'Aceptar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
};

export const useConfirm = (): ConfirmFn => {
  const context = useContext(ConfirmContext);
  if (context === undefined) {
    throw new Error('useConfirm must be used within a ConfirmProvider');
  }
  return context;
};
