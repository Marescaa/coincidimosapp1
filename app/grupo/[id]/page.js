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

function addDiasStr(dateStr, n) {
  const d = new Date(dateStr + "T12:00:00");
  d.setDate(d.getDate() + n);
  return d.toISOString().split("T")[0];
}

function GrupoContenido() {
  const { id } = useParams();
  const searchParams = useSearchParams();
  const miNombre = searchParams.get("miembro");
  const router = useRouter();

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

  // Descripcion editable
  const [editandoDesc, setEditandoDesc] = useState(false);
  const [descDraft, setDescDraft] = useState("");

  // Ubicacion al confirmar plan
  const [ubicacionDraft, setUbicacionDraft] = useState("");
  const [propuestaAConfirmar, setPropuestaAConfirmar] = useState(null);

  const cargar = async () => {
    const { data: g } = await supabase.from("grupos").select("*").eq("id", id).single();
    setGrupo(g);
    const { data: m } = await supabase.from("miembros").select("*").eq("grupo_id", id);
    setMiembros(m || []);
    const { data: disp } = await supabase.from("disponibilidades").select("*").eq("grupo_id", id);
    if (disp && m) {
      const conDisp = new Set(disp.map(d => d.miembro_id));
      setMiembrosConDisp(conDisp);
      const miMiembro = m.find(mb => mb.nombre === miNombre);
      if (miMiembro) setMiDisponibilidad(disp.filter(d => d.miembro_id === miMiembro.id));

      // Calcular slots individuales primero
      const mapa = {};
      disp.forEach(({ miembro_id, fecha, hora_inicio }) => {
        const key = `${fecha}-${hora_inicio}`;
        if (!mapa[key]) mapa[key] = new Set();
        mapa[key].add(miembro_id);
      });
      const rawSlots = Object.entries(mapa).map(([key, ids]) => {
        const dbFecha = key.substring(0, 10);
        const horaStr = key.substring(11);
        const h = parseInt(horaStr.split(":")[0]);
        const esMadrugada = h <= 6;
        const fechaVisual = esMadrugada ? addDiasStr(dbFecha, -1) : dbFecha;
        return { fechaVisual, horaIni: h, cantidad: ids.size, total: m.length };
      });
      rawSlots.sort((a, b) => {
        const aFull = a.cantidad === a.total ? 1 : 0;
        const bFull = b.cantidad === b.total ? 1 : 0;
        if (bFull !== aFull) return bFull - aFull;
        return b.cantidad - a.cantidad || a.fechaVisual.localeCompare(b.fechaVisual);
      });
      setSlots(rawSlots);
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

  const fmtFecha = (fecha) => {
    const d = new Date(fecha + "T12:00:00");
    return d.toLocaleDateString("es-AR", { weekday: "short", day: "numeric", month: "short" });
  };

  const fmt = (fecha, hora) => {
    const d = new Date(`${fecha}T${hora}`);
    return d.toLocaleDateString("es-AR", { weekday: "short", day: "numeric", month: "short" }) + " · " + d.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" });
  };

  const fmtFechaVisual = (fechaVisual) => {
    const d = new Date(fechaVisual + "T12:00:00");
    return d.toLocaleDateString("es-AR", { weekday: "short", day: "numeric", month: "short" });
  };

  const fmtSlot = (fechaVisual, horaIni) => {
    const h = String(horaIni).padStart(2, "0");
    return `${fmtFechaVisual(fechaVisual)} · ${h}:00`;
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

  const borrarDisponibilidad = async () => {
    const miMiembro = miembros.find(m => m.nombre === miNombre);
    if (!miMiembro) return;
    await supabase.from("disponibilidades").delete().eq("miembro_id", miMiembro.id);
    await cargar();
  };

  const salirDelGrupo = async () => {
    const miMiembro = miembros.find(m => m.nombre === miNombre);
    if (!miMiembro) return;
    await supabase.from("disponibilidades").delete().eq("miembro_id", miMiembro.id);
    await supabase.from("miembros").delete().eq("id", miMiembro.id);
    const { data: restantes } = await supabase.from("miembros").select("id").eq("grupo_id", id);
    if (!restantes || restantes.length === 0) {
      await supabase.from("grupos").delete().eq("id", id);
    }
    router.push("/dashboard");
  };

  const proponerHorario = async (fechaVisual, horaStr) => {
    // Convertir fechaVisual + horaStr a fecha DB (madrugada 0-6 se guarda en día siguiente)
    const h = parseInt(horaStr.split(":")[0]);
    const esMadrugada = h <= 6;
    const dbFecha = esMadrugada ? addDiasStr(fechaVisual, 1) : fechaVisual;
    const horaLimpia = horaStr.substring(0, 8);
    if (propuestas.find(p => p.fecha === dbFecha && p.hora === horaLimpia)) return alert("Ya fue propuesto.");
    await supabase.from("propuestas").insert({ grupo_id: id, fecha: dbFecha, hora: horaLimpia, propuesto_por: miNombre, votos: [miNombre] });
    await supabase.from("notificaciones").insert({ grupo_id: id, texto: `${miNombre} propuso un horario` });
    await cargar();
  };

  const votar = async (propuestaId, votosActuales) => {
    if (votosActuales.includes(miNombre)) return alert("Ya votaste este horario");
    await supabase.from("propuestas").update({ votos: [...votosActuales, miNombre] }).eq("id", propuestaId);
    await supabase.from("notificaciones").insert({ grupo_id: id, texto: `${miNombre} voto un horario` });
    await cargar();
  };

  const todosVotaron = () => {
    if (propuestas.length === 0) return false;
    const votosUnificados = new Set(propuestas.flatMap(p => p.votos));
    return miembros.every(m => votosUnificados.has(m.nombre));
  };

  const miembrosQueNoVotaron = () => {
    if (propuestas.length === 0) return miembros.map(m => m.nombre);
    const votosUnificados = new Set(propuestas.flatMap(p => p.votos));
    return miembros.filter(m => !votosUnificados.has(m.nombre)).map(m => m.nombre);
  };

  const abrirConfirmarPlan = (propuesta) => {
    setPropuestaAConfirmar(propuesta);
    setUbicacionDraft("");
  };

  const confirmarPlan = async () => {
    if (!propuestaAConfirmar) return;
    const { fecha, hora } = propuestaAConfirmar;
    await supabase.from("grupos").update({
      plan_fecha: fecha,
      plan_hora: hora,
      plan_confirmado_por: miNombre,
      plan_ubicacion: ubicacionDraft.trim() || null,
    }).eq("id", id);
    await supabase.from("juntadas").insert({ grupo_id: id, nombre: `Juntada ${juntadas.length + 1}`, fecha, hora });
    const textoNotif = ubicacionDraft.trim()
      ? `${miNombre} confirmo el plan para ${fmt(fecha, hora)} en ${ubicacionDraft.trim()}`
      : `${miNombre} confirmo el plan para ${fmt(fecha, hora)}`;
    await supabase.from("notificaciones").insert({ grupo_id: id, texto: textoNotif });
    setPropuestaAConfirmar(null);
    await cargar();
  };

  const cancelarPlan = async () => {
    await supabase.from("grupos").update({ plan_fecha: null, plan_hora: null, plan_confirmado_por: null, plan_ubicacion: null }).eq("id", id);
    await cargar();
  };

  const guardarDescripcion = async () => {
    await supabase.from("grupos").update({ descripcion: descDraft.trim() || null }).eq("id", id);
    setEditandoDesc(false);
    await cargar();
  };

  const nivel = getNivel(juntadas.length);
  const siguiente = getSiguiente(juntadas.length);
  const progreso = siguiente ? ((juntadas.length - nivel.min) / (siguiente.min - nivel.min)) * 100 : 100;
  const puedeConfirmar = todosVotaron();
  const faltanVotar = miembrosQueNoVotaron();

  const tabs = [
    { id: "horarios", label: "Horarios" },
    { id: "propuestas", label: `Propuestas${propuestas.length > 0 ? ` (${propuestas.length})` : ""}` },
    { id: "actividad", label: "Actividad" },
    { id: "historial", label: "Historial" },
  ];

  return (
    <div style={{ maxWidth: "480px", margin: "0 auto", padding: "24px 20px" }}>

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

      {/* Modal confirmar plan con ubicacion */}
      {propuestaAConfirmar && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, padding: "24px" }}>
          <div className="fade-in" style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "20px", padding: "28px", maxWidth: "360px", width: "100%" }}>
            <p style={{ fontSize: "20px", marginBottom: "12px" }}>🎉</p>
            <h2 style={{ fontFamily: "Syne, sans-serif", fontSize: "18px", fontWeight: 800, color: "var(--text)", marginBottom: "4px" }}>Confirmar plan</h2>
            <p style={{ fontSize: "13px", color: "var(--text-muted)", marginBottom: "20px" }}>{fmt(propuestaAConfirmar.fecha, propuestaAConfirmar.hora)}</p>
            <div style={{ marginBottom: "20px" }}>
              <label style={{ fontSize: "11px", fontWeight: 700, color: "var(--text-muted)", letterSpacing: "0.06em", textTransform: "uppercase", display: "block", marginBottom: "8px" }}>
                Ubicación (opcional)
              </label>
              <input
                type="text"
                placeholder="Ej: Casa de Juan, Parque Centenario..."
                value={ubicacionDraft}
                onChange={e => setUbicacionDraft(e.target.value)}
                onKeyDown={e => e.key === "Enter" && confirmarPlan()}
                autoFocus
                style={{ width: "100%", padding: "12px 16px", background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: "12px", color: "var(--text)", fontSize: "14px" }}
              />
            </div>
            <div style={{ display: "flex", gap: "10px" }}>
              <button onClick={() => setPropuestaAConfirmar(null)} style={{ flex: 1, padding: "12px", background: "var(--surface-2)", border: "1px solid var(--border)", color: "var(--text)", borderRadius: "12px", fontFamily: "Syne, sans-serif", fontSize: "14px", fontWeight: 600, cursor: "pointer" }}>Cancelar</button>
              <button onClick={confirmarPlan} style={{ flex: 1, padding: "12px", background: "var(--accent)", color: "#0C0C0F", border: "none", borderRadius: "12px", fontFamily: "Syne, sans-serif", fontSize: "14px", fontWeight: 700, cursor: "pointer" }}>Confirmar 🎉</button>
            </div>
          </div>
        </div>
      )}

      {/* Top nav */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
        <button onClick={() => router.push("/dashboard")} style={{ background: "none", border: "none", color: "var(--text-muted)", fontSize: "13px", cursor: "pointer", padding: 0 }}>
          ← Dashboard
        </button>
        <button onClick={copiarLink} style={{ fontSize: "12px", background: linkCopiado ? "rgba(52,211,153,0.08)" : "var(--surface)", border: `1px solid ${linkCopiado ? "rgba(52,211,153,0.2)" : "var(--border)"}`, color: linkCopiado ? "var(--accent)" : "var(--text-muted)", padding: "6px 14px", borderRadius: "8px", cursor: "pointer", transition: "all 0.2s", fontWeight: 600 }}>
          {linkCopiado ? "✓ Copiado" : "Copiar link"}
        </button>
      </div>

      {/* Plan confirmado */}
      {grupo.plan_fecha && (
        <div className="fade-up s0" style={{ background: "rgba(52,211,153,0.08)", border: "1px solid rgba(52,211,153,0.2)", borderRadius: "16px", padding: "18px 20px", marginBottom: "20px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <p style={{ fontSize: "11px", fontWeight: 700, color: "#34D399", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: "4px" }}>🎉 Plan confirmado</p>
              <p style={{ fontFamily: "Syne, sans-serif", fontSize: "16px", fontWeight: 700, color: "var(--text)" }}>{fmt(grupo.plan_fecha, grupo.plan_hora)}</p>
              {grupo.plan_ubicacion && (
                <p style={{ fontSize: "13px", color: "var(--text-muted)", marginTop: "3px" }}>📍 {grupo.plan_ubicacion}</p>
              )}
              <p style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "2px" }}>por {grupo.plan_confirmado_por}</p>
            </div>
            <button onClick={cancelarPlan} style={{ fontSize: "11px", background: "none", border: "1px solid var(--border)", color: "var(--text-muted)", padding: "6px 12px", borderRadius: "8px", cursor: "pointer", whiteSpace: "nowrap", marginLeft: "12px" }}>Cancelar</button>
          </div>
        </div>
      )}

      {/* Header con descripcion */}
      <div className="fade-up s0" style={{ marginBottom: "20px" }}>
        <h1 style={{ fontFamily: "Syne, sans-serif", fontSize: "26px", fontWeight: 800, color: "var(--text)", marginBottom: "4px" }}>{grupo.nombre}</h1>
        <p style={{ fontSize: "13px", color: "var(--text-muted)", marginBottom: "10px" }}>Codigo: <span style={{ color: "var(--accent)", fontWeight: 700, letterSpacing: "0.1em" }}>{grupo.codigo}</span></p>
        {editandoDesc ? (
          <div style={{ display: "flex", gap: "8px", alignItems: "flex-start" }}>
            <textarea
              value={descDraft}
              onChange={e => setDescDraft(e.target.value)}
              placeholder="Descripcion del grupo..."
              autoFocus
              rows={2}
              style={{ flex: 1, padding: "10px 14px", background: "var(--surface-2)", border: "1px solid rgba(52,211,153,0.3)", borderRadius: "10px", color: "var(--text)", fontSize: "13px", resize: "none", outline: "none", lineHeight: 1.5 }}
            />
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              <button onClick={guardarDescripcion} style={{ padding: "8px 12px", background: "var(--accent)", color: "#0C0C0F", border: "none", borderRadius: "8px", fontSize: "12px", fontWeight: 700, cursor: "pointer" }}>✓</button>
              <button onClick={() => setEditandoDesc(false)} style={{ padding: "8px 12px", background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text-muted)", borderRadius: "8px", fontSize: "12px", cursor: "pointer" }}>✕</button>
            </div>
          </div>
        ) : (
          <div
            onClick={() => { setDescDraft(grupo.descripcion || ""); setEditandoDesc(true); }}
            style={{ cursor: "pointer", padding: "8px 12px", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "10px", display: "inline-flex", alignItems: "center", gap: "8px" }}
            onMouseEnter={e => e.currentTarget.style.borderColor = "rgba(255,255,255,0.15)"}
            onMouseLeave={e => e.currentTarget.style.borderColor = "var(--border)"}
          >
            <span style={{ fontSize: "13px", color: "var(--text-muted)", fontStyle: grupo.descripcion ? "normal" : "italic" }}>
              {grupo.descripcion || "Agregar descripcion..."}
            </span>
            <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>✎</span>
          </div>
        )}
      </div>

      {/* Miembros */}
      <div className="fade-up s1" style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "16px", padding: "16px 20px", marginBottom: "16px" }}>
        <p style={{ fontSize: "11px", fontWeight: 700, color: "var(--text-muted)", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: "12px" }}>
          Miembros · {miembrosConDisp.size}/{miembros.length} listos
        </p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
          {miembros.map(m => (
            <div key={m.id} style={{ display: "flex", alignItems: "center", gap: "6px", padding: "6px 12px", background: "var(--surface-2)", borderRadius: "20px", border: `1px solid ${miembrosConDisp.has(m.id) ? "rgba(52,211,153,0.2)" : "var(--border)"}` }}>
              <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: miembrosConDisp.has(m.id) ? "#34D399" : "#71717A" }} />
              <span style={{ fontSize: "13px", color: "var(--text)", fontWeight: m.nombre === miNombre ? 600 : 400 }}>{m.nombre}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div className="fade-up s2" style={{ display: "flex", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "12px", padding: "4px", gap: "2px", marginBottom: "16px" }}>
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
          slots.length === 0 ? (
            <p style={{ fontSize: "13px", color: "var(--text-muted)", textAlign: "center", padding: "16px 0" }}>Todavia nadie cargo disponibilidad.</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {slots.slice(0, 16).map(({ fechaVisual, horaIni, cantidad, total }, idx) => {
                const c = slotColor(cantidad, total);
                return (
                  <div key={idx} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 14px", background: c.bg, border: `1px solid ${c.border}`, borderRadius: "10px" }}>
                    <span style={{ fontSize: "13px", color: "var(--text)", fontWeight: 500 }}>
                      {fmtSlot(fechaVisual, horaIni)}
                    </span>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      <span style={{ fontSize: "12px", fontWeight: 700, color: c.text }}>{cantidad}/{total}</span>
                      <button onClick={() => proponerHorario(fechaVisual, String(horaIni).padStart(2,"0") + ":00:00")} style={{ fontSize: "11px", background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text-muted)", padding: "4px 10px", borderRadius: "6px", cursor: "pointer", fontWeight: 600 }}>Proponer</button>
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
              {!puedeConfirmar && (
                <div style={{ background: "rgba(251,191,36,0.07)", border: "1px solid rgba(251,191,36,0.2)", borderRadius: "10px", padding: "10px 14px", marginBottom: "4px" }}>
                  <p style={{ fontSize: "12px", color: "#FBBF24", fontWeight: 600, marginBottom: "3px" }}>⏳ Esperando que todos voten</p>
                  <p style={{ fontSize: "11px", color: "var(--text-muted)" }}>Faltan: {faltanVotar.join(", ")}</p>
                </div>
              )}
              {propuestas.map(p => (
                <div key={p.id} style={{ background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: "12px", padding: "14px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "10px" }}>
                    <div>
                      <p style={{ fontSize: "14px", fontWeight: 600, color: "var(--text)", marginBottom: "2px" }}>{fmt(p.fecha, p.hora)}</p>
                      <p style={{ fontSize: "11px", color: "var(--text-muted)" }}>por {p.propuesto_por}</p>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <span style={{ fontSize: "13px", fontWeight: 700, color: "var(--accent)" }}>{p.votos.length}/{miembros.length}</span>
                      <button onClick={() => votar(p.id, p.votos)} style={{ fontSize: "12px", padding: "5px 12px", borderRadius: "8px", border: "none", cursor: "pointer", fontWeight: 600, background: p.votos.includes(miNombre) ? "var(--surface)" : "var(--accent)", color: p.votos.includes(miNombre) ? "var(--text-muted)" : "#0C0C0F" }}>
                        {p.votos.includes(miNombre) ? "✓" : "Votar"}
                      </button>
                    </div>
                  </div>
                  <button
                    onClick={() => puedeConfirmar && abrirConfirmarPlan(p)}
                    disabled={!puedeConfirmar}
                    style={{ width: "100%", padding: "10px", background: puedeConfirmar ? "rgba(52,211,153,0.08)" : "var(--surface)", border: `1px solid ${puedeConfirmar ? "rgba(52,211,153,0.2)" : "var(--border)"}`, color: puedeConfirmar ? "#34D399" : "var(--text-muted)", borderRadius: "10px", fontSize: "13px", fontWeight: 700, cursor: puedeConfirmar ? "pointer" : "not-allowed", fontFamily: "Syne, sans-serif", opacity: puedeConfirmar ? 1 : 0.5 }}>
                    {puedeConfirmar ? "🎉 Confirmar este plan" : "🔒 Todos deben votar primero"}
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
      <div className="fade-up s3" style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
        <button onClick={() => router.push(`/actividades/${id}?miembro=${miNombre}`)} style={{ width: "100%", padding: "14px", background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text)", borderRadius: "12px", fontFamily: "Syne, sans-serif", fontSize: "14px", fontWeight: 700, cursor: "pointer" }} onMouseEnter={e => e.currentTarget.style.borderColor = "rgba(255,255,255,0.15)"} onMouseLeave={e => e.currentTarget.style.borderColor = "var(--border)"}>
          🎯 Que hacemos?
        </button>
        <button onClick={() => router.push(`/disponibilidad/${id}?miembro=${miNombre}`)} style={{ width: "100%", padding: "14px", background: "var(--accent)", color: "#0C0C0F", border: "none", borderRadius: "12px", fontFamily: "Syne, sans-serif", fontSize: "14px", fontWeight: 700, cursor: "pointer" }}>
          {miDisponibilidad.length > 0 ? "Editar disponibilidad" : "Agregar disponibilidad"}
        </button>
        {miDisponibilidad.length > 0 && (
          <button onClick={borrarDisponibilidad} style={{ width: "100%", padding: "12px", background: "rgba(248,113,113,0.06)", border: "1px solid rgba(248,113,113,0.2)", color: "#F87171", borderRadius: "12px", fontFamily: "Syne, sans-serif", fontSize: "14px", fontWeight: 600, cursor: "pointer" }}>
            Borrar mi disponibilidad
          </button>
        )}
        <button onClick={() => setConfirmarSalir(true)} style={{ width: "100%", padding: "12px", background: "none", border: "1px solid var(--border)", color: "var(--text-muted)", borderRadius: "12px", fontFamily: "Syne, sans-serif", fontSize: "13px", fontWeight: 600, cursor: "pointer", transition: "all 0.2s" }} onMouseEnter={e => { e.currentTarget.style.borderColor = "rgba(248,113,113,0.3)"; e.currentTarget.style.color = "#F87171"; }} onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.color = "var(--text-muted)"; }}>
          Salir del grupo
        </button>
      </div>

      {/* Nivel — compacto al fondo */}
      <div style={{ marginTop: "28px", paddingTop: "20px", borderTop: "1px solid var(--border)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ fontSize: "18px" }}>{nivel.emoji}</span>
            <span style={{ fontFamily: "Syne, sans-serif", fontSize: "13px", fontWeight: 700, color: "var(--text-muted)" }}>{nivel.nombre}</span>
            <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>· {juntadas.length} juntadas</span>
          </div>
          {siguiente && (
            <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>{siguiente.min - juntadas.length} para {siguiente.emoji}</span>
          )}
        </div>
        <div style={{ height: "3px", background: "var(--surface-2)", borderRadius: "4px", overflow: "hidden" }}>
          <div style={{ height: "100%", width: `${progreso}%`, background: "var(--accent)", borderRadius: "4px", transition: "width 0.6s ease" }} />
        </div>
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