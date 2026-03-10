"use client";
import { useEffect, useState, Suspense } from "react";
import { supabase } from "@/lib/supabase";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import Loader from "@/app/components/Loader";

const NIVELES = [
  { nombre: "Recien conocidos", min: 0,  emoji: "🌱" },
  { nombre: "Amigos",           min: 3,  emoji: "🤝" },
  { nombre: "Banda",            min: 8,  emoji: "⚡" },
  { nombre: "Inseparables",     min: 15, emoji: "🔥" },
  { nombre: "Leyenda",          min: 30, emoji: "👑" },
];

function getNivel(n) { for (let i = NIVELES.length - 1; i >= 0; i--) { if (n >= NIVELES[i].min) return NIVELES[i]; } return NIVELES[0]; }
function getSiguiente(n) { for (let i = 0; i < NIVELES.length; i++) { if (n < NIVELES[i].min) return NIVELES[i]; } return null; }

function GrupoContenido() {
  const { id } = useParams();
  const searchParams = useSearchParams();
  const miNombre = searchParams.get("miembro");
  const router = useRouter();
  const [miNombreEfectivo, setMiNombreEfectivo] = useState(miNombre);
  const [esAdmin, setEsAdmin] = useState(false);
  const [eliminandoMiembro, setEliminandoMiembro] = useState(null);
  const [grupo, setGrupo] = useState(null);
  const [miembros, setMiembros] = useState([]);
  const [slots, setSlots] = useState([]);
  const [propuestas, setPropuestas] = useState([]);
  const [miDisponibilidad, setMiDisponibilidad] = useState([]);
  const [linkCopiado, setLinkCopiado] = useState(false);
  const [miembrosConDisp, setMiembrosConDisp] = useState(new Set());
  const [juntadas, setJuntadas] = useState([]);
  const [notificaciones, setNotificaciones] = useState([]);
  const [seccionAbierta, setSeccionAbierta] = useState("horarios");
  const [cargando, setCargando] = useState(true);
  const [confirmarSalir, setConfirmarSalir] = useState(false);
  const [mostrarInvitar, setMostrarInvitar] = useState(false);
  const [amigos, setAmigos] = useState([]);
  const [invitando, setInvitando] = useState(null);
  const [miUserId, setMiUserId] = useState(null);
  const [editandoEvento, setEditandoEvento] = useState(false);
  const [eventoInput, setEventoInput] = useState("");

  const cargar = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      setMiUserId(user.id);
      const { data: grupoAdmin } = await supabase.from("grupos").select("creado_por").eq("id", id).single();
      if (grupoAdmin?.creado_por === user.id) setEsAdmin(true);
      const { data: amisConfirmadas } = await supabase
        .from("amistades").select("*")
        .or(`de_id.eq.${user.id},para_id.eq.${user.id}`)
        .eq("estado", "aceptada");
      const amigosIds = (amisConfirmadas || []).map(a => a.de_id === user.id ? a.para_id : a.de_id);
      if (amigosIds.length > 0) {
        const { data: perfilesAmigos } = await supabase.from("perfiles").select("*").in("id", amigosIds);
        setAmigos(perfilesAmigos || []);
      }
    }

    const { data: g } = await supabase.from("grupos").select("*").eq("id", id).single();
    setGrupo(g);
    setEventoInput(g?.evento || "");

    const { data: m } = await supabase.from("miembros").select("*").eq("grupo_id", id);
    setMiembros(m || []);

    let nombreFinal = miNombre;
    if (user) {
      const miMiembroReal = m?.find(mb => mb.user_id === user.id);
      if (miMiembroReal) {
        nombreFinal = miMiembroReal.nombre;
        setMiNombreEfectivo(miMiembroReal.nombre);
      }
    }

    const { data: disp } = await supabase.from("disponibilidades").select("*").eq("grupo_id", id);
    if (disp && m) {
      const conDisp = new Set(disp.map(d => d.miembro_id));
      setMiembrosConDisp(conDisp);
      const miMiembro = m.find(mb => mb.nombre === nombreFinal);
      if (miMiembro) setMiDisponibilidad(disp.filter(d => d.miembro_id === miMiembro.id));
      const mapa = {};
      disp.forEach(({ miembro_id, fecha, hora_inicio }) => {
        const key = `${fecha}-${hora_inicio}`;
        if (!mapa[key]) mapa[key] = new Set();
        mapa[key].add(miembro_id);
      });
      setSlots(Object.entries(mapa).map(([key, ids]) => ({
        fecha: key.substring(0, 10), hora: key.substring(11),
        cantidad: ids.size, total: m.length,
      })).sort((a, b) => b.cantidad - a.cantidad || a.fecha.localeCompare(b.fecha)));
    }

    const { data: props } = await supabase.from("propuestas").select("*").eq("grupo_id", id);
    setPropuestas((props || []).sort((a, b) => b.votos.length - a.votos.length));
    const { data: j } = await supabase.from("juntadas").select("*").eq("grupo_id", id).order("fecha", { ascending: false });
    setJuntadas(j || []);
    const { data: notifs } = await supabase.from("notificaciones").select("*").eq("grupo_id", id).order("creado_en", { ascending: false }).limit(8);
    setNotificaciones(notifs || []);
    setCargando(false);
  };

  useEffect(() => { cargar(); }, [id]);
  if (cargando) return <Loader />;

  const fmt = (fecha, hora) => {
    const d = new Date(`${fecha}T${hora}`);
    return d.toLocaleDateString("es-AR", { weekday: "short", day: "numeric", month: "short" }) + " · " + d.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" });
  };

  const fmtRelativo = (timestamp) => {
    const diff = Date.now() - new Date(timestamp);
    const min = Math.floor(diff / 60000);
    if (min < 1) return "ahora";
    if (min < 60) return `hace ${min}m`;
    const hs = Math.floor(min / 60);
    if (hs < 24) return `hace ${hs}h`;
    return `hace ${Math.floor(hs / 24)}d`;
  };

  const slotColor = (cantidad, total) => {
    if (cantidad === total) return { bg: "rgba(52,211,153,0.07)", border: "rgba(52,211,153,0.2)", text: "#34D399" };
    if (cantidad >= total * 0.7) return { bg: "rgba(251,191,36,0.07)", border: "rgba(251,191,36,0.2)", text: "#FBBF24" };
    return { bg: "var(--surface-2)", border: "var(--border)", text: "var(--text-muted)" };
  };

  const copiarLink = () => {
    navigator.clipboard.writeText(`${window.location.origin}?codigo=${grupo.codigo}`);
    setLinkCopiado(true);
    setTimeout(() => setLinkCopiado(false), 2000);
  };

  const guardarEvento = async () => {
    await supabase.from("grupos").update({ evento: eventoInput.trim() || null }).eq("id", id);
    setEditandoEvento(false);
    await cargar();
  };

  const borrarDisponibilidad = async () => {
    const miMiembro = miembros.find(m => m.nombre === miNombreEfectivo);
    if (!miMiembro) return;
    await supabase.from("disponibilidades").delete().eq("miembro_id", miMiembro.id);
    await cargar();
  };

  const salirDelGrupo = async () => {
    const miMiembro = miembros.find(m => m.nombre === miNombreEfectivo);
    if (!miMiembro) return;
    await supabase.from("disponibilidades").delete().eq("miembro_id", miMiembro.id);
    await supabase.from("miembros").delete().eq("id", miMiembro.id);
    router.push("/dashboard");
  };

  const eliminarMiembro = async (miembro) => {
    await supabase.from("disponibilidades").delete().eq("miembro_id", miembro.id);
    await supabase.from("miembros").delete().eq("id", miembro.id);
    await supabase.from("notificaciones").insert({ grupo_id: id, texto: `${miembro.nombre} fue eliminado del grupo` });
    setEliminandoMiembro(null);
    await cargar();
  };

  const proponerHorario = async (fecha, hora) => {
    if (propuestas.find(p => p.fecha === fecha && p.hora === hora)) return alert("Ya fue propuesto.");
    await supabase.from("propuestas").insert({ grupo_id: id, fecha, hora, propuesto_por: miNombreEfectivo, votos: [miNombreEfectivo] });
    await supabase.from("notificaciones").insert({ grupo_id: id, texto: `${miNombreEfectivo} propuso un horario` });
    await cargar();
  };

  const votar = async (propuestaId, votosActuales) => {
    if (votosActuales.includes(miNombreEfectivo)) return alert("Ya votaste este horario");
    await supabase.from("propuestas").update({ votos: [...votosActuales, miNombreEfectivo] }).eq("id", propuestaId);
    await supabase.from("notificaciones").insert({ grupo_id: id, texto: `${miNombreEfectivo} voto un horario` });
    await cargar();
  };

  const confirmarPlan = async (fecha, hora) => {
    await supabase.from("grupos").update({ plan_fecha: fecha, plan_hora: hora, plan_confirmado_por: miNombreEfectivo }).eq("id", id);
    await supabase.from("juntadas").insert({ grupo_id: id, nombre: grupo.evento || `Juntada ${juntadas.length + 1}`, fecha, hora });
    await supabase.from("notificaciones").insert({ grupo_id: id, texto: `${miNombreEfectivo} confirmo el plan para ${fmt(fecha, hora)}` });
    await cargar();
  };

  const cancelarPlan = async () => {
    await supabase.from("grupos").update({ plan_fecha: null, plan_hora: null, plan_confirmado_por: null }).eq("id", id);
    await cargar();
  };

  const invitarAmigo = async (amigoId, amigoNombre) => {
    setInvitando(amigoId);
    const yaEsta = miembros.find(m => m.nombre === amigoNombre);
    if (yaEsta) { setInvitando(null); return alert(`${amigoNombre} ya esta en el grupo`); }
    const { data: invExistente } = await supabase.from("invitaciones").select("*").eq("grupo_id", id).eq("para_id", amigoId).eq("estado", "pendiente").maybeSingle();
    if (invExistente) { setInvitando(null); return alert("Ya le enviaste una invitacion"); }
    await supabase.from("invitaciones").insert({ grupo_id: id, de_id: miUserId, para_id: amigoId, estado: "pendiente" });
    setInvitando(null);
    setMostrarInvitar(false);
    alert(`Invitacion enviada a ${amigoNombre} ✓`);
  };

  const nivel = getNivel(juntadas.length);
  const siguiente = getSiguiente(juntadas.length);
  const progreso = siguiente ? ((juntadas.length - nivel.min) / (siguiente.min - nivel.min)) * 100 : 100;
  const amigosNoEnGrupo = amigos.filter(a => !miembros.find(m => m.nombre === a.nombre));

  const tabs = [
    { id: "horarios", label: "Horarios" },
    { id: "propuestas", label: `Propuestas${propuestas.length > 0 ? ` (${propuestas.length})` : ""}` },
    { id: "actividad", label: "Actividad" },
    { id: "historial", label: "Historial" },
  ];

  return (
    <div style={{ maxWidth: "480px", margin: "0 auto", padding: "24px 20px" }}>

      {/* Modal eliminar miembro */}
      {eliminandoMiembro && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, padding: "24px" }}>
          <div className="fade-in" style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "20px", padding: "28px", maxWidth: "360px", width: "100%" }}>
            <p style={{ fontSize: "20px", marginBottom: "12px" }}>🚫</p>
            <h2 style={{ fontFamily: "Syne, sans-serif", fontSize: "18px", fontWeight: 800, color: "var(--text)", marginBottom: "8px" }}>Eliminar miembro</h2>
            <p style={{ fontSize: "13px", color: "var(--text-muted)", marginBottom: "24px", lineHeight: 1.6 }}>
              Vas a eliminar a <strong style={{ color: "var(--text)" }}>{eliminandoMiembro.nombre}</strong> del grupo. Se va a borrar su disponibilidad.
            </p>
            <div style={{ display: "flex", gap: "10px" }}>
              <button onClick={() => setEliminandoMiembro(null)} style={{ flex: 1, padding: "12px", background: "var(--surface-2)", border: "1px solid var(--border)", color: "var(--text)", borderRadius: "12px", fontFamily: "Syne, sans-serif", fontSize: "14px", fontWeight: 600, cursor: "pointer" }}>Cancelar</button>
              <button onClick={() => eliminarMiembro(eliminandoMiembro)} style={{ flex: 1, padding: "12px", background: "rgba(248,113,113,0.1)", border: "1px solid rgba(248,113,113,0.2)", color: "#F87171", borderRadius: "12px", fontFamily: "Syne, sans-serif", fontSize: "14px", fontWeight: 700, cursor: "pointer" }}>Eliminar</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal confirmar salir */}
      {confirmarSalir && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, padding: "24px" }}>
          <div className="fade-in" style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "20px", padding: "28px", maxWidth: "360px", width: "100%" }}>
            <p style={{ fontSize: "20px", marginBottom: "12px" }}>👋</p>
            <h2 style={{ fontFamily: "Syne, sans-serif", fontSize: "18px", fontWeight: 800, color: "var(--text)", marginBottom: "8px" }}>Salir del grupo</h2>
            <p style={{ fontSize: "13px", color: "var(--text-muted)", marginBottom: "24px", lineHeight: 1.6 }}>
              Vas a salir de <strong style={{ color: "var(--text)" }}>{grupo.nombre}</strong>. Tu disponibilidad se va a borrar.
            </p>
            <div style={{ display: "flex", gap: "10px" }}>
              <button onClick={() => setConfirmarSalir(false)} style={{ flex: 1, padding: "12px", background: "var(--surface-2)", border: "1px solid var(--border)", color: "var(--text)", borderRadius: "12px", fontFamily: "Syne, sans-serif", fontSize: "14px", fontWeight: 600, cursor: "pointer" }}>Cancelar</button>
              <button onClick={salirDelGrupo} style={{ flex: 1, padding: "12px", background: "rgba(248,113,113,0.1)", border: "1px solid rgba(248,113,113,0.2)", color: "#F87171", borderRadius: "12px", fontFamily: "Syne, sans-serif", fontSize: "14px", fontWeight: 700, cursor: "pointer" }}>Salir</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal invitar amigos */}
      {mostrarInvitar && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, padding: "24px" }}>
          <div className="fade-in" style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "20px", padding: "28px", maxWidth: "380px", width: "100%" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
              <h2 style={{ fontFamily: "Syne, sans-serif", fontSize: "18px", fontWeight: 800, color: "var(--text)" }}>Invitar amigos</h2>
              <button onClick={() => setMostrarInvitar(false)} style={{ background: "none", border: "none", color: "var(--text-muted)", fontSize: "18px", cursor: "pointer" }}>✕</button>
            </div>
            {amigosNoEnGrupo.length === 0 ? (
              <div style={{ textAlign: "center", padding: "24px 0" }}>
                <p style={{ fontSize: "28px", marginBottom: "10px" }}>🤷</p>
                <p style={{ fontSize: "13px", color: "var(--text-muted)", lineHeight: 1.6 }}>
                  {amigos.length === 0 ? "No tenes amigos agregados todavia." : "Todos tus amigos ya estan en el grupo."}
                </p>
                {amigos.length === 0 && (
                  <button onClick={() => { setMostrarInvitar(false); router.push("/amigos"); }} style={{ marginTop: "16px", padding: "10px 20px", background: "var(--accent)", color: "#0C0C0F", border: "none", borderRadius: "10px", fontFamily: "Syne, sans-serif", fontSize: "13px", fontWeight: 700, cursor: "pointer" }}>
                    Ir a Amigos →
                  </button>
                )}
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                {amigosNoEnGrupo.map(a => (
                  <div key={a.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: "12px", padding: "12px 16px" }}>
                    <div>
                      <p style={{ fontFamily: "Syne, sans-serif", fontSize: "14px", fontWeight: 700, color: "var(--text)", marginBottom: "2px" }}>{a.nombre}</p>
                      <p style={{ fontSize: "12px", color: "var(--accent)", fontWeight: 600 }}>@{a.usuario}</p>
                    </div>
                    <button onClick={() => invitarAmigo(a.id, a.nombre)} disabled={invitando === a.id} style={{ padding: "8px 16px", background: "var(--accent)", color: "#0C0C0F", border: "none", borderRadius: "8px", fontFamily: "Syne, sans-serif", fontSize: "12px", fontWeight: 700, cursor: "pointer", opacity: invitando === a.id ? 0.6 : 1 }}>
                      {invitando === a.id ? "..." : "Invitar"}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Top nav */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
        <button onClick={() => router.push("/dashboard")} style={{ background: "none", border: "none", color: "var(--text-muted)", fontSize: "13px", cursor: "pointer", padding: 0 }}>
          ← Dashboard
        </button>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          {esAdmin && (
            <span style={{ fontSize: "10px", fontWeight: 700, color: "var(--accent)", letterSpacing: "0.08em", background: "rgba(52,211,153,0.08)", border: "1px solid rgba(52,211,153,0.2)", padding: "3px 8px", borderRadius: "6px" }}>
              ADMIN
            </span>
          )}
          <button onClick={copiarLink} style={{ fontSize: "12px", background: linkCopiado ? "rgba(52,211,153,0.08)" : "var(--surface)", border: `1px solid ${linkCopiado ? "rgba(52,211,153,0.2)" : "var(--border)"}`, color: linkCopiado ? "var(--accent)" : "var(--text-muted)", padding: "6px 14px", borderRadius: "8px", cursor: "pointer", transition: "all 0.2s", fontWeight: 600 }}>
            {linkCopiado ? "✓ Copiado" : "Copiar link"}
          </button>
        </div>
      </div>

      {/* Banner evento */}
      {!grupo.plan_fecha && (
        <div className="fade-up s0" style={{ marginBottom: "20px" }}>
          {grupo.evento && !editandoEvento ? (
            <div onClick={() => setEditandoEvento(true)} style={{ background: "rgba(52,211,153,0.06)", border: "1px solid rgba(52,211,153,0.2)", borderRadius: "16px", padding: "18px 20px", cursor: "pointer" }}>
              <p style={{ fontSize: "11px", fontWeight: 700, color: "var(--accent)", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: "4px" }}>🎯 Para qué se juntan</p>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <p style={{ fontFamily: "Syne, sans-serif", fontSize: "18px", fontWeight: 800, color: "var(--text)" }}>{grupo.evento}</p>
                <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>Editar</span>
              </div>
            </div>
          ) : editandoEvento ? (
            <div className="fade-in" style={{ background: "var(--surface)", border: "1px solid rgba(52,211,153,0.2)", borderRadius: "16px", padding: "18px 20px" }}>
              <p style={{ fontSize: "11px", fontWeight: 700, color: "var(--accent)", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: "10px" }}>🎯 Para qué se juntan</p>
              <div style={{ display: "flex", gap: "8px" }}>
                <input type="text" placeholder="Ej: Asado del finde, Cine, Cumple de Lean..." value={eventoInput} onChange={e => setEventoInput(e.target.value)} onKeyDown={e => e.key === "Enter" && guardarEvento()} autoFocus style={{ flex: 1, padding: "11px 14px", background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: "10px", color: "var(--text)", fontSize: "14px" }} />
                <button onClick={guardarEvento} style={{ padding: "11px 18px", background: "var(--accent)", color: "#0C0C0F", border: "none", borderRadius: "10px", fontFamily: "Syne, sans-serif", fontWeight: 700, cursor: "pointer", fontSize: "13px" }}>Guardar</button>
              </div>
              {grupo.evento && <button onClick={() => { setEventoInput(""); guardarEvento(); }} style={{ marginTop: "8px", background: "none", border: "none", color: "var(--text-muted)", fontSize: "12px", cursor: "pointer", padding: 0 }}>Borrar evento</button>}
            </div>
          ) : (
            <button onClick={() => setEditandoEvento(true)} className="fade-up s0" style={{ width: "100%", padding: "16px 20px", background: "var(--surface)", border: "1px dashed rgba(52,211,153,0.25)", borderRadius: "16px", cursor: "pointer", textAlign: "left", transition: "border-color 0.2s, background 0.2s" }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = "rgba(52,211,153,0.5)"; e.currentTarget.style.background = "rgba(52,211,153,0.03)"; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(52,211,153,0.25)"; e.currentTarget.style.background = "var(--surface)"; }}>
              <p style={{ fontSize: "11px", fontWeight: 700, color: "var(--accent)", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: "4px" }}>🎯 Para qué se juntan</p>
              <p style={{ fontSize: "14px", color: "var(--text-muted)" }}>Agregá el motivo de la juntada...</p>
            </button>
          )}
        </div>
      )}

      {/* Plan confirmado */}
      {grupo.plan_fecha && (
        <div className="fade-up s0" style={{ background: "rgba(52,211,153,0.08)", border: "1px solid rgba(52,211,153,0.2)", borderRadius: "16px", padding: "18px 20px", marginBottom: "20px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <p style={{ fontSize: "11px", fontWeight: 700, color: "#34D399", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: "4px" }}>🎉 Plan confirmado</p>
              {grupo.evento && <p style={{ fontFamily: "Syne, sans-serif", fontSize: "16px", fontWeight: 800, color: "var(--text)", marginBottom: "2px" }}>{grupo.evento}</p>}
              <p style={{ fontFamily: "Syne, sans-serif", fontSize: grupo.evento ? "14px" : "16px", fontWeight: 700, color: grupo.evento ? "var(--text-muted)" : "var(--text)" }}>{fmt(grupo.plan_fecha, grupo.plan_hora)}</p>
              <p style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "2px" }}>por {grupo.plan_confirmado_por}</p>
            </div>
            <button onClick={cancelarPlan} style={{ fontSize: "11px", background: "none", border: "1px solid var(--border)", color: "var(--text-muted)", padding: "6px 12px", borderRadius: "8px", cursor: "pointer" }}>Cancelar</button>
          </div>
        </div>
      )}

      {/* Header grupo */}
      <div className="fade-up s1" style={{ marginBottom: "20px" }}>
        <h1 style={{ fontFamily: "Syne, sans-serif", fontSize: "26px", fontWeight: 800, color: "var(--text)", marginBottom: "4px" }}>{grupo.nombre}</h1>
        <p style={{ fontSize: "13px", color: "var(--text-muted)" }}>Codigo: <span style={{ color: "var(--accent)", fontWeight: 700, letterSpacing: "0.1em" }}>{grupo.codigo}</span></p>
      </div>

      {/* Nivel */}
      <div className="fade-up s1" style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "16px", padding: "16px 20px", marginBottom: "16px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <span style={{ fontSize: "24px" }}>{nivel.emoji}</span>
            <div>
              <p style={{ fontFamily: "Syne, sans-serif", fontSize: "14px", fontWeight: 700, color: "var(--accent)" }}>{nivel.nombre}</p>
              <p style={{ fontSize: "11px", color: "var(--text-muted)" }}>{juntadas.length} juntadas</p>
            </div>
          </div>
          {siguiente && <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>{siguiente.min - juntadas.length} para {siguiente.emoji} {siguiente.nombre}</span>}
        </div>
        <div style={{ height: "4px", background: "var(--surface-2)", borderRadius: "4px", overflow: "hidden" }}>
          <div style={{ height: "100%", width: `${progreso}%`, background: "var(--accent)", borderRadius: "4px", transition: "width 0.6s ease" }} />
        </div>
      </div>

      {/* Miembros */}
      <div className="fade-up s2" style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "16px", padding: "16px 20px", marginBottom: "16px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
          <p style={{ fontSize: "11px", fontWeight: 700, color: "var(--text-muted)", letterSpacing: "0.08em", textTransform: "uppercase" }}>
            Miembros · {miembrosConDisp.size}/{miembros.length} listos
          </p>
          {miUserId && (
            <button onClick={() => setMostrarInvitar(true)} style={{ fontSize: "11px", background: "var(--surface-2)", border: "1px solid var(--border)", color: "var(--text)", padding: "4px 12px", borderRadius: "8px", cursor: "pointer", fontWeight: 600 }}
              onMouseEnter={e => e.currentTarget.style.borderColor = "rgba(52,211,153,0.3)"}
              onMouseLeave={e => e.currentTarget.style.borderColor = "var(--border)"}>
              + Invitar
            </button>
          )}
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
          {miembros.map(m => (
            <div key={m.id} style={{ display: "flex", alignItems: "center", gap: "6px", padding: "6px 12px", background: "var(--surface-2)", borderRadius: "20px", border: `1px solid ${miembrosConDisp.has(m.id) ? "rgba(52,211,153,0.2)" : "var(--border)"}` }}>
              <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: miembrosConDisp.has(m.id) ? "#34D399" : "#71717A" }} />
              <span style={{ fontSize: "13px", color: "var(--text)", fontWeight: m.nombre === miNombreEfectivo ? 600 : 400 }}>{m.nombre}</span>
              {esAdmin && m.nombre !== miNombreEfectivo && (
                <button
                  onClick={() => setEliminandoMiembro(m)}
                  style={{ background: "none", border: "none", color: "var(--text-muted)", fontSize: "11px", cursor: "pointer", padding: "0 2px", lineHeight: 1, transition: "color 0.2s" }}
                  onMouseEnter={e => e.currentTarget.style.color = "#F87171"}
                  onMouseLeave={e => e.currentTarget.style.color = "var(--text-muted)"}
                  title="Eliminar del grupo"
                >
                  ✕
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div className="fade-up s3" style={{ display: "flex", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "12px", padding: "4px", gap: "2px", marginBottom: "16px" }}>
        {tabs.map(tab => (
          <button key={tab.id} onClick={() => setSeccionAbierta(tab.id)}
            style={{ flex: 1, padding: "8px 4px", borderRadius: "9px", border: "none", cursor: "pointer", fontFamily: "Syne, sans-serif", fontSize: "11px", fontWeight: 700, transition: "all 0.2s", background: seccionAbierta === tab.id ? "var(--surface-2)" : "transparent", color: seccionAbierta === tab.id ? "var(--text)" : "var(--text-muted)", whiteSpace: "nowrap" }}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Contenido tabs */}
      <div className="fade-in" style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "16px", padding: "20px", marginBottom: "16px", minHeight: "120px" }}>
        {seccionAbierta === "horarios" && (
          slots.filter(s => s.cantidad / s.total >= 0.5).length === 0 ? (
            <p style={{ fontSize: "13px", color: "var(--text-muted)", textAlign: "center", padding: "16px 0" }}>Todavia no hay suficientes coincidencias.</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {slots.filter(s => s.cantidad / s.total >= 0.5).slice(0, 8).map(({ fecha, hora, cantidad, total }) => {
                const c = slotColor(cantidad, total);
                return (
                  <div key={`${fecha}-${hora}`} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 14px", background: c.bg, border: `1px solid ${c.border}`, borderRadius: "10px" }}>
                    <span style={{ fontSize: "13px", color: "var(--text)", fontWeight: 500 }}>{fmt(fecha, hora)}</span>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      <span style={{ fontSize: "12px", fontWeight: 700, color: c.text }}>{cantidad}/{total}</span>
                      <button onClick={() => proponerHorario(fecha, hora)} style={{ fontSize: "11px", background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text-muted)", padding: "4px 10px", borderRadius: "6px", cursor: "pointer", fontWeight: 600 }}>Proponer</button>
                    </div>
                  </div>
                );
              })}
            </div>
          )
        )}

        {seccionAbierta === "propuestas" && (
          propuestas.length === 0 ? (
            <p style={{ fontSize: "13px", color: "var(--text-muted)", textAlign: "center", padding: "16px 0" }}>Todavia no hay propuestas. Propone un horario desde la seccion Horarios.</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {propuestas.map(p => (
                <div key={p.id} style={{ background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: "12px", padding: "14px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "10px" }}>
                    <div>
                      <p style={{ fontSize: "14px", fontWeight: 600, color: "var(--text)", marginBottom: "2px" }}>{fmt(p.fecha, p.hora)}</p>
                      <p style={{ fontSize: "11px", color: "var(--text-muted)" }}>por {p.propuesto_por}</p>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <span style={{ fontSize: "13px", fontWeight: 700, color: "var(--accent)" }}>{p.votos.length}</span>
                      <button onClick={() => votar(p.id, p.votos)} style={{ fontSize: "12px", padding: "5px 12px", borderRadius: "8px", border: "none", cursor: "pointer", fontWeight: 600, background: p.votos.includes(miNombreEfectivo) ? "var(--surface)" : "var(--accent)", color: p.votos.includes(miNombreEfectivo) ? "var(--text-muted)" : "#0C0C0F" }}>
                        {p.votos.includes(miNombreEfectivo) ? "✓" : "Votar"}
                      </button>
                    </div>
                  </div>
                  <button onClick={() => confirmarPlan(p.fecha, p.hora)} style={{ width: "100%", padding: "10px", background: "rgba(52,211,153,0.08)", border: "1px solid rgba(52,211,153,0.2)", color: "#34D399", borderRadius: "10px", fontSize: "13px", fontWeight: 700, cursor: "pointer", fontFamily: "Syne, sans-serif" }}>
                    🎉 Confirmar este plan
                  </button>
                </div>
              ))}
            </div>
          )
        )}

        {seccionAbierta === "actividad" && (
          notificaciones.length === 0 ? (
            <p style={{ fontSize: "13px", color: "var(--text-muted)", textAlign: "center", padding: "16px 0" }}>Sin actividad todavia.</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {notificaciones.map(n => (
                <div key={n.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <p style={{ fontSize: "13px", color: "var(--text)" }}>• {n.texto}</p>
                  <span style={{ fontSize: "11px", color: "var(--text-muted)", whiteSpace: "nowrap", marginLeft: "12px" }}>{fmtRelativo(n.creado_en)}</span>
                </div>
              ))}
            </div>
          )
        )}

        {seccionAbierta === "historial" && (
          juntadas.length === 0 ? (
            <p style={{ fontSize: "13px", color: "var(--text-muted)", textAlign: "center", padding: "16px 0" }}>Todavia no hay juntadas confirmadas.</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {juntadas.map((j, i) => (
                <div key={j.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 14px", background: i === 0 ? "rgba(52,211,153,0.06)" : "var(--surface-2)", border: `1px solid ${i === 0 ? "rgba(52,211,153,0.2)" : "var(--border)"}`, borderRadius: "10px" }}>
                  <span style={{ fontSize: "13px", color: "var(--text)", fontWeight: 500 }}>{j.nombre}</span>
                  <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>{new Date(j.fecha).toLocaleDateString("es-AR", { day: "numeric", month: "short" })}</span>
                </div>
              ))}
            </div>
          )
        )}
      </div>

      {/* Botones */}
      <div className="fade-up s4" style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
        <button onClick={() => router.push(`/actividades/${id}?miembro=${miNombreEfectivo}`)} style={{ width: "100%", padding: "14px", background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text)", borderRadius: "12px", fontFamily: "Syne, sans-serif", fontSize: "14px", fontWeight: 700, cursor: "pointer" }}
          onMouseEnter={e => e.currentTarget.style.borderColor = "rgba(255,255,255,0.15)"}
          onMouseLeave={e => e.currentTarget.style.borderColor = "var(--border)"}>
          🎯 Que hacemos?
        </button>
        <button onClick={() => router.push(`/disponibilidad/${id}?miembro=${miNombreEfectivo}`)} style={{ width: "100%", padding: "14px", background: "var(--accent)", color: "#0C0C0F", border: "none", borderRadius: "12px", fontFamily: "Syne, sans-serif", fontSize: "14px", fontWeight: 700, cursor: "pointer" }}>
          {miDisponibilidad.length > 0 ? "Editar disponibilidad" : "Agregar disponibilidad"}
        </button>
        {miDisponibilidad.length > 0 && (
          <button onClick={borrarDisponibilidad} style={{ width: "100%", padding: "12px", background: "rgba(248,113,113,0.06)", border: "1px solid rgba(248,113,113,0.2)", color: "#F87171", borderRadius: "12px", fontFamily: "Syne, sans-serif", fontSize: "14px", fontWeight: 600, cursor: "pointer" }}>
            Borrar mi disponibilidad
          </button>
        )}
        <button onClick={() => setConfirmarSalir(true)} style={{ width: "100%", padding: "12px", background: "none", border: "1px solid var(--border)", color: "var(--text-muted)", borderRadius: "12px", fontFamily: "Syne, sans-serif", fontSize: "13px", fontWeight: 600, cursor: "pointer", transition: "all 0.2s" }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = "rgba(248,113,113,0.3)"; e.currentTarget.style.color = "#F87171"; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.color = "var(--text-muted)"; }}>
          Salir del grupo
        </button>
      </div>
    </div>
  );
}

export default function Grupo() {
  return (
    <main style={{ background: "var(--bg)", minHeight: "100vh" }}>
      <Suspense fallback={<Loader />}>
        <GrupoContenido />
      </Suspense>
    </main>
  );
}