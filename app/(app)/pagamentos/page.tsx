import { redirect } from "next/navigation";
import { getSupabase } from "@/lib/supabase/server";
import type { Pagamento, Pessoa, ConfigFinanceira } from "@/lib/types";
import { PagamentosCliente } from "./pagamentos-cliente";

async function getData(mes: number, ano: number) {
  const sb = getSupabase();
  const [{ data: pagamentos }, { data: pessoas }, { data: configFinanceira }] =
    await Promise.all([
      sb
        .from("pe_pagamentos")
        .select("*")
        .eq("mes", mes)
        .eq("ano", ano)
        .order("despesa")
        .order("tipo_pagamento"),
      sb.from("pe_pessoas").select("*").eq("tipo", "funcionario").order("nome"),
      sb.from("pe_config_financeira").select("*"),
    ]);

  return {
    pagamentos: (pagamentos ?? []) as Pagamento[],
    pessoas: (pessoas ?? []) as Pessoa[],
    configFinanceira: (configFinanceira ?? []) as ConfigFinanceira[],
  };
}

export default async function PagamentosPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>;
}) {
  const today = new Date();
  const defaultMes = today.getMonth() + 1;
  const defaultAno = today.getFullYear();

  const params = await searchParams;
  const mes = parseInt(params.mes ?? String(defaultMes));
  const ano = parseInt(params.ano ?? String(defaultAno));

  if (isNaN(mes) || isNaN(ano) || mes < 1 || mes > 12 || ano < 2024) {
    redirect(`/pagamentos?mes=${defaultMes}&ano=${defaultAno}`);
  }

  const { pagamentos, pessoas, configFinanceira } = await getData(mes, ano);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Pagamentos</h1>
        <p className="text-muted-foreground text-sm">
          Gerencie pagamentos de funcionários, VT, folguistas e outros gastos.
        </p>
      </div>
      <PagamentosCliente
        mes={mes}
        ano={ano}
        pagamentos={pagamentos}
        pessoas={pessoas}
        configFinanceira={configFinanceira}
      />
    </div>
  );
}
