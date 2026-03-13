"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import Brand from "@/app/components/Brand";
import { Analytics } from '@vercel/analytics/next';

export default function Home() {
  const [codigo, setCodigo] = useState("");
  const [tuNombre, setTuNombre] = useState("");
  const [cargando, setCargando] = useState(false);
  const [mostrarUnirse, setMostrarUnirse] = useState(false);
  const [grupoEncontrado, setGrupoEncontrado] = useState(null);
  const [paso, setPaso] = useState("inicio"); // inicio | encontrado | nombre
  const router = useRouter();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) router.replace("/dashboard");
    });
    // Si viene con ?codigo= en la URL, pre-rellenar
    const params = new URLSearchParams(window.location.search);
    const codigoUrl = params.get("codigo");
    if (codigoUrl) {
      setCodigo(codigoUrl.toUpperCase());
      setMostrarUnirse(true);
    }
  }, []);

  const buscarGrupo = async () => {
    if (!codigo.trim()) return;
    setCargando(true);
    const { data: grupo, error } = await supabase
      .from("grupos").select("*").eq("codigo", codigo.toUpperCase()).single();
    if (error || !grupo) {
      alert("Código inválido. Verificá que esté bien escrito.");
      setCargando(false);
      return;
    }
    setGrupoEncontrado(grupo);
    setPaso("encontrado");
    setCargando(false);
  };

  const unirseComoInvitado = async () => {
    if (!tuNombre.trim()) return;
    setCargando(true);
    await supabase.from("miembros").insert({ grupo_id: grupoEncontrado.id, nombre: tuNombre });
    router.push(`/grupo/${grupoEncontrado.id}?miembro=${tuNombre}`);
  };

  const inputStyle = {
    width: "100%", padding: "12px 16px",
    background: "var(--surface-2)", border: "1px solid var(--border)",
    borderRadius: "12px", color: "var(--text)", fontSize: "14px",
  };

  return (
    <main style={{ background: "var(--bg)", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "24px", position: "relative", overflow: "hidden" }}>
      <div style={{ position: "absolute", top: "20%", left: "50%", transform: "translateX(-50%)", width: "600px", height: "600px", background: "radial-gradient(circle, rgba(52,211,153,0.06) 0%, transparent 70%)", pointerEvents: "none" }} />

      <div style={{ width: "100%", maxWidth: "420px", position: "relative", zIndex: 1 }}>

        {/* Nav */}
        <div className="fade-up s0" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "48px" }}>
          <Brand size="lg" />
          <button
            onClick={() => router.push("/login")}
            style={{ fontSize: "13px", background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text)", padding: "8px 16px", borderRadius: "10px", cursor: "pointer", fontFamily: "Syne, sans-serif", fontWeight: 600 }}
            onMouseEnter={e => e.currentTarget.style.borderColor = "rgba(255,255,255,0.15)"}
            onMouseLeave={e => e.currentTarget.style.borderColor = "var(--border)"}
          >
            Iniciar sesion
          </button>
        </div>

        {/* Hero */}
        <div className="fade-up s1" style={{ textAlign: "center", marginBottom: "36px" }}>
          <h1 style={{ fontFamily: "Syne, sans-serif", fontSize: "34px", fontWeight: 800, color: "var(--text)", lineHeight: 1.15, marginBottom: "14px" }}>
            Encontra el momento<br />
            <span style={{ color: "var(--accent)" }}>perfecto</span> con tus amigos
          </h1>
          <p style={{ color: "var(--text-muted)", fontSize: "14px", lineHeight: 1.6 }}>Coordina horarios, vota actividades<br />y confirma el plan sin drama.</p>
        </div>

        {/* Card */}
        <div className="fade-up s2" style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "20px", padding: "28px", display: "flex", flexDirection: "column", gap: "10px" }}>

          <button
            onClick={() => router.push("/login?modo=registro")}
            style={{ width: "100%", padding: "14px", background: "var(--accent)", color: "#0C0C0F", border: "none", borderRadius: "12px", fontFamily: "Syne, sans-serif", fontSize: "15px", fontWeight: 700, cursor: "pointer", transition: "opacity 0.2s" }}
            onMouseEnter={e => e.currentTarget.style.opacity = "0.88"}
            onMouseLeave={e => e.currentTarget.style.opacity = "1"}
          >
            Crear cuenta y empezar →
          </button>

          <div style={{ display: "flex", alignItems: "center", gap: "10px", margin: "4px 0" }}>
            <div style={{ flex: 1, height: "1px", background: "var(--border)" }} />
            <span style={{ fontSize: "11px", color: "var(--text-muted)", fontWeight: 600, letterSpacing: "0.04em" }}>O UNITE A UN GRUPO</span>
            <div style={{ flex: 1, height: "1px", background: "var(--border)" }} />
          </div>

          <button
            onClick={() => { setMostrarUnirse(!mostrarUnirse); setPaso("inicio"); setGrupoEncontrado(null); }}
            style={{ width: "100%", padding: "13px", background: mostrarUnirse ? "var(--surface-2)" : "transparent", color: "var(--text)", border: "1px solid var(--border)", borderRadius: "12px", fontFamily: "Syne, sans-serif", fontSize: "14px", fontWeight: 600, cursor: "pointer", transition: "all 0.2s" }}
          >
            Tengo un codigo de invitacion
          </button>

          {mostrarUnirse && paso === "inicio" && (
            <div className="fade-in" style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              <input type="text" placeholder="Codigo del grupo" value={codigo} onChange={e => setCodigo(e.target.value.toUpperCase())} onKeyDown={e => e.key === "Enter" && buscarGrupo()} style={inputStyle} autoFocus />
              <button onClick={buscarGrupo} disabled={cargando} style={{ width: "100%", padding: "13px", background: "rgba(52,211,153,0.08)", color: "var(--accent)", border: "1px solid rgba(52,211,153,0.2)", borderRadius: "12px", fontFamily: "Syne, sans-serif", fontSize: "14px", fontWeight: 600, cursor: "pointer", opacity: cargando ? 0.5 : 1 }}>
                {cargando ? "Buscando..." : "Buscar grupo →"}
              </button>
            </div>
          )}

          {mostrarUnirse && paso === "encontrado" && grupoEncontrado && (
            <div className="fade-in" style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {/* Grupo encontrado */}
              <div style={{ background: "rgba(52,211,153,0.06)", border: "1px solid rgba(52,211,153,0.2)", borderRadius: "12px", padding: "14px 16px" }}>
                <p style={{ fontSize: "11px", color: "var(--accent)", fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: "4px" }}>Grupo encontrado</p>
                <p style={{ fontFamily: "Syne, sans-serif", fontSize: "16px", fontWeight: 700, color: "var(--text)" }}>{grupoEncontrado.nombre}</p>
              </div>

              {/* Opción 1: Crear cuenta */}
              <button
                onClick={() => router.push(`/login?modo=registro&codigo=${grupoEncontrado.codigo}`)}
                style={{ width: "100%", padding: "13px", background: "var(--accent)", color: "#0C0C0F", border: "none", borderRadius: "12px", fontFamily: "Syne, sans-serif", fontSize: "14px", fontWeight: 700, cursor: "pointer" }}
              >
                Crear cuenta y unirme →
              </button>

              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <div style={{ flex: 1, height: "1px", background: "var(--border)" }} />
                <span style={{ fontSize: "11px", color: "var(--text-muted)", fontWeight: 600 }}>O</span>
                <div style={{ flex: 1, height: "1px", background: "var(--border)" }} />
              </div>

              {/* Opción 2: Entrar como invitado */}
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                <input type="text" placeholder="Tu nombre (como invitado)" value={tuNombre} onChange={e => setTuNombre(e.target.value)} onKeyDown={e => e.key === "Enter" && unirseComoInvitado()} style={inputStyle} autoFocus />
                <button onClick={unirseComoInvitado} disabled={cargando || !tuNombre.trim()} style={{ width: "100%", padding: "12px", background: "transparent", color: "var(--text-muted)", border: "1px solid var(--border)", borderRadius: "12px", fontFamily: "Syne, sans-serif", fontSize: "13px", fontWeight: 600, cursor: "pointer", opacity: !tuNombre.trim() ? 0.5 : 1 }}>
                  Entrar sin cuenta (solo esta vez)
                </button>
                <p style={{ fontSize: "11px", color: "var(--text-muted)", textAlign: "center", lineHeight: 1.5 }}>
                  Sin cuenta no podés guardar tu historial ni agregar amigos
                </p>
              </div>
            </div>
          )}
        </div>

        <Analytics />
        <p className="fade-up s3" style={{ textAlign: "center", fontSize: "11px", color: "var(--text-muted)", marginTop: "20px" }}>
          Con cuenta podes crear grupos, ver historial y ganar niveles 🚀
        </p>
      </div>
    </main>
  );
}
