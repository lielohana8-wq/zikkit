'use client';

import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';

interface Toast {
  id: string;
  message: string;
  color?: string;
}

interface ToastContextValue {
  toasts: Toast[];
  toast: (message: string, color?: string) => void;
  dismiss: (id: string) => void;
}

const ToastContext = createContext<ToastContextValue>({
  toasts: [], toast: () => {}, dismiss: () => {},
});

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const toast = useCallback((message: string, color?: string) => {
    const id = Date.now().toString(36) + Math.random().toString(36).slice(2);
    setToasts((prev) => [...prev, { id, message, color }]);
    setTimeout(() => { setToasts((prev) => prev.filter((t) => t.id !== id)); }, 3500);
  }, []);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ toasts, toast, dismiss }}>
      {children}
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}
