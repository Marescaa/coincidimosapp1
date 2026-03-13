export default function Loader() {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "20px", minHeight: "100vh", background: "var(--bg)" }}>
      <div style={{ position: "relative", width: "56px", height: "56px" }}>
        {/* Calendario base */}
        <div style={{
          width: "56px", height: "56px",
          background: "var(--surface)",
          border: "2px solid var(--border)",
          borderRadius: "14px",
          display: "flex", flexDirection: "column",
          overflow: "hidden",
          boxShadow: "0 0 0 0 rgba(52,211,153,0.4)",
          animation: "pulse-glow 1.8s ease-in-out infinite"
        }}>
          {/* Header del calendario */}
          <div style={{ height: "16px", background: "var(--accent)", display: "flex", alignItems: "center", justifyContent: "center", gap: "4px" }}>
            <div style={{ width: "3px", height: "6px", background: "rgba(0,0,0,0.3)", borderRadius: "2px", marginTop: "-4px" }} />
            <div style={{ width: "3px", height: "6px", background: "rgba(0,0,0,0.3)", borderRadius: "2px", marginTop: "-4px" }} />
          </div>
          {/* Grilla de dias */}
          <div style={{ flex: 1, display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "3px", padding: "5px" }}>
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} style={{
                borderRadius: "2px",
                background: "var(--surface-2)",
                animation: `cell-pop 1.8s ease-in-out ${i * 0.12}s infinite`
              }} />
            ))}
          </div>
        </div>

        {/* Circulito orbitando */}
        <div style={{
          position: "absolute",
          top: "-6px", left: "-6px",
          width: "68px", height: "68px",
          animation: "orbit 1.8s linear infinite"
        }}>
          <div style={{
            width: "10px", height: "10px",
            background: "var(--accent)",
            borderRadius: "50%",
            boxShadow: "0 0 8px rgba(52,211,153,0.8)"
          }} />
        </div>
      </div>

      {/* Tres puntos */}
      <div style={{ display: "flex", gap: "6px" }}>
        {[0, 1, 2].map(i => (
          <div key={i} style={{
            width: "5px", height: "5px",
            borderRadius: "50%",
            background: "var(--accent)",
            opacity: 0.3,
            animation: `dot-bounce 1.2s ease-in-out ${i * 0.2}s infinite`
          }} />
        ))}
      </div>

      <style>{`
        @keyframes pulse-glow {
          0%, 100% { box-shadow: 0 0 0 0 rgba(52,211,153,0.0); }
          50%       { box-shadow: 0 0 0 8px rgba(52,211,153,0.08); }
        }
        @keyframes orbit {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
        @keyframes cell-pop {
          0%, 100% { background: var(--surface-2); }
          50%      { background: rgba(52,211,153,0.25); }
        }
        @keyframes dot-bounce {
          0%, 100% { opacity: 0.2; transform: translateY(0); }
          50%      { opacity: 1;   transform: translateY(-4px); }
        }
      `}</style>
    </div>
  );
}
