import { getSupabase } from "@/lib/supabase/server";
import { EVENTO_TIPO_COR, EVENTO_TIPO_LABEL } from "@/lib/types";
import type { EventoComPessoas, Pessoa } from "@/lib/types";
import { EventosCliente } from "./eventos-cliente";

async function getData() {
  const sb = getSupabase();
  const [{ data: eventos }, { data: pessoas }] = await Promise.all([
    sb
      .from("pe_eventos")
      .select("*, pe_evento_pessoas(pessoa_id)")
      .order("data_inicio", { ascending: false })
      .limit(200),
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

export default async function EventosPage() {
  const { eventos, pessoas } = await getData();

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Eventos</h1>
        <p className="text-muted-foreground text-sm">
          Todos os eventos cadastrados.
        </p>
      </div>
      <EventosCliente eventos={eventos} pessoas={pessoas} />
    </div>
  );
}
