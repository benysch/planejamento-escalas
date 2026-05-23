import { getSupabase } from "@/lib/supabase/server";
import type { Rotina } from "@/lib/types";
import { RotinasCliente } from "./rotinas-cliente";

async function getData() {
  const sb = getSupabase();
  const { data } = await sb
    .from("pe_rotinas")
    .select("*")
    .order("dia_semana")
    .order("ordem");
  return (data ?? []) as Rotina[];
}

export default async function RotinasPage() {
  const rotinas = await getData();
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Rotinas semanais</h1>
        <p className="text-muted-foreground text-sm">
          Atividades fixas de segunda a sexta — exibidas no Dashboard todo dia.
        </p>
      </div>
      <RotinasCliente rotinas={rotinas} />
    </div>
  );
}
