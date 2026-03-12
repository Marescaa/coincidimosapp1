"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import Loader from "@/app/components/Loader";
import Brand from "@/app/components/Brand";
import { useToast } from "@/app/components/ui/Toast";
import { getNivel, getSiguiente, getProgreso } from "@/lib/niveles";

// BUGFIX: Math.random() no es criptográficamente seguro
function generarCodigo(longitud = 6) {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // sin 0,O,I,1 (confusos)
  const bytes = crypto.getRandomValues(new Uint8Array(longitud));
  return Array.from(bytes, (b) => chars[b % chars.length]).join("");
}

export default function Dashboard() {
  const router = useRouter();
  const toast = useToast();

  const [perfil, setPerfil] = useState(null);
  const [grupos, setGrupos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [modo, setModo] = useState(null);
  const [nombreGrupo, setNombreGrupo] = useState("");
  const [codigoUnirse, setCodigoUnirse] = useState("");
  const [confirmandoSalir, setConfirmandoSalir] = useState(null);
  const [solicitudesPendientes, setSolicitudesPendientes] = useState(0);
  const [invitaciones, setInvitaciones] = useState([]);
  const [cantidadAmigos, setCantidadAmigos] = useState(0);
  const [creando, setCreando] = useState(false);

  const cargar = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      router.push("/login");
      return;
    }
    const { data: p } = await supabase
      .from("perfiles")
      .select("*")
      .eq("id", user.id)
      .single();
    setPerfil({ ...p, id: user.id });

    const { data: amistades } = await supabase
      .from("amistades")
      .select("id")
      .eq("estado", "aceptada")
      .or(`de_id.eq.${user.id},para_id.eq.${user.id}`);
    setCantidadAmigos(amistades?.length || 0);

    const { data: solicitudes } = await supabase
      .from("amistades")
      .select("id")
      .eq("para_id", user.id)
      .eq("estado", "pendiente");
    setSolicitudesPendientes(solicitudes?.length || 0);

    const { data: invs } = await supabase
      .from("invitaciones")
      .select("*")
      .eq("para_id", user.id)
      .eq("estado", "pendiente");
    if (invs?.length > 0) {
      const grupoIds = invs.map((i) => i.grupo_id);
      const deIds = invs.map((i) => i.de_id);
      const { data: gruposInv } = await supabase
        .from("grupos")
        .select("*")
        .in("id", grupoIds);
      const { data: perfilesInv } = await supabase
        .from("perfiles")
        .select("*")
        .in("id", deIds);
      setInvitaciones(
        invs.map((inv) => ({
          ...inv,
          grupo: gruposInv?.find((g) => g.id === inv.grupo_id),
          de: perfilesInv?.find((p) => p.id === inv.de_id),
        }))
      );
    } else {
      setInvitaciones([]);
    }

    const { data: miembros } = await supabase
      .from("miembros")
      .select("grupo_id")
      .eq("user_id", user.id);
    if (!miembros?.length) {
      setCargando(false);
      return;
    }
    const grupoIds = [...new Set(miembros.map((m) => m.grupo_id))];
    const { data: gruposData } = await supabase
      .from("grupos")
      .select("*")
      .in("id", grupoIds);
    const gruposConInfo = await Promise.all(
      (gruposData || []).map(async (g) => {
        const { data: juntadas } = await supabase
          .from("juntadas")
          .select("*")
          .eq("grupo_id", g.id)
          .order("fecha", { ascending: false });
        const { data: miembrosGrupo } = await supabase
          .from("miembros")
          .select("*")
          .eq("grupo_id", g.id);
        const { data: notifs } = await supabase
          .from("notificaciones")
          .select("*")
          .eq("grupo_id", g.id)
          .order("creado_en", { ascending: false })
          .limit(1);
        return {
          ...g,
          juntadas: juntadas || [],
          miembros: miembrosGrupo || [],
          ultimaNotif: notifs?.[0],
        };
      })
    );
    setGrupos(gruposConInfo);
    setCargando(false);
  };

  useEffect(() => {
    cargar();
  }, []);

  const crearGrupo = async () => {
    if (!nombreGrupo.trim() || creando) return;
    setCreando(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();

    // BUGFIX: usar crypto en lugar de Math.random()
    const codigo = generarCodigo();

    const { data: grupo, error } = await supabase
      .from("grupos")
      .insert({ nombre: nombreGrupo.trim(), codigo, creado_por: user.id })
      .select()
      .single();

    if (error) {
      toast.err("Error al crear el grupo. Intentá de nuevo.");
      setCreando(false);
      return;
    }

    await supabase
      .from("miembros")
      .insert({ grupo_id: grupo.id, nombre: perfil.nombre, user_id: user.id });
    router.push(`/grupo/${grupo.id}?miembro=${perfil.nombre}`);
  };

  const unirseGrupo = async () => {
    if (!codigoUnirse.trim()) return;
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const { data: grupo } = await supabase
      .from("grupos")
      .select("*")
      .eq("codigo", codigoUnirse.toUpperCase())
      .single();

    if (!grupo) {
      toast.err("Código inválido. Verificá que esté bien escrito.");
      return;
    }

    const { data: yaEsMiembro } = await supabase
      .from("miembros")
      .select("id")
      .eq("grupo_id", grupo.id)
      .eq("user_id", user.id)
      .maybeSingle();

    if (yaEsMiembro) {
      router.push(`/grupo/${grupo.id}?miembro=${perfil.nombre}`);
      return;
    }

    await supabase
      .from("miembros")
      .insert({ grupo_id: grupo.id, nombre: perfil.nombre, user_id: user.id });
    router.push(`/grupo/${grupo.id}?miembro=${perfil.nombre}`);
  };

  const salirDelGrupo = async (grupoId) => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    await supabase
      .from("miembros")
      .delete()
      .eq("grupo_id", grupoId)
      .eq("user_id", user.id);
    setConfirmandoSalir(null);
    await cargar();
  };

  const responderInvitacion = async (inv, aceptar) => {
    await supabase
      .from("invitaciones")
      .update({ estado: aceptar ? "aceptada" : "rechazada" })
      .eq("id", inv.id);
    if (aceptar) {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const { data: yaEsMiembro } = await supabase
        .from("miembros")
        .select("id")
        .eq("grupo_id", inv.grupo_id)
        .eq("user_id", user.id)
        .maybeSingle();
      if (!yaEsMiembro) {
        await supabase
          .from("miembros")
          .insert({
            grupo_id: inv.grupo_id,
            nombre: perfil.nombre,
            user_id: user.id,
          });
      }
      toast.ok(`¡Te uniste a ${inv.grupo?.nombre}!`);
    } else {
      toast.info("Invitación rechazada");
    }
    await cargar();
  };

  const cerrarSesion = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  const inputStyle = {
    width: "100%",
    padding: "12px 16px",
    background: "var(--surface-2)",
    border: "1px solid var(--border)",
    borderRadius: "12px",
    color: "var(--text)",
    fontSize: "14px",
  };

  const totalJuntadas = grupos.reduce((acc, g) => acc + g.juntadas.length, 0);

  if (cargando) return <Loader />;

  return (
    <main style={{ background: "var(--bg)", minHeight: "100vh" }}>
      {/* Modal confirmar salir */}
      {confirmandoSalir && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.7)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 100,
            padding: "24px",
          }}
        >
          <div
            className="fade-in"
            style={{
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: "20px",
              padding: "28px",
              maxWidth: "360px",
              width: "100%",
            }}
          >
            <p style={{ fontSize: "20px", marginBottom: "12px" }}>👋</p>
            <h2
              style={{
                fontFamily: "Syne, sans-serif",
                fontSize: "18px",
                fontWeight: 800,
                color: "var(--text)",
                marginBottom: "8px",
              }}
            >
              Salir del grupo
            </h2>
            <p
              style={{
                fontSize: "13px",
                color: "var(--text-muted)",
                marginBottom: "24px",
                lineHeight: 1.6,
              }}
            >
              Vas a salir de{" "}
              <strong style={{ color: "var(--text)" }}>
                {grupos.find((g) => g.id === confirmandoSalir)?.nombre}
              </strong>
              . Tu disponibilidad se va a borrar.
            </p>
            <div style={{ display: "flex", gap: "10px" }}>
              <button
                onClick={() => setConfirmandoSalir(null)}
                style={{
                  flex: 1,
                  padding: "12px",
                  background: "var(--surface-2)",
                  border: "1px solid var(--border)",
                  color: "var(--text)",
                  borderRadius: "12px",
                  fontFamily: "Syne, sans-serif",
                  fontSize: "14px",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Cancelar
              </button>
              <button
                onClick={() => salirDelGrupo(confirmandoSalir)}
                style={{
                  flex: 1,
                  padding: "12px",
                  background: "rgba(248,113,113,0.1)",
                  border: "1px solid rgba(248,113,113,0.2)",
                  color: "#F87171",
                  borderRadius: "12px",
                  fontFamily: "Syne, sans-serif",
                  fontSize: "14px",
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                Salir
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Top bar */}
      <div style={{ borderBottom: "1px solid var(--border)", padding: "0 24px" }}>
        <div
          style={{
            maxWidth: "560px",
            margin: "0 auto",
            height: "60px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <Brand size="md" />
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <button
              onClick={() => router.push("/amigos")}
              style={{
                position: "relative",
                fontSize: "12px",
                background: "var(--surface)",
                border: "1px solid var(--border)",
                color: "var(--text)",
                padding: "5px 14px",
                borderRadius: "8px",
                cursor: "pointer",
                fontWeight: 600,
              }}
            >
              Amigos
              {solicitudesPendientes > 0 && (
                <span
                  style={{
                    position: "absolute",
                    top: "-6px",
                    right: "-6px",
                    width: "16px",
                    height: "16px",
                    background: "#F87171",
                    borderRadius: "50%",
                    fontSize: "10px",
                    fontWeight: 700,
                    color: "#fff",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {solicitudesPendientes}
                </span>
              )}
            </button>
            <button
              onClick={cerrarSesion}
              style={{
                fontSize: "12px",
                background: "none",
                border: "1px solid var(--border)",
                color: "var(--text-muted)",
                padding: "5px 12px",
                borderRadius: "8px",
                cursor: "pointer",
              }}
            >
              Salir
            </button>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: "560px", margin: "0 auto", padding: "32px 20px" }}>
        <div className="fade-up s0" style={{ marginBottom: "28px" }}>
          <h1
            style={{
              fontFamily: "Syne, sans-serif",
              fontSize: "22px",
              fontWeight: 800,
              color: "var(--text)",
              marginBottom: "2px",
            }}
          >
            Hola, {perfil.nombre} 👋
          </h1>
          <p style={{ fontSize: "13px", color: "var(--accent)", fontWeight: 600 }}>
            @{perfil.usuario}
          </p>
        </div>

        {/* Invitaciones */}
        {invitaciones.length > 0 && (
          <div className="fade-up s0" style={{ marginBottom: "24px" }}>
            <p className="section-label">
              Invitaciones · {invitaciones.length}
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {invitaciones.map((inv) => (
                <div
                  key={inv.id}
                  style={{
                    background: "rgba(52,211,153,0.05)",
                    border: "1px solid rgba(52,211,153,0.15)",
                    borderRadius: "14px",
                    padding: "16px 18px",
                  }}
                >
                  <div style={{ marginBottom: "12px" }}>
                    <p
                      style={{
                        fontFamily: "Syne, sans-serif",
                        fontSize: "15px",
                        fontWeight: 700,
                        color: "var(--text)",
                        marginBottom: "3px",
                      }}
                    >
                      {inv.grupo?.nombre}
                    </p>
                    <p style={{ fontSize: "12px", color: "var(--text-muted)" }}>
                      Invitado por{" "}
                      <span style={{ color: "var(--accent)", fontWeight: 600 }}>
                        @{inv.de?.usuario}
                      </span>
                    </p>
                  </div>
                  <div style={{ display: "flex", gap: "8px" }}>
                    <button
                      onClick={() => responderInvitacion(inv, false)}
                      style={{
                        flex: 1,
                        padding: "9px",
                        background: "none",
                        border: "1px solid var(--border)",
                        color: "var(--text-muted)",
                        borderRadius: "10px",
                        fontFamily: "Syne, sans-serif",
                        fontSize: "13px",
                        fontWeight: 600,
                        cursor: "pointer",
                      }}
                    >
                      Rechazar
                    </button>
                    <button
                      onClick={() => responderInvitacion(inv, true)}
                      style={{
                        flex: 2,
                        padding: "9px",
                        background: "var(--accent)",
                        color: "#0C0C0F",
                        border: "none",
                        borderRadius: "10px",
                        fontFamily: "Syne, sans-serif",
                        fontSize: "13px",
                        fontWeight: 700,
                        cursor: "pointer",
                      }}
                    >
                      Unirme →
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Stats */}
        {grupos.length > 0 && (
          <div
            className="fade-up s0"
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr 1fr",
              gap: "12px",
              marginBottom: "28px",
            }}
          >
            {[
              { label: "Grupos", value: grupos.length },
              { label: "Juntadas", value: totalJuntadas },
              { label: "Amigos", value: cantidadAmigos },
            ].map((s) => (
              <div
                key={s.label}
                style={{
                  background: "var(--surface)",
                  border: "1px solid var(--border)",
                  borderRadius: "14px",
                  padding: "16px",
                  textAlign: "center",
                }}
              >
                <p
                  style={{
                    fontFamily: "Syne, sans-serif",
                    fontSize: "24px",
                    fontWeight: 800,
                    color: "var(--text)",
                    marginBottom: "2px",
                  }}
                >
                  {s.value}
                </p>
                <p
                  style={{
                    fontSize: "11px",
                    color: "var(--text-muted)",
                    fontWeight: 600,
                    letterSpacing: "0.04em",
                    textTransform: "uppercase",
                  }}
                >
                  {s.label}
                </p>
              </div>
            ))}
          </div>
        )}

        {/* Acciones */}
        <div
          className="fade-up s1"
          style={{
            display: "flex",
            gap: "10px",
            marginBottom: modo ? "0" : "28px",
          }}
        >
          <button
            onClick={() => setModo(modo === "crear" ? null : "crear")}
            style={{
              flex: 1,
              padding: "13px",
              background: "var(--accent)",
              color: "#0C0C0F",
              border: "none",
              borderRadius: "12px",
              fontFamily: "Syne, sans-serif",
              fontSize: "14px",
              fontWeight: 700,
              cursor: "pointer",
              opacity: modo === "unirse" ? 0.5 : 1,
              transition: "opacity 0.2s",
            }}
          >
            + Crear grupo
          </button>
          <button
            onClick={() => setModo(modo === "unirse" ? null : "unirse")}
            style={{
              flex: 1,
              padding: "13px",
              background: "var(--surface)",
              color: "var(--text)",
              border: "1px solid var(--border)",
              borderRadius: "12px",
              fontFamily: "Syne, sans-serif",
              fontSize: "14px",
              fontWeight: 700,
              cursor: "pointer",
              opacity: modo === "crear" ? 0.5 : 1,
              transition: "opacity 0.2s",
            }}
          >
            Unirme con codigo
          </button>
        </div>

        {modo && (
          <div
            className="fade-in"
            style={{
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: "16px",
              padding: "20px",
              margin: "12px 0 24px",
            }}
          >
            <p className="section-label">
              {modo === "crear" ? "Nombre del grupo" : "Codigo de invitacion"}
            </p>
            <div style={{ display: "flex", gap: "10px" }}>
              <input
                type="text"
                placeholder={
                  modo === "crear" ? "Ej: Los pibes" : "Ej: A1B2C3"
                }
                value={modo === "crear" ? nombreGrupo : codigoUnirse}
                onChange={(e) =>
                  modo === "crear"
                    ? setNombreGrupo(e.target.value)
                    : setCodigoUnirse(e.target.value)
                }
                onKeyDown={(e) =>
                  e.key === "Enter" &&
                  (modo === "crear" ? crearGrupo() : unirseGrupo())
                }
                style={inputStyle}
                autoFocus
              />
              <button
                onClick={modo === "crear" ? crearGrupo : unirseGrupo}
                disabled={creando}
                style={{
                  padding: "12px 20px",
                  background: "var(--accent)",
                  color: "#0C0C0F",
                  border: "none",
                  borderRadius: "12px",
                  fontFamily: "Syne, sans-serif",
                  fontWeight: 700,
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                  opacity: creando ? 0.6 : 1,
                }}
              >
                {modo === "crear" ? "Crear →" : "Entrar →"}
              </button>
            </div>
          </div>
        )}

        <p className="section-label">
          Tus grupos {grupos.length > 0 && `· ${grupos.length}`}
        </p>

        {grupos.length === 0 ? (
          <div className="fade-up s2 empty-state">
            <p className="empty-state-emoji">👥</p>
            <p className="empty-state-title">Sin grupos todavia</p>
            <p style={{ fontSize: "13px", lineHeight: 1.6 }}>
              Crea uno o unite con un codigo
              <br />
              para empezar a coordinar.
            </p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {grupos.map((g, i) => {
              // BUGFIX: importado desde lib/niveles, ya no duplicado
              const nivel = getNivel(g.juntadas.length);
              const siguiente = getSiguiente(g.juntadas.length);
              const progreso = getProgreso(g.juntadas.length);

              return (
                <div
                  key={g.id}
                  className={`fade-up s${Math.min(i + 2, 5)}`}
                  style={{
                    background: "var(--surface)",
                    border: "1px solid var(--border)",
                    borderRadius: "16px",
                    padding: "20px",
                    transition: "border-color 0.2s, transform 0.2s",
                    cursor: "pointer",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor =
                      "rgba(255,255,255,0.12)";
                    e.currentTarget.style.transform = "translateY(-1px)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = "var(--border)";
                    e.currentTarget.style.transform = "translateY(0)";
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                      marginBottom: "14px",
                    }}
                  >
                    <div
                      onClick={() =>
                        router.push(
                          `/grupo/${g.id}?miembro=${perfil.nombre}`
                        )
                      }
                      style={{ flex: 1 }}
                    >
                      <h2
                        style={{
                          fontFamily: "Syne, sans-serif",
                          fontSize: "16px",
                          fontWeight: 700,
                          color: "var(--text)",
                          marginBottom: "4px",
                        }}
                      >
                        {g.nombre}
                      </h2>
                      <p style={{ fontSize: "12px", color: "var(--text-muted)" }}>
                        {g.miembros.length} miembros ·{" "}
                        <span
                          style={{
                            color: "var(--accent)",
                            fontWeight: 700,
                            letterSpacing: "0.06em",
                          }}
                        >
                          {g.codigo}
                        </span>
                      </p>
                    </div>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                      }}
                    >
                      <span style={{ fontSize: "24px" }}>{nivel.emoji}</span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setConfirmandoSalir(g.id);
                        }}
                        style={{
                          fontSize: "11px",
                          background: "none",
                          border: "1px solid var(--border)",
                          color: "var(--text-muted)",
                          padding: "5px 10px",
                          borderRadius: "8px",
                          cursor: "pointer",
                          transition: "all 0.2s",
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.borderColor =
                            "rgba(248,113,113,0.3)";
                          e.currentTarget.style.color = "#F87171";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.borderColor = "var(--border)";
                          e.currentTarget.style.color = "var(--text-muted)";
                        }}
                      >
                        Salir
                      </button>
                    </div>
                  </div>

                  <div
                    onClick={() =>
                      router.push(`/grupo/${g.id}?miembro=${perfil.nombre}`)
                    }
                    style={{ marginBottom: g.ultimaNotif ? "12px" : "0" }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        marginBottom: "6px",
                      }}
                    >
                      <span
                        style={{
                          fontSize: "12px",
                          fontWeight: 600,
                          color: "var(--accent)",
                        }}
                      >
                        {nivel.nombre}
                      </span>
                      <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>
                        {g.juntadas.length} juntadas
                        {siguiente
                          ? ` · faltan ${siguiente.min - g.juntadas.length}`
                          : ""}
                      </span>
                    </div>
                    <div className="progress-track">
                      <div
                        className="progress-fill"
                        style={{ width: `${progreso}%` }}
                      />
                    </div>
                  </div>

                  {g.ultimaNotif && (
                    <p
                      onClick={() =>
                        router.push(`/grupo/${g.id}?miembro=${perfil.nombre}`)
                      }
                      style={{
                        fontSize: "11px",
                        color: "var(--text-muted)",
                        marginTop: "10px",
                        paddingTop: "10px",
                        borderTop: "1px solid var(--border)",
                      }}
                    >
                      💬 {g.ultimaNotif.texto}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
