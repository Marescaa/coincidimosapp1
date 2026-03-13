"use client";
import { useEffect, useState } from "react";

export default function OfflineBanner() {
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    const handleOffline = () => setOffline(true);
    const handleOnline = () => setOffline(false);
    window.addEventListener("offline", handleOffline);
    window.addEventListener("online", handleOnline);
    // Chequear estado inicial
    setOffline(!navigator.onLine);
    return () => {
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("online", handleOnline);
    };
  }, []);

  if (!offline) return null;

  return (
    <div style={{
      position: "fixed",
      top: 0,
      left: 0,
      right: 0,
      zIndex: 999,
      background: "rgba(248,113,113,0.95)",
      backdropFilter: "blur(8px)",
      padding: "12px 20px",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      gap: "8px",
    }}>
      <span style={{ fontSize: "16px" }}>📡</span>
      <p style={{
        fontSize: "13px",
        fontWeight: 600,
        color: "#fff",
        fontFamily: "Syne, sans-serif",
      }}>
        Sin conexión — revisá tu internet
      </p>
    </div>
  );
}
