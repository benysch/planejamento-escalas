"use client";

import { useOptimistic, useTransition, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { toggleEscalaDia, upsertEscalaMensal } from "@/app/(app)/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { isCorPastel } from "@/lib/cores";
import { CARGO_LABEL, MESES } from "@/lib/types";
import type { EscalaDia, EscalaMensal, Pessoa } from "@/lib/types";

const DIAS_HEADER = ["D", "S", "T", "Q", "Q", "S", "S"];

type Props = {
  funcionarios: Pessoa[];
  diasPorFuncionario: Record<string, EscalaDia[]>;
  escalaMensalPorFuncionario: Record<string, EscalaMensal>;
  ano: number;
  mes: number;
  nomeMes: string;
};

// ─── Mini-calendário por funcionário ────────────────────────────────────────

function EscalaCard({
  funcionario,
  diasProgramados,
  escala,
  ano,
  mes,
}: {
  funcionario: Pessoa;
  diasProgramados: EscalaDia[];
  escala: EscalaMensal | undefined;
  ano: number;
  mes: number;
}) {
  const [, startTransition] = useTransition();
  const [optimisticDias, toggleOptimistic] = useOptimistic(
    diasProgramados,
    (state: EscalaDia[], dateStr: string): EscalaDia[] => {
      const existing = state.find((d) => d.data === dateStr);
      if (!existing) {
        return [...state, { id: `temp-${dateStr}`, funcionario_id: funcionario.id, data: dateStr, tipo_alocacao: "normal", obs: null }];
      }
      if (existing.tipo_alocacao === "normal") {
        return state.map((d) => d.data === dateStr ? { ...d, tipo_alocacao: "folguista" } : d);
      }
      if (existing.tipo_alocacao === "folguista") {
        return state.map((d) => d.data === dateStr ? { ...d, tipo_alocacao: "especial" } : d);
      }
      return state.filter((d) => d.data !== dateStr);
    },
  );

  // VT edit
  const [vtEditando, setVtEditando] = useState(false);
  const [vtPending, startVtTransition] = useTransition();
  const [saldoVt, setSaldoVt] = useState(escala?.saldo_vt ?? 0);
  const [notas, setNotas] = useState(escala?.notas ?? "");

  const primeiroDia = new Date(ano, mes - 1, 1).getDay();
  const totalDias = new Date(ano, mes, 0).getDate();
  const cells: (number | null)[] = Array(primeiroDia).fill(null);
  for (let d = 1; d <= totalDias; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  const hoje = new Date().toISOString().split("T")[0];
  const mesStr = `${ano}-${String(mes).padStart(2, "0")}`;

  function handleToggle(dia: number) {
    const dateStr = `${mesStr}-${String(dia).padStart(2, "0")}`;
    startTransition(async () => {
      toggleOptimistic(dateStr);
      try {
        await toggleEscalaDia(funcionario.id, dateStr);
      } catch {
        toast.error("Erro ao salvar.");
      }
    });
  }

  function handleSaveVt() {
    startVtTransition(async () => {
      try {
        await upsertEscalaMensal({
          funcionario_id: funcionario.id,
          mes,
          ano,
          dias_trabalhados: 0,
          dias_programados: optimisticDias.length,
          saldo_vt: saldoVt,
          notas: notas || null,
        });
        toast.success("VT salvo.");
        setVtEditando(false);
      } catch (e: unknown) {
        toast.error(e instanceof Error ? e.message : "Erro ao salvar.");
      }
    });
  }

  const totalProgramados = optimisticDias.filter((d) => d.tipo_alocacao).length;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm font-semibold">
          <div
            className="size-3 shrink-0 rounded-full"
            style={{ backgroundColor: funcionario.cor_hex }}
          />
          {funcionario.nome}
          <Badge variant="secondary" className="text-xs font-normal">
            {CARGO_LABEL[(funcionario.cargo as keyof typeof CARGO_LABEL) ?? "outro"]}
          </Badge>
          {!funcionario.ativo && (
            <Badge variant="outline" className="text-xs text-muted-foreground">
              Inativo
            </Badge>
          )}
          <span className="ml-auto text-xs font-normal text-muted-foreground">
            {totalProgramados} {totalProgramados === 1 ? "dia" : "dias"} programados
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Instrução e Legenda */}
        <div className="rounded-md bg-blue-50 dark:bg-blue-900/20 p-3 space-y-2">
          <p className="text-xs font-medium text-blue-900 dark:text-blue-100">
            Clique nos dias para alternar entre os tipos:
          </p>
          <div className="grid grid-cols-3 gap-3">
            <div className="flex items-center gap-2">
              <div
                className="size-6 rounded text-white flex items-center justify-center text-xs font-bold"
                style={{ backgroundColor: funcionario.cor_hex }}
              >
                1
              </div>
              <span className="text-xs font-medium">Normal (salário)</span>
            </div>
            <div className="flex items-center gap-2">
              <div
                className="size-6 rounded border-2 border-white text-white flex items-center justify-center text-xs font-bold"
                style={{ backgroundColor: funcionario.cor_hex }}
              >
                2
              </div>
              <span className="text-xs font-medium">Folguista</span>
            </div>
            <div className="flex items-center gap-2">
              <div
                className="size-6 rounded border-2 border-dashed border-white text-white flex items-center justify-center text-xs font-bold relative"
                style={{ backgroundColor: funcionario.cor_hex }}
              >
                3 <span className="absolute top-0 right-0 text-[10px]">★</span>
              </div>
              <span className="text-xs font-medium">Especial (extra)</span>
            </div>
          </div>
        </div>

        {/* Mini calendário */}
        <div className="grid grid-cols-7 gap-1 text-center text-xs">
          {DIAS_HEADER.map((d, i) => (
            <div
              key={i}
              className={`py-1 font-medium ${i === 0 || i === 6 ? "text-muted-foreground/60" : "text-muted-foreground"}`}
            >
              {d}
            </div>
          ))}
          {cells.map((dia, idx) => {
            if (!dia) return <div key={idx} />;

            const dateStr = `${mesStr}-${String(dia).padStart(2, "0")}`;
            const diaData = optimisticDias.find((d) => d.data === dateStr);
            const isHoje = dateStr === hoje;
            const isWeekend = idx % 7 === 0 || idx % 7 === 6;
            const tipo = diaData?.tipo_alocacao;

            let borderClass = "";
            let textClass = "text-xs font-medium";
            let bgStyle: Record<string, string> | undefined;

            if (tipo === "normal") {
              bgStyle = { backgroundColor: funcionario.cor_hex };
              textClass += ` ${isCorPastel(funcionario.cor_hex) ? "text-black/80" : "text-white"}`;
            } else if (tipo === "folguista") {
              bgStyle = { backgroundColor: funcionario.cor_hex, borderWidth: "2px", borderColor: "white" };
              textClass += ` font-bold ${isCorPastel(funcionario.cor_hex) ? "text-black/80" : "text-white"}`;
              borderClass = "border-2 border-white";
            } else if (tipo === "especial") {
              bgStyle = { backgroundColor: funcionario.cor_hex, borderWidth: "2px", borderStyle: "dashed", borderColor: "white" };
              textClass += ` font-bold ${isCorPastel(funcionario.cor_hex) ? "text-black/80" : "text-white"}`;
              borderClass = "border-2 border-dashed border-white relative";
            }

            return (
              <button
                key={idx}
                type="button"
                onClick={() => handleToggle(dia)}
                className={[
                  "flex h-8 w-full items-center justify-center rounded-md transition-all relative",
                  tipo ? "shadow-sm" : isWeekend ? "text-muted-foreground/50 hover:bg-muted" : "text-foreground hover:bg-muted",
                  isHoje && !tipo ? "ring-2 ring-primary ring-offset-1" : "",
                  isHoje && tipo ? "ring-2 ring-offset-1 ring-white/70" : "",
                  borderClass,
                  textClass,
                ].join(" ")}
                style={bgStyle}
              >
                {dia}
                {tipo === "folguista" && (
                  <span className="absolute top-0 right-0.5 text-[8px] leading-none">☆</span>
                )}
                {tipo === "especial" && (
                  <span className="absolute top-0 right-0.5 text-[8px] leading-none">★</span>
                )}
              </button>
            );
          })}
        </div>

        {/* VT */}
        <div className="border-t pt-3">
          {vtEditando ? (
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground shrink-0">VT (dias):</span>
              <Input
                type="number"
                min={0}
                value={saldoVt}
                onChange={(e) => setSaldoVt(parseInt(e.target.value) || 0)}
                className="h-7 w-16 text-center text-xs"
              />
              <Input
                value={notas}
                onChange={(e) => setNotas(e.target.value)}
                className="h-7 flex-1 text-xs"
                placeholder="Notas…"
              />
              <Button
                size="sm"
                variant="ghost"
                className="h-7 text-xs"
                onClick={() => setVtEditando(false)}
                disabled={vtPending}
              >
                Cancelar
              </Button>
              <Button
                size="sm"
                className="h-7 text-xs"
                onClick={handleSaveVt}
                disabled={vtPending}
              >
                Salvar
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <span className="text-xs text-muted-foreground">
                VT: <span className="font-medium text-foreground">{escala?.saldo_vt ?? "—"} dias</span>
              </span>
              {escala?.notas && (
                <span className="text-xs text-muted-foreground truncate flex-1">{escala.notas}</span>
              )}
              <Button
                variant="ghost"
                size="sm"
                className="h-6 ml-auto text-xs"
                onClick={() => {
                  setSaldoVt(escala?.saldo_vt ?? 0);
                  setNotas(escala?.notas ?? "");
                  setVtEditando(true);
                }}
              >
                Editar VT
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Componente principal ────────────────────────────────────────────────────

export function FuncionariosCliente({
  funcionarios,
  diasPorFuncionario,
  escalaMensalPorFuncionario,
  ano,
  mes,
  nomeMes,
}: Props) {
  const router = useRouter();

  function navMes(delta: number) {
    let novoMes = mes + delta;
    let novoAno = ano;
    if (novoMes > 12) { novoMes = 1; novoAno++; }
    else if (novoMes < 1) { novoMes = 12; novoAno--; }
    router.push(`/funcionarios?ano=${novoAno}&mes=${novoMes}`);
  }

  function irHoje() {
    const n = new Date();
    router.push(`/funcionarios?ano=${n.getFullYear()}&mes=${n.getMonth() + 1}`);
  }

  return (
    <div className="space-y-6">
      {/* Navegação */}
      <div className="flex items-center gap-1">
        <Button variant="ghost" size="icon" onClick={() => navMes(-1)}>
          <ChevronLeft className="size-4" />
        </Button>
        <button
          type="button"
          className="text-lg font-semibold px-2 hover:text-primary transition-colors"
          onClick={irHoje}
        >
          {nomeMes} {ano}
        </button>
        <Button variant="ghost" size="icon" onClick={() => navMes(1)}>
          <ChevronRight className="size-4" />
        </Button>
        <Button variant="ghost" size="sm" className="ml-1" onClick={irHoje}>
          Hoje
        </Button>
      </div>

      {/* Cards */}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {funcionarios.map((func) => (
          <EscalaCard
            key={func.id}
            funcionario={func}
            diasProgramados={diasPorFuncionario[func.id] ?? []}
            escala={escalaMensalPorFuncionario[func.id]}
            ano={ano}
            mes={mes}
          />
        ))}
      </div>
    </div>
  );
}
