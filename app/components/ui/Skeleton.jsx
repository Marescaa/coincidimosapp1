// app/components/ui/Skeleton.jsx
// Skeletons para reemplazar el <Loader /> de pantalla completa
// en carga de listas de grupos y contenido de grupo

export function SkeletonGrupoCard() {
  return (
    <div
      aria-hidden="true"
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: '16px',
        padding: '20px',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px' }}>
        <div style={{ flex: 1 }}>
          <Skel height={16} width="55%" style={{ marginBottom: 8, borderRadius: 999 }} />
          <Skel height={12} width="35%" style={{ borderRadius: 999 }} />
        </div>
        <Skel height={28} width={28} style={{ borderRadius: '50%' }} />
      </div>
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
          <Skel height={12} width="30%" style={{ borderRadius: 999 }} />
          <Skel height={12} width="25%" style={{ borderRadius: 999 }} />
        </div>
        <Skel height={3} style={{ borderRadius: 4 }} />
      </div>
    </div>
  );
}

export function SkeletonGruposList({ count = 3 }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonGrupoCard key={i} />
      ))}
    </div>
  );
}

export function SkeletonSlot() {
  return (
    <div
      aria-hidden="true"
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '10px 14px',
        background: 'var(--surface-2)',
        border: '1px solid var(--border)',
        borderRadius: '10px',
      }}
    >
      <Skel height={13} width="45%" style={{ borderRadius: 999 }} />
      <Skel height={13} width="15%" style={{ borderRadius: 999 }} />
    </div>
  );
}

export function SkeletonSlotsList({ count = 5 }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonSlot key={i} />
      ))}
    </div>
  );
}

// Componente base de skeleton con shimmer
function Skel({ height, width = '100%', style = {} }) {
  return (
    <div
      style={{
        height,
        width,
        background: 'linear-gradient(90deg, var(--surface) 25%, var(--surface-2) 50%, var(--surface) 75%)',
        backgroundSize: '200% 100%',
        animation: 'shimmer 1.5s infinite',
        borderRadius: '4px',
        ...style,
      }}
    />
  );
}
