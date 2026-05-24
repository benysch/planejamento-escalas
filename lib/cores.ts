export const CORES_PARES = [
  { vivid: "#6366f1", pastel: "#c7d2fe" }, // índigo
  { vivid: "#3b82f6", pastel: "#bfdbfe" }, // azul
  { vivid: "#8b5cf6", pastel: "#ddd6fe" }, // violeta
  { vivid: "#ec4899", pastel: "#fbcfe8" }, // rosa
  { vivid: "#f59e0b", pastel: "#fde68a" }, // âmbar
  { vivid: "#10b981", pastel: "#a7f3d0" }, // esmeralda
  { vivid: "#14b8a6", pastel: "#99f6e4" }, // teal
  { vivid: "#f97316", pastel: "#fed7aa" }, // laranja
  { vivid: "#ef4444", pastel: "#fecaca" }, // vermelho
  { vivid: "#6b7280", pastel: "#e5e7eb" }, // cinza
] as const;

const PASTEL_SET: Set<string> = new Set(CORES_PARES.map((p) => p.pastel));

export function isCorPastel(cor: string): boolean {
  return PASTEL_SET.has(cor);
}
