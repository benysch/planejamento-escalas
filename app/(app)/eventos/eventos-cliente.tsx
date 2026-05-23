"use client";

import { useState } from "react";
import { Plus } from "lucide-react";

import { EventoModal } from "@/components/evento-modal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getEventoCor, EVENTO_TIPO_LABEL } from "@/lib/types";
import type { EventoComPessoas, EventoTipo, Pessoa } from "@/lib/types";

type Props = {
  eventos: EventoComPessoas[];
  pessoas: Pessoa[];
};

function formatDate(iso: string) {
  return iso.split("-").reverse().join("/");
}

export function EventosCliente({ eventos, pessoas }: Props) {
  const [modalOpen, setModalOpen] = useState(false);
  const [eventoSel, setEventoSel] = useState<EventoComPessoas | null>(null);
  const [filtroTipo, setFiltroTipo] = useState<EventoTipo | "todos">("todos");

  const tiposPresentes = Array.from(new Set(eventos.map((e) => e.tipo)));

  const eventosFiltrados =
    filtroTipo === "todos"
      ? eventos
      : eventos.filter((e) => e.tipo === filtroTipo);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Button
          onClick={() => {
            setEventoSel(null);
            setModalOpen(true);
          }}
          size="sm"
        >
          <Plus className="mr-1 size-4" />
          Novo evento
        </Button>

        <div className="flex flex-wrap gap-1.5">
          <button
            onClick={() => setFiltroTipo("todos")}
            className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
              filtroTipo === "todos"
                ? "bg-primary text-primary-foreground border-primary"
                : "border-border bg-background hover:bg-muted"
            }`}
          >
            Todos ({eventos.length})
          </button>
          {tiposPresentes.map((tipo) => {
            const count = eventos.filter((e) => e.tipo === tipo).length;
            return (
              <button
                key={tipo}
                onClick={() => setFiltroTipo(tipo)}
                className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                  filtroTipo === tipo
                    ? "bg-primary text-primary-foreground border-primary"
                    : "border-border bg-background hover:bg-muted"
                }`}
              >
                {EVENTO_TIPO_LABEL[tipo]} ({count})
              </button>
            );
          })}
        </div>
      </div>

      {eventosFiltrados.length === 0 ? (
        <p className="text-muted-foreground text-sm py-8 text-center">
          Nenhum evento cadastrado ainda.
        </p>
      ) : (
        <div className="divide-y rounded-lg border">
          {eventosFiltrados.map((ev) => {
            const isSingleDay = ev.data_inicio === ev.data_fim;
            return (
              <div
                key={ev.id}
                className="flex items-start gap-3 px-4 py-3 hover:bg-muted/30 cursor-pointer transition-colors"
                onClick={() => {
                  setEventoSel(ev);
                  setModalOpen(true);
                }}
              >
                <div
                  className="mt-1.5 size-2.5 shrink-0 rounded-full"
                  style={{
                    backgroundColor:
                      getEventoCor(ev),
                  }}
                />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">
                    {ev.emoji && <span className="mr-1">{ev.emoji}</span>}
                    {ev.titulo}
                  </p>
                  <p className="text-muted-foreground text-xs mt-0.5">
                    {isSingleDay
                      ? formatDate(ev.data_inicio)
                      : `${formatDate(ev.data_inicio)} – ${formatDate(ev.data_fim)}`}
                    {ev.pessoas.length > 0 && (
                      <span className="ml-2">
                        · {ev.pessoas.map((p) => p.nome).join(", ")}
                      </span>
                    )}
                    {ev.notas && (
                      <span className="ml-2">· {ev.notas}</span>
                    )}
                  </p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1">
                  <Badge variant="secondary" className="text-xs">
                    {EVENTO_TIPO_LABEL[ev.tipo]}
                  </Badge>
                  {ev.recorrente_anual && (
                    <span className="text-muted-foreground text-xs">↻ anual</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <EventoModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        evento={eventoSel}
        pessoas={pessoas}
      />
    </div>
  );
}
