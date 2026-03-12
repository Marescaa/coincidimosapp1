"use client";
import { useState, useEffect, useRef, useCallback, Suspense } from "react";
import { supabase } from "@/lib/supabase";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import Loader from "@/app/components/Loader";
import { useToast } from "@/app/components/ui/Toast";

const HORAS = [7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 0, 1, 2, 3, 4, 5, 6];

const DIAS = Array.from({ length: 14 }, (_, i) => {
  const d = new Date();
  d.setDate(d.getDate() + i);
  return d;
});

function formatFecha(date) {
  return date.toISOString().split("T")[0];
}

function addDias(dateStr, n) {
  const d = new Date(dateStr + "T12:00:00");
  d.setDate(d.getDate() + n);
  return d.toISOString().split("T")[0];
}

function formatHora(h) {
  return `${String(h).padStart(2, "0")}:00`;
}

function nombreDia(date) {
  const hoy = new Date();
  const manana = new Date();
  manana.setDate(hoy.getDate() + 1);
  if (formatFecha(date) === formatFecha(hoy)) return { top: "Hoy", bot: "" };
  if (formatFecha(date) === formatFecha(manana)) return { top: "Mañ", bot: "" };
  const top = date.toLocaleDateString("es-AR", { weekday: "short" });
  const bot = date.getDate();
  return { top, bot };
}

function esHoy(date) {
  return formatFecha(date) === formatFecha(new Date());
}

function toDb(fechaVisual, hora) {
  const esMadrugada = hora <= 6;
  const dbFecha = esMadrugada ? addDias(fechaVisual, 1) : fechaVisual;
  return { dbFecha, dbHora: `${String(hora).padStart(2, "0")}:00` };
}

function fromDb(dbFecha, horaStr) {
  const h = parseInt(horaStr.split(":")[0]);
  const esMadrugada = h <= 6;
  const fechaVisual = esMadrugada ? addDias(dbFecha, -1) : dbFecha;
  return { fechaVisual, hora: h };
}

function DisponibilidadContenido() {
  const { id } = useParams();
  const searchParams = useSearchParams();
  const miNombre = searchParams.get("miembro");
  const router = useRouter();
  const toast = useToast();

  const [miMiembro, setMiMiembro] = useState(null);
  const [seleccion, setSeleccion] = useState({});
  const [cargando, setCargando] = useState(false);
  const [cargandoDatos, setCargandoDatos] = useState(true);
  const [arrastrando, setArrastrando] = useState(false);
  const [modoArrastre, setModoArrastre] = useState(null);
  const [dispOtros, setDispOtros] = useState({});
  const gridRef = useRef(null);

  // SEGURIDAD: Igual que en grupo/[id]/page.js — verificar identidad real
  const resolverMiMiembro = useCallback(async (miembrosData) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const porUserId = miembrosData.find((m) => m.user_id === user.id);
      if (porUserId) return porUserId;
    }
    // Invitado: buscar en sessionStorage
    const guardadoId = sessionStorage.getItem(`coincidimos_miembro_${id}`);
    if (guardadoId) {
      const porId = miembrosData.find((m) => String(m.id) === guardadoId);
      if (porId) return porId;
    }
    // Fallback por nombre (compatibilidad con sesiones existentes)
    if (miNombre) {
      const porNombre = miembrosData.find((m) => m.nombre === miNombre);
      if (porNombre) {
        sessionStorage.setItem(`coincidimos_miembro_${id}`, String(porNombre.id));
        return porNombre;
      }
    }
    return null;
  }, [id, miNombre]);

  useEffect(() => {
    const cargarDatos = async () => {
      const [{ data: miembrosData }, { data: dispTodos }] = await Promise.all([
        supabase.from("miembros").select("*").eq("grupo_id", id),
        supabase.from("disponibilidades").select("*").eq("grupo_id", id),
      ]);

      const yo = await resolverMiMiembro(miembrosData || []);
      setMiMiembro(yo);

      if (dispTodos) {
        const sel = {};
        const mapa = {};
        dispTodos.forEach(({ miembro_id, fecha, hora_inicio }) => {
          const { fechaVisual, hora } = fromDb(fecha, hora_inicio);
          const key = `${fechaVisual}-${hora}`;
          if (yo && miembro_id === yo.id) sel[key] = true;
          else mapa[key] = (mapa[key] || 0) + 1;
        });
        setSeleccion(sel);
        setDispOtros(mapa);
      }
      setCargandoDatos(false);
    };
    cargarDatos();
  }, [id, resolverMiMiembro]);

  // Touch support
  const getCeldaFromTouch = (touch) => {
    const el = document.elementFromPoint(touch.clientX, touch.clientY);
    if (!el) return null;
    const fecha = el.dataset.fecha;
    const hora = el.dataset.hora;
    if (!fecha || hora === undefined) return null;
    return { fecha, hora: parseInt(hora) };
  };

  const handleTouchStart = (fecha, hora) => {
    const key = `${fecha}-${hora}`;
    const nuevoEstado = !seleccion[key];
    setModoArrastre(nuevoEstado);
    setArrastrando(true);
    setSeleccion((prev) => ({ ...prev, [key]: nuevoEstado }));
  };

  const handleTouchMove = (e) => {
    if (!arrastrando) return;
    e.preventDefault();
    const touch = e.touches[0];
    const celda = getCeldaFromTouch(touch);
    if (!celda) return;
    setSeleccion((prev) => ({
      ...prev,
      [`${celda.fecha}-${celda.hora}`]: modoArrastre,
    }));
  };

  const handleMouseDown = (fecha, hora) => {
    const key = `${fecha}-${hora}`;
    const nuevoEstado = !seleccion[key];
    setModoArrastre(nuevoEstado);
    setArrastrando(true);
    setSeleccion((prev) => ({ ...prev, [key]: nuevoEstado }));
  };

  const handleMouseEnter = (fecha, hora) => {
    if (!arrastrando) return;
    setSeleccion((prev) => ({
      ...prev,
      [`${fecha}-${hora}`]: modoArrastre,
    }));
  };

  const handleEnd = () => setArrastrando(false);

  const guardar = async () => {
    // SEGURIDAD: usar miMiembro verificado, no el nombre del URL
    if (!miMiembro) {
      toast.err("No se pudo verificar tu identidad. Volvé al grupo e intentá de nuevo.");
      return;
    }

    const slots = Object.entries(seleccion)
      .filter(([, v]) => v)
      .map(([key]) => {
        const lastDash = key.lastIndexOf("-");
        const fechaVisual = key.substring(0, lastDash);
        const hora = parseInt(key.substring(lastDash + 1));
        const { dbFecha, dbHora } = toDb(fechaVisual, hora);
        const horaFinNum = (hora + 1) % 24;
        const { dbHora: dbHoraFin } = toDb(fechaVisual, horaFinNum);
        return {
          miembro_id: miMiembro.id,
          grupo_id: id,
          fecha: dbFecha,
          hora_inicio: dbHora,
          hora_fin: dbHoraFin,
        };
      });

    if (slots.length === 0) {
      toast.err("Seleccioná al menos un horario");
      return;
    }

    setCargando(true);
    await supabase.from("disponibilidades").delete().eq("miembro_id", miMiembro.id);
    await supabase.from("disponibilidades").insert(slots);
    await supabase.from("notificaciones").insert({
      grupo_id: id,
      texto: `${miMiembro.nombre} cargó su disponibilidad`,
    });
    toast.ok("¡Disponibilidad guardada!");
    router.push(`/grupo/${id}?miembro=${miMiembro.nombre}`);
  };

  const totalSeleccionados = Object.values(seleccion).filter(Boolean).length;
  const otrosMax = Math.max(...Object.values(dispOtros), 1);

  const getCeldaStyle = (fecha, hora) => {
    const key = `${fecha}-${hora}`;
    const activo = seleccion[key];
    const cantOtros = dispOtros[key] || 0;
    const tr = "background 0.1s ease";
    if (activo && cantOtros > 0) {
      const i = 0.35 + (cantOtros / otrosMax) * 0.55;
      return { borderRadius: "6px", marginBottom: 2, transition: tr, background: `rgba(167,139,250,${i})` };
    }
    if (activo) return { borderRadius: "6px", marginBottom: 2, transition: tr, background: "var(--accent)" };
    if (cantOtros > 0) {
      const pct = cantOtros / otrosMax;
      return { borderRadius: "6px", marginBottom: 2, transition: tr, background: `rgba(99,179,237,${0.08 + pct * 0.35})` };
    }
    return { borderRadius: "6px", marginBottom: 2, transition: tr, background: "var(--surface-2)" };
  };

  if (cargandoDatos) return <Loader />;

  const CELDA_H = 38;
  const COL_W = 48;
  const HORA_W = 44;
  const miNombreActual = miMiembro?.nombre ?? miNombre ?? "Invitado";

  return (
    <div
      style={{ maxWidth: "820px", margin: "0 auto", padding: "20px 16px" }}
      onMouseUp={handleEnd}
      onTouchEnd={handleEnd}
    >
      <button
        onClick={() => router.push(`/grupo/${id}?miembro=${miNombreActual}`)}
        style={{ background: "none", border: "none", color: "var(--text-muted)", fontSize: "13px", cursor: "pointer", marginBottom: "20px", padding: 0 }}
      >
        ← Volver al grupo
      </button>

      <h1 style={{ fontFamily: "Syne, sans-serif", fontSize: "22px", fontWeight: 800, color: "var(--text)", marginBottom: "12px" }}>
        Tu disponibilidad
      </h1>

      {/* Leyenda */}
      <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginBottom: "16px" }}>
        {[
          { bg: "#34D399", label: "Vos" },
          { bg: "rgba(99,179,237,0.35)", label: "Otros" },
          { bg: "rgba(167,139,250,0.7)", label: "Coinciden" },
        ].map(({ bg, label }) => (
          <div key={label} style={{ display: "flex", alignItems: "center", gap: "5px", padding: "4px 10px", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "8px" }}>
            <div style={{ width: "9px", height: "9px", borderRadius: "2px", background: bg }} />
            <span style={{ fontSize: "11px", color: "var(--text-muted)", fontWeight: 600 }}>{label}</span>
          </div>
        ))}
      </div>

      {/* Calendario */}
      <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "18px", padding: "14px 10px", marginBottom: "20px", userSelect: "none", touchAction: "none" }}>
        <div
          style={{ overflowX: "auto", WebkitOverflowScrolling: "touch" }}
          ref={gridRef}
          onTouchMove={handleTouchMove}
        >
          <div style={{ display: "flex", gap: "3px", minWidth: `${HORA_W + DIAS.length * (COL_W + 3)}px` }}>

            {/* Columna horas */}
            <div style={{ width: HORA_W, flexShrink: 0, display: "flex", flexDirection: "column", paddingTop: "48px" }}>
              {HORAS.map((hora) => (
                <div key={hora} style={{ height: CELDA_H, marginBottom: 2, display: "flex", alignItems: "center", justifyContent: "flex-end", paddingRight: "6px" }}>
                  <span style={{ fontSize: "11px", color: "var(--text-muted)", whiteSpace: "nowrap" }}>{formatHora(hora)}</span>
                </div>
              ))}
            </div>

            {/* Columnas días */}
            {DIAS.map((d) => {
              const fecha = formatFecha(d);
              const { top, bot } = nombreDia(d);
              const hoy = esHoy(d);
              return (
                <div key={fecha} style={{ width: COL_W, flexShrink: 0, display: "flex", flexDirection: "column" }}>
                  <div style={{ height: "48px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "1px" }}>
                    <span style={{ fontSize: "10px", fontWeight: 700, color: hoy ? "var(--accent)" : "var(--text-muted)", textTransform: "capitalize" }}>{top}</span>
                    {bot !== "" && <span style={{ fontSize: "12px", fontWeight: 800, color: hoy ? "var(--accent)" : "var(--text)" }}>{bot}</span>}
                  </div>
                  {HORAS.map((hora) => {
                    const cStyle = getCeldaStyle(fecha, hora);
                    return (
                      <div
                        key={hora}
                        data-fecha={fecha}
                        data-hora={hora}
                        onMouseDown={() => handleMouseDown(fecha, hora)}
                        onMouseEnter={() => handleMouseEnter(fecha, hora)}
                        onTouchStart={() => handleTouchStart(fecha, hora)}
                        style={{ height: CELDA_H, cursor: "pointer", ...cStyle }}
                      />
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <p style={{ fontSize: "13px", color: "var(--text-muted)" }}>
          <span style={{ color: "var(--accent)", fontWeight: 700 }}>{totalSeleccionados}</span> seleccionados
        </p>
        <button
          onClick={guardar}
          disabled={cargando}
          style={{ padding: "13px 28px", background: "var(--accent)", color: "#0C0C0F", border: "none", borderRadius: "12px", fontFamily: "Syne, sans-serif", fontSize: "14px", fontWeight: 700, cursor: "pointer", opacity: cargando ? 0.6 : 1 }}
        >
          {cargando ? "Guardando..." : "Guardar →"}
        </button>
      </div>
    </div>
  );
}

export default function Disponibilidad() {
  return (
    <main style={{ background: "var(--bg)", minHeight: "100vh" }}>
      <Suspense fallback={<Loader />}>
        <DisponibilidadContenido />
      </Suspense>
    </main>
  );
}
