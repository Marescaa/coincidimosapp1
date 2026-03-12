// lib/niveles.js
// Lógica compartida de niveles — antes estaba DUPLICADA en dashboard y grupo/[id]

export const NIVELES = [
  { nombre: "Recien conocidos", min: 0,  emoji: "🌱" },
  { nombre: "Amigos",           min: 3,  emoji: "🤝" },
  { nombre: "Banda",            min: 8,  emoji: "⚡" },
  { nombre: "Inseparables",     min: 15, emoji: "🔥" },
  { nombre: "Leyenda",          min: 30, emoji: "👑" },
];

export function getNivel(juntadas) {
  for (let i = NIVELES.length - 1; i >= 0; i--) {
    if (juntadas >= NIVELES[i].min) return NIVELES[i];
  }
  return NIVELES[0];
}

export function getSiguiente(juntadas) {
  for (let i = 0; i < NIVELES.length; i++) {
    if (juntadas < NIVELES[i].min) return NIVELES[i];
  }
  return null;
}

export function getProgreso(juntadas) {
  const actual = getNivel(juntadas);
  const siguiente = getSiguiente(juntadas);
  if (!siguiente) return 100;
  return ((juntadas - actual.min) / (siguiente.min - actual.min)) * 100;
}
