"use client";

import { useCallback, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EVENTO_TIPO_COR, MESES } from "@/lib/types";
import type { EventoComPessoas } from "@/lib/types";

const DIAS_SEMANA = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

type Props = {
  eventos: EventoComPessoas[];
  ano: number;
  mes: number; // 1-12
  onMesChange: (ano: number, mes: number) => void;
  onDiaClick?: (date: string) => void;
  onEventoClick?: (evento: EventoComPessoas) => void;
};

function diasDoMes(ano: number, mes: number) {
  const primeiroDia = new Date(ano, mes - 1, 1).getDay(); // 0=Dom
  const totalDias = new Date(ano, mes, 0).getDate();
  const cells: (number | null)[] = Array(primeiroDia).fill(null);
  for (let d = 1; d <= totalDias; d++) cells.push(d);
  // pad to full weeks
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

export function CalendarioMensal({
  eventos,
  ano,
  mes,
  onMesChange,
  onDiaClick,
  onEventoClick,
}: Props) {
  const cells = useMemo(() => diasDoMes(ano, mes), [ano, mes]);

  const eventosPorDia = useMemo(() => {
    const map = new Map<string, EventoComPessoas[]>();
    for (const ev of eventos) {
      const start = new Date(ev.data_inicio + "T00:00:00");
      const end = new Date(ev.data_fim + "T00:00:00");
      const cur = new Date(start);
      while (cur <= end) {
        const key = cur.toISOString().split("T")[0];
        if (!map.has(key)) map.set(key, []);
        map.get(key)!.push(ev);
        cur.setDate(cur.getDate() + 1);
      }
    }
    return map;
  }, [eventos]);

  const hoje = new Date().toISOString().split("T")[0];

  function navMes(delta: number) {
    let novoMes = mes + delta;
    let novoAno = ano;
    if (novoMes > 12) {
      novoMes = 1;
      novoAno++;
    } else if (novoMes < 1) {
      novoMes = 12;
      novoAno--;
    }
    onMesChange(novoAno, novoMes);
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">
          {MESES[mes - 1]} {ano}
        </h2>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" onClick={() => navMes(-1)}>
            <ChevronLeft className="size-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              const n = new Date();
              onMesChange(n.getFullYear(), n.getMonth() + 1);
            }}
          >
            Hoje
          </Button>
          <Button variant="ghost" size="icon" onClick={() => navMes(1)}>
            <ChevronRight className="size-4" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-px rounded-lg border bg-border overflow-hidden text-sm">
        {DIAS_SEMANA.map((d) => (
          <div
            key={d}
            className="bg-muted/50 py-2 text-center text-xs font-medium text-muted-foreground"
          >
            {d}
          </div>
        ))}

        {cells.map((dia, idx) => {
          if (!dia) {
            return <div key={idx} className="bg-background min-h-[80px]" />;
          }

          const dateStr = `${ano}-${String(mes).padStart(2, "0")}-${String(dia).padStart(2, "0")}`;
          const evsDia = eventosPorDia.get(dateStr) ?? [];
          const isHoje = dateStr === hoje;

          return (
            <div
              key={idx}
              className="bg-background min-h-[80px] p-1 hover:bg-muted/30 cursor-pointer transition-colors"
              onClick={() => onDiaClick?.(dateStr)}
            >
              <div className="flex items-center justify-between">
                <span
                  className={`flex size-6 items-center justify-center rounded-full text-xs font-medium ${
                    isHoje
                      ? "bg-primary text-primary-foreground"
                      : "text-foreground"
                  }`}
                >
                  {dia}
                </span>
                {onDiaClick && (
                  <Plus className="size-3 text-muted-foreground opacity-0 group-hover:opacity-100" />
                )}
              </div>
              <div className="mt-1 space-y-0.5">
                {evsDia.slice(0, 3).map((ev) => (
                  <div
                    key={ev.id}
                    className="truncate rounded px-1 py-0.5 text-xs font-medium text-white cursor-pointer"
                    style={{
                      backgroundColor:
                        ev.cor_hex ?? EVENTO_TIPO_COR[ev.tipo] ?? "#6366f1",
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      onEventoClick?.(ev);
                    }}
                    title={ev.titulo}
                  >
                    {ev.titulo}
                  </div>
                ))}
                {evsDia.length > 3 && (
                  <div className="text-muted-foreground px-1 text-xs">
                    +{evsDia.length - 3} mais
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
