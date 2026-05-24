"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import {
  marcarBlocoFuncionariaPago,
  upsertPagamentoAvulso,
  deletePagamento,
} from "@/app/(app)/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MESES } from "@/lib/types";
import type { EscalaDia, EscalaMensal, Pagamento, Pessoa, ConfigFinanceira } from "@/lib/types";

const TIPOS_AVULSO = ["e-social", "adiantamento", "encargos", "outro"];

type Props = {
  mes: number;
  ano: number;
  pessoas: Pessoa[];
  escalaDias: EscalaDia[];
  escalaMensais: EscalaMensal[];
  configFinanceira: ConfigFinanceira[];
  pagamentos: Pagamento[];
};

type BlocoFuncionaria = {
  funcionario_id: string;
  nome: string;
  cor_hex: string;
  dias_normais: number;
  dias_folguista: number;
  dias_especiais: EscalaDia[];
  saldo_vt: number;
  salario_base: number;
  valor_vt_dia: number;
  valor_folguista_dia: number;
  pago: boolean;
  data_pagamento: string | null;
};

function calcularBlocos(
  pessoas: Pessoa[],
  escalaDias: EscalaDia[],
  escalaMensais: EscalaMensal[],
  configFinanceira: ConfigFinanceira[],
  pagamentos: Pagamento[],
): BlocoFuncionaria[] {
  const configMap = new Map(
    configFinanceira.map((c) => [c.funcionario_id, c]),
  );

  const escalaMensalMap = new Map(
    escalaMensais.map((e) => [e.funcionario_id, e]),
  );

  const statusPagoMap = new Map(
    pagamentos
      .filter((p) => p.tipo_pagamento === "resumo")
      .map((p) => [p.funcionario_id, { pago: p.pago, data_pagamento: p.data_pagamento }]),
  );

  return pessoas.map((pessoa) => {
    const config = configMap.get(pessoa.id) || {
      salario_base: 0,
      valor_vt_dia: 0,
      valor_folguista_dia: 0,
    };

    const escalaMensal = escalaMensalMap.get(pessoa.id);
    const status = statusPagoMap.get(pessoa.id) || { pago: false, data_pagamento: null };

    const diasPessoa = escalaDias.filter((d) => d.funcionario_id === pessoa.id);
    const dias_normais = diasPessoa.filter((d) => d.tipo_alocacao === "normal").length;
    const dias_folguista = diasPessoa.filter((d) => d.tipo_alocacao === "folguista").length;
    const dias_especiais = diasPessoa.filter((d) => d.tipo_alocacao === "especial");

    return {
      funcionario_id: pessoa.id,
      nome: pessoa.nome,
      cor_hex: pessoa.cor_hex,
      dias_normais,
      dias_folguista,
      dias_especiais,
      saldo_vt: escalaMensal?.saldo_vt ?? 0,
      salario_base: config.salario_base,
      valor_vt_dia: config.valor_vt_dia,
      valor_folguista_dia: config.valor_folguista_dia,
      pago: status.pago,
      data_pagamento: status.data_pagamento,
    };
  });
}

function calcularParcelas(bloco: BlocoFuncionaria): {
  salarioProporcional: number;
  folguistas: number;
  vt: number;
  total: number;
} {
  const diasMes = 30; // aproximado
  const salarioDia = bloco.salario_base / diasMes;

  const salarioProporcional = Math.round(salarioDia * bloco.dias_normais * 100) / 100;
  const folguistas = Math.round(bloco.dias_folguista * bloco.valor_folguista_dia * 100) / 100;
  const vt = Math.round(bloco.saldo_vt * bloco.valor_vt_dia * 100) / 100;
  const total = salarioProporcional + folguistas + vt;

  return { salarioProporcional, folguistas, vt, total };
}

export function PagamentosCliente({
  mes: mesProp,
  ano: anoProp,
  pessoas,
  escalaDias,
  escalaMensais,
  configFinanceira,
  pagamentos: pagamentosInicial,
}: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [pagamentos, setPagamentos] = useState(pagamentosInicial);

  const mes = mesProp;
  const ano = anoProp;

  const blocos = calcularBlocos(
    pessoas,
    escalaDias,
    escalaMensais,
    configFinanceira,
    pagamentos,
  );

  function navMes(delta: number) {
    let newMes = mes + delta;
    let newAno = ano;
    if (newMes < 1) {
      newMes = 12;
      newAno--;
    } else if (newMes > 12) {
      newMes = 1;
      newAno++;
    }
    router.push(`/pagamentos?mes=${newMes}&ano=${newAno}`);
  }

  function handleTogglePago(bloco: BlocoFuncionaria) {
    const dataPagamento = !bloco.pago ? new Date().toISOString().split("T")[0] : null;
    startTransition(async () => {
      try {
        await marcarBlocoFuncionariaPago(
          bloco.funcionario_id,
          mes,
          ano,
          !bloco.pago,
          dataPagamento,
        );
        toast.success(
          !bloco.pago
            ? `${bloco.nome} marcado como pago`
            : `${bloco.nome} marcado como pendente`,
        );
        router.refresh();
      } catch (e: unknown) {
        toast.error(e instanceof Error ? e.message : "Erro ao atualizar.");
      }
    });
  }

  const totaisGerais = blocos.reduce(
    (acc, bloco) => {
      const parcelas = calcularParcelas(bloco);
      return {
        total: acc.total + parcelas.total,
        pago: acc.pago + (bloco.pago ? parcelas.total : 0),
        pendente: acc.pendente + (!bloco.pago ? parcelas.total : 0),
      };
    },
    { total: 0, pago: 0, pendente: 0 },
  );

  // Linhas avulsas (não relacionadas a funcionários)
  const pagamentosAvulsos = pagamentos.filter((p) => !p.funcionario_id || p.tipo_pagamento === "resumo");

  return (
    <div className="space-y-6">
      {/* Month Navigation */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" onClick={() => navMes(-1)}>
            <ChevronLeft className="size-4" />
          </Button>
          <h2 className="text-3xl font-bold min-w-48 text-center">
            {MESES[mes - 1]} {ano}
          </h2>
          <Button variant="ghost" size="icon" onClick={() => navMes(1)}>
            <ChevronRight className="size-4" />
          </Button>
        </div>
      </div>

      {/* Funcionárias Cards */}
      {blocos.map((bloco) => {
        const parcelas = calcularParcelas(bloco);
        const temDados = bloco.dias_normais > 0 || bloco.dias_folguista > 0 || bloco.saldo_vt > 0 || bloco.dias_especiais.length > 0;

        if (!temDados && !bloco.pago) return null;

        return (
          <Card key={bloco.funcionario_id}>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-3">
                <div
                  className="size-4 shrink-0 rounded-full"
                  style={{ backgroundColor: bloco.cor_hex }}
                />
                <CardTitle className="flex-1">{bloco.nome}</CardTitle>
                <div className="flex items-center gap-2">
                  <span className="text-lg font-semibold">
                    R$ {parcelas.total.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                  </span>
                  <label className="flex items-center gap-2 ml-4">
                    <input
                      type="checkbox"
                      checked={bloco.pago}
                      onChange={() => handleTogglePago(bloco)}
                      disabled={pending || !temDados}
                      className="cursor-pointer"
                    />
                    <span className="text-sm font-medium">
                      {bloco.pago ? `Pago em ${bloco.data_pagamento}` : "Marcar como pago"}
                    </span>
                  </label>
                </div>
              </div>
            </CardHeader>

            {temDados && (
              <CardContent className="space-y-3">
                {bloco.dias_normais > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">
                      ● {bloco.dias_normais} dias normais → Salário proporcional
                    </span>
                    <span className="font-medium">
                      R$ {parcelas.salarioProporcional.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                )}

                {bloco.dias_folguista > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">
                      ⬤ {bloco.dias_folguista} dias folguista × R$ {bloco.valor_folguista_dia.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                    </span>
                    <span className="font-medium">
                      R$ {parcelas.folguistas.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                )}

                {bloco.saldo_vt > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">
                      VT: {bloco.saldo_vt} dias × R$ {bloco.valor_vt_dia.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                    </span>
                    <span className="font-medium">
                      R$ {parcelas.vt.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                )}

                {bloco.dias_especiais.map((dia) => (
                  <div key={dia.id} className="flex justify-between text-sm border-t pt-2">
                    <span className="text-muted-foreground">
                      ★ Especial {dia.data} {dia.obs ? `(${dia.obs})` : ""}
                    </span>
                    <span className="font-medium text-orange-600">[editar]</span>
                  </div>
                ))}
              </CardContent>
            )}
          </Card>
        );
      })}

      {/* Linhas Avulsas */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">E-Social & Outras Despesas</CardTitle>
            <Button size="sm" variant="outline">
              <Plus className="mr-1 size-3.5" />
              Adicionar
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {pagamentosAvulsos.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              Nenhuma despesa avulsa registrada.
            </p>
          ) : (
            <div className="space-y-2">
              {pagamentosAvulsos.map((p) => (
                <div key={p.id} className="flex items-center justify-between text-sm border-b pb-2">
                  <div className="flex-1">
                    <p className="font-medium">{p.despesa}</p>
                    {p.observacao && <p className="text-xs text-muted-foreground">{p.observacao}</p>}
                  </div>
                  <span className="font-medium min-w-fit ml-4">
                    R$ {p.valor.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-7 ml-2"
                    onClick={() => {
                      // Delete action
                    }}
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Totais */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-3 gap-4 font-semibold">
            <div>
              Total Geral
              <p className="text-2xl">
                R$ {totaisGerais.total.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
              </p>
            </div>
            <div className="text-green-600">
              Pago
              <p className="text-2xl">
                R$ {totaisGerais.pago.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
              </p>
            </div>
            <div className="text-orange-600">
              Pendente
              <p className="text-2xl">
                R$ {totaisGerais.pendente.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
