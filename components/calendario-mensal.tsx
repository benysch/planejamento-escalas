"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Download, Plus } from "lucide-react";
import { domToPng } from "modern-screenshot";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { useIsMobile } from "@/hooks/use-mobile";
import { isCorPastel } from "@/lib/cores";
import { hojeLocal } from "@/lib/datas";
import { FAIXA_HORARIO_ORDEM, getEventoCor, MESES } from "@/lib/types";
import type { EventoComPessoas, TipoEvento } from "@/lib/types";

const DIAS_SEMANA = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const DIAS_SEMANA_LONGO = [
  "Domingo", "Segunda-feira", "Terça-feira", "Quarta-feira",
  "Quinta-feira", "Sexta-feira", "Sábado",
];

type Props = {
  eventos: EventoComPessoas[];
  tipos: TipoEvento[];
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
  tipos,
  ano,
  mes,
  onMesChange,
  onDiaClick,
  onEventoClick,
}: Props) {
  const cells = useMemo(() => diasDoMes(ano, mes), [ano, mes]);
  const isMobile = useIsMobile();

  const ordemTipo = useMemo(() => {
    const m = new Map<string, number>();
    tipos.forEach((t) => m.set(t.slug, t.ordem));
    return m;
  }, [tipos]);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerAno, setPickerAno] = useState(ano);

  const eventosPorDia = useMemo(() => {
    const map = new Map<string, EventoComPessoas[]>();
    for (const ev of eventos) {
      const start = new Date(ev.data_inicio + "T00:00:00");
      const end = new Date(ev.data_fim + "T00:00:00");
      const cur = new Date(start);
      while (cur <= end) {
        const dow = cur.getDay(); // 0=Dom, 6=Sáb
        const isFds = dow === 0 || dow === 6;
        if (!(ev.tipo === "ferias_escola" && isFds)) {
          const key = cur.toISOString().split("T")[0];
          if (!map.has(key)) map.set(key, []);
          map.get(key)!.push(ev);
        }
        cur.setDate(cur.getDate() + 1);
      }
    }
    return map;
  }, [eventos]);

  const hoje = hojeLocal();

  // Ordena pela faixa de horário; sem horário vai para o fim.
  // Desempate: ordem da categoria.
  function compararEventos(a: EventoComPessoas, b: EventoComPessoas) {
    const fa = a.faixa_horario ? FAIXA_HORARIO_ORDEM[a.faixa_horario] ?? 99 : 99;
    const fb = b.faixa_horario ? FAIXA_HORARIO_ORDEM[b.faixa_horario] ?? 99 : 99;
    if (fa !== fb) return fa - fb;
    return (ordemTipo.get(a.tipo) ?? 999) - (ordemTipo.get(b.tipo) ?? 999);
  }

  // Mobile: tocar num dia seleciona e mostra o painel de eventos embaixo.
  const mesStr = `${ano}-${String(mes).padStart(2, "0")}`;
  const [diaSel, setDiaSel] = useState<string | null>(
    hoje.startsWith(mesStr) ? hoje : null,
  );
  useEffect(() => {
    setDiaSel(hoje.startsWith(mesStr) ? hoje : null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mesStr]);

  const printRef = useRef<HTMLDivElement>(null);
  const [exportando, setExportando] = useState(false);

  // No celular as células mostram só pontinhos; na exportação PNG volta o
  // layout completo (o await de 2 rAF abaixo dá tempo do React re-renderizar).
  const compacto = isMobile && !exportando;

  async function baixarImagem() {
    const node = printRef.current;
    if (!node) return;
    setExportando(true);
    // Aguarda o título de exportação aparecer no DOM antes de capturar.
    await new Promise((r) =>
      requestAnimationFrame(() => requestAnimationFrame(() => r(null))),
    );
    try {
      const dataUrl = await domToPng(node, {
        scale: 3,
        backgroundColor: "#ffffff",
      });
      const a = document.createElement("a");
      a.download = `calendario-${MESES[mes - 1].toLowerCase()}-${ano}.png`;
      a.href = dataUrl;
      a.click();
    } catch {
      toast.error("Não consegui gerar a imagem. Tente de novo.");
    } finally {
      setExportando(false);
    }
  }

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

  function labelDia(dateStr: string) {
    const [, m, d] = dateStr.split("-");
    const dow = new Date(dateStr + "T12:00:00").getDay();
    return `${DIAS_SEMANA_LONGO[dow]}, ${parseInt(d)} de ${MESES[parseInt(m) - 1].toLowerCase()}`;
  }

  const evsDiaSel = diaSel
    ? [...(eventosPorDia.get(diaSel) ?? [])].sort((a, b) => {
        // Evento que trava a agenda vem primeiro no painel do dia.
        if (!!a.trava_agenda !== !!b.trava_agenda) return a.trava_agenda ? -1 : 1;
        return compararEventos(a, b);
      })
    : [];

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
                className={`rounded py-2 text-sm font-medium transition-colors ${
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
            className="min-h-11 text-lg font-semibold hover:text-primary transition-colors"
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
            <Button
              variant="ghost"
              size="icon"
              onClick={baixarImagem}
              disabled={exportando}
              title="Baixar imagem do calendário"
            >
              <Download className="size-4" />
            </Button>
          </div>
        </div>
      )}

      <div ref={printRef} className="space-y-2 bg-background p-2">
        {exportando && (
          <div className="text-center text-base font-semibold">
            {MESES[mes - 1]} {ano}
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
            {compacto ? d.slice(0, 1) : d}
          </div>
        ))}

        {cells.map((dia, idx) => {
          const isWeekend = idx % 7 === 0 || idx % 7 === 6;
          const alturaCell = compacto ? "min-h-14" : "min-h-[72px]";

          if (!dia) {
            return (
              <div
                key={idx}
                className={`${alturaCell} ${isWeekend ? "cell-fds" : "bg-background"}`}
              />
            );
          }

          const dateStr = `${mesStr}-${String(dia).padStart(2, "0")}`;
          const evsDia = eventosPorDia.get(dateStr) ?? [];
          const isHoje = dateStr === hoje;
          const isSel = compacto && dateStr === diaSel;
          const travado = evsDia.find((e) => e.trava_agenda) ?? null;
          const corTrava = travado ? getEventoCor(travado) : null;
          const hasFeriado = evsDia.some((e) => e.tipo === "feriado");
          const isEspecial = isWeekend || hasFeriado;
          const folguista = evsDia.find((e) => e.tipo === "baba_folguista") ?? null;
          const ferias = evsDia.find((e) => e.tipo === "ferias_escola") ?? null;
          const evsChip = evsDia
            .filter((e) => e.tipo !== "baba_folguista" && e.tipo !== "ferias_escola")
            .sort(compararEventos);

          const selecionar = () =>
            compacto ? setDiaSel(dateStr) : onDiaClick?.(dateStr);
          const anelSel = isSel ? "ring-2 ring-primary ring-inset" : "";

          // Mobile compacto: número + pontinhos coloridos; detalhes no painel.
          if (compacto) {
            const evsDots = evsDia.filter((e) => e.id !== travado?.id);
            const corTexto =
              travado && corTrava
                ? isCorPastel(corTrava)
                  ? "text-black/80"
                  : "text-white"
                : "";
            return (
              <div
                key={idx}
                className={`${alturaCell} cursor-pointer p-1 ${anelSel} ${
                  travado ? "" : isEspecial ? "cell-fds" : "bg-background"
                }`}
                style={travado && corTrava ? { backgroundColor: corTrava } : undefined}
                onClick={selecionar}
              >
                <div className="flex justify-center">
                  <span
                    className={`flex size-6 items-center justify-center rounded-full text-xs font-medium ${
                      isHoje && !travado
                        ? "bg-primary text-primary-foreground"
                        : corTexto || "text-foreground"
                    }`}
                  >
                    {dia}
                  </span>
                </div>
                {travado?.emoji ? (
                  <div className="mt-0.5 text-center text-sm leading-none">
                    {travado.emoji}
                  </div>
                ) : null}
                {evsDots.length > 0 && (
                  <div className="mt-1 flex flex-wrap items-center justify-center gap-0.5">
                    {evsDots.slice(0, 6).map((ev) => (
                      <span
                        key={ev.id}
                        className="size-1.5 rounded-full"
                        style={{ backgroundColor: getEventoCor(ev) }}
                      />
                    ))}
                    {evsDots.length > 6 && (
                      <span className={`text-[9px] leading-none ${corTexto || "text-muted-foreground"}`}>
                        +{evsDots.length - 6}
                      </span>
                    )}
                  </div>
                )}
              </div>
            );
          }

          // Célula travada: fundo sólido com a cor do evento
          if (travado && corTrava) {
            const corTextoTrava = isCorPastel(corTrava) ? "text-black/80" : "text-white";
            // Demais eventos do dia (ex: regar plantas) continuam visíveis por cima.
            const outros = evsDia
              .filter((e) => e.id !== travado.id)
              .sort(compararEventos);
            return (
              <div
                key={idx}
                className="min-h-[80px] p-1 cursor-pointer transition-opacity hover:opacity-90"
                style={{ backgroundColor: corTrava }}
                onClick={selecionar}
              >
                {outros.length === 0 ? (
                  <>
                    <div className="flex items-center justify-between">
                      <span className={`flex size-6 items-center justify-center rounded-full text-xs font-semibold ${isCorPastel(corTrava) ? "text-black/70" : "text-white/90"}`}>
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
                      <span className={`text-center text-xs font-medium leading-tight line-clamp-2 ${corTextoTrava}`}>
                        {travado.recorrente_anual && (
                          <span className="opacity-70">↻ </span>
                        )}
                        {travado.titulo}
                      </span>
                    </div>
                  </>
                ) : (
                  <>
                    <div
                      className="flex items-center gap-1 cursor-pointer"
                      onClick={(e) => {
                        e.stopPropagation();
                        onEventoClick?.(travado);
                      }}
                    >
                      <span className={`flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${isCorPastel(corTrava) ? "text-black/70" : "text-white/90"}`}>
                        {dia}
                      </span>
                      <span className={`truncate text-xs font-medium leading-tight ${corTextoTrava}`}>
                        {travado.emoji && <span>{travado.emoji} </span>}
                        {travado.recorrente_anual && (
                          <span className="opacity-70">↻ </span>
                        )}
                        {travado.titulo}
                      </span>
                    </div>
                    <div className="mt-1 space-y-0.5">
                      {outros.map((ev) => (
                        <div
                          key={ev.id}
                          className="flex items-center gap-1 truncate rounded bg-white/90 px-1 py-0.5 text-xs font-medium text-black/80 cursor-pointer"
                          onClick={(e) => {
                            e.stopPropagation();
                            onEventoClick?.(ev);
                          }}
                          title={ev.titulo}
                        >
                          <span
                            className="size-1.5 shrink-0 rounded-full"
                            style={{ backgroundColor: getEventoCor(ev) }}
                          />
                          {ev.emoji && <span className="shrink-0">{ev.emoji}</span>}
                          {ev.recorrente_anual && (
                            <span className="shrink-0 opacity-70">↻</span>
                          )}
                          <span className="truncate">{ev.titulo}</span>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            );
          }

          // Célula normal
          return (
            <div
              key={idx}
              className={`group min-h-[72px] p-1 cursor-pointer transition-colors ${
                isEspecial
                  ? "cell-fds"
                  : "bg-background hover:bg-muted/30"
              }`}
              onClick={selecionar}
            >
              <div className="flex items-center justify-between gap-1">
                <div className="flex items-center gap-1 min-w-0">
                  <span
                    className={`flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-medium ${
                      isHoje
                        ? "bg-primary text-primary-foreground"
                        : "text-foreground"
                    }`}
                  >
                    {dia}
                  </span>
                  {folguista && (
                    <span
                      className="text-sm font-bold truncate cursor-pointer"
                      style={{ color: getEventoCor(folguista) }}
                      title={folguista.pessoas[0]?.nome ?? folguista.titulo}
                      onClick={(e) => {
                        e.stopPropagation();
                        onEventoClick?.(folguista);
                      }}
                    >
                      {folguista.pessoas[0]?.nome ?? folguista.titulo}
                    </span>
                  )}
                  {ferias && (
                    <span
                      className="text-sm font-bold truncate cursor-pointer"
                      style={{ color: getEventoCor(ferias) }}
                      title={ferias.titulo}
                      onClick={(e) => {
                        e.stopPropagation();
                        onEventoClick?.(ferias);
                      }}
                    >
                      {ferias.recorrente_anual && (
                        <span className="opacity-70">↻ </span>
                      )}
                      {ferias.titulo}
                    </span>
                  )}
                </div>
                {onDiaClick && (
                  <Plus className="size-3 shrink-0 text-muted-foreground opacity-0 group-hover:opacity-100" />
                )}
              </div>
              <div className="mt-1 space-y-0.5">
                {evsChip.map((ev) => (
                  <div
                    key={ev.id}
                    className={`flex items-center gap-0.5 truncate rounded px-1 py-0.5 text-xs font-medium cursor-pointer ${isCorPastel(getEventoCor(ev)) ? "text-black/80" : "text-white"}`}
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
              </div>
            </div>
          );
        })}
        </div>
      </div>

      {/* Painel do dia selecionado — só no mobile */}
      {compacto && diaSel && (
        <div className="rounded-lg border bg-card">
          <div className="flex items-center justify-between gap-2 border-b px-3 py-2">
            <p className="text-sm font-semibold first-letter:uppercase">
              {labelDia(diaSel)}
            </p>
            {onDiaClick && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onDiaClick(diaSel)}
              >
                <Plus className="mr-1 size-3.5" />
                Adicionar
              </Button>
            )}
          </div>
          {evsDiaSel.length === 0 ? (
            <p className="text-muted-foreground px-3 py-4 text-center text-sm">
              Sem eventos neste dia.
            </p>
          ) : (
            <ul className="divide-y">
              {evsDiaSel.map((ev) => (
                <li key={ev.id}>
                  <button
                    type="button"
                    className="flex min-h-11 w-full items-center gap-2.5 px-3 py-2 text-left transition-colors hover:bg-muted/40 active:bg-muted/60"
                    onClick={() => onEventoClick?.(ev)}
                  >
                    <span
                      className="size-2.5 shrink-0 rounded-full"
                      style={{ backgroundColor: getEventoCor(ev) }}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">
                        {ev.emoji && <span className="mr-1">{ev.emoji}</span>}
                        {ev.recorrente_anual && (
                          <span className="text-muted-foreground">↻ </span>
                        )}
                        {ev.titulo}
                      </span>
                      {ev.pessoas.length > 0 && (
                        <span className="text-muted-foreground block truncate text-xs">
                          {ev.pessoas.map((p) => p.nome).join(", ")}
                        </span>
                      )}
                    </span>
                    {ev.trava_agenda && (
                      <span className="text-muted-foreground shrink-0 text-[10px] uppercase tracking-wide">
                        agenda
                      </span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
