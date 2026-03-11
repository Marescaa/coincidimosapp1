"use client";
import { useState, useEffect, Suspense } from "react";
import { supabase } from "@/lib/supabase";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import Loader from "@/app/components/Loader";

// Horas de 7am a 6am (madrugada)
const HORAS = [7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,0,1,2,3,4,5,6];

const DIAS = Array.from({ length: 7 }, (_, i) => {
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
  if (formatFecha(date) === formatFecha(hoy)) return "Hoy";
  if (formatFecha(date) === formatFecha(manana)) return "Mañ";
  return date.toLocaleDateString("es-AR", { weekday: "short", day: "numeric" });
}

function esHoy(date) {
  return formatFecha(date) === formatFecha(new Date());
}

// Convierte (fecha visual del día, hora) → (fecha DB, hora string)
// Las horas 0-6 se guardan en el día siguiente
function toDb(fechaVisual, hora) {
  const esMadrugada = hora <= 6;
  const dbFecha = esMadrugada ? addDias(fechaVisual, 1) : fechaVisual;
  return { dbFecha, dbHora: `${String(hora).padStart(2, "0")}:00` };
}

// Convierte (dbFecha, horaStr) → (fechaVisual, hora)
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

  const [seleccion, setSeleccion] = useState({});
  const [cargando, setCargando] = useState(false);
  const [cargandoDatos, setCargandoDatos] = useState(true);
  const [arrastrando, setArrastrando] = useState(false);
  const [modoArrastre, setModoArrastre] = useState(null);
  const [dispOtros, setDispOtros] = useState({});

  useEffect(() => {
    const cargarDatos = async () => {
      const [
        { data: miembro },
        { data: dispTodos },
      ] = await Promise.all([
        supabase.from("miembros").select("*").eq("grupo_id", id).eq("nombre", miNombre).limit(1).maybeSingle(),
        supabase.from("disponibilidades").select("*").eq("grupo_id", id),
      ]);

      if (dispTodos) {
        const sel = {};
        const mapa = {};

        dispTodos.forEach(({ miembro_id, fecha, hora_inicio }) => {
          const { fechaVisual, hora } = fromDb(fecha, hora_inicio);
          const key = `${fechaVisual}-${hora}`;

          if (miembro && miembro_id === miembro.id) {
            sel[key] = true;
          } else {
            mapa[key] = (mapa[key] || 0) + 1;
          }
        });

        setSeleccion(sel);
        setDispOtros(mapa);
      }

      setCargandoDatos(false);
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
    setSeleccion(prev => ({ ...prev, [`${fecha}-${hora}`]: modoArrastre }));
  };

  const handleMouseUp = () => setArrastrando(false);

  const guardar = async () => {
    setCargando(true);
    const { data: miembro } = await supabase
      .from("miembros").select("*")
      .eq("grupo_id", id).eq("nombre", miNombre)
      .limit(1).maybeSingle();

    if (!miembro) { alert("No se encontro tu perfil"); setCargando(false); return; }

    await supabase.from("disponibilidades").delete().eq("miembro_id", miembro.id);

    const slots = Object.entries(seleccion)
      .filter(([, v]) => v)
      .map(([key]) => {
        // Key format: "YYYY-MM-DD-H" (H sin padding)
        const lastDash = key.lastIndexOf("-");
        const fechaVisual = key.substring(0, lastDash);
        const hora = parseInt(key.substring(lastDash + 1));
        const { dbFecha, dbHora } = toDb(fechaVisual, hora);
        const horaFinNum = (hora + 1) % 24;
        const { dbHora: dbHoraFin } = toDb(fechaVisual, horaFinNum);
        return {
          miembro_id: miembro.id,
          grupo_id: id,
          fecha: dbFecha,
          hora_inicio: dbHora,
          hora_fin: dbHoraFin,
        };
      });

    if (slots.length === 0) { alert("Seleccioná al menos un horario"); setCargando(false); return; }

    await supabase.from("disponibilidades").insert(slots);
    await supabase.from("notificaciones").insert({ grupo_id: id, texto: `${miNombre} cargo su disponibilidad` });
    router.push(`/grupo/${id}?miembro=${miNombre}`);
  };

  const totalSeleccionados = Object.values(seleccion).filter(Boolean).length;
  const otrosMax = Math.max(...Object.values(dispOtros), 1);

  const getCeldaStyle = (fecha, hora) => {
    const key = `${fecha}-${hora}`;
    const activo = seleccion[key];
    const cantOtros = dispOtros[key] || 0;
    const tr = "background 0.1s ease";
    if (activo && cantOtros > 0) {
      const intensidadVioleta = 0.35 + (cantOtros / otrosMax) * 0.55;
      return { borderRadius: "7px", marginBottom: 2, transition: tr, background: "rgba(167,139,250," + intensidadVioleta + ")" };
    }
    if (activo) {
      return { borderRadius: "7px", marginBottom: 2, transition: tr, background: "var(--accent)" };
    }
    if (cantOtros > 0) {
      const pct = cantOtros / otrosMax;
      return { borderRadius: "7px", marginBottom: 2, transition: tr, background: "rgba(99,179,237," + (0.08 + pct * 0.35) + ")" };
    }
    return { borderRadius: "7px", marginBottom: 2, transition: tr, background: "var(--surface-2)" };
  };

  if (cargandoDatos) return <Loader />;

  return (
    <div style={{ maxWidth: "820px", margin: "0 auto", padding: "32px 20px" }} onMouseUp={handleMouseUp}>
      <button onClick={() => router.push(`/grupo/${id}?miembro=${miNombre}`)} style={{ background: "none", border: "none", color: "var(--text-muted)", fontSize: "13px", cursor: "pointer", marginBottom: "24px", padding: 0 }}>
        ← Volver al grupo
      </button>

      <div style={{ marginBottom: "20px" }}>
        <h1 style={{ fontFamily: "Syne, sans-serif", fontSize: "24px", fontWeight: 800, color: "var(--text)", marginBottom: "12px" }}>Tu disponibilidad</h1>
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
          {[
            { color: "#34D399", bg: "#34D399", label: "Vos" },
            { color: "#63B3ED", bg: "rgba(99,179,237,0.2)", label: "Otros" },
            { color: "#A78BFA", bg: "rgba(167,139,250,0.7)", label: "Coinciden" },
          ].map(({ color, bg, label }) => (
            <div key={label} style={{ display: "flex", alignItems: "center", gap: "6px", padding: "5px 10px", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "8px" }}>
              <div style={{ width: "10px", height: "10px", borderRadius: "3px", background: bg }} />
              <span style={{ fontSize: "11px", color: "var(--text-muted)", fontWeight: 600 }}>{label}</span>
            </div>
          ))}
          <div style={{ display: "flex", alignItems: "center", padding: "5px 10px", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "8px" }}>
            <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>Arrastrá para seleccionar</span>
          </div>
        </div>
      </div>

      <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "20px", padding: "20px 16px", marginBottom: "20px", userSelect: "none" }}>
        <div style={{ overflowX: "auto" }}>
          <div style={{ display: "flex", gap: "4px", minWidth: "fit-content" }}>

            {/* Columna de horas */}
            <div style={{ display: "flex", flexDirection: "column", paddingTop: "36px", marginRight: "4px" }}>
              {HORAS.map(hora => (
                <div key={hora} style={{ height: "32px", marginBottom: "2px", display: "flex", alignItems: "center", justifyContent: "flex-end" }}>
                  <span style={{ fontSize: "12px", color: "var(--text-muted)", whiteSpace: "nowrap", lineHeight: 1 }}>{formatHora(hora)}</span>
                </div>
              ))}
            </div>

            {/* Columnas de días */}
            {DIAS.map(d => {
              const fecha = formatFecha(d);
              return (
                <div key={fecha} style={{ flex: 1, minWidth: "38px", display: "flex", flexDirection: "column" }}>
                  {/* Header día */}
                  <div style={{ height: "36px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <span style={{ fontSize: "13px", fontWeight: 700, color: esHoy(d) ? "var(--accent)" : "var(--text-muted)", letterSpacing: "0.03em", textAlign: "center", lineHeight: 1.3 }}>
                      {nombreDia(d)}
                    </span>
                  </div>
                  {/* Celdas */}
                  {HORAS.map(hora => {
                    const cStyle = getCeldaStyle(fecha, hora);
                    return (
                      <div
                        key={hora}
                        onMouseDown={() => handleMouseDown(fecha, hora)}
                        onMouseEnter={() => handleMouseEnter(fecha, hora)}
                        style={{ height: "32px", cursor: "pointer", ...cStyle }}
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
          <span style={{ color: "var(--accent)", fontWeight: 700 }}>{totalSeleccionados}</span> horarios seleccionados
        </p>
        <button onClick={guardar} disabled={cargando} style={{ padding: "13px 32px", background: "var(--accent)", color: "#0C0C0F", border: "none", borderRadius: "12px", fontFamily: "Syne, sans-serif", fontSize: "14px", fontWeight: 700, cursor: "pointer", opacity: cargando ? 0.6 : 1 }}>
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