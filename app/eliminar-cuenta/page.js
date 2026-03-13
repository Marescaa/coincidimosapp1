export default function EliminarCuenta() {
  return (
    <main style={{ background: "var(--bg)", minHeight: "100vh", padding: "48px 24px" }}>
      <div style={{ maxWidth: "640px", margin: "0 auto" }}>

        <h1 style={{ fontFamily: "Syne, sans-serif", fontSize: "26px", fontWeight: 800, color: "var(--text)", marginBottom: "8px" }}>
          Eliminar tu cuenta
        </h1>
        <p style={{ fontSize: "13px", color: "var(--text-muted)", marginBottom: "40px" }}>
          Coincidimos · solicitud de eliminación de cuenta y datos
        </p>

        <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "16px", padding: "28px", marginBottom: "24px" }}>
          <h2 style={{ fontFamily: "Syne, sans-serif", fontSize: "16px", fontWeight: 700, color: "var(--text)", marginBottom: "16px" }}>
            ¿Cómo solicitar la eliminación?
          </h2>
          <p style={{ fontSize: "14px", color: "var(--text-muted)", lineHeight: 1.8, marginBottom: "16px" }}>
            Para solicitar la eliminación de tu cuenta y todos los datos asociados, enviá un email a la siguiente dirección indicando el email con el que te registraste en Coincidimos:
          </p>
          <div style={{ background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: "12px", padding: "16px", textAlign: "center" }}>
            <p style={{ fontFamily: "Syne, sans-serif", fontSize: "16px", fontWeight: 700, color: "#34D399" }}>
              coincidimosapp@gmail.com
            </p>
            <p style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "6px" }}>
              Asunto sugerido: "Solicitud de eliminación de cuenta"
            </p>
          </div>
          <p style={{ fontSize: "13px", color: "var(--text-muted)", marginTop: "16px", lineHeight: 1.7 }}>
            Procesamos todas las solicitudes dentro de los <strong style={{ color: "var(--text)" }}>7 días hábiles</strong>.
          </p>
        </div>

        <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "16px", padding: "28px", marginBottom: "24px" }}>
          <h2 style={{ fontFamily: "Syne, sans-serif", fontSize: "16px", fontWeight: 700, color: "var(--text)", marginBottom: "16px" }}>
            ¿Qué datos se eliminan?
          </h2>
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {[
              { label: "Tu perfil", detalle: "Nombre, nombre de usuario y email — eliminados permanentemente", accion: "🗑️ Eliminado" },
              { label: "Disponibilidad horaria", detalle: "Todos los horarios que cargaste en grupos", accion: "🗑️ Eliminado" },
              { label: "Participación en grupos", detalle: "Tu membresía en todos los grupos", accion: "🗑️ Eliminado" },
              { label: "Amistades", detalle: "Todas tus conexiones con otros usuarios", accion: "🗑️ Eliminado" },
              { label: "Credenciales de acceso", detalle: "Email y contraseña encriptada", accion: "🗑️ Eliminado" },
              { label: "Grupos creados por vos", detalle: "El grupo y su historial permanecen para los demás miembros", accion: "⚠️ Se conserva (sin vínculo a tu cuenta)" },
            ].map((item, i) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", padding: "12px 16px", background: "var(--surface-2)", borderRadius: "10px", gap: "12px" }}>
                <div>
                  <p style={{ fontSize: "13px", fontWeight: 600, color: "var(--text)", marginBottom: "2px" }}>{item.label}</p>
                  <p style={{ fontSize: "12px", color: "var(--text-muted)", lineHeight: 1.5 }}>{item.detalle}</p>
                </div>
                <p style={{ fontSize: "11px", fontWeight: 600, color: item.accion.startsWith("🗑️") ? "#F87171" : "#FBBF24", whiteSpace: "nowrap" }}>{item.accion}</p>
              </div>
            ))}
          </div>
        </div>

        <div style={{ paddingTop: "24px", borderTop: "1px solid var(--border)" }}>
          <p style={{ fontSize: "12px", color: "var(--text-muted)", textAlign: "center" }}>
            © 2025 Coincidimos · coincidimosapp@gmail.com
          </p>
        </div>
      </div>
    </main>
  );
}
