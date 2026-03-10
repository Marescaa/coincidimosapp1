"use client";

export default function Brand({ size = "md" }) {
  const sizes = {
    sm: { icon: 20, font: 13, gap: 7, radius: 5, headerH: 6, grip: 2, gridGap: 2, padding: 3 },
    md: { icon: 26, font: 16, gap: 8, radius: 7, headerH: 8, grip: 2, gridGap: 2, padding: 4 },
    lg: { icon: 42, font: 24, gap: 12, radius: 11, headerH: 13, grip: 3, gridGap: 3, padding: 6 },
  };
  const s = sizes[size] || sizes.md;

  return (
    <div style={{ display: "flex", alignItems: "center", gap: `${s.gap}px` }}>
      {/* Calendario estático */}
      <div style={{
        width: s.icon,
        height: s.icon,
        background: "var(--surface)",
        border: "1.5px solid var(--border)",
        borderRadius: s.radius,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        flexShrink: 0,
        boxShadow: "0 0 12px rgba(52,211,153,0.12)",
      }}>
        {/* Header verde */}
        <div style={{
          height: s.headerH,
          background: "var(--accent)",
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "center",
          gap: s.grip + 1,
          paddingBottom: "2px",
          flexShrink: 0,
        }}>
          <div style={{ width: s.grip, height: s.headerH * 0.55, background: "rgba(0,0,0,0.25)", borderRadius: "2px", marginBottom: 1 }} />
          <div style={{ width: s.grip, height: s.headerH * 0.55, background: "rgba(0,0,0,0.25)", borderRadius: "2px", marginBottom: 1 }} />
        </div>
        {/* Grilla */}
        <div style={{
          flex: 1,
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: s.gridGap,
          padding: s.padding,
        }}>
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} style={{
              borderRadius: 2,
              background: i === 2 ? "rgba(52,211,153,0.5)" : i === 4 ? "rgba(52,211,153,0.25)" : "var(--surface-2)",
            }} />
          ))}
        </div>
      </div>

      {/* Wordmark */}
      <span style={{
        fontFamily: "Syne, sans-serif",
        fontSize: s.font,
        fontWeight: 800,
        letterSpacing: "-0.025em",
        lineHeight: 1,
        color: "var(--text)",
      }}>
        <span style={{ color: "#34D399" }}>C</span>oincidimos
      </span>
    </div>
  );
}