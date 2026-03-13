"use client";
import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { useToast } from "@/app/components/ui/Toast";

// BUGFIX: Math.random() no es criptográficamente seguro
function generarCodigo(longitud = 6) {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // sin 0,O,I,1 (confusos)
  const bytes = crypto.getRandomValues(new Uint8Array(longitud));
  return Array.from(bytes, (b) => chars[b % chars.length]).join("");
}

export default function CrearGrupo() {
  const [nombre, setNombre] = useState("");
  const [tuNombre, setTuNombre] = useState("");
  const [cargando, setCargando] = useState(false);
  const router = useRouter();
  const toast = useToast();

  const crearGrupo = async () => {
    if (!nombre.trim() || !tuNombre.trim()) {
      toast.err("Completá todos los campos");
      return;
    }
    setCargando(true);

    // BUGFIX: usar crypto en lugar de Math.random()
    const codigo = generarCodigo();

    // Intentar obtener user_id si hay sesión activa
    const { data: { user } } = await supabase.auth.getUser();

    const { data: grupo, error } = await supabase
      .from("grupos")
      .insert({
        nombre: nombre.trim(),
        codigo,
        // BUGFIX: guardar el creador del grupo
        creado_por: user?.id ?? null,
      })
      .select()
      .single();

    if (error) {
      toast.err("Error al crear el grupo. Intentá de nuevo.");
      setCargando(false);
      return;
    }

    await supabase.from("miembros").insert({
      grupo_id: grupo.id,
      nombre: tuNombre.trim(),
      // Guardar user_id si está autenticado (para RLS)
      user_id: user?.id ?? null,
    });

    router.push(`/grupo/${grupo.id}?miembro=${tuNombre.trim()}`);
  };

  const inputStyle = {
    width: "100%",
    padding: "13px 16px",
    background: "var(--surface-2)",
    border: "1px solid var(--border)",
    borderRadius: "12px",
    color: "var(--text)",
    fontSize: "14px",
    transition: "border-color 0.2s",
  };
  const labelStyle = {
    fontSize: "12px",
    fontWeight: 600,
    color: "var(--text-muted)",
    letterSpacing: "0.06em",
    textTransform: "uppercase",
    marginBottom: "8px",
    display: "block",
  };

  return (
    <main
      style={{
        background: "var(--bg)",
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          position: "absolute",
          top: "20%",
          left: "50%",
          transform: "translateX(-50%)",
          width: "500px",
          height: "500px",
          background:
            "radial-gradient(circle, rgba(52,211,153,0.05) 0%, transparent 70%)",
          pointerEvents: "none",
        }}
      />

      <div
        style={{
          width: "100%",
          maxWidth: "420px",
          position: "relative",
          zIndex: 1,
        }}
      >
        <button
          onClick={() => router.push("/")}
          className="fade-up s0"
          style={{
            background: "none",
            border: "none",
            color: "var(--text-muted)",
            fontSize: "14px",
            cursor: "pointer",
            marginBottom: "24px",
            display: "flex",
            alignItems: "center",
            gap: "6px",
            padding: 0,
          }}
        >
          ← Volver
        </button>

        <div className="fade-up s0" style={{ marginBottom: "32px" }}>
          <h1
            style={{
              fontSize: "28px",
              fontWeight: 800,
              color: "var(--text)",
              marginBottom: "8px",
            }}
          >
            Crear grupo
          </h1>
          <p style={{ color: "var(--text-muted)", fontSize: "14px" }}>
            Invitá a tus amigos con el código que se genera automáticamente.
          </p>
        </div>

        <div
          className="fade-up s1"
          style={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: "20px",
            padding: "32px",
            display: "flex",
            flexDirection: "column",
            gap: "20px",
          }}
        >
          <div>
            <label style={labelStyle}>Nombre del grupo</label>
            <input
              type="text"
              placeholder="Ej: Los pibes"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && crearGrupo()}
              style={inputStyle}
            />
          </div>
          <div>
            <label style={labelStyle}>Tu nombre</label>
            <input
              type="text"
              placeholder="Ej: Franco"
              value={tuNombre}
              onChange={(e) => setTuNombre(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && crearGrupo()}
              style={inputStyle}
            />
          </div>
          <button
            onClick={crearGrupo}
            disabled={cargando}
            style={{
              width: "100%",
              padding: "14px",
              background: "var(--accent)",
              color: "#0C0C0F",
              border: "none",
              borderRadius: "12px",
              fontFamily: "'Syne', sans-serif",
              fontSize: "15px",
              fontWeight: 700,
              cursor: "pointer",
              opacity: cargando ? 0.6 : 1,
              transition: "opacity 0.2s",
            }}
          >
            {cargando ? "Creando..." : "Crear grupo →"}
          </button>
        </div>
      </div>
    </main>
  );
}

