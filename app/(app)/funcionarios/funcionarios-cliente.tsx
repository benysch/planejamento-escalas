"use client";

import { useState, useTransition } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { upsertEscalaMensal } from "@/app/(app)/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { EscalaMensal, Pessoa } from "@/lib/types";

type Props = {
  funcionarios: Pessoa[];
  escalaPorFuncionario: Record<string, Record<number, EscalaMensal>>;
  ano: number;
  meses: string[];
};

function EscalaInput({
  value,
  label,
  onChange,
}: {
  value: number;
  label: string;
  onChange: (v: number) => void;
}) {
  return (
    <div className="space-y-0.5 text-center">
      <p className="text-[10px] text-muted-foreground">{label}</p>
      <Input
        type="number"
        min={0}
        max={31}
        value={value}
        onChange={(e) => onChange(parseInt(e.target.value) || 0)}
        className="h-8 w-14 text-center text-sm"
      />
    </div>
  );
}

export function FuncionariosCliente({
  funcionarios,
  escalaPorFuncionario,
  ano,
  meses,
}: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [editando, setEditando] = useState<{
    funcId: string;
    mes: number;
    dias_trabalhados: number;
    dias_programados: number;
    saldo_vt: number;
  } | null>(null);

  function navAno(delta: number) {
    router.push(`/funcionarios?ano=${ano + delta}`);
  }

  function handleSave() {
    if (!editando) return;
    startTransition(async () => {
      try {
        await upsertEscalaMensal({
          funcionario_id: editando.funcId,
          mes: editando.mes,
          ano,
          dias_trabalhados: editando.dias_trabalhados,
          dias_programados: editando.dias_programados,
          saldo_vt: editando.saldo_vt,
        });
        toast.success("Escala salva.");
        setEditando(null);
      } catch (e: unknown) {
        toast.error(e instanceof Error ? e.message : "Erro ao salvar.");
      }
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" onClick={() => navAno(-1)}>
          <ChevronLeft className="size-4" />
        </Button>
        <span className="text-lg font-semibold w-16 text-center">{ano}</span>
        <Button variant="ghost" size="icon" onClick={() => navAno(1)}>
          <ChevronRight className="size-4" />
        </Button>
      </div>

      {funcionarios.map((func) => {
        const escalaFunc = escalaPorFuncionario[func.id] ?? {};
        const totalTrabalhados = Object.values(escalaFunc).reduce(
          (sum, e) => sum + e.dias_trabalhados,
          0,
        );

        return (
          <Card key={func.id}>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-3 text-base">
                <div
                  className="size-3 rounded-full"
                  style={{ backgroundColor: func.cor_hex }}
                />
                {func.nome}
                <Badge variant="secondary" className="text-xs font-normal">
                  {func.cargo ?? "funcionário"}
                </Badge>
                {!func.ativo && (
                  <Badge variant="outline" className="text-xs text-muted-foreground">
                    Inativo
                  </Badge>
                )}
                <span className="ml-auto text-sm font-normal text-muted-foreground">
                  Total {ano}: {totalTrabalhados} dias
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="py-1.5 text-left text-xs font-medium text-muted-foreground">
                        Mês
                      </th>
                      <th className="py-1.5 text-center text-xs font-medium text-muted-foreground">
                        Programados
                      </th>
                      <th className="py-1.5 text-center text-xs font-medium text-muted-foreground">
                        Trabalhados
                      </th>
                      <th className="py-1.5 text-center text-xs font-medium text-muted-foreground">
                        VT (dias)
                      </th>
                      <th className="py-1.5" />
                    </tr>
                  </thead>
                  <tbody>
                    {meses.map((nomeMes, idx) => {
                      const mes = idx + 1;
                      const e = escalaFunc[mes];
                      const isEditando =
                        editando?.funcId === func.id &&
                        editando?.mes === mes;

                      return (
                        <tr key={mes} className="border-b last:border-0 hover:bg-muted/30">
                          <td className="py-1.5 font-medium">{nomeMes}</td>
                          {isEditando ? (
                            <>
                              <td className="py-1 text-center">
                                <Input
                                  type="number"
                                  min={0}
                                  max={31}
                                  value={editando.dias_programados}
                                  onChange={(ev) =>
                                    setEditando({
                                      ...editando,
                                      dias_programados:
                                        parseInt(ev.target.value) || 0,
                                    })
                                  }
                                  className="mx-auto h-7 w-14 text-center text-sm"
                                />
                              </td>
                              <td className="py-1 text-center">
                                <Input
                                  type="number"
                                  min={0}
                                  max={31}
                                  value={editando.dias_trabalhados}
                                  onChange={(ev) =>
                                    setEditando({
                                      ...editando,
                                      dias_trabalhados:
                                        parseInt(ev.target.value) || 0,
                                    })
                                  }
                                  className="mx-auto h-7 w-14 text-center text-sm"
                                />
                              </td>
                              <td className="py-1 text-center">
                                <Input
                                  type="number"
                                  min={0}
                                  value={editando.saldo_vt}
                                  onChange={(ev) =>
                                    setEditando({
                                      ...editando,
                                      saldo_vt:
                                        parseInt(ev.target.value) || 0,
                                    })
                                  }
                                  className="mx-auto h-7 w-14 text-center text-sm"
                                />
                              </td>
                              <td className="py-1 text-right">
                                <div className="flex items-center justify-end gap-1">
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-7 text-xs"
                                    onClick={() => setEditando(null)}
                                  >
                                    Cancelar
                                  </Button>
                                  <Button
                                    size="sm"
                                    className="h-7 text-xs"
                                    onClick={handleSave}
                                    disabled={pending}
                                  >
                                    Salvar
                                  </Button>
                                </div>
                              </td>
                            </>
                          ) : (
                            <>
                              <td className="py-1.5 text-center text-muted-foreground">
                                {e?.dias_programados ?? "—"}
                              </td>
                              <td className="py-1.5 text-center font-medium">
                                {e?.dias_trabalhados ?? "—"}
                              </td>
                              <td className="py-1.5 text-center text-muted-foreground">
                                {e?.saldo_vt ?? "—"}
                              </td>
                              <td className="py-1.5 text-right">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 text-xs"
                                  onClick={() =>
                                    setEditando({
                                      funcId: func.id,
                                      mes,
                                      dias_trabalhados: e?.dias_trabalhados ?? 0,
                                      dias_programados: e?.dias_programados ?? 0,
                                      saldo_vt: e?.saldo_vt ?? 0,
                                    })
                                  }
                                >
                                  Editar
                                </Button>
                              </td>
                            </>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
