"use client";

import { useEffect, useState, useTransition } from "react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Edit2, GripVertical, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import {
  createPessoa,
  deletePessoa,
  updatePessoa,
  createTipoEvento,
  updateTipoEvento,
  deleteTipoEvento,
  reordenarTipos,
  upsertConfigFinanceira,
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
import { ColorPicker } from "@/components/ui/color-picker";
import { CARGO_LABEL } from "@/lib/types";
import type { Pessoa, PessoaCargo, PessoaTipo, TipoEvento, ConfigFinanceira } from "@/lib/types";

const CARGOS_FAMILIAR: PessoaCargo[] = ["adulto", "crianca"];
const CARGOS_FUNCIONARIO: PessoaCargo[] = [
  "baba",
  "diarista",
  "faxineira",
  "motorista",
  "outro",
];

// ─── Sortable row ────────────────────────────────────────────────────────────

function TipoRow({
  tipo,
  onEdit,
}: {
  tipo: TipoEvento;
  onEdit: (t: TipoEvento) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: tipo.id });

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`flex items-center gap-2 rounded-md border px-3 py-2 bg-background ${
        isDragging ? "opacity-50 shadow-lg" : ""
      }`}
    >
      <button
        type="button"
        className="cursor-grab touch-none text-muted-foreground/50 hover:text-muted-foreground active:cursor-grabbing shrink-0"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="size-4" />
      </button>
      <div className="size-3 shrink-0 rounded-full" style={{ backgroundColor: tipo.cor_hex }} />
      <span className="flex-1 text-sm font-medium">{tipo.label}</span>
      <Button variant="ghost" size="icon" className="size-7 shrink-0" onClick={() => onEdit(tipo)}>
        <Edit2 className="size-3.5" />
      </Button>
    </li>
  );
}

// ─── Props ───────────────────────────────────────────────────────────────────

type Props = {
  pessoas: Pessoa[];
  tipos: TipoEvento[];
  configFinanceira: ConfigFinanceira[];
};

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

export function ConfiguracoesCliente({
  pessoas,
  tipos: tiposInicial,
  configFinanceira: configInicial,
}: Props) {
  const [pending, startTransition] = useTransition();
  const [modalOpen, setModalOpen] = useState(false);
  const [editando, setEditando] = useState<Pessoa | null>(null);
  const [form, setForm] = useState<Form>(defaultForm());
  const [confirmaExcluir, setConfirmaExcluir] = useState(false);
  const [confirmaExcluirTipo, setConfirmaExcluirTipo] = useState(false);

  // Tipos de evento
  const [tipos, setTipos] = useState<TipoEvento[]>(tiposInicial);
  const [tipoModalOpen, setTipoModalOpen] = useState(false);
  const [tipoEditando, setTipoEditando] = useState<TipoEvento | null>(null);
  const [tipoForm, setTipoForm] = useState<TipoForm>(defaultTipoForm());

  // Configuração financeira — inline editing
  const [configFinanceira, setConfigFinanceira] = useState<
    Record<string, { salario_base: number; valor_vt_dia: number; valor_folguista_dia: number }>
  >(
    configInicial.reduce(
      (acc, cfg) => {
        acc[cfg.funcionario_id] = {
          salario_base: cfg.salario_base,
          valor_vt_dia: cfg.valor_vt_dia,
          valor_folguista_dia: cfg.valor_folguista_dia,
        };
        return acc;
      },
      {} as Record<string, { salario_base: number; valor_vt_dia: number; valor_folguista_dia: number }>,
    ),
  );

  // Sync local state when server revalidates (after create/edit/delete)
  useEffect(() => { setTipos(tiposInicial); }, [tiposInicial]);

  // DnD sensors
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setTipos((prev) => {
      const oldIndex = prev.findIndex((t) => t.id === active.id);
      const newIndex = prev.findIndex((t) => t.id === over.id);
      const nova = arrayMove(prev, oldIndex, newIndex);
      startTransition(async () => {
        try {
          await reordenarTipos(nova.map((t) => t.id));
        } catch {
          toast.error("Erro ao salvar ordem.");
        }
      });
      return nova;
    });
  }

  function openCriarTipo() {
    setTipoEditando(null);
    setTipoForm(defaultTipoForm());
    setConfirmaExcluirTipo(false);
    setTipoModalOpen(true);
  }

  function openEditarTipo(t: TipoEvento) {
    setTipoEditando(t);
    setTipoForm({ label: t.label, cor_hex: t.cor_hex });
    setConfirmaExcluirTipo(false);
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

  function openCriar(tipoInicial: PessoaTipo = "familiar") {
    setEditando(null);
    setForm({
      ...defaultForm(),
      tipo: tipoInicial,
      cargo: tipoInicial === "familiar" ? "adulto" : "baba",
    });
    setConfirmaExcluir(false);
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
    setConfirmaExcluir(false);
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
      try {
        await updatePessoa(p.id, { ativo: !p.ativo });
        toast.success(p.ativo ? "Marcado como inativo." : "Reativado.");
        setModalOpen(false);
      } catch (e: unknown) {
        toast.error(e instanceof Error ? e.message : "Erro ao atualizar.");
      }
    });
  }

  function handleSaveConfig(funcionario_id: string) {
    const cfg = configFinanceira[funcionario_id];
    if (!cfg) return;
    startTransition(async () => {
      try {
        await upsertConfigFinanceira({
          funcionario_id,
          salario_base: cfg.salario_base,
          valor_vt_dia: cfg.valor_vt_dia,
          valor_folguista_dia: cfg.valor_folguista_dia,
        });
        toast.success("Parâmetros salvos.");
      } catch (e: unknown) {
        toast.error(e instanceof Error ? e.message : "Erro ao salvar.");
      }
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
            <Button size="sm" variant="outline" onClick={() => openCriar("familiar")}>
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
            <Button size="sm" variant="outline" onClick={() => openCriar("funcionario")}>
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
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Parâmetros de Pagamento</CardTitle>
        </CardHeader>
        <CardContent>
          {funcionarios.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              Nenhum funcionário cadastrado.
            </p>
          ) : (
            <div className="space-y-3">
              {funcionarios.map((p) => {
                const cfg = configFinanceira[p.id] || {
                  salario_base: 0,
                  valor_vt_dia: 0,
                  valor_folguista_dia: 0,
                };
                return (
                  <div
                    key={p.id}
                    className="flex flex-wrap items-center gap-3 rounded-md border px-3 py-2"
                  >
                    <div
                      className="size-3 shrink-0 rounded-full"
                      style={{ backgroundColor: p.cor_hex }}
                    />
                    <span className="w-24 flex-shrink-0 text-sm font-medium">{p.nome}</span>
                    <div className="flex flex-1 basis-full gap-2 sm:basis-0">
                      <div className="flex-1">
                        <label className="block text-xs text-muted-foreground mb-1">
                          Salário base (R$)
                        </label>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          value={cfg.salario_base}
                          onChange={(e) =>
                            setConfigFinanceira({
                              ...configFinanceira,
                              [p.id]: { ...cfg, salario_base: parseFloat(e.target.value) || 0 },
                            })
                          }
                          className="h-8 text-sm"
                        />
                      </div>
                      <div className="flex-1">
                        <label className="block text-xs text-muted-foreground mb-1">
                          VT/dia (R$)
                        </label>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          value={cfg.valor_vt_dia}
                          onChange={(e) =>
                            setConfigFinanceira({
                              ...configFinanceira,
                              [p.id]: { ...cfg, valor_vt_dia: parseFloat(e.target.value) || 0 },
                            })
                          }
                          className="h-8 text-sm"
                        />
                      </div>
                      <div className="flex-1">
                        <label className="block text-xs text-muted-foreground mb-1">
                          Folguista/dia (R$)
                        </label>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          value={cfg.valor_folguista_dia}
                          onChange={(e) =>
                            setConfigFinanceira({
                              ...configFinanceira,
                              [p.id]: { ...cfg, valor_folguista_dia: parseFloat(e.target.value) || 0 },
                            })
                          }
                          className="h-8 text-sm"
                        />
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleSaveConfig(p.id)}
                      disabled={pending}
                      className="h-8"
                    >
                      Salvar
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex-row items-center justify-between pb-3">
          <CardTitle className="text-base">Categorias de evento</CardTitle>
          <Button size="sm" variant="outline" onClick={openCriarTipo}>
            <Plus className="mr-1 size-3.5" />
            Adicionar
          </Button>
        </CardHeader>
        <CardContent>
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={tipos.map((t) => t.id)} strategy={verticalListSortingStrategy}>
              <ul className="space-y-2">
                {tipos.map((t) => (
                  <TipoRow key={t.id} tipo={t} onEdit={openEditarTipo} />
                ))}
              </ul>
            </SortableContext>
          </DndContext>
        </CardContent>
      </Card>

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
              <ColorPicker
                value={tipoForm.cor_hex}
                onChange={(cor) => setTipoForm({ ...tipoForm, cor_hex: cor })}
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            {tipoEditando && (
              <Button
                variant="destructive"
                size="sm"
                onClick={() =>
                  confirmaExcluirTipo
                    ? handleDeleteTipo(tipoEditando.id)
                    : setConfirmaExcluirTipo(true)
                }
                disabled={pending}
              >
                <Trash2 className="mr-1 size-3.5" />
                {confirmaExcluirTipo ? "Confirmar exclusão" : "Remover"}
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
              <ColorPicker
                value={form.cor_hex}
                onChange={(cor) => setForm({ ...form, cor_hex: cor })}
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            {editando && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleToggleAtivo(editando)}
                  disabled={pending}
                >
                  {editando.ativo ? "Inativar" : "Reativar"}
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() =>
                    confirmaExcluir
                      ? handleDelete(editando.id)
                      : setConfirmaExcluir(true)
                  }
                  disabled={pending}
                >
                  <Trash2 className="mr-1 size-3.5" />
                  {confirmaExcluir ? "Confirmar exclusão" : "Remover"}
                </Button>
              </>
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
