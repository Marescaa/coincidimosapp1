'use client';
// app/components/ui/Toast.jsx
// Reemplaza todos los alert() del proyecto con notificaciones in-app

import { createContext, useContext, useState, useCallback, useEffect } from 'react';

const ToastCtx = createContext(null);

export function useToast() {
  const ctx = useContext(ToastCtx);
  if (!ctx) throw new Error('useToast: envolvé el componente con <ToastProvider>');
  return ctx;
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const show = useCallback((message, type = 'info', duration = 3500) => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, duration);
  }, []);

  // API conveniente: toast.ok(), toast.err(), toast.info()
  const toast = {
    ok:   (msg, ms) => show(msg, 'ok',   ms),
    err:  (msg, ms) => show(msg, 'err',  ms ?? 5000),
    info: (msg, ms) => show(msg, 'info', ms),
  };

  return (
    <ToastCtx.Provider value={toast}>
      {children}
      {/* Contenedor de toasts — arriba centrado, safe-area para notch */}
      <div
        role="region"
        aria-label="Notificaciones"
        aria-live="polite"
        style={{
          position: 'fixed',
          top: 'calc(16px + env(safe-area-inset-top))',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 9999,
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          width: 'calc(100% - 32px)',
          maxWidth: '400px',
          pointerEvents: 'none',
        }}
      >
        {toasts.map(t => (
          <ToastItem key={t.id} {...t} />
        ))}
      </div>
    </ToastCtx.Provider>
  );
}

const STYLES = {
  ok:   { accent: '#34D399', icon: '✅', border: 'rgba(52,211,153,0.25)' },
  err:  { accent: '#F87171', icon: '❌', border: 'rgba(248,113,113,0.25)' },
  info: { accent: '#6C63FF', icon: 'ℹ️', border: 'rgba(108,99,255,0.25)' },
};

function ToastItem({ message, type }) {
  const [visible, setVisible] = useState(false);
  const s = STYLES[type] ?? STYLES.info;

  useEffect(() => {
    // Pequeño delay para que CSS transition funcione
    const t = setTimeout(() => setVisible(true), 10);
    return () => clearTimeout(t);
  }, []);

  return (
    <div
      role="alert"
      style={{
        background: 'var(--surface-2)',
        border: `1px solid ${s.border}`,
        borderLeft: `3px solid ${s.accent}`,
        borderRadius: '12px',
        padding: '13px 16px',
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
        pointerEvents: 'all',
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(-10px)',
        transition: 'opacity 0.25s ease, transform 0.25s cubic-bezier(0.34,1.56,0.64,1)',
      }}
    >
      <span aria-hidden="true" style={{ fontSize: '16px', flexShrink: 0 }}>{s.icon}</span>
      <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text)', lineHeight: 1.4 }}>
        {message}
      </span>
    </div>
  );
}
