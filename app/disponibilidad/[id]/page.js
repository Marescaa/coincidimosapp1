"use client";
import { useState, useEffect, useRef, Suspense } from "react";
import { supabase } from "@/lib/supabase";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import Loader from "@/app/components/Loader";

const HORAS = Array.from({ length: 24 }, (_, i) => i);
const DIAS = Array.from({ length: 7 }, (_, i) => {
  const d = new Date();
  d.setDate(d.getDate() + i);
  return d;
});

function formatFecha(date) { return date.toISOString().split("T")[0]; }
function nombreDia(date) {
  const hoy = new Date();
  const manana = new Date(); manana.setDate(hoy.getDate() + 1);
  if (formatFecha(date) === formatFecha(hoy)) return { top: "HOY", bottom: date.getDate() };
  if (formatFecha(date) === formatFecha(manana)) return { top: "MÑN", bottom: date.getDate() };
  return {
    top: date.toLocaleDateString("es-AR", { weekday: "short" }).toUpperCase().replace(".", ""),
    bottom: date.getDate()
  };
}
function esHoy(date) { return formatFecha(date) === formatFecha(new Date()); }

const HORA_W = 32;
const ROW_H = 40;

function DisponibilidadContenido() {
  const { id } = useParams();
  const searchParams = useSearchParams();
  const miNombre = searchParams.get("miembro");
  const router = useRouter();
  const [seleccion, setSeleccion] = useState({});
  const [cargando, setCargando] = useState(false);
  const [cargandoDatos, setCargandoDatos] = useState(true);
  const [arrastrando, setArrastrando] = useState(false);
  const [modoArrastre, setModoArrastre] = useState(null);
  const [dispOtros, setDispOtros] = useState({});
  const scrollRef = useRef(null);

  useEffect(() => {
    const cargarDatos = async () => {
      const { data: miembro } = await supabase.from("miembros").select("*").eq("grupo_id", id).eq("nombre", miNombre).limit(1).maybeSingle();
      if (miembro) {
        const { data: disp } = await supabase.from("disponibilidades").select("*").eq("miembro_id", miembro.id);
        if (disp) {
          const sel = {};
          disp.forEach(({ fecha, hora_inicio }) => { sel[`${fecha}-${parseInt(hora_inicio)}`] = true; });
          setSeleccion(sel);
        }
      }
      const { data: dispTodos } = await supabase.from("disponibilidades").select("*").eq("grupo_id", id);
      const { data: miembro2 } = await supabase.from("miembros").select("*").eq("grupo_id", id).eq("nombre", miNombre).limit(1).maybeSingle();
      const mapa = {};
      dispTodos?.forEach(({ miembro_id, fecha, hora_inicio }) => {
        if (miembro_id === miembro2?.id) return;
        const key = `${fecha}-${parseInt(hora_inicio)}`;
        if (!mapa[key]) mapa[key] = 0;
        mapa[key]++;
      });
      setDispOtros(mapa);
      setCargandoDatos(false);

      // Scroll a las 8am — cada fila es ROW_H(40) + padding(6) ≈ 46px
      setTimeout(() => {
        if (scrollRef.current) {
          scrollRef.current.scrollTop = 8 * 46;
        }
      }, 50);
    };
    cargarDatos();
  }, [id, miNombre]);

  const handleMouseDown = (fecha, hora) => {
    const key = `${fecha}-${hora}`;
    const nuevoEstado = !seleccion[key];
    setModoArrastre(nuevoEstado);
    setArrastrando(true);
    setSeleccion(prev => ({ ...prev, [key]: nuevoEstado }));
  };

  const handleMouseEnter = (fecha, hora) => {
    if (!arrastrando) return;
    const key = `${fecha}-${hora}`;
    setSeleccion(prev => ({ ...prev, [key]: modoArrastre }));
  };

  useEffect(() => {
    const up = () => setArrastrando(false);
    window.addEventListener("mouseup", up);
    return () => window.removeEventListener("mouseup", up);
  }, []);

  const guardar = async () => {
    setCargando(true);
    const { data: miembro } = await supabase.from("miembros").select("*").eq("grupo_id", id).eq("nombre", miNombre).limit(1).maybeSingle();
    await supabase.from("disponibilidades").delete().eq("miembro_id", miembro.id);
    const slots = Object.entries(seleccion).filter(([, v]) => v).map(([key]) => ({
      miembro_id: miembro.id, grupo_id: id,
      fecha: key.substring(0, 10),
      hora_inicio: `${key.substring(11)}:00`,
      hora_fin: `${parseInt(key.substring(11)) + 1}:00`,
    }));
    if (slots.length === 0) { alert("Selecciona al menos un horario"); setCargando(false); return; }
    await supabase.from("disponibilidades").insert(slots);
    await supabase.from("notificaciones").insert({ grupo_id: id, texto: `${miNombre} cargo su disponibilidad` });
    router.push(`/grupo/${id}?miembro=${miNombre}`);
  };

  const otrosMax = Math.max(...Object.values(dispOtros), 1);
  const totalSeleccionados = Object.values(seleccion).filter(Boolean).length;

  const getCeldaStyle = (fecha, hora) => {
    const key = `${fecha}-${hora}`;
    const activo = seleccion[key];
    const cantOtros = dispOtros[key] || 0;
    if (activo && cantOtros > 0) return { background: `rgba(167,139,250,${0.4 + (cantOtros / otrosMax) * 0.6})`, border: "1px solid rgba(167,139,250,0.6)" };
    if (activo) return { background: "var(--accent)", border: "1px solid transparent" };
    if (cantOtros > 0) { const i = 0.07 + (cantOtros / otrosMax) * 0.18; return { background: `rgba(99,179,237,${i})`, border: `1px solid rgba(99,179,237,${i * 2})` }; }
    return { background: "var(--surface-2)", border: "1px solid var(--border)" };
  };

  if (cargandoDatos) return <Loader />;

  return (
    <div style={{ maxWidth: "600px", margin: "0 auto", padding: "32px 20px" }}>
      <button onClick={() => router.push(`/grupo/${id}?miembro=${miNombre}`)} style={{ background: "none", border: "none", color: "var(--text-muted)", fontSize: "13px", cursor: "pointer", marginBottom: "24px", padding: 0 }}>
        ← Volver al grupo
      </button>

      <div style={{ marginBottom: "20px" }}>
        <h1 style={{ fontFamily: "Syne, sans-serif", fontSize: "24px", fontWeight: 800, color: "var(--text)", marginBottom: "12px" }}>
          Tu disponibilidad
        </h1>
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
          {[
            { color: "#34D399", bg: "#34D399", label: "Vos" },
            { color: "#63B3ED", bg: "rgba(99,179,237,0.2)", label: "Otros" },
            { color: "#A78BFA", bg: "#A78BFA", label: "Coinciden" },
          ].map(({ color, bg, label }) => (
            <div key={label} style={{ display: "flex", alignItems: "center", gap: "6px", padding: "5px 10px", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "8px" }}>
              <div style={{ width: "10px", height: "10px", borderRadius: "3px", background: bg, flexShrink: 0 }} />
              <span style={{ fontSize: "11px", color: "var(--text-muted)", fontWeight: 600 }}>{label}</span>
            </div>
          ))}
          <div style={{ display: "flex", alignItems: "center", padding: "5px 10px", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "8px" }}>
            <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>Arrastra para seleccionar</span>
          </div>
        </div>
      </div>

      {/* Calendario */}
      <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "20px", overflow: "hidden", marginBottom: "20px" }}>

        {/* Header días fijo */}
        <div style={{ display: "flex", borderBottom: "1px solid var(--border)", background: "var(--surface)" }}>
          <div style={{ width: `${HORA_W}px`, flexShrink: 0, display: "flex", alignItems: "flex-end", justifyContent: "flex-end", paddingRight: "6px", paddingBottom: "6px" }}>
            <span style={{ fontSize: "10px", fontWeight: 700, color: "var(--text-muted)", letterSpacing: "0.08em", textTransform: "uppercase", lineHeight: 1 }}>Hs</span>
          </div>
          {DIAS.map(d => {
            const { top, bottom } = nombreDia(d);
            const hoy = esHoy(d);
            return (
              <div key={formatFecha(d)} style={{ flex: 1, minWidth: 0, padding: "10px 0", textAlign: "center" }}>
                <div style={{ fontSize: "9px", fontWeight: 700, letterSpacing: "0.06em", color: hoy ? "var(--accent)" : "var(--text-muted)", marginBottom: "2px" }}>{top}</div>
                <div style={{ fontSize: "16px", fontWeight: 800, fontFamily: "Syne, sans-serif", color: hoy ? "var(--accent)" : "var(--text)", lineHeight: 1 }}>{bottom}</div>
              </div>
            );
          })}
        </div>

        {/* Grid scrolleable */}
        <div
          ref={scrollRef}
          style={{ overflowY: "auto", maxHeight: "612px", userSelect: "none" }}
          onMouseLeave={() => setArrastrando(false)}
        >
          {HORAS.map((hora, hi) => (
            <div key={hora} style={{ display: "flex", borderBottom: hi < HORAS.length - 1 ? "1px solid rgba(255,255,255,0.03)" : "none" }}>
              <div style={{ width: `${HORA_W}px`, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "flex-end", paddingRight: "6px", fontSize: "15px", color: "var(--text-muted)", fontWeight: 500, lineHeight: 1 }}>
                {hora}
              </div>
              {DIAS.map(d => {
                const fecha = formatFecha(d);
                const style = getCeldaStyle(fecha, hora);
                const activo = seleccion[`${fecha}-${hora}`];
                return (
                  <div key={`${fecha}-${hora}`} style={{ flex: 1, minWidth: 0, padding: "3px" }}>
                    <div
                      onMouseDown={() => handleMouseDown(fecha, hora)}
                      onMouseEnter={() => handleMouseEnter(fecha, hora)}
                      style={{
                        height: `${ROW_H}px`,
                        borderRadius: "7px",
                        cursor: "pointer",
                        transition: "background 0.1s, transform 0.1s",
                        transform: activo ? "scale(0.88)" : "scale(1)",
                        ...style
                      }}
                    />
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <p style={{ fontSize: "13px", color: "var(--text-muted)" }}>
          <span style={{ color: "var(--accent)", fontWeight: 700 }}>{totalSeleccionados}</span> horarios seleccionados
        </p>
        <button
          onClick={guardar}
          disabled={cargando}
          style={{ padding: "13px 32px", background: "var(--accent)", color: "#0C0C0F", border: "none", borderRadius: "12px", fontFamily: "Syne, sans-serif", fontSize: "14px", fontWeight: 700, cursor: "pointer", opacity: cargando ? 0.6 : 1, transition: "opacity 0.2s" }}
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