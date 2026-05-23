import { getSupabase } from "@/lib/supabase/server";
import { CARGO_LABEL, MESES } from "@/lib/types";
import type { EscalaMensal, Pessoa } from "@/lib/types";
import { FuncionariosCliente } from "./funcionarios-cliente";

async function getData(ano: number) {
  const sb = getSupabase();
  const [{ data: pessoas }, { data: escala }] = await Promise.all([
    sb
      .from("pe_pessoas")
      .select("*")
      .eq("tipo", "funcionario")
      .order("nome"),
    sb
      .from("pe_escala_mensal")
      .select("*")
      .eq("ano", ano)
      .order("mes"),
  ]);

  return {
    funcionarios: (pessoas ?? []) as Pessoa[],
    escala: (escala ?? []) as EscalaMensal[],
  };
}

export default async function FuncionariosPage({
  searchParams,
}: {
  searchParams: Promise<{ ano?: string }>;
}) {
  const sp = await searchParams;
  const ano = parseInt(sp.ano ?? String(new Date().getFullYear()));
  const { funcionarios, escala } = await getData(ano);

  const escalaPorFuncionario = new Map<string, Map<number, EscalaMensal>>();
  for (const e of escala) {
    if (!escalaPorFuncionario.has(e.funcionario_id))
      escalaPorFuncionario.set(e.funcionario_id, new Map());
    escalaPorFuncionario.get(e.funcionario_id)!.set(e.mes, e);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Funcionários</h1>
        <p className="text-muted-foreground text-sm">
          Escala mensal e controle de dias trabalhados.
        </p>
      </div>

      {funcionarios.length === 0 ? (
        <p className="text-muted-foreground text-sm">
          Nenhum funcionário cadastrado. Adicione em Configurações.
        </p>
      ) : (
        <FuncionariosCliente
          funcionarios={funcionarios}
          escalaPorFuncionario={Object.fromEntries(
            Array.from(escalaPorFuncionario.entries()).map(([k, v]) => [
              k,
              Object.fromEntries(v.entries()),
            ]),
          )}
          ano={ano}
          meses={MESES}
        />
      )}
    </div>
  );
}
