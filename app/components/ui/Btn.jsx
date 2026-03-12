'use client';
// app/components/ui/Btn.jsx
// Botón reutilizable que sigue el design system existente (verde #34D399, Syne)
// Reemplaza los ~40 botones con estilos inline repetidos en el proyecto

const VARIANTS = {
  primary: {
    background: 'var(--accent)',
    color: '#0C0C0F',
    border: 'none',
    fontWeight: 700,
  },
  secondary: {
    background: 'var(--surface)',
    color: 'var(--text)',
    border: '1px solid var(--border)',
    fontWeight: 700,
  },
  ghost: {
    background: 'transparent',
    color: 'var(--text-muted)',
    border: '1px solid var(--border)',
    fontWeight: 600,
  },
  danger: {
    background: 'rgba(248,113,113,0.08)',
    color: '#F87171',
    border: '1px solid rgba(248,113,113,0.2)',
    fontWeight: 600,
  },
  'accent-ghost': {
    background: 'rgba(52,211,153,0.07)',
    color: 'var(--accent)',
    border: '1px solid rgba(52,211,153,0.2)',
    fontWeight: 600,
  },
};

const SIZES = {
  sm: { padding: '7px 14px', fontSize: '12px', minHeight: '34px', borderRadius: '9px' },
  md: { padding: '12px 20px', fontSize: '14px', minHeight: '46px', borderRadius: '12px' },
  lg: { padding: '14px 24px', fontSize: '15px', minHeight: '52px', borderRadius: '13px' },
};

export default function Btn({
  children,
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  loading = false,
  disabled = false,
  onClick,
  type = 'button',
  style = {},
  ...props
}) {
  const v = VARIANTS[variant] ?? VARIANTS.primary;
  const s = SIZES[size] ?? SIZES.md;

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      aria-busy={loading}
      style={{
        ...v,
        ...s,
        width: fullWidth ? '100%' : undefined,
        fontFamily: 'Syne, sans-serif',
        cursor: disabled || loading ? 'not-allowed' : 'pointer',
        opacity: disabled || loading ? 0.55 : 1,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '7px',
        transition: 'opacity 0.2s, transform 0.15s',
        whiteSpace: 'nowrap',
        ...style,
      }}
      onMouseEnter={e => {
        if (!disabled && !loading) e.currentTarget.style.opacity = '0.88';
      }}
      onMouseLeave={e => {
        if (!disabled && !loading) e.currentTarget.style.opacity = '1';
      }}
      onMouseDown={e => {
        if (!disabled && !loading) e.currentTarget.style.transform = 'scale(0.97)';
      }}
      onMouseUp={e => {
        e.currentTarget.style.transform = 'scale(1)';
      }}
      {...props}
    >
      {loading ? <Spinner /> : children}
    </button>
  );
}

function Spinner() {
  return (
    <div
      aria-hidden="true"
      style={{
        width: '16px',
        height: '16px',
        border: '2px solid rgba(0,0,0,0.2)',
        borderTopColor: 'currentColor',
        borderRadius: '50%',
        animation: 'spin 0.6s linear infinite',
      }}
    />
  );
}
