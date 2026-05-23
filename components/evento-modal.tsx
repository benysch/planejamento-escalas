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
import { EMOJIS_EVENTO, EVENTO_TIPO_LABEL } from "@/lib/types";
import type { EventoComPessoas, EventoTipo, Pessoa } from "@/lib/types";

const CORES_FAMILIA = [
  "#3b82f6", // azul
  "#8b5cf6", // roxo
  "#ec4899", // rosa
  "#f59e0b", // âmbar
  "#f97316", // laranja
  "#ef4444", // vermelho
  "#10b981", // verde
  "#14b8a6", // teal
  "#6366f1", // índigo
  "#6b7280", // cinza
];

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
  const [corEvento, setCorEvento] = useState<string>(CORES_FAMILIA[0]);
  const [emojiSel, setEmojiSel] = useState<string | null>(null);

  // IDs dos funcionários para detectar quando a cor vem deles
  const funcionarios = pessoas.filter((p) => p.tipo === "funcionario");
  const familiares = pessoas.filter((p) => p.tipo === "familiar");
  const funcionariosSel = pessoasSel.filter((id) =>
    funcionarios.some((f) => f.id === id),
  );
  const temFuncionario = funcionariosSel.length > 0;

  useEffect(() => {
    if (evento) {
      setTitulo(evento.titulo);
      setTipo(evento.tipo);
      setDataInicio(evento.data_inicio);
      setDataFim(evento.data_fim);
      setNotas(evento.notas ?? "");
      setPessoasSel(evento.pessoas.map((p) => p.id));
      setCorEvento(evento.cor_hex ?? CORES_FAMILIA[0]);
      setEmojiSel(evento.emoji ?? null);
    } else {
      setTitulo("");
      setTipo("outro");
      setDataInicio(defaultDate ?? new Date().toISOString().split("T")[0]);
      setDataFim(defaultDate ?? new Date().toISOString().split("T")[0]);
      setNotas("");
      setPessoasSel([]);
      setCorEvento(CORES_FAMILIA[0]);
      setEmojiSel(null);
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
        const corFinal = temFuncionario ? null : corEvento;
        if (evento) {
          await updateEvento(evento.id, {
            titulo,
            tipo,
            data_inicio: dataInicio,
            data_fim: dataFim,
            notas: notas || null,
            cor_hex: corFinal,
            emoji: emojiSel,
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
            cor_hex: corFinal,
            emoji: emojiSel,
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
            <div className="space-y-2">
              {familiares.length > 0 && (
                <div className="space-y-1.5">
                  <Label>Família</Label>
                  <div className="flex flex-wrap gap-2">
                    {familiares.map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => togglePessoa(p.id)}
                        className={`flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                          pessoasSel.includes(p.id)
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-border bg-background hover:bg-muted"
                        }`}
                      >
                        <div
                          className="size-2 rounded-full"
                          style={{ backgroundColor: p.cor_hex }}
                        />
                        {p.nome}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {funcionarios.length > 0 && (
                <div className="space-y-1.5">
                  <Label>Funcionários</Label>
                  <div className="flex flex-wrap gap-2">
                    {funcionarios.map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => togglePessoa(p.id)}
                        className={`flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                          pessoasSel.includes(p.id)
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-border bg-background hover:bg-muted"
                        }`}
                      >
                        <div
                          className="size-2 rounded-full"
                          style={{ backgroundColor: p.cor_hex }}
                        />
                        {p.nome}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Cor do evento: só para eventos sem funcionários */}
          {temFuncionario ? (
            <div className="flex items-center gap-2 rounded-md bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
              <div className="flex gap-1">
                {funcionariosSel.map((id) => {
                  const f = funcionarios.find((x) => x.id === id);
                  return f ? (
                    <div
                      key={id}
                      className="size-3 rounded-full border border-white/50"
                      style={{ backgroundColor: f.cor_hex }}
                    />
                  ) : null;
                })}
              </div>
              Cor do calendário vem do(s) funcionário(s) selecionado(s).
            </div>
          ) : (
            <div className="space-y-1.5">
              <Label>Cor no calendário</Label>
              <div className="flex flex-wrap gap-2">
                {CORES_FAMILIA.map((cor) => (
                  <button
                    key={cor}
                    type="button"
                    onClick={() => setCorEvento(cor)}
                    className={`size-7 rounded-full border-2 transition-transform hover:scale-110 ${
                      corEvento === cor
                        ? "border-foreground scale-110"
                        : "border-transparent"
                    }`}
                    style={{ backgroundColor: cor }}
                  />
                ))}
              </div>
            </div>
          )}

          <div className="space-y-1.5">
            <Label>Emoji (opcional)</Label>
            <div className="flex flex-wrap gap-1.5">
              {EMOJIS_EVENTO.map(({ emoji, label }) => (
                <button
                  key={emoji}
                  type="button"
                  title={label}
                  onClick={() =>
                    setEmojiSel((prev) => (prev === emoji ? null : emoji))
                  }
                  className={`flex size-9 items-center justify-center rounded-lg border text-xl transition-colors ${
                    emojiSel === emoji
                      ? "border-primary bg-primary/10 ring-1 ring-primary"
                      : "border-border bg-background hover:bg-muted"
                  }`}
                >
                  {emoji}
                </button>
              ))}
            </div>
            {emojiSel && (
              <button
                type="button"
                onClick={() => setEmojiSel(null)}
                className="text-muted-foreground text-xs hover:underline"
              >
                Remover emoji
              </button>
            )}
          </div>

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
