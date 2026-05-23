import { CalendarioCliente } from "./calendario-cliente";
import { getSupabase } from "@/lib/supabase/server";
import type { EventoComPessoas, Pessoa, TipoEvento } from "@/lib/types";

function ajustarAno(dateStr: string, ano: number): string {
  return `${ano}${dateStr.slice(4)}`;
}

async function getData(ano: number, mes: number) {
  const sb = getSupabase();
  const primeiroDia = `${ano}-${String(mes).padStart(2, "0")}-01`;
  const ultimoDia = new Date(ano, mes, 0);
  const ultimoDiaStr = `${ano}-${String(mes).padStart(2, "0")}-${String(ultimoDia.getDate()).padStart(2, "0")}`;

  const [{ data: eventos }, { data: recorrentes }, { data: pessoas }, { data: tipos }] =
    await Promise.all([
      sb
        .from("pe_eventos")
        .select("*, pe_evento_pessoas(pessoa_id)")
        .eq("recorrente_anual", false)
        .lte("data_inicio", ultimoDiaStr)
        .gte("data_fim", primeiroDia)
        .order("data_inicio"),
      sb
        .from("pe_eventos")
        .select("*, pe_evento_pessoas(pessoa_id)")
        .eq("recorrente_anual", true)
        .order("data_inicio"),
      sb.from("pe_pessoas").select("*").eq("ativo", true).order("nome"),
      sb.from("pe_evento_tipos").select("*").order("ordem"),
    ]);

  const pessoaMap = new Map<string, Pessoa>(
    (pessoas ?? []).map((p) => [p.id, p]),
  );

  function enrich(ev: Record<string, unknown>): EventoComPessoas {
    const { pe_evento_pessoas: links = [], ...resto } = ev as {
      pe_evento_pessoas?: { pessoa_id: string }[];
      [k: string]: unknown;
    };
    return {
      ...(resto as EventoComPessoas),
      pessoas: (links as { pessoa_id: string }[])
        .map((l) => pessoaMap.get(l.pessoa_id))
        .filter(Boolean) as Pessoa[],
    };
  }

  // Recurring events adjusted to the viewed year
  const recorrentesAjustados = (recorrentes ?? [])
    .map((ev) => ({
      ...ev,
      data_inicio: ajustarAno(ev.data_inicio, ano),
      data_fim: ajustarAno(ev.data_fim, ano),
    }))
    .filter(
      (ev) => ev.data_inicio <= ultimoDiaStr && ev.data_fim >= primeiroDia,
    );

  const eventosEnriquecidos: EventoComPessoas[] = [
    ...(eventos ?? []),
    ...recorrentesAjustados,
  ].map((ev) => enrich(ev as Record<string, unknown>));

  return { eventos: eventosEnriquecidos, pessoas: pessoas ?? [], tipos: (tipos ?? []) as TipoEvento[] };
}

export default async function CalendarioPage({
  searchParams,
}: {
  searchParams: Promise<{ ano?: string; mes?: string }>;
}) {
  const sp = await searchParams;
  const hoje = new Date();
  const ano = parseInt(sp.ano ?? String(hoje.getFullYear()));
  const mes = parseInt(sp.mes ?? String(hoje.getMonth() + 1));

  const { eventos, pessoas, tipos } = await getData(ano, mes);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Calendário</h1>
        <p className="text-muted-foreground text-sm">
          Visualize e gerencie todos os eventos.
        </p>
      </div>
      <CalendarioCliente
        eventos={eventos}
        pessoas={pessoas}
        tipos={tipos}
        ano={ano}
        mes={mes}
      />
    </div>
  );
}
