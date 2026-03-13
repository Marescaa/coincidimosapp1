"use client";
import { useState, useEffect, Suspense } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter, useSearchParams } from "next/navigation";
import Brand from "@/app/components/Brand";

function LoginContenido() {
  const searchParams = useSearchParams();
  const [modo, setModo] = useState(searchParams.get("modo") === "registro" ? "registro" : "login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [nombre, setNombre] = useState("");
  const [usuario, setUsuario] = useState("");
  const [cargando, setCargando] = useState(false);
  const [verificando, setVerificando] = useState(true);
  const [error, setError] = useState("");
  const router = useRouter();

  // Si ya hay sesión activa, ir directo al dashboard
  useEffect(() => {
    const verificarSesion = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error || !session) {
          await supabase.auth.signOut();
          setVerificando(false);
          return;
        }
        router.replace("/dashboard");
      } catch (e) {
        await supabase.auth.signOut();
        setVerificando(false);
      }
    };
    verificarSesion();
  }, []);

  const inputStyle = {
    width: "100%", padding: "13px 16px",
    background: "var(--surface-2)", border: "1px solid var(--border)",
    borderRadius: "12px", color: "var(--text)", fontSize: "14px",
  };
  const labelStyle = {
    fontSize: "11px", fontWeight: 700, color: "var(--text-muted)",
    letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: "8px", display: "block"
  };

  const handleSubmit = async () => {
    setError("");
    if (!email || !password) return setError("Completa todos los campos");
    if (modo === "registro" && !nombre) return setError("Ingresa tu nombre");
    if (modo === "registro" && !usuario) return setError("Ingresa un nombre de usuario");
    if (modo === "registro" && !/^[a-z0-9_]+$/.test(usuario)) return setError("El usuario solo puede tener letras minusculas, numeros y _");
    setCargando(true);

    if (modo === "registro") {
      const { data: existente } = await supabase.from("perfiles").select("id").eq("usuario", usuario).maybeSingle();
      if (existente) { setError("Ese usuario ya esta en uso"); setCargando(false); return; }
      await supabase.auth.signOut();
      const { data, error: err } = await supabase.auth.signUp({ email, password });
      if (err) { setError(err.message); setCargando(false); return; }
      if (!data.user) { setError("Revisá tu email para confirmar tu cuenta"); setCargando(false); return; }
      await supabase.from("perfiles").insert({ id: data.user.id, nombre, usuario });
      router.push("/dashboard");
    } else {
      const { error: err } = await supabase.auth.signInWithPassword({ email, password });
      if (err) { setError("Email o contrasena incorrectos"); setCargando(false); return; }
      router.push("/dashboard");
    }
  };

  if (verificando) return null;

  return (
    <div style={{ width: "100%", maxWidth: "420px", position: "relative", zIndex: 1 }}>
      <div className="fade-up s0" style={{ textAlign: "center", marginBottom: "40px" }}>
        <div style={{ display: "inline-flex", alignItems: "center", gap: "10px", marginBottom: "12px" }}>
          <Brand size="lg" />
        </div>
        <p style={{ color: "var(--text-muted)", fontSize: "14px" }}>
          {modo === "login" ? "Bienvenido de nuevo" : "Crea tu cuenta gratis"}
        </p>
      </div>

      <div className="fade-up s1" style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "20px", padding: "32px" }}>
        <div style={{ display: "flex", background: "var(--surface-2)", borderRadius: "12px", padding: "4px", marginBottom: "24px" }}>
          {["login", "registro"].map(m => (
            <button key={m} onClick={() => { setModo(m); setError(""); }}
              style={{ flex: 1, padding: "10px", borderRadius: "9px", border: "none", cursor: "pointer", fontFamily: "'Syne', sans-serif", fontSize: "13px", fontWeight: 700, transition: "all 0.2s", background: modo === m ? "var(--surface)" : "transparent", color: modo === m ? "var(--text)" : "var(--text-muted)" }}>
              {m === "login" ? "Iniciar sesion" : "Registrarse"}
            </button>
          ))}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {modo === "registro" && (
            <>
              <div>
                <label style={labelStyle}>Tu nombre</label>
                <input type="text" placeholder="Ej: Franco" value={nombre} onChange={e => setNombre(e.target.value)} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Nombre de usuario</label>
                <div style={{ position: "relative" }}>
                  <span style={{ position: "absolute", left: "16px", top: "50%", transform: "translateY(-50%)", color: "var(--accent)", fontWeight: 700, fontSize: "14px" }}>@</span>
                  <input type="text" placeholder="tuusuario" value={usuario} onChange={e => setUsuario(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))} style={{ ...inputStyle, paddingLeft: "32px" }} />
                </div>
                <p style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "6px" }}>Solo letras minusculas, numeros y _</p>
              </div>
            </>
          )}
          <div>
            <label style={labelStyle}>Email</label>
            <input type="email" placeholder="tu@email.com" value={email} onChange={e => setEmail(e.target.value)} style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Contrasena</label>
            <input type="password" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} onKeyDown={e => e.key === "Enter" && handleSubmit()} style={inputStyle} />
          </div>

          {error && <p style={{ fontSize: "13px", color: "#F87171", textAlign: "center" }}>{error}</p>}

          <button onClick={handleSubmit} disabled={cargando}
            style={{ width: "100%", padding: "14px", background: "var(--accent)", color: "#0C0C0F", border: "none", borderRadius: "12px", fontFamily: "'Syne', sans-serif", fontSize: "15px", fontWeight: 700, cursor: "pointer", opacity: cargando ? 0.6 : 1, transition: "opacity 0.2s", marginTop: "4px" }}>
            {cargando ? "Cargando..." : modo === "login" ? "Entrar →" : "Crear cuenta →"}
          </button>
        </div>
      </div>

      <button onClick={() => router.push("/")} style={{ display: "block", margin: "16px auto 0", background: "none", border: "none", color: "var(--text-muted)", fontSize: "13px", cursor: "pointer" }}>
        ← Volver al inicio
      </button>
    </div>
  );
}

export default function Login() {
  return (
    <main style={{ background: "var(--bg)", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "24px", position: "relative", overflow: "hidden" }}>
      <div style={{ position: "absolute", top: "20%", left: "50%", transform: "translateX(-50%)", width: "500px", height: "500px", background: "radial-gradient(circle, rgba(52,211,153,0.06) 0%, transparent 70%)", pointerEvents: "none" }} />
      <Suspense fallback={null}>
        <LoginContenido />
      </Suspense>
    </main>
  );
}
