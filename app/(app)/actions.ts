"use server";

import { revalidatePath } from "next/cache";

import { getSupabase } from "@/lib/supabase/server";
import type { EventoTipo, PessoaCargo, PessoaTipo } from "@/lib/types";

// ─── Pessoas ────────────────────────────────────────────────────────────────

export async function createPessoa(data: {
  nome: string;
  tipo: PessoaTipo;
  cargo: PessoaCargo | null;
  cor_hex: string;
}) {
  const sb = getSupabase();
  const { error } = await sb.from("pe_pessoas").insert(data);
  if (error) throw new Error(error.message);
  revalidatePath("/", "layout");
}

export async function updatePessoa(
  id: string,
  data: {
    nome?: string;
    tipo?: PessoaTipo;
    cargo?: PessoaCargo | null;
    cor_hex?: string;
    ativo?: boolean;
  },
) {
  const sb = getSupabase();
  const { error } = await sb.from("pe_pessoas").update(data).eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/", "layout");
}

export async function deletePessoa(id: string) {
  const sb = getSupabase();
  const { error } = await sb.from("pe_pessoas").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/", "layout");
}

// ─── Eventos ────────────────────────────────────────────────────────────────

export async function createEvento(data: {
  titulo: string;
  tipo: EventoTipo;
  data_inicio: string;
  data_fim: string;
  dia_todo: boolean;
  notas?: string | null;
  cor_hex?: string | null;
  emoji?: string | null;
  trava_agenda?: boolean;
  pessoa_ids?: string[];
}) {
  const sb = getSupabase();
  const { pessoa_ids = [], ...eventoData } = data;

  const { data: evento, error } = await sb
    .from("pe_eventos")
    .insert(eventoData)
    .select("id")
    .single();
  if (error) throw new Error(error.message);

  if (pessoa_ids.length > 0) {
    const links = pessoa_ids.map((pessoa_id) => ({
      evento_id: evento.id,
      pessoa_id,
    }));
    const { error: linkError } = await sb
      .from("pe_evento_pessoas")
      .insert(links);
    if (linkError) throw new Error(linkError.message);
  }

  revalidatePath("/", "layout");
  return evento.id;
}

export async function updateEvento(
  id: string,
  data: {
    titulo?: string;
    tipo?: EventoTipo;
    data_inicio?: string;
    data_fim?: string;
    dia_todo?: boolean;
    notas?: string | null;
    cor_hex?: string | null;
    emoji?: string | null;
    trava_agenda?: boolean;
    pessoa_ids?: string[];
  },
) {
  const sb = getSupabase();
  const { pessoa_ids, ...eventoData } = data;

  const { error } = await sb.from("pe_eventos").update(eventoData).eq("id", id);
  if (error) throw new Error(error.message);

  if (pessoa_ids !== undefined) {
    await sb.from("pe_evento_pessoas").delete().eq("evento_id", id);
    if (pessoa_ids.length > 0) {
      const links = pessoa_ids.map((pessoa_id) => ({ evento_id: id, pessoa_id }));
      const { error: linkError } = await sb
        .from("pe_evento_pessoas")
        .insert(links);
      if (linkError) throw new Error(linkError.message);
    }
  }

  revalidatePath("/", "layout");
}

export async function deleteEvento(id: string) {
  const sb = getSupabase();
  const { error } = await sb.from("pe_eventos").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/", "layout");
}

// ─── Escala Mensal ──────────────────────────────────────────────────────────

export async function upsertEscalaMensal(data: {
  funcionario_id: string;
  mes: number;
  ano: number;
  dias_trabalhados: number;
  dias_programados: number;
  saldo_vt: number;
  notas?: string | null;
}) {
  const sb = getSupabase();
  const { error } = await sb
    .from("pe_escala_mensal")
    .upsert(data, { onConflict: "funcionario_id,mes,ano" });
  if (error) throw new Error(error.message);
  revalidatePath("/funcionarios");
}
