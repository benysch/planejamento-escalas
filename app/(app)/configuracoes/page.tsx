import { getSupabase } from "@/lib/supabase/server";
import type { Pessoa, TipoEvento } from "@/lib/types";
import { ConfiguracoesCliente } from "./configuracoes-cliente";

async function getData() {
  const sb = getSupabase();
  const [{ data: pessoas }, { data: tipos }] = await Promise.all([
    sb.from("pe_pessoas").select("*").order("tipo").order("nome"),
    sb.from("pe_evento_tipos").select("*").order("ordem"),
  ]);
  return {
    pessoas: (pessoas ?? []) as Pessoa[],
    tipos: (tipos ?? []) as TipoEvento[],
  };
}

export default async function ConfiguracoesPage() {
  const { pessoas, tipos } = await getData();
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Configurações</h1>
        <p className="text-muted-foreground text-sm">
          Gerencie família, funcionários e categorias de evento.
        </p>
      </div>
      <ConfiguracoesCliente pessoas={pessoas} tipos={tipos} />
    </div>
  );
}
