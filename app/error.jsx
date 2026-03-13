"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function Error({ error, reset }) {
  const router = useRouter();

  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main style={{ background: "var(--bg)", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "24px" }}>
      <div style={{ textAlign: "center", maxWidth: "360px" }}>
        <span style={{ fontSize: "3rem" }} role="img" aria-label="Error">😵</span>

        <div>
          <h2 style={{ fontFamily: "'Syne', sans-serif", fontSize: "20px", fontWeight: 800, color: "var(--text)", marginBottom: "8px" }}>
            Algo salió mal
          </h2>
          <p style={{ color: "var(--text-muted)", fontSize: "14px", maxWidth: "300px", lineHeight: 1.6 }}>
            Ocurrió un error inesperado. Intentá de nuevo o volvé al inicio.
          </p>
        </div>

        <div style={{ display: "flex", gap: "10px", marginTop: "24px", justifyContent: "center" }}>
          <button
            onClick={reset}
            style={{ padding: "11px 20px", background: "var(--accent)", color: "#0C0C0F", border: "none", borderRadius: "12px", fontFamily: "'Syne', sans-serif", fontSize: "14px", fontWeight: 700, cursor: "pointer" }}
          >
            Reintentar
          </button>
          <button
            onClick={() => router.push("/")}
            style={{ padding: "11px 20px", background: "var(--surface)", color: "var(--text)", border: "1px solid var(--border)", borderRadius: "12px", fontFamily: "'Syne', sans-serif", fontSize: "14px", fontWeight: 600, cursor: "pointer" }}
          >
            Ir al inicio
          </button>
        </div>
      </div>
    </main>
  );
}