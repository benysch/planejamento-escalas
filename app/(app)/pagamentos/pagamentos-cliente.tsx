"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import {
  marcarBlocoFuncionariaPago,
  marcarPago,
  upsertPagamentoAvulso,
  deletePagamento,
} from "@/app/(app)/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { hojeLocal } from "@/lib/datas";
import { MESES } from "@/lib/types";
import type { EscalaDia, EscalaMensal, Pagamento, Pessoa, ConfigFinanceira } from "@/lib/types";

const TIPOS_AVULSO = ["e-social", "adiantamento", "encargos", "extra", "outro"];

const TIPO_AVULSO_LABEL: Record<string, string> = {
  "e-social": "E-Social",
  adiantamento: "Adiantamento",
  encargos: "Encargos",
  extra: "Extra",
  outro: "Outro",
  salario: "Salário",
  vt: "VT",
  folguista: "Folguista",
};

function tipoAvulsoLabel(tipo: string): string {
  return TIPO_AVULSO_LABEL[tipo] ?? tipo;
}

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

function brl(valor: number): string {
  return valor.toLocaleString("pt-BR", { minimumFractionDigits: 2 });
}

type AvulsoForm = {
  id?: string;
  despesa: string;
  tipo_pagamento: string;
  valor: string;
  observacao: string;
};

function defaultAvulsoForm(): AvulsoForm {
  return { despesa: "", tipo_pagamento: "e-social", valor: "", observacao: "" };
}

export function PagamentosCliente({
  mes,
  ano,
  pessoas,
  escalaDias,
  escalaMensais,
  configFinanceira,
  pagamentos,
}: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const [avulsoOpen, setAvulsoOpen] = useState(false);
  const [avulsoForm, setAvulsoForm] = useState<AvulsoForm>(defaultAvulsoForm());
  const [confirmaExcluir, setConfirmaExcluir] = useState(false);

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
    const dataPagamento = !bloco.pago ? hojeLocal() : null;
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

  // Despesas avulsas: importadas do Excel e lançadas à mão (sem funcionário).
  // Linhas "resumo" são o marcador interno de pago dos blocos — ficam de fora.
  const pagamentosAvulsos = pagamentos.filter(
    (p) => !p.funcionario_id && p.tipo_pagamento !== "resumo",
  );

  function openNovoAvulso() {
    setAvulsoForm(defaultAvulsoForm());
    setConfirmaExcluir(false);
    setAvulsoOpen(true);
  }

  function openEditarAvulso(p: Pagamento) {
    setAvulsoForm({
      id: p.id,
      despesa: p.despesa,
      tipo_pagamento: p.tipo_pagamento,
      valor: String(p.valor),
      observacao: p.observacao ?? "",
    });
    setConfirmaExcluir(false);
    setAvulsoOpen(true);
  }

  const valorAvulso = parseFloat(avulsoForm.valor.replace(",", "."));
  const avulsoValido = avulsoForm.despesa.trim() !== "" && !isNaN(valorAvulso);

  function handleSaveAvulso() {
    if (!avulsoValido) return;
    startTransition(async () => {
      try {
        await upsertPagamentoAvulso({
          id: avulsoForm.id,
          mes,
          ano,
          despesa: avulsoForm.despesa.trim(),
          tipo_pagamento: avulsoForm.tipo_pagamento,
          valor: Math.round(valorAvulso * 100) / 100,
          observacao: avulsoForm.observacao.trim() || null,
        });
        toast.success(avulsoForm.id ? "Despesa atualizada." : "Despesa adicionada.");
        setAvulsoOpen(false);
        router.refresh();
      } catch (e: unknown) {
        toast.error(e instanceof Error ? e.message : "Erro ao salvar.");
      }
    });
  }

  function handleDeleteAvulso() {
    if (!avulsoForm.id) return;
    startTransition(async () => {
      try {
        await deletePagamento(avulsoForm.id!);
        toast.success("Despesa removida.");
        setAvulsoOpen(false);
        router.refresh();
      } catch (e: unknown) {
        toast.error(e instanceof Error ? e.message : "Erro ao remover.");
      }
    });
  }

  function handleToggleAvulsoPago(p: Pagamento) {
    startTransition(async () => {
      try {
        await marcarPago(p.id, !p.pago, !p.pago ? hojeLocal() : null);
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
  for (const p of pagamentosAvulsos) {
    totaisGerais.total += p.valor;
    if (p.pago) totaisGerais.pago += p.valor;
    else totaisGerais.pendente += p.valor;
  }

  const blocosVisiveis = blocos.filter(
    (b) =>
      b.dias_normais > 0 ||
      b.dias_folguista > 0 ||
      b.saldo_vt > 0 ||
      b.dias_especiais.length > 0 ||
      b.pago,
  );

  const tiposDoSelect = TIPOS_AVULSO.includes(avulsoForm.tipo_pagamento)
    ? TIPOS_AVULSO
    : [avulsoForm.tipo_pagamento, ...TIPOS_AVULSO];

  return (
    <div className="space-y-6">
      {/* Month Navigation */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" onClick={() => navMes(-1)}>
            <ChevronLeft className="size-4" />
          </Button>
          <h2 className="min-w-40 text-center text-2xl font-bold sm:min-w-48 sm:text-3xl">
            {MESES[mes - 1]} {ano}
          </h2>
          <Button variant="ghost" size="icon" onClick={() => navMes(1)}>
            <ChevronRight className="size-4" />
          </Button>
        </div>
      </div>

      {/* Funcionárias Cards */}
      {blocosVisiveis.length === 0 && (
        <p className="text-muted-foreground py-4 text-center text-sm">
          Nenhum dia programado para os funcionários neste mês — marque a
          escala em Funcionários.
        </p>
      )}
      {blocosVisiveis.map((bloco) => {
        const parcelas = calcularParcelas(bloco);
        const temDados = bloco.dias_normais > 0 || bloco.dias_folguista > 0 || bloco.saldo_vt > 0 || bloco.dias_especiais.length > 0;

        return (
          <Card key={bloco.funcionario_id}>
            <CardHeader className="pb-3">
              <div className="flex flex-wrap items-center gap-3">
                <div
                  className="size-4 shrink-0 rounded-full"
                  style={{ backgroundColor: bloco.cor_hex }}
                />
                <CardTitle className="flex-1">{bloco.nome}</CardTitle>
                <div className="flex w-full items-center justify-between gap-2 sm:w-auto sm:justify-end">
                  <span className="text-lg font-semibold">
                    R$ {brl(parcelas.total)}
                  </span>
                  <label className="flex min-h-11 cursor-pointer select-none items-center gap-2 sm:ml-4 sm:min-h-0">
                    <input
                      type="checkbox"
                      checked={bloco.pago}
                      onChange={() => handleTogglePago(bloco)}
                      disabled={pending || !temDados}
                      className="size-4 cursor-pointer"
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
                      R$ {brl(parcelas.salarioProporcional)}
                    </span>
                  </div>
                )}

                {bloco.dias_folguista > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">
                      ⬤ {bloco.dias_folguista} dias folguista × R$ {brl(bloco.valor_folguista_dia)}
                    </span>
                    <span className="font-medium">
                      R$ {brl(parcelas.folguistas)}
                    </span>
                  </div>
                )}

                {bloco.saldo_vt > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">
                      VT: {bloco.saldo_vt} dias × R$ {brl(bloco.valor_vt_dia)}
                    </span>
                    <span className="font-medium">
                      R$ {brl(parcelas.vt)}
                    </span>
                  </div>
                )}

                {bloco.dias_especiais.map((dia) => (
                  <div key={dia.id} className="flex justify-between text-sm border-t pt-2">
                    <span className="text-muted-foreground">
                      ★ Especial {dia.data.split("-").reverse().join("/")} {dia.obs ? `(${dia.obs})` : ""}
                    </span>
                    <span className="text-muted-foreground text-xs">
                      combinar à parte
                    </span>
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
            <Button size="sm" variant="outline" onClick={openNovoAvulso}>
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
            <div className="divide-y">
              {pagamentosAvulsos.map((p) => (
                <div key={p.id} className="flex items-center gap-3 py-2.5 text-sm">
                  <label className="flex shrink-0 cursor-pointer items-center">
                    <input
                      type="checkbox"
                      checked={p.pago}
                      onChange={() => handleToggleAvulsoPago(p)}
                      disabled={pending}
                      className="size-4 cursor-pointer"
                      title={p.pago ? "Pago" : "Pendente"}
                    />
                  </label>
                  <button
                    type="button"
                    className="min-w-0 flex-1 cursor-pointer text-left"
                    onClick={() => openEditarAvulso(p)}
                  >
                    <p className="truncate font-medium">{p.despesa}</p>
                    <p className="text-muted-foreground truncate text-xs">
                      {tipoAvulsoLabel(p.tipo_pagamento)}
                      {p.observacao ? ` · ${p.observacao}` : ""}
                      {p.pago && p.data_pagamento
                        ? ` · pago em ${p.data_pagamento.split("-").reverse().join("/")}`
                        : ""}
                    </p>
                  </button>
                  <span className={`min-w-fit font-medium ${p.pago ? "text-muted-foreground" : ""}`}>
                    R$ {brl(p.valor)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Totais */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid gap-3 font-semibold sm:grid-cols-3 sm:gap-4">
            <div>
              Total Geral
              <p className="text-2xl">
                R$ {brl(totaisGerais.total)}
              </p>
            </div>
            <div className="text-green-600">
              Pago
              <p className="text-2xl">
                R$ {brl(totaisGerais.pago)}
              </p>
            </div>
            <div className="text-orange-600">
              Pendente
              <p className="text-2xl">
                R$ {brl(totaisGerais.pendente)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Modal despesa avulsa */}
      <Dialog open={avulsoOpen} onOpenChange={(v) => !v && setAvulsoOpen(false)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>
              {avulsoForm.id ? "Editar despesa" : "Nova despesa"} — {MESES[mes - 1]} {ano}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="despesa">Despesa</Label>
              <Input
                id="despesa"
                value={avulsoForm.despesa}
                onChange={(e) => setAvulsoForm({ ...avulsoForm, despesa: e.target.value })}
                placeholder="Ex: DAE e-Social junho"
                autoFocus
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Tipo</Label>
                <Select
                  value={avulsoForm.tipo_pagamento}
                  onValueChange={(v) => v && setAvulsoForm({ ...avulsoForm, tipo_pagamento: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {tiposDoSelect.map((t) => (
                      <SelectItem key={t} value={t}>
                        {tipoAvulsoLabel(t)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="valor">Valor (R$)</Label>
                <Input
                  id="valor"
                  type="text"
                  inputMode="decimal"
                  value={avulsoForm.valor}
                  onChange={(e) => setAvulsoForm({ ...avulsoForm, valor: e.target.value })}
                  placeholder="0,00"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="observacao">Observação (opcional)</Label>
              <Input
                id="observacao"
                value={avulsoForm.observacao}
                onChange={(e) => setAvulsoForm({ ...avulsoForm, observacao: e.target.value })}
                placeholder="Detalhes…"
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            {avulsoForm.id && (
              <Button
                variant="destructive"
                size="sm"
                onClick={() =>
                  confirmaExcluir ? handleDeleteAvulso() : setConfirmaExcluir(true)
                }
                disabled={pending}
              >
                <Trash2 className="mr-1 size-3.5" />
                {confirmaExcluir ? "Confirmar exclusão" : "Excluir"}
              </Button>
            )}
            <Button variant="outline" onClick={() => setAvulsoOpen(false)} disabled={pending}>
              Cancelar
            </Button>
            <Button onClick={handleSaveAvulso} disabled={pending || !avulsoValido}>
              {pending ? "Salvando…" : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
