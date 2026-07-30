import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

const ToastContext = createContext(null);

const ICONS = {
  success: CheckCircle2,
  error: AlertCircle,
  info: Info,
};

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const dismissToast = useCallback((id) => {
    setToasts((currentToasts) => currentToasts.filter((toast) => toast.id !== id));
  }, []);

  const pushToast = useCallback((toast) => {
    const id = crypto.randomUUID();
    const nextToast = {
      id,
      title: toast.title,
      description: toast.description || '',
      variant: toast.variant || 'info',
    };

    setToasts((currentToasts) => [...currentToasts, nextToast]);
    window.setTimeout(() => dismissToast(id), toast.duration || 3500);
    return id;
  }, [dismissToast]);

  const value = useMemo(() => ({ pushToast, dismissToast }), [pushToast, dismissToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed right-4 top-4 z-[100] flex w-full max-w-sm flex-col gap-3 sm:right-6 sm:top-6">
        {toasts.map((toast) => {
          const Icon = ICONS[toast.variant] || Info;
          const variantClass =
            toast.variant === 'success'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-800 shadow-emerald-100'
              : toast.variant === 'error'
                ? 'border-rose-200 bg-rose-50 text-rose-800 shadow-rose-100'
                : 'border-slate-200 bg-white text-slate-800 shadow-slate-200';

          return (
            <div key={toast.id} className={`pointer-events-auto flex items-start gap-3 rounded-2xl border p-4 shadow-xl ${variantClass}`}>
              <div className="mt-0.5 shrink-0">
                <Icon size={18} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold">{toast.title}</p>
                {toast.description ? <p className="mt-1 text-sm opacity-90">{toast.description}</p> : null}
              </div>
              <button
                type="button"
                onClick={() => dismissToast(toast.id)}
                className="rounded-full p-1 transition hover:bg-black/5"
                aria-label="Dismiss toast"
              >
                <X size={16} />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used inside ToastProvider');
  }
  return context;
};