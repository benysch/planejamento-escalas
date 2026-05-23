import { getSupabase } from "@/lib/supabase/server";
import type { Pessoa } from "@/lib/types";
import { ConfiguracoesCliente } from "./configuracoes-cliente";

async function getData() {
  const sb = getSupabase();
  const { data } = await sb
    .from("pe_pessoas")
    .select("*")
    .order("tipo")
    .order("nome");
  return { pessoas: (data ?? []) as Pessoa[] };
}

export default async function ConfiguracoesPage() {
  const { pessoas } = await getData();
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Configurações</h1>
        <p className="text-muted-foreground text-sm">
          Gerencie família e funcionários.
        </p>
      </div>
      <ConfiguracoesCliente pessoas={pessoas} />
    </div>
  );
}
