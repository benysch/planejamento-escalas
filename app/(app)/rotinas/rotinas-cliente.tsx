"use client";

import { useState, useTransition } from "react";
import { Edit2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { createRotina, updateRotina, deleteRotina } from "@/app/(app)/actions";
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
import type { Rotina } from "@/lib/types";

const DIAS = [
  { value: 1, label: "Seg", nome: "Segunda-feira" },
  { value: 2, label: "Ter", nome: "Terça-feira" },
  { value: 3, label: "Qua", nome: "Quarta-feira" },
  { value: 4, label: "Qui", nome: "Quinta-feira" },
  { value: 5, label: "Sex", nome: "Sexta-feira" },
];

type Props = { rotinas: Rotina[] };

export function RotinasCliente({ rotinas }: Props) {
  const [pending, startTransition] = useTransition();
  const [diaSel, setDiaSel] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);
  const [editando, setEditando] = useState<Rotina | null>(null);
  const [texto, setTexto] = useState("");
  const [hora, setHora] = useState("");

  function openCriar() {
    setEditando(null);
    setTexto("");
    setHora("");
    setModalOpen(true);
  }

  function openEditar(r: Rotina) {
    setEditando(r);
    setTexto(r.texto);
    setHora(r.hora ?? "");
    setModalOpen(true);
  }

  function handleSave() {
    if (!texto.trim()) return;
    startTransition(async () => {
      try {
        if (editando) {
          await updateRotina(editando.id, {
            texto: texto.trim(),
            hora: hora.trim() || null,
          });
          toast.success("Rotina atualizada.");
        } else {
          await createRotina({
            dia_semana: diaSel,
            texto: texto.trim(),
            hora: hora.trim() || null,
          });
          toast.success("Rotina adicionada.");
        }
        setModalOpen(false);
      } catch (e: unknown) {
        toast.error(e instanceof Error ? e.message : "Erro ao salvar.");
      }
    });
  }

  function handleDelete(id: string) {
    startTransition(async () => {
      try {
        await deleteRotina(id);
        toast.success("Rotina removida.");
        setModalOpen(false);
      } catch (e: unknown) {
        toast.error(e instanceof Error ? e.message : "Erro ao remover.");
      }
    });
  }

  const rotinasDia = rotinas.filter((r) => r.dia_semana === diaSel);
  const diaAtual = DIAS.find((d) => d.value === diaSel)!;

  return (
    <>
      <Card>
        <CardHeader className="flex-row items-center justify-between pb-3">
          <CardTitle className="text-base">{diaAtual.nome}</CardTitle>
          <Button size="sm" variant="outline" onClick={openCriar}>
            <Plus className="mr-1 size-3.5" />
            Adicionar
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-1">
            {DIAS.map((d) => (
              <button
                key={d.value}
                type="button"
                onClick={() => setDiaSel(d.value)}
                className={`flex-1 rounded py-2 text-sm font-medium transition-colors ${
                  diaSel === d.value
                    ? "bg-primary text-primary-foreground"
                    : "hover:bg-muted"
                }`}
              >
                {d.label}
              </button>
            ))}
          </div>

          {rotinasDia.length === 0 ? (
            <p className="text-muted-foreground text-sm py-4 text-center">
              Nenhuma rotina para {diaAtual.nome.toLowerCase()}.
            </p>
          ) : (
            <ul className="divide-y">
              {rotinasDia.map((r) => (
                <li key={r.id} className="flex items-center gap-3 py-2.5">
                  {r.hora ? (
                    <span className="shrink-0 text-xs font-medium tabular-nums text-muted-foreground w-20 sm:w-24">
                      {r.hora}
                    </span>
                  ) : (
                    <span className="w-20 shrink-0 sm:w-24" />
                  )}
                  <span className="flex-1 text-sm">{r.texto}</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-8 shrink-0"
                    onClick={() => openEditar(r)}
                  >
                    <Edit2 className="size-3.5" />
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Dialog open={modalOpen} onOpenChange={(v) => !v && setModalOpen(false)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>
              {editando ? "Editar rotina" : `Nova rotina — ${diaAtual.nome}`}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Descrição</Label>
              <Input
                value={texto}
                onChange={(e) => setTexto(e.target.value)}
                autoFocus
                placeholder="Ex: Lia — Ballet"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Horário (opcional)</Label>
              <Input
                value={hora}
                onChange={(e) => setHora(e.target.value)}
                placeholder="Ex: 15:15 – 16:00"
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            {editando && (
              <Button
                variant="destructive"
                size="sm"
                onClick={() => handleDelete(editando.id)}
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
            <Button onClick={handleSave} disabled={pending || !texto.trim()}>
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
