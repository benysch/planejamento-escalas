"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { getEventoCor, MESES } from "@/lib/types";
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
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerAno, setPickerAno] = useState(ano);

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
      {pickerOpen ? (
        <div className="space-y-2 rounded-lg border bg-card p-3">
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setPickerAno((y) => y - 1)}
            >
              <ChevronLeft className="size-4" />
            </Button>
            <span className="text-base font-semibold">{pickerAno}</span>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setPickerAno((y) => y + 1)}
            >
              <ChevronRight className="size-4" />
            </Button>
          </div>
          <div className="grid grid-cols-4 gap-1">
            {MESES.map((nome, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => {
                  onMesChange(pickerAno, idx + 1);
                  setPickerOpen(false);
                }}
                className={`rounded py-1.5 text-sm font-medium transition-colors ${
                  pickerAno === ano && idx + 1 === mes
                    ? "bg-primary text-primary-foreground"
                    : "hover:bg-muted"
                }`}
              >
                {nome.slice(0, 3)}
              </button>
            ))}
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="w-full text-xs text-muted-foreground"
            onClick={() => setPickerOpen(false)}
          >
            Cancelar
          </Button>
        </div>
      ) : (
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => {
              setPickerAno(ano);
              setPickerOpen(true);
            }}
            className="text-lg font-semibold hover:text-primary transition-colors"
          >
            {MESES[mes - 1]} {ano}
          </button>
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
      )}

      <div className="grid grid-cols-7 gap-px rounded-lg border bg-border overflow-hidden text-sm">
        {DIAS_SEMANA.map((d, i) => (
          <div
            key={d}
            className={`py-2 text-center text-xs font-medium text-muted-foreground ${
              i === 0 || i === 6 ? "cell-fds-header" : "bg-muted/50"
            }`}
          >
            {d}
          </div>
        ))}

        {cells.map((dia, idx) => {
          const isWeekend = idx % 7 === 0 || idx % 7 === 6;

          if (!dia) {
            return (
              <div
                key={idx}
                className={`min-h-[80px] ${isWeekend ? "cell-fds" : "bg-background"}`}
              />
            );
          }

          const dateStr = `${ano}-${String(mes).padStart(2, "0")}-${String(dia).padStart(2, "0")}`;
          const evsDia = eventosPorDia.get(dateStr) ?? [];
          const isHoje = dateStr === hoje;
          const travado = evsDia.find((e) => e.trava_agenda) ?? null;
          const corTrava = travado ? getEventoCor(travado) : null;
          const hasFeriado = evsDia.some((e) => e.tipo === "feriado");
          const isEspecial = isWeekend || hasFeriado;

          // Célula travada: fundo sólido com a cor do evento
          if (travado && corTrava) {
            return (
              <div
                key={idx}
                className="min-h-[80px] p-1 cursor-pointer transition-opacity hover:opacity-90"
                style={{ backgroundColor: corTrava }}
                onClick={() => onDiaClick?.(dateStr)}
              >
                <div className="flex items-center justify-between">
                  <span className="flex size-6 items-center justify-center rounded-full text-xs font-semibold text-white/90">
                    {dia}
                  </span>
                </div>
                <div
                  className="mt-1 flex flex-col items-center justify-center gap-0.5 cursor-pointer"
                  onClick={(e) => {
                    e.stopPropagation();
                    onEventoClick?.(travado);
                  }}
                >
                  {travado.emoji && (
                    <span className="text-lg leading-none">{travado.emoji}</span>
                  )}
                  <span className="text-center text-xs font-medium text-white leading-tight line-clamp-2">
                    {travado.recorrente_anual && (
                      <span className="opacity-70">↻ </span>
                    )}
                    {travado.titulo}
                  </span>
                </div>
              </div>
            );
          }

          // Célula normal
          return (
            <div
              key={idx}
              className={`min-h-[80px] p-1 cursor-pointer transition-colors ${
                isEspecial
                  ? "cell-fds"
                  : "bg-background hover:bg-muted/30"
              }`}
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
                    className="flex items-center gap-0.5 truncate rounded px-1 py-0.5 text-xs font-medium text-white cursor-pointer"
                    style={{ backgroundColor: getEventoCor(ev) }}
                    onClick={(e) => {
                      e.stopPropagation();
                      onEventoClick?.(ev);
                    }}
                    title={ev.titulo}
                  >
                    {ev.emoji && <span className="shrink-0">{ev.emoji}</span>}
                    {ev.recorrente_anual && (
                      <span className="shrink-0 opacity-70">↻</span>
                    )}
                    <span className="truncate">{ev.titulo}</span>
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
