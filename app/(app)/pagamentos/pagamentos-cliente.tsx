"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, Plus, Trash2, Zap } from "lucide-react";
import { toast } from "sonner";

import {
  upsertPagamento,
  deletePagamento,
  marcarPago,
  gerarPagamentosDoMes,
} from "@/app/(app)/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import { MESES } from "@/lib/types";
import type { Pagamento, Pessoa, ConfigFinanceira, TipoPagamento } from "@/lib/types";

const TIPOS_PAGAMENTO: TipoPagamento[] = [
  "salario",
  "vt",
  "folguista",
  "extra",
  "adiantamento",
  "encargos",
  "outro",
];

const TIPO_LABELS: Record<TipoPagamento, string> = {
  salario: "Salário",
  vt: "Vale Transporte",
  folguista: "Folguista",
  extra: "Extra",
  adiantamento: "Adiantamento",
  encargos: "Encargos",
  outro: "Outro",
};

type FormState = {
  despesa: string;
  funcionario_id: string | null;
  tipo_pagamento: TipoPagamento;
  valor: number;
  observacao: string | null;
};

function defaultForm(): FormState {
  return {
    despesa: "",
    funcionario_id: null,
    tipo_pagamento: "salario",
    valor: 0,
    observacao: null,
  };
}

type Props = {
  mes: number;
  ano: number;
  pagamentos: Pagamento[];
  pessoas: Pessoa[];
  configFinanceira: ConfigFinanceira[];
};

export function PagamentosCliente({
  mes: mesProp,
  ano: anoProp,
  pagamentos: pagamentosInicial,
  pessoas,
  configFinanceira,
}: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [pagamentos, setPagamentos] = useState(pagamentosInicial);
  const [modalOpen, setModalOpen] = useState(false);
  const [editando, setEditando] = useState<Pagamento | null>(null);
  const [form, setForm] = useState<FormState>(defaultForm());

  const mes = mesProp;
  const ano = anoProp;

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

  function openCriar() {
    setEditando(null);
    setForm(defaultForm());
    setModalOpen(true);
  }

  function openEditar(p: Pagamento) {
    setEditando(p);
    setForm({
      despesa: p.despesa,
      funcionario_id: p.funcionario_id,
      tipo_pagamento: p.tipo_pagamento as TipoPagamento,
      valor: p.valor,
      observacao: p.observacao,
    });
    setModalOpen(true);
  }

  function handleSave() {
    if (!form.despesa.trim()) {
      toast.error("Preencha o campo Despesa.");
      return;
    }
    startTransition(async () => {
      try {
        await upsertPagamento({
          ...(editando && { id: editando.id }),
          mes,
          ano,
          despesa: form.despesa,
          funcionario_id: form.funcionario_id,
          tipo_pagamento: form.tipo_pagamento,
          valor: form.valor,
          observacao: form.observacao,
        });
        toast.success(editando ? "Pagamento atualizado." : "Pagamento adicionado.");
        setModalOpen(false);
        setPagamentos((prev) => {
          if (editando) {
            return prev.map((p) =>
              p.id === editando.id
                ? {
                    ...p,
                    despesa: form.despesa,
                    funcionario_id: form.funcionario_id,
                    tipo_pagamento: form.tipo_pagamento,
                    valor: form.valor,
                    observacao: form.observacao,
                  }
                : p,
            );
          } else {
            return [
              ...prev,
              {
                id: `temp-${Date.now()}`,
                mes,
                ano,
                despesa: form.despesa,
                funcionario_id: form.funcionario_id,
                tipo_pagamento: form.tipo_pagamento,
                valor: form.valor,
                observacao: form.observacao,
                pago: false,
                data_pagamento: null,
                criado_em: new Date().toISOString(),
              },
            ];
          }
        });
      } catch (e: unknown) {
        toast.error(e instanceof Error ? e.message : "Erro ao salvar.");
      }
    });
  }

  function handleDelete(id: string) {
    startTransition(async () => {
      try {
        await deletePagamento(id);
        toast.success("Pagamento removido.");
        setPagamentos((prev) => prev.filter((p) => p.id !== id));
      } catch (e: unknown) {
        toast.error(e instanceof Error ? e.message : "Erro ao remover.");
      }
    });
  }

  function handleTogglePago(p: Pagamento) {
    const dataPagamento = !p.pago ? new Date().toISOString().split("T")[0] : null;
    startTransition(async () => {
      try {
        await marcarPago(p.id, !p.pago, dataPagamento);
        toast.success(
          !p.pago
            ? `Marcado como pago em ${dataPagamento}`
            : "Marcado como não pago.",
        );
        setPagamentos((prev) =>
          prev.map((item) =>
            item.id === p.id
              ? { ...item, pago: !p.pago, data_pagamento: dataPagamento }
              : item,
          ),
        );
      } catch (e: unknown) {
        toast.error(e instanceof Error ? e.message : "Erro ao atualizar.");
      }
    });
  }

  function handleGerarDoMes() {
    startTransition(async () => {
      try {
        const result = await gerarPagamentosDoMes(mes, ano);
        if (result.success) {
          toast.success(`${result.count} linhas de pagamento geradas.`);
          // Refresh the page to show new pagamentos
          router.refresh();
        }
      } catch (e: unknown) {
        toast.error(e instanceof Error ? e.message : "Erro ao gerar pagamentos.");
      }
    });
  }

  const total = pagamentos.reduce((sum, p) => sum + p.valor, 0);
  const pago = pagamentos
    .filter((p) => p.pago)
    .reduce((sum, p) => sum + p.valor, 0);
  const pendente = total - pago;

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={() => navMes(-1)}
                disabled={pending}
              >
                <ChevronLeft className="size-4" />
              </Button>
              <span className="w-40 text-center font-medium">
                {MESES[mes - 1]} {ano}
              </span>
              <Button
                variant="outline"
                size="icon"
                onClick={() => navMes(1)}
                disabled={pending}
              >
                <ChevronRight className="size-4" />
              </Button>
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={openCriar}
                disabled={pending}
              >
                <Plus className="mr-1 size-3.5" />
                Nova linha
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={handleGerarDoMes}
                disabled={pending}
              >
                <Zap className="mr-1 size-3.5" />
                Gerar do mês
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {pagamentos.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              Nenhum pagamento registrado para este mês.
            </p>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="px-3 py-2 text-left font-medium">Despesa</th>
                      <th className="px-3 py-2 text-left font-medium">Tipo</th>
                      <th className="px-3 py-2 text-right font-medium">Valor</th>
                      <th className="px-3 py-2 text-left font-medium">Observação</th>
                      <th className="px-3 py-2 text-center font-medium">Pago</th>
                      <th className="px-3 py-2 text-left font-medium">Data</th>
                      <th className="px-3 py-2 text-center font-medium">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pagamentos.map((p) => (
                      <tr key={p.id} className="border-b hover:bg-muted/50">
                        <td className="px-3 py-2 font-medium">{p.despesa}</td>
                        <td className="px-3 py-2">
                          <Badge variant="secondary" className="text-xs">
                            {TIPO_LABELS[p.tipo_pagamento as TipoPagamento]}
                          </Badge>
                        </td>
                        <td className="px-3 py-2 text-right font-medium">
                          R$ {p.valor.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-3 py-2 text-muted-foreground text-xs">
                          {p.observacao || "-"}
                        </td>
                        <td className="px-3 py-2 text-center">
                          <input
                            type="checkbox"
                            checked={p.pago}
                            onChange={() => handleTogglePago(p)}
                            disabled={pending}
                            className="cursor-pointer"
                          />
                        </td>
                        <td className="px-3 py-2 text-xs">
                          {p.data_pagamento || "-"}
                        </td>
                        <td className="px-3 py-2 text-center space-x-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-7"
                            onClick={() => openEditar(p)}
                            disabled={pending}
                          >
                            ✎
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-7"
                            onClick={() => handleDelete(p.id)}
                            disabled={pending}
                          >
                            <Trash2 className="size-3.5" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="mt-4 flex justify-end gap-4 border-t pt-4 font-medium">
                <div>
                  Total: <span className="text-lg">R$ {total.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="text-green-600">
                  Pago: <span className="text-lg">R$ {pago.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="text-orange-600">
                  Pendente: <span className="text-lg">R$ {pendente.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Dialog open={modalOpen} onOpenChange={(v) => !v && setModalOpen(false)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>
              {editando ? "Editar pagamento" : "Novo pagamento"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Despesa</Label>
              <Select
                value={form.funcionario_id || "custom"}
                onValueChange={(v) => {
                  if (v === "custom") {
                    setForm({ ...form, funcionario_id: null, despesa: "" });
                  } else {
                    const pessoa = pessoas.find((p) => p.id === v);
                    setForm({
                      ...form,
                      funcionario_id: v,
                      despesa: pessoa?.nome || "",
                    });
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="custom">Personalizado</SelectItem>
                  {pessoas.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {form.funcionario_id === null && (
                <Input
                  placeholder="Ex: E-Social, Advanced, etc."
                  value={form.despesa}
                  onChange={(e) => setForm({ ...form, despesa: e.target.value })}
                  className="mt-2"
                />
              )}
            </div>

            <div className="space-y-1.5">
              <Label>Tipo de pagamento</Label>
              <Select
                value={form.tipo_pagamento}
                onValueChange={(v) =>
                  setForm({ ...form, tipo_pagamento: v as TipoPagamento })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TIPOS_PAGAMENTO.map((t) => (
                    <SelectItem key={t} value={t}>
                      {TIPO_LABELS[t]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Valor (R$)</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={form.valor}
                onChange={(e) =>
                  setForm({ ...form, valor: parseFloat(e.target.value) || 0 })
                }
                placeholder="0.00"
              />
            </div>

            <div className="space-y-1.5">
              <Label>Observação</Label>
              <Input
                placeholder="Opcional"
                value={form.observacao || ""}
                onChange={(e) =>
                  setForm({ ...form, observacao: e.target.value || null })
                }
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            {editando && (
              <Button
                variant="destructive"
                size="sm"
                onClick={() => {
                  handleDelete(editando.id);
                  setModalOpen(false);
                }}
                disabled={pending}
              >
                <Trash2 className="mr-1 size-3.5" />
                Remover
              </Button>
            )}
            <Button
              variant="outline"
              onClick={() => setModalOpen(false)}
              disabled={pending}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSave}
              disabled={pending || !form.despesa.trim()}
            >
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
