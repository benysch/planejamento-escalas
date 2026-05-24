import { redirect } from "next/navigation";
import { getSupabase } from "@/lib/supabase/server";
import type { EscalaDia, EscalaMensal, Pagamento, Pessoa, ConfigFinanceira } from "@/lib/types";
import { PagamentosCliente } from "./pagamentos-cliente";

async function getData(mes: number, ano: number) {
  const sb = getSupabase();
  const primeiroDia = `${ano}-${String(mes).padStart(2, "0")}-01`;
  const ultimoDia = new Date(ano, mes, 0);
  const ultimoDiaStr = `${ano}-${String(mes).padStart(2, "0")}-${String(ultimoDia.getDate()).padStart(2, "0")}`;

  const [
    { data: pessoas },
    { data: escalaDias },
    { data: escalaMensais },
    { data: configFinanceira },
    { data: pagamentos },
  ] = await Promise.all([
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
    sb.from("pe_config_financeira").select("*"),
    sb
      .from("pe_pagamentos")
      .select("*")
      .eq("mes", mes)
      .eq("ano", ano),
  ]);

  return {
    pessoas: (pessoas ?? []) as Pessoa[],
    escalaDias: (escalaDias ?? []) as EscalaDia[],
    escalaMensais: (escalaMensais ?? []) as EscalaMensal[],
    configFinanceira: (configFinanceira ?? []) as ConfigFinanceira[],
    pagamentos: (pagamentos ?? []) as Pagamento[],
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

  const { pessoas, escalaDias, escalaMensais, configFinanceira, pagamentos } = await getData(mes, ano);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Pagamentos</h1>
        <p className="text-muted-foreground text-sm">
          Resumo de pagamentos por funcionário.
        </p>
      </div>
      <PagamentosCliente
        mes={mes}
        ano={ano}
        pessoas={pessoas}
        escalaDias={escalaDias}
        escalaMensais={escalaMensais}
        configFinanceira={configFinanceira}
        pagamentos={pagamentos}
      />
    </div>
  );
}
