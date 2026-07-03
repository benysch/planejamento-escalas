import { hojeSaoPaulo } from "@/lib/datas";
import { getSupabase } from "@/lib/supabase/server";
import { MESES } from "@/lib/types";
import type { EscalaMensal, Pessoa } from "@/lib/types";
import { FuncionariosCliente } from "./funcionarios-cliente";

async function getData(ano: number, mes: number) {
  const sb = getSupabase();
  const primeiroDia = `${ano}-${String(mes).padStart(2, "0")}-01`;
  const ultimoDia = new Date(ano, mes, 0);
  const ultimoDiaStr = `${ano}-${String(mes).padStart(2, "0")}-${String(ultimoDia.getDate()).padStart(2, "0")}`;

  const [{ data: pessoas }, { data: escalasDias }, { data: escalasMensais }] =
    await Promise.all([
      sb.from("pe_pessoas").select("*").eq("tipo", "funcionario").order("nome"),
      sb
        .from("pe_escala_dias")
        .select("*")
        .gte("data", primeiroDia)
        .lte("data", ultimoDiaStr),
      sb
        .from("pe_escala_mensal")
        .select("*")
        .eq("ano", ano)
        .eq("mes", mes),
    ]);

  const diasPorFuncionario: Record<string, import("@/lib/types").EscalaDia[]> = {};
  for (const d of escalasDias ?? []) {
    if (!diasPorFuncionario[d.funcionario_id])
      diasPorFuncionario[d.funcionario_id] = [];
    diasPorFuncionario[d.funcionario_id].push(d as import("@/lib/types").EscalaDia);
  }

  const escalaMensalPorFuncionario: Record<string, EscalaMensal> = {};
  for (const e of escalasMensais ?? []) {
    escalaMensalPorFuncionario[e.funcionario_id] = e as EscalaMensal;
  }

  return { funcionarios: (pessoas ?? []) as Pessoa[], diasPorFuncionario, escalaMensalPorFuncionario };
}

export default async function FuncionariosPage({
  searchParams,
}: {
  searchParams: Promise<{ ano?: string; mes?: string }>;
}) {
  const sp = await searchParams;
  const hoje = hojeSaoPaulo();
  const ano = parseInt(sp.ano ?? hoje.slice(0, 4));
  const mes = parseInt(sp.mes ?? hoje.slice(5, 7));

  const { funcionarios, diasPorFuncionario, escalaMensalPorFuncionario } =
    await getData(ano, mes);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Funcionários</h1>
        <p className="text-muted-foreground text-sm">
          Escala mensal — marque os dias de cada funcionário.
        </p>
      </div>

      {funcionarios.length === 0 ? (
        <p className="text-muted-foreground text-sm">
          Nenhum funcionário cadastrado. Adicione em Configurações.
        </p>
      ) : (
        <FuncionariosCliente
          funcionarios={funcionarios}
          diasPorFuncionario={diasPorFuncionario}
          escalaMensalPorFuncionario={escalaMensalPorFuncionario}
          ano={ano}
          mes={mes}
          nomeMes={MESES[mes - 1]}
        />
      )}
    </div>
  );
}
