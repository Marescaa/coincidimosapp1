'use client';
// app/error.jsx — Error boundary automático de Next.js App Router
// Se muestra cuando cualquier página tira un error no capturado

import { useEffect } from 'react';

export default function ErrorPage({ error, reset }) {
  useEffect(() => {
    // Acá iría Sentry o similar en producción
    console.error('[Coincidimos] Error no capturado:', error);
  }, [error]);

  return (
    <main
      className="page"
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '32px 24px',
        textAlign: 'center',
        gap: '20px',
        minHeight: '100vh',
      }}
    >
      <span style={{ fontSize: '3rem' }} role="img" aria-label="Error">😵</span>

      <div>
        <h2 style={{ fontFamily: 'Syne, sans-serif', fontSize: '20px', fontWeight: 800, color: 'var(--text)', marginBottom: '8px' }}>
          Algo salió mal
        </h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '14px', maxWidth: '300px', lineHeight: 1.6 }}>
          Ocurrió un error inesperado. Podés reintentar o volver al inicio.
        </p>
      </div>

      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', justifyContent: 'center' }}>
        <button
          onClick={reset}
          style={{
            padding: '12px 24px',
            background: 'var(--accent)',
            color: '#0C0C0F',
            border: 'none',
            borderRadius: '12px',
            fontFamily: 'Syne, sans-serif',
            fontWeight: 700,
            fontSize: '14px',
            cursor: 'pointer',
          }}
        >
          Reintentar
        </button>
        <a
          href="/dashboard"
          style={{
            padding: '12px 24px',
            background: 'var(--surface)',
            color: 'var(--text)',
            border: '1px solid var(--border)',
            borderRadius: '12px',
            fontFamily: 'Syne, sans-serif',
            fontWeight: 700,
            fontSize: '14px',
            textDecoration: 'none',
          }}
        >
          Ir al dashboard
        </a>
      </div>

      {/* Solo en desarrollo */}
      {process.env.NODE_ENV === 'development' && (
        <details
          style={{
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: '12px',
            padding: '12px 16px',
            maxWidth: '400px',
            width: '100%',
            textAlign: 'left',
          }}
        >
          <summary style={{ cursor: 'pointer', color: 'var(--text-muted)', fontSize: '12px', fontWeight: 600 }}>
            Detalles del error (dev)
          </summary>
          <pre style={{ marginTop: 10, fontSize: '11px', color: 'var(--danger)', overflow: 'auto', whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
            {error?.message}{'\n'}{error?.stack}
          </pre>
        </details>
      )}
    </main>
  );
}
