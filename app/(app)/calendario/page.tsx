import { CalendarioCliente } from "./calendario-cliente";
import { getSupabase } from "@/lib/supabase/server";
import type { EventoComPessoas, Pessoa } from "@/lib/types";

async function getData(ano: number, mes: number) {
  const sb = getSupabase();
  const primeiroDia = `${ano}-${String(mes).padStart(2, "0")}-01`;
  const ultimoDia = new Date(ano, mes, 0);
  const ultimoDiaStr = `${ano}-${String(mes).padStart(2, "0")}-${String(ultimoDia.getDate()).padStart(2, "0")}`;

  const [{ data: eventos }, { data: pessoas }] = await Promise.all([
    sb
      .from("pe_eventos")
      .select("*, pe_evento_pessoas(pessoa_id)")
      .lte("data_inicio", ultimoDiaStr)
      .gte("data_fim", primeiroDia)
      .order("data_inicio"),
    sb.from("pe_pessoas").select("*").eq("ativo", true).order("nome"),
  ]);

  const pessoaMap = new Map<string, Pessoa>(
    (pessoas ?? []).map((p) => [p.id, p]),
  );

  const eventosEnriquecidos: EventoComPessoas[] = (eventos ?? []).map((ev) => {
    const { pe_evento_pessoas: links = [], ...resto } = ev;
    return {
      ...(resto as EventoComPessoas),
      pessoas: links
        .map((l: { pessoa_id: string }) => pessoaMap.get(l.pessoa_id))
        .filter(Boolean) as Pessoa[],
    };
  });

  return { eventos: eventosEnriquecidos, pessoas: pessoas ?? [] };
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

  const { eventos, pessoas } = await getData(ano, mes);

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
        ano={ano}
        mes={mes}
      />
    </div>
  );
}
