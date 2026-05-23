"use client";

import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";

import { createEvento, deleteEvento, updateEvento } from "@/app/(app)/actions";
import { Button } from "@/components/ui/button";
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
import { Textarea } from "@/components/ui/textarea";
import { EVENTO_TIPO_LABEL } from "@/lib/types";
import type { Evento, EventoComPessoas, EventoTipo, Pessoa } from "@/lib/types";

type Props = {
  open: boolean;
  onClose: () => void;
  evento?: EventoComPessoas | null;
  defaultDate?: string;
  pessoas: Pessoa[];
};

const TIPOS = Object.entries(EVENTO_TIPO_LABEL) as [EventoTipo, string][];

export function EventoModal({
  open,
  onClose,
  evento,
  defaultDate,
  pessoas,
}: Props) {
  const [pending, startTransition] = useTransition();
  const [titulo, setTitulo] = useState("");
  const [tipo, setTipo] = useState<EventoTipo>("outro");
  const [dataInicio, setDataInicio] = useState(
    defaultDate ?? new Date().toISOString().split("T")[0],
  );
  const [dataFim, setDataFim] = useState(
    defaultDate ?? new Date().toISOString().split("T")[0],
  );
  const [notas, setNotas] = useState("");
  const [pessoasSel, setPessoasSel] = useState<string[]>([]);

  useEffect(() => {
    if (evento) {
      setTitulo(evento.titulo);
      setTipo(evento.tipo);
      setDataInicio(evento.data_inicio);
      setDataFim(evento.data_fim);
      setNotas(evento.notas ?? "");
      setPessoasSel(evento.pessoas.map((p) => p.id));
    } else {
      setTitulo("");
      setTipo("outro");
      setDataInicio(defaultDate ?? new Date().toISOString().split("T")[0]);
      setDataFim(defaultDate ?? new Date().toISOString().split("T")[0]);
      setNotas("");
      setPessoasSel([]);
    }
  }, [evento, defaultDate, open]);

  function togglePessoa(id: string) {
    setPessoasSel((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }

  function handleSave() {
    if (!titulo.trim()) return;
    startTransition(async () => {
      try {
        if (evento) {
          await updateEvento(evento.id, {
            titulo,
            tipo,
            data_inicio: dataInicio,
            data_fim: dataFim,
            notas: notas || null,
            pessoa_ids: pessoasSel,
          });
        } else {
          await createEvento({
            titulo,
            tipo,
            data_inicio: dataInicio,
            data_fim: dataFim,
            dia_todo: true,
            notas: notas || null,
            pessoa_ids: pessoasSel,
          });
        }
        toast.success(evento ? "Evento atualizado." : "Evento criado.");
        onClose();
      } catch (e: unknown) {
        toast.error(e instanceof Error ? e.message : "Erro ao salvar evento.");
      }
    });
  }

  function handleDelete() {
    if (!evento) return;
    startTransition(async () => {
      try {
        await deleteEvento(evento.id);
        toast.success("Evento excluído.");
        onClose();
      } catch (e: unknown) {
        toast.error(e instanceof Error ? e.message : "Erro ao excluir.");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {evento ? "Editar evento" : "Novo evento"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="titulo">Título</Label>
            <Input
              id="titulo"
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              placeholder="Ex: Viagem Disney"
              autoFocus
            />
          </div>

          <div className="space-y-1.5">
            <Label>Tipo</Label>
            <Select
              value={tipo}
              onValueChange={(v) => setTipo(v as EventoTipo)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TIPOS.map(([v, l]) => (
                  <SelectItem key={v} value={v}>
                    {l}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="data_inicio">Início</Label>
              <Input
                id="data_inicio"
                type="date"
                value={dataInicio}
                onChange={(e) => {
                  setDataInicio(e.target.value);
                  if (e.target.value > dataFim) setDataFim(e.target.value);
                }}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="data_fim">Fim</Label>
              <Input
                id="data_fim"
                type="date"
                value={dataFim}
                min={dataInicio}
                onChange={(e) => setDataFim(e.target.value)}
              />
            </div>
          </div>

          {pessoas.length > 0 && (
            <div className="space-y-1.5">
              <Label>Pessoas envolvidas</Label>
              <div className="flex flex-wrap gap-2">
                {pessoas.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => togglePessoa(p.id)}
                    className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                      pessoasSel.includes(p.id)
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-background hover:bg-muted"
                    }`}
                  >
                    {p.nome}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="notas">Notas (opcional)</Label>
            <Textarea
              id="notas"
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              rows={2}
              placeholder="Detalhes, informações relevantes…"
            />
          </div>
        </div>

        <DialogFooter className="gap-2">
          {evento && (
            <Button
              variant="destructive"
              size="sm"
              onClick={handleDelete}
              disabled={pending}
            >
              Excluir
            </Button>
          )}
          <Button variant="outline" onClick={onClose} disabled={pending}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={pending || !titulo.trim()}>
            {pending ? "Salvando…" : "Salvar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
