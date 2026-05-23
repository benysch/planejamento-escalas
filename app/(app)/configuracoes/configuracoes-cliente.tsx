"use client";

import { useState, useTransition } from "react";
import { Edit2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import {
  createPessoa,
  deletePessoa,
  updatePessoa,
  createTipoEvento,
  updateTipoEvento,
  deleteTipoEvento,
  createRotina,
  updateRotina,
  deleteRotina,
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
import { CARGO_LABEL } from "@/lib/types";
import type { Pessoa, PessoaCargo, PessoaTipo, Rotina, TipoEvento } from "@/lib/types";

const CARGOS_FAMILIAR: PessoaCargo[] = ["adulto", "crianca"];
const CARGOS_FUNCIONARIO: PessoaCargo[] = [
  "baba",
  "diarista",
  "faxineira",
  "motorista",
  "outro",
];

const CORES = [
  "#6366f1",
  "#3b82f6",
  "#8b5cf6",
  "#ec4899",
  "#f59e0b",
  "#10b981",
  "#14b8a6",
  "#f97316",
  "#ef4444",
  "#6b7280",
];

const DIAS_ROTINA = [
  { value: 1, label: "Seg" },
  { value: 2, label: "Ter" },
  { value: 3, label: "Qua" },
  { value: 4, label: "Qui" },
  { value: 5, label: "Sex" },
];

type Props = { pessoas: Pessoa[]; tipos: TipoEvento[]; rotinas: Rotina[] };

type Form = {
  nome: string;
  tipo: PessoaTipo;
  cargo: PessoaCargo;
  cor_hex: string;
};

function defaultForm(): Form {
  return { nome: "", tipo: "familiar", cargo: "adulto", cor_hex: "#6366f1" };
}

type TipoForm = { label: string; cor_hex: string };
function defaultTipoForm(): TipoForm {
  return { label: "", cor_hex: "#6366f1" };
}

export function ConfiguracoesCliente({ pessoas, tipos, rotinas }: Props) {
  const [pending, startTransition] = useTransition();
  const [modalOpen, setModalOpen] = useState(false);
  const [editando, setEditando] = useState<Pessoa | null>(null);
  const [form, setForm] = useState<Form>(defaultForm());

  // Tipos de evento
  const [tipoModalOpen, setTipoModalOpen] = useState(false);
  const [tipoEditando, setTipoEditando] = useState<TipoEvento | null>(null);
  const [tipoForm, setTipoForm] = useState<TipoForm>(defaultTipoForm());

  // Rotinas
  const [diaSel, setDiaSel] = useState(1);
  const [rotinaModalOpen, setRotinaModalOpen] = useState(false);
  const [rotinaEditando, setRotinaEditando] = useState<Rotina | null>(null);
  const [rotinaTexto, setRotinaTexto] = useState("");
  const [rotinaHora, setRotinaHora] = useState("");

  function openCriarRotina() {
    setRotinaEditando(null);
    setRotinaTexto("");
    setRotinaHora("");
    setRotinaModalOpen(true);
  }

  function openEditarRotina(r: Rotina) {
    setRotinaEditando(r);
    setRotinaTexto(r.texto);
    setRotinaHora(r.hora ?? "");
    setRotinaModalOpen(true);
  }

  function handleSaveRotina() {
    if (!rotinaTexto.trim()) return;
    startTransition(async () => {
      try {
        if (rotinaEditando) {
          await updateRotina(rotinaEditando.id, {
            texto: rotinaTexto.trim(),
            hora: rotinaHora.trim() || null,
          });
          toast.success("Rotina atualizada.");
        } else {
          await createRotina({
            dia_semana: diaSel,
            texto: rotinaTexto.trim(),
            hora: rotinaHora.trim() || null,
          });
          toast.success("Rotina adicionada.");
        }
        setRotinaModalOpen(false);
      } catch (e: unknown) {
        toast.error(e instanceof Error ? e.message : "Erro ao salvar.");
      }
    });
  }

  function handleDeleteRotina(id: string) {
    startTransition(async () => {
      try {
        await deleteRotina(id);
        toast.success("Rotina removida.");
        setRotinaModalOpen(false);
      } catch (e: unknown) {
        toast.error(e instanceof Error ? e.message : "Erro ao remover.");
      }
    });
  }

  const rotinasDia = rotinas.filter((r) => r.dia_semana === diaSel);

  function openCriarTipo() {
    setTipoEditando(null);
    setTipoForm(defaultTipoForm());
    setTipoModalOpen(true);
  }

  function openEditarTipo(t: TipoEvento) {
    setTipoEditando(t);
    setTipoForm({ label: t.label, cor_hex: t.cor_hex });
    setTipoModalOpen(true);
  }

  function handleSaveTipo() {
    if (!tipoForm.label.trim()) return;
    startTransition(async () => {
      try {
        if (tipoEditando) {
          await updateTipoEvento(tipoEditando.id, tipoForm);
          toast.success("Categoria atualizada.");
        } else {
          await createTipoEvento(tipoForm);
          toast.success("Categoria criada.");
        }
        setTipoModalOpen(false);
      } catch (e: unknown) {
        toast.error(e instanceof Error ? e.message : "Erro ao salvar.");
      }
    });
  }

  function handleDeleteTipo(id: string) {
    startTransition(async () => {
      try {
        await deleteTipoEvento(id);
        toast.success("Categoria removida.");
        setTipoModalOpen(false);
      } catch (e: unknown) {
        toast.error(e instanceof Error ? e.message : "Erro ao remover.");
      }
    });
  }

  function openCriar() {
    setEditando(null);
    setForm(defaultForm());
    setModalOpen(true);
  }

  function openEditar(p: Pessoa) {
    setEditando(p);
    setForm({
      nome: p.nome,
      tipo: p.tipo,
      cargo: (p.cargo as PessoaCargo) ?? "adulto",
      cor_hex: p.cor_hex,
    });
    setModalOpen(true);
  }

  function handleSave() {
    if (!form.nome.trim()) return;
    startTransition(async () => {
      try {
        if (editando) {
          await updatePessoa(editando.id, form);
          toast.success("Pessoa atualizada.");
        } else {
          await createPessoa({
            ...form,
            cargo: form.cargo,
          });
          toast.success("Pessoa adicionada.");
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
        await deletePessoa(id);
        toast.success("Removido.");
        setModalOpen(false);
      } catch (e: unknown) {
        toast.error(e instanceof Error ? e.message : "Erro ao remover.");
      }
    });
  }

  function handleToggleAtivo(p: Pessoa) {
    startTransition(async () => {
      await updatePessoa(p.id, { ativo: !p.ativo });
      toast.success(p.ativo ? "Marcado como inativo." : "Reativado.");
    });
  }

  const familia = pessoas.filter((p) => p.tipo === "familiar");
  const funcionarios = pessoas.filter((p) => p.tipo === "funcionario");

  const cargosDisponiveis =
    form.tipo === "familiar" ? CARGOS_FAMILIAR : CARGOS_FUNCIONARIO;

  return (
    <>
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader className="flex-row items-center justify-between pb-3">
            <CardTitle className="text-base">Família</CardTitle>
            <Button size="sm" variant="outline" onClick={openCriar}>
              <Plus className="mr-1 size-3.5" />
              Adicionar
            </Button>
          </CardHeader>
          <CardContent>
            {familia.length === 0 ? (
              <p className="text-muted-foreground text-sm">
                Nenhum membro familiar cadastrado.
              </p>
            ) : (
              <ul className="space-y-2">
                {familia.map((p) => (
                  <li
                    key={p.id}
                    className="flex items-center gap-2 rounded-md border px-3 py-2"
                  >
                    <div
                      className="size-3 shrink-0 rounded-full"
                      style={{ backgroundColor: p.cor_hex }}
                    />
                    <span className="flex-1 text-sm font-medium">{p.nome}</span>
                    <Badge variant="secondary" className="text-xs">
                      {CARGO_LABEL[(p.cargo as PessoaCargo) ?? "adulto"]}
                    </Badge>
                    {!p.ativo && (
                      <Badge variant="outline" className="text-xs text-muted-foreground">
                        Inativo
                      </Badge>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-7"
                      onClick={() => openEditar(p)}
                    >
                      <Edit2 className="size-3.5" />
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center justify-between pb-3">
            <CardTitle className="text-base">Funcionários</CardTitle>
            <Button size="sm" variant="outline" onClick={openCriar}>
              <Plus className="mr-1 size-3.5" />
              Adicionar
            </Button>
          </CardHeader>
          <CardContent>
            {funcionarios.length === 0 ? (
              <p className="text-muted-foreground text-sm">
                Nenhum funcionário cadastrado.
              </p>
            ) : (
              <ul className="space-y-2">
                {funcionarios.map((p) => (
                  <li
                    key={p.id}
                    className="flex items-center gap-2 rounded-md border px-3 py-2"
                  >
                    <div
                      className="size-3 shrink-0 rounded-full"
                      style={{ backgroundColor: p.cor_hex }}
                    />
                    <span className="flex-1 text-sm font-medium">{p.nome}</span>
                    <Badge variant="secondary" className="text-xs">
                      {CARGO_LABEL[(p.cargo as PessoaCargo) ?? "outro"]}
                    </Badge>
                    {!p.ativo && (
                      <Badge variant="outline" className="text-xs text-muted-foreground">
                        Inativo
                      </Badge>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-7"
                      onClick={() => openEditar(p)}
                    >
                      <Edit2 className="size-3.5" />
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex-row items-center justify-between pb-3">
          <CardTitle className="text-base">Categorias de evento</CardTitle>
          <Button size="sm" variant="outline" onClick={openCriarTipo}>
            <Plus className="mr-1 size-3.5" />
            Adicionar
          </Button>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2">
            {tipos.map((t) => (
              <li
                key={t.id}
                className="flex items-center gap-2 rounded-md border px-3 py-2"
              >
                <div
                  className="size-3 shrink-0 rounded-full"
                  style={{ backgroundColor: t.cor_hex }}
                />
                <span className="flex-1 text-sm font-medium">{t.label}</span>
                {t.sistema && (
                  <Badge variant="outline" className="text-xs text-muted-foreground">
                    padrão
                  </Badge>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-7"
                  onClick={() => openEditarTipo(t)}
                >
                  <Edit2 className="size-3.5" />
                </Button>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex-row items-center justify-between pb-3">
          <CardTitle className="text-base">Rotinas semanais</CardTitle>
          <Button size="sm" variant="outline" onClick={openCriarRotina}>
            <Plus className="mr-1 size-3.5" />
            Adicionar
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-1">
            {DIAS_ROTINA.map((d) => (
              <button
                key={d.value}
                type="button"
                onClick={() => setDiaSel(d.value)}
                className={`flex-1 rounded py-1.5 text-sm font-medium transition-colors ${
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
            <p className="text-muted-foreground text-sm py-2 text-center">
              Nenhuma rotina para este dia.
            </p>
          ) : (
            <ul className="space-y-1.5">
              {rotinasDia.map((r) => (
                <li
                  key={r.id}
                  className="flex items-center gap-2 rounded-md border px-3 py-2"
                >
                  {r.hora ? (
                    <span className="shrink-0 text-xs font-medium text-muted-foreground w-24">
                      {r.hora}
                    </span>
                  ) : (
                    <span className="w-24 shrink-0" />
                  )}
                  <span className="flex-1 text-sm">{r.texto}</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-7"
                    onClick={() => openEditarRotina(r)}
                  >
                    <Edit2 className="size-3.5" />
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Dialog open={rotinaModalOpen} onOpenChange={(v) => !v && setRotinaModalOpen(false)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>
              {rotinaEditando ? "Editar rotina" : `Nova rotina — ${DIAS_ROTINA.find((d) => d.value === diaSel)?.label}`}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Descrição</Label>
              <Input
                value={rotinaTexto}
                onChange={(e) => setRotinaTexto(e.target.value)}
                autoFocus
                placeholder="Ex: Lia — Ballet"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Horário (opcional)</Label>
              <Input
                value={rotinaHora}
                onChange={(e) => setRotinaHora(e.target.value)}
                placeholder="Ex: 15:15 – 16:00"
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            {rotinaEditando && (
              <Button
                variant="destructive"
                size="sm"
                onClick={() => handleDeleteRotina(rotinaEditando.id)}
                disabled={pending}
              >
                <Trash2 className="mr-1 size-3.5" />
                Remover
              </Button>
            )}
            <Button
              variant="outline"
              onClick={() => setRotinaModalOpen(false)}
              disabled={pending}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSaveRotina}
              disabled={pending || !rotinaTexto.trim()}
            >
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={tipoModalOpen} onOpenChange={(v) => !v && setTipoModalOpen(false)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>
              {tipoEditando ? "Editar categoria" : "Nova categoria"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Nome</Label>
              <Input
                value={tipoForm.label}
                onChange={(e) => setTipoForm({ ...tipoForm, label: e.target.value })}
                autoFocus
                placeholder="Ex: Festas"
              />
            </div>

            <div className="space-y-1.5">
              <Label>Cor no calendário</Label>
              <div className="flex flex-wrap gap-2">
                {CORES.map((cor) => (
                  <button
                    key={cor}
                    type="button"
                    onClick={() => setTipoForm({ ...tipoForm, cor_hex: cor })}
                    className={`size-7 rounded-full border-2 transition-transform hover:scale-110 ${
                      tipoForm.cor_hex === cor
                        ? "border-foreground scale-110"
                        : "border-transparent"
                    }`}
                    style={{ backgroundColor: cor }}
                  />
                ))}
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2">
            {tipoEditando && !tipoEditando.sistema && (
              <Button
                variant="destructive"
                size="sm"
                onClick={() => handleDeleteTipo(tipoEditando.id)}
                disabled={pending}
              >
                <Trash2 className="mr-1 size-3.5" />
                Remover
              </Button>
            )}
            <Button
              variant="outline"
              onClick={() => setTipoModalOpen(false)}
              disabled={pending}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSaveTipo}
              disabled={pending || !tipoForm.label.trim()}
            >
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={modalOpen} onOpenChange={(v) => !v && setModalOpen(false)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>
              {editando ? "Editar pessoa" : "Nova pessoa"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Nome</Label>
              <Input
                value={form.nome}
                onChange={(e) => setForm({ ...form, nome: e.target.value })}
                autoFocus
                placeholder="Nome completo"
              />
            </div>

            <div className="space-y-1.5">
              <Label>Tipo</Label>
              <Select
                value={form.tipo}
                onValueChange={(v) => {
                  const tipo = v as PessoaTipo;
                  const cargo =
                    tipo === "familiar" ? "adulto" : "baba";
                  setForm({ ...form, tipo, cargo });
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="familiar">Familiar</SelectItem>
                  <SelectItem value="funcionario">Funcionário</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Cargo / Função</Label>
              <Select
                value={form.cargo}
                onValueChange={(v) =>
                  setForm({ ...form, cargo: v as PessoaCargo })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {cargosDisponiveis.map((c) => (
                    <SelectItem key={c} value={c}>
                      {CARGO_LABEL[c]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Cor no calendário</Label>
              <div className="flex flex-wrap gap-2">
                {CORES.map((cor) => (
                  <button
                    key={cor}
                    type="button"
                    onClick={() => setForm({ ...form, cor_hex: cor })}
                    className={`size-7 rounded-full border-2 transition-transform hover:scale-110 ${
                      form.cor_hex === cor
                        ? "border-foreground scale-110"
                        : "border-transparent"
                    }`}
                    style={{ backgroundColor: cor }}
                  />
                ))}
              </div>
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
            <Button
              onClick={handleSave}
              disabled={pending || !form.nome.trim()}
            >
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
