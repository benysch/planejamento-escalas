const TZ = "America/Sao_Paulo";

/**
 * Data de hoje (YYYY-MM-DD) no fuso da família. O servidor da Vercel roda em
 * UTC — sem isso, entre 21h e meia-noite o "hoje" do dashboard vira amanhã.
 */
export function hojeSaoPaulo(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(new Date());
}

/** Soma dias a uma data ISO (YYYY-MM-DD) sem interferência de fuso. */
export function somarDias(iso: string, dias: number): string {
  const d = new Date(iso + "T12:00:00Z");
  d.setUTCDate(d.getUTCDate() + dias);
  return d.toISOString().split("T")[0];
}

/**
 * Data de hoje (YYYY-MM-DD) no fuso do APARELHO — para componentes client.
 * (toISOString() converte para UTC e erra a data à noite no Brasil.)
 */
export function hojeLocal(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
