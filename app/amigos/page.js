"use client";
import { useEffect, useState, Suspense } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import Loader from "@/app/components/Loader";

function AmigosContenido() {
  const router = useRouter();
  const [perfil, setPerfil] = useState(null);
  const [amigos, setAmigos] = useState([]);
  const [solicitudesRecibidas, setSolicitudesRecibidas] = useState([]);
  const [solicitudesEnviadas, setSolicitudesEnviadas] = useState([]);
  const [busqueda, setBusqueda] = useState("");
  const [resultadoBusqueda, setResultadoBusqueda] = useState(null);
  const [buscando, setBuscando] = useState(false);
  const [cargando, setCargando] = useState(true);
  const [tab, setTab] = useState("amigos");

  const cargar = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push("/login"); return; }

    const { data: p } = await supabase.from("perfiles").select("*").eq("id", user.id).single();
    setPerfil({ ...p, id: user.id });

    // Amigos confirmados
    const { data: amisConfirmadas } = await supabase
      .from("amistades")
      .select("*")
      .or(`de_id.eq.${user.id},para_id.eq.${user.id}`)
      .eq("estado", "aceptada");

    const amigosIds = (amisConfirmadas || []).map(a => a.de_id === user.id ? a.para_id : a.de_id);
    if (amigosIds.length > 0) {
      const { data: perfilesAmigos } = await supabase.from("perfiles").select("*").in("id", amigosIds);
      setAmigos(perfilesAmigos || []);
    } else {
      setAmigos([]);
    }

    // Solicitudes recibidas
    const { data: recibidas } = await supabase
      .from("amistades").select("*").eq("para_id", user.id).eq("estado", "pendiente");
    if (recibidas?.length > 0) {
      const ids = recibidas.map(s => s.de_id);
      const { data: perfs } = await supabase.from("perfiles").select("*").in("id", ids);
      setSolicitudesRecibidas(recibidas.map(s => ({ ...s, perfil: perfs?.find(p => p.id === s.de_id) })));
    } else {
      setSolicitudesRecibidas([]);
    }

    // Solicitudes enviadas
    const { data: enviadas } = await supabase
      .from("amistades").select("*").eq("de_id", user.id).eq("estado", "pendiente");
    if (enviadas?.length > 0) {
      const ids = enviadas.map(s => s.para_id);
      const { data: perfs } = await supabase.from("perfiles").select("*").in("id", ids);
      setSolicitudesEnviadas(enviadas.map(s => ({ ...s, perfil: perfs?.find(p => p.id === s.para_id) })));
    } else {
      setSolicitudesEnviadas([]);
    }

    setCargando(false);
  };

  useEffect(() => { cargar(); }, []);

  const buscarUsuario = async () => {
    if (!busqueda.trim()) return;
    setBuscando(true);
    setResultadoBusqueda(null);
    const query = busqueda.startsWith("@") ? busqueda.slice(1) : busqueda;
    const { data } = await supabase.from("perfiles").select("*").eq("usuario", query.toLowerCase()).maybeSingle();
    if (!data || data.id === perfil.id) {
      setResultadoBusqueda("no_encontrado");
    } else {
      // Ver si ya hay relacion
      const { data: relacion } = await supabase
        .from("amistades").select("*")
        .or(`and(de_id.eq.${perfil.id},para_id.eq.${data.id}),and(de_id.eq.${data.id},para_id.eq.${perfil.id})`)
        .maybeSingle();
      setResultadoBusqueda({ ...data, relacion });
    }
    setBuscando(false);
  };

  const enviarSolicitud = async (paraId) => {
    await supabase.from("amistades").insert({ de_id: perfil.id, para_id: paraId, estado: "pendiente" });
    await cargar();
    setResultadoBusqueda(null);
    setBusqueda("");
  };

  const responderSolicitud = async (amistadId, estado) => {
    await supabase.from("amistades").update({ estado }).eq("id", amistadId);
    await cargar();
  };

  const eliminarAmigo = async (amigoId) => {
    await supabase.from("amistades")
      .delete()
      .or(`and(de_id.eq.${perfil.id},para_id.eq.${amigoId}),and(de_id.eq.${amigoId},para_id.eq.${perfil.id})`);
    await cargar();
  };

  if (cargando) return <Loader />;

  const tabs = [
    { id: "amigos", label: `Amigos${amigos.length > 0 ? ` (${amigos.length})` : ""}` },
    { id: "solicitudes", label: `Solicitudes${solicitudesRecibidas.length > 0 ? ` (${solicitudesRecibidas.length})` : ""}` },
    { id: "buscar", label: "Buscar" },
  ];

  return (
    <div style={{ maxWidth: "480px", margin: "0 auto", padding: "24px 20px" }}>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "28px" }}>
        <button onClick={() => router.push("/dashboard")} style={{ background: "none", border: "none", color: "var(--text-muted)", fontSize: "13px", cursor: "pointer", padding: 0 }}>
          ← Dashboard
        </button>
      </div>

      <div style={{ marginBottom: "24px" }}>
        <h1 style={{ fontFamily: "Syne, sans-serif", fontSize: "24px", fontWeight: 800, color: "var(--text)", marginBottom: "4px" }}>Amigos</h1>
        <p style={{ fontSize: "13px", color: "var(--text-muted)" }}>Tu usuario: <span style={{ color: "var(--accent)", fontWeight: 700 }}>@{perfil.usuario}</span></p>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "12px", padding: "4px", gap: "2px", marginBottom: "20px" }}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            style={{ flex: 1, padding: "8px 4px", borderRadius: "9px", border: "none", cursor: "pointer", fontFamily: "Syne, sans-serif", fontSize: "11px", fontWeight: 700, transition: "all 0.2s", background: tab === t.id ? "var(--surface-2)" : "transparent", color: tab === t.id ? "var(--text)" : "var(--text-muted)", whiteSpace: "nowrap" }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab: Amigos */}
      {tab === "amigos" && (
        amigos.length === 0 ? (
          <div style={{ textAlign: "center", padding: "48px 0", color: "var(--text-muted)" }}>
            <p style={{ fontSize: "32px", marginBottom: "12px" }}>🤝</p>
            <p style={{ fontFamily: "Syne, sans-serif", fontSize: "15px", fontWeight: 700, color: "var(--text)", marginBottom: "6px" }}>Sin amigos todavia</p>
            <p style={{ fontSize: "13px" }}>Busca a alguien por su @usuario</p>
            <button onClick={() => setTab("buscar")} style={{ marginTop: "16px", padding: "10px 20px", background: "var(--accent)", color: "#0C0C0F", border: "none", borderRadius: "10px", fontFamily: "Syne, sans-serif", fontSize: "13px", fontWeight: 700, cursor: "pointer" }}>
              Buscar amigos
            </button>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {amigos.map(a => (
              <div key={a.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "14px", padding: "14px 18px" }}>
                <div>
                  <p style={{ fontFamily: "Syne, sans-serif", fontSize: "14px", fontWeight: 700, color: "var(--text)", marginBottom: "2px" }}>{a.nombre}</p>
                  <p style={{ fontSize: "12px", color: "var(--accent)", fontWeight: 600 }}>@{a.usuario}</p>
                </div>
                <button
                  onClick={() => eliminarAmigo(a.id)}
                  style={{ fontSize: "11px", background: "none", border: "1px solid var(--border)", color: "var(--text-muted)", padding: "5px 12px", borderRadius: "8px", cursor: "pointer", transition: "all 0.2s" }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = "rgba(248,113,113,0.3)"; e.currentTarget.style.color = "#F87171"; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.color = "var(--text-muted)"; }}
                >
                  Eliminar
                </button>
              </div>
            ))}
          </div>
        )
      )}

      {/* Tab: Solicitudes */}
      {tab === "solicitudes" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {solicitudesRecibidas.length === 0 && solicitudesEnviadas.length === 0 ? (
            <div style={{ textAlign: "center", padding: "48px 0", color: "var(--text-muted)" }}>
              <p style={{ fontSize: "32px", marginBottom: "12px" }}>📭</p>
              <p style={{ fontFamily: "Syne, sans-serif", fontSize: "15px", fontWeight: 700, color: "var(--text)", marginBottom: "6px" }}>Sin solicitudes</p>
              <p style={{ fontSize: "13px" }}>Cuando alguien te mande una solicitud aparece aca</p>
            </div>
          ) : (
            <>
              {solicitudesRecibidas.length > 0 && (
                <div>
                  <p style={{ fontSize: "11px", fontWeight: 700, color: "var(--text-muted)", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: "10px" }}>Recibidas</p>
                  <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                    {solicitudesRecibidas.map(s => (
                      <div key={s.id} style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "14px", padding: "14px 18px" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <div>
                            <p style={{ fontFamily: "Syne, sans-serif", fontSize: "14px", fontWeight: 700, color: "var(--text)", marginBottom: "2px" }}>{s.perfil?.nombre}</p>
                            <p style={{ fontSize: "12px", color: "var(--accent)", fontWeight: 600 }}>@{s.perfil?.usuario}</p>
                          </div>
                          <div style={{ display: "flex", gap: "8px" }}>
                            <button onClick={() => responderSolicitud(s.id, "rechazada")} style={{ fontSize: "12px", padding: "7px 14px", borderRadius: "8px", border: "1px solid var(--border)", background: "none", color: "var(--text-muted)", cursor: "pointer", fontWeight: 600 }}>
                              Rechazar
                            </button>
                            <button onClick={() => responderSolicitud(s.id, "aceptada")} style={{ fontSize: "12px", padding: "7px 14px", borderRadius: "8px", border: "none", background: "var(--accent)", color: "#0C0C0F", cursor: "pointer", fontFamily: "Syne, sans-serif", fontWeight: 700 }}>
                              Aceptar
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {solicitudesEnviadas.length > 0 && (
                <div>
                  <p style={{ fontSize: "11px", fontWeight: 700, color: "var(--text-muted)", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: "10px" }}>Enviadas</p>
                  <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                    {solicitudesEnviadas.map(s => (
                      <div key={s.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "14px", padding: "14px 18px" }}>
                        <div>
                          <p style={{ fontFamily: "Syne, sans-serif", fontSize: "14px", fontWeight: 700, color: "var(--text)", marginBottom: "2px" }}>{s.perfil?.nombre}</p>
                          <p style={{ fontSize: "12px", color: "var(--accent)", fontWeight: 600 }}>@{s.perfil?.usuario}</p>
                        </div>
                        <span style={{ fontSize: "11px", color: "var(--text-muted)", background: "var(--surface-2)", border: "1px solid var(--border)", padding: "4px 10px", borderRadius: "6px" }}>Pendiente</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Tab: Buscar */}
      {tab === "buscar" && (
        <div>
          <div style={{ display: "flex", gap: "10px", marginBottom: "20px" }}>
            <div style={{ flex: 1, position: "relative" }}>
              <span style={{ position: "absolute", left: "16px", top: "50%", transform: "translateY(-50%)", color: "var(--accent)", fontWeight: 700, fontSize: "14px" }}>@</span>
              <input
                type="text"
                placeholder="usuario"
                value={busqueda}
                onChange={e => setBusqueda(e.target.value.toLowerCase().replace(/[^a-z0-9_@]/g, ""))}
                onKeyDown={e => e.key === "Enter" && buscarUsuario()}
                style={{ width: "100%", padding: "13px 16px 13px 32px", background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: "12px", color: "var(--text)", fontSize: "14px" }}
                autoFocus
              />
            </div>
            <button onClick={buscarUsuario} disabled={buscando} style={{ padding: "13px 20px", background: "var(--accent)", color: "#0C0C0F", border: "none", borderRadius: "12px", fontFamily: "Syne, sans-serif", fontWeight: 700, cursor: "pointer", fontSize: "14px", opacity: buscando ? 0.6 : 1 }}>
              Buscar
            </button>
          </div>

          {resultadoBusqueda === "no_encontrado" && (
            <div style={{ textAlign: "center", padding: "32px 0", color: "var(--text-muted)" }}>
              <p style={{ fontSize: "28px", marginBottom: "10px" }}>🔍</p>
              <p style={{ fontSize: "14px" }}>No se encontro ningun usuario con ese nombre</p>
            </div>
          )}

          {resultadoBusqueda && resultadoBusqueda !== "no_encontrado" && (
            <div className="fade-in" style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "16px", padding: "20px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <p style={{ fontFamily: "Syne, sans-serif", fontSize: "16px", fontWeight: 700, color: "var(--text)", marginBottom: "4px" }}>{resultadoBusqueda.nombre}</p>
                  <p style={{ fontSize: "13px", color: "var(--accent)", fontWeight: 600 }}>@{resultadoBusqueda.usuario}</p>
                </div>
                {!resultadoBusqueda.relacion && (
                  <button onClick={() => enviarSolicitud(resultadoBusqueda.id)} style={{ padding: "10px 18px", background: "var(--accent)", color: "#0C0C0F", border: "none", borderRadius: "10px", fontFamily: "Syne, sans-serif", fontSize: "13px", fontWeight: 700, cursor: "pointer" }}>
                    Agregar →
                  </button>
                )}
                {resultadoBusqueda.relacion?.estado === "pendiente" && (
                  <span style={{ fontSize: "12px", color: "var(--text-muted)", background: "var(--surface-2)", border: "1px solid var(--border)", padding: "6px 12px", borderRadius: "8px" }}>Solicitud enviada</span>
                )}
                {resultadoBusqueda.relacion?.estado === "aceptada" && (
                  <span style={{ fontSize: "12px", color: "var(--accent)", background: "rgba(52,211,153,0.08)", border: "1px solid rgba(52,211,153,0.2)", padding: "6px 12px", borderRadius: "8px" }}>Ya son amigos ✓</span>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function Amigos() {
  return (
    <main style={{ background: "var(--bg)", minHeight: "100vh" }}>
      <Suspense fallback={<Loader />}>
        <AmigosContenido />
      </Suspense>
    </main>
  );
}