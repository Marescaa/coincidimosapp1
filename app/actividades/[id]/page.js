"use client";
import { useState, useEffect, Suspense } from "react";
import { supabase } from "@/lib/supabase";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import Loader from "@/app/components/Loader";

function ActividadesContenido() {
  const { id } = useParams();
  const searchParams = useSearchParams();
  const miNombre = searchParams.get("miembro");
  const router = useRouter();
  const [actividades, setActividades] = useState([]);
  const [nueva, setNueva] = useState("");
  const [cargando, setCargando] = useState(true);
  const [totalMiembros, setTotalMiembros] = useState(0);

  const cargar = async () => {
    const { data: acts } = await supabase.from("actividades").select("*").eq("grupo_id", id).order("created_at", { ascending: false });
    const { data: miembros } = await supabase.from("miembros").select("*").eq("grupo_id", id);
    setActividades(acts || []);
    setTotalMiembros(miembros?.length || 0);
    setCargando(false);
  };

  useEffect(() => { cargar(); }, [id]);

  const proponer = async () => {
    if (!nueva.trim()) return;
    await supabase.from("actividades").insert({ grupo_id: id, nombre: nueva, propuesto_por: miNombre, votos: [miNombre] });
    await supabase.from("notificaciones").insert({ grupo_id: id, texto: `${miNombre} propuso: ${nueva}` });
    setNueva("");
    await cargar();
  };

  const votar = async (actId, votosActuales) => {
    if (votosActuales.includes(miNombre)) return;
    await supabase.from("actividades").update({ votos: [...votosActuales, miNombre] }).eq("id", actId);
    await supabase.from("notificaciones").insert({ grupo_id: id, texto: `${miNombre} voto una actividad` });
    await cargar();
  };

  if (cargando) return <Loader />;

  const sorted = [...actividades].sort((a, b) => b.votos.length - a.votos.length);
  const maxVotos = sorted[0]?.votos.length || 1;

  return (
    <div style={{ maxWidth: "480px", margin: "0 auto", padding: "32px 20px" }}>
      <button onClick={() => router.push(`/grupo/${id}?miembro=${miNombre}`)} style={{ background: "none", border: "none", color: "var(--text-muted)", fontSize: "13px", cursor: "pointer", marginBottom: "24px", padding: 0 }}>
        ← Volver al grupo
      </button>

      <h1 style={{ fontFamily: "Syne, sans-serif", fontSize: "24px", fontWeight: 800, color: "var(--text)", marginBottom: "6px" }}>
        ¿Que hacemos?
      </h1>
      <p style={{ color: "var(--text-muted)", fontSize: "13px", marginBottom: "24px" }}>
        Proponé y votá actividades para la juntada
      </p>

      {/* Input proponer */}
      <div style={{ display: "flex", gap: "10px", marginBottom: "24px" }}>
        <input
          type="text"
          placeholder="Ej: Cine, Bowling, Asado..."
          value={nueva}
          onChange={e => setNueva(e.target.value)}
          onKeyDown={e => e.key === "Enter" && proponer()}
          style={{ flex: 1, padding: "13px 16px", background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: "12px", color: "var(--text)", fontSize: "14px" }}
        />
        <button onClick={proponer} style={{ padding: "13px 20px", background: "var(--accent)", color: "#0C0C0F", border: "none", borderRadius: "12px", fontFamily: "Syne, sans-serif", fontWeight: 700, cursor: "pointer", fontSize: "14px" }}>
          + Proponer
        </button>
      </div>

      {/* Lista */}
      {sorted.length === 0 ? (
        <div style={{ textAlign: "center", padding: "48px 0", color: "var(--text-muted)" }}>
          <p style={{ fontSize: "32px", marginBottom: "12px" }}>🎯</p>
          <p style={{ fontFamily: "Syne, sans-serif", fontSize: "15px", fontWeight: 700, color: "var(--text)", marginBottom: "6px" }}>Sin propuestas todavia</p>
          <p style={{ fontSize: "13px" }}>Se el primero en proponer algo</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {sorted.map((act, i) => {
            const esGanadora = i === 0 && act.votos.length > 0;
            const yaVote = act.votos.includes(miNombre);
            const progreso = (act.votos.length / Math.max(maxVotos, 1)) * 100;

            return (
              <div key={act.id} style={{
                background: esGanadora ? "rgba(52,211,153,0.06)" : "var(--surface)",
                border: `1px solid ${esGanadora ? "rgba(52,211,153,0.2)" : "var(--border)"}`,
                borderRadius: "14px",
                padding: "16px 18px",
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    {esGanadora && <span style={{ fontSize: "16px" }}>🏆</span>}
                    <span style={{ fontFamily: "Syne, sans-serif", fontSize: "15px", fontWeight: 700, color: "var(--text)" }}>{act.nombre}</span>
                  </div>
                  <button
                    onClick={() => votar(act.id, act.votos)}
                    style={{
                      display: "flex", alignItems: "center", gap: "6px",
                      padding: "6px 14px", borderRadius: "8px", border: "none", cursor: yaVote ? "default" : "pointer",
                      background: yaVote ? "var(--surface-2)" : "var(--accent)",
                      color: yaVote ? "var(--text-muted)" : "#0C0C0F",
                      fontFamily: "Syne, sans-serif", fontSize: "13px", fontWeight: 700,
                      transition: "all 0.2s"
                    }}
                  >
                    {yaVote ? "✓" : "Votar"} <span style={{ fontSize: "12px" }}>{act.votos.length}</span>
                  </button>
                </div>

                <div style={{ height: "4px", background: "var(--surface-2)", borderRadius: "4px", overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${progreso}%`, background: esGanadora ? "var(--accent)" : "rgba(52,211,153,0.4)", borderRadius: "4px", transition: "width 0.5s ease" }} />
                </div>

                <p style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "6px" }}>
                  {act.votos.length}/{totalMiembros} votos · por {act.propuesto_por}
                </p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function Actividades() {
  return (
    <main style={{ background: "var(--bg)", minHeight: "100vh" }}>
      <Suspense fallback={<Loader />}>
        <ActividadesContenido />
      </Suspense>
    </main>
  );
}