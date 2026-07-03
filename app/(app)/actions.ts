"use server";

import { revalidatePath } from "next/cache";

import { getSupabase } from "@/lib/supabase/server";
import { MESES } from "@/lib/types";
import type { PessoaCargo, PessoaTipo } from "@/lib/types";

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
  tipo: string;
  data_inicio: string;
  data_fim: string;
  dia_todo: boolean;
  notas?: string | null;
  cor_hex?: string | null;
  emoji?: string | null;
  trava_agenda?: boolean;
  recorrente_anual?: boolean;
  faixa_horario?: string | null;
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
    tipo?: string;
    data_inicio?: string;
    data_fim?: string;
    dia_todo?: boolean;
    notas?: string | null;
    cor_hex?: string | null;
    emoji?: string | null;
    trava_agenda?: boolean;
    recorrente_anual?: boolean;
    faixa_horario?: string | null;
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

// ─── Tipos de Evento ────────────────────────────────────────────────────────

function slugify(label: string): string {
  return label
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\s+/g, "_")
    .replace(/[^a-z0-9_]/g, "");
}

export async function createTipoEvento(data: { label: string; cor_hex: string }) {
  const sb = getSupabase();
  const slug = slugify(data.label);
  const { data: last } = await sb
    .from("pe_evento_tipos")
    .select("ordem")
    .order("ordem", { ascending: false })
    .limit(1)
    .single();
  const ordem = (last?.ordem ?? 0) + 1;
  const { error } = await sb
    .from("pe_evento_tipos")
    .insert({ slug, label: data.label, cor_hex: data.cor_hex, sistema: false, ordem });
  if (error) throw new Error(error.message);
  revalidatePath("/", "layout");
}

export async function updateTipoEvento(
  id: string,
  data: { label?: string; cor_hex?: string },
) {
  const sb = getSupabase();
  const update: Record<string, string> = {};
  if (data.label !== undefined) {
    update.label = data.label;
    update.slug = slugify(data.label);
  }
  if (data.cor_hex !== undefined) update.cor_hex = data.cor_hex;
  const { error } = await sb.from("pe_evento_tipos").update(update).eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/", "layout");
}

export async function deleteTipoEvento(id: string) {
  const sb = getSupabase();
  const { error } = await sb.from("pe_evento_tipos").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/", "layout");
}

export async function reordenarTipos(ids: string[]) {
  const sb = getSupabase();
  await Promise.all(
    ids.map((id, i) =>
      sb.from("pe_evento_tipos").update({ ordem: i + 1 }).eq("id", id),
    ),
  );
  revalidatePath("/", "layout");
}

// ─── Rotinas ────────────────────────────────────────────────────────────────

export async function createRotina(data: {
  dia_semana: number;
  texto: string;
  hora?: string | null;
}) {
  const sb = getSupabase();
  const { data: last } = await sb
    .from("pe_rotinas")
    .select("ordem")
    .eq("dia_semana", data.dia_semana)
    .order("ordem", { ascending: false })
    .limit(1)
    .single();
  const ordem = (last?.ordem ?? 0) + 1;
  const { error } = await sb.from("pe_rotinas").insert({ ...data, ordem });
  if (error) throw new Error(error.message);
  revalidatePath("/", "layout");
}

export async function updateRotina(
  id: string,
  data: { texto?: string; hora?: string | null },
) {
  const sb = getSupabase();
  const { error } = await sb.from("pe_rotinas").update(data).eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/", "layout");
}

export async function deleteRotina(id: string) {
  const sb = getSupabase();
  const { error } = await sb.from("pe_rotinas").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/", "layout");
}

// ─── Escala Dias ────────────────────────────────────────────────────────────

export async function toggleEscalaDia(
  funcionario_id: string,
  data: string,
  obs?: string | null,
) {
  const sb = getSupabase();
  const { data: existing } = await sb
    .from("pe_escala_dias")
    .select("tipo_alocacao")
    .eq("funcionario_id", funcionario_id)
    .eq("data", data)
    .maybeSingle();

  if (!existing) {
    // não existe → insert tipo='normal'
    const { error } = await sb.from("pe_escala_dias").insert({
      funcionario_id,
      data,
      tipo_alocacao: "normal",
      obs: null,
    });
    if (error) throw new Error(error.message);
  } else if (existing.tipo_alocacao === "normal") {
    // normal → update para 'folguista'
    const { error } = await sb
      .from("pe_escala_dias")
      .update({ tipo_alocacao: "folguista", obs: null })
      .eq("funcionario_id", funcionario_id)
      .eq("data", data);
    if (error) throw new Error(error.message);
  } else if (existing.tipo_alocacao === "folguista") {
    // folguista → update para 'especial'
    const { error } = await sb
      .from("pe_escala_dias")
      .update({ tipo_alocacao: "especial", obs: obs ?? null })
      .eq("funcionario_id", funcionario_id)
      .eq("data", data);
    if (error) throw new Error(error.message);
  } else if (existing.tipo_alocacao === "especial") {
    // especial → delete
    const { error } = await sb
      .from("pe_escala_dias")
      .delete()
      .eq("funcionario_id", funcionario_id)
      .eq("data", data);
    if (error) throw new Error(error.message);
  }
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

// ─── Configuração Financeira ────────────────────────────────────────────────

export async function upsertConfigFinanceira(data: {
  funcionario_id: string;
  salario_base: number;
  valor_vt_dia: number;
  valor_folguista_dia: number;
}) {
  const sb = getSupabase();
  const { error } = await sb
    .from("pe_config_financeira")
    .upsert(data, { onConflict: "funcionario_id" });
  if (error) throw new Error(error.message);
  revalidatePath("/configuracoes");
}

// ─── Pagamentos ─────────────────────────────────────────────────────────────

export async function deletePagamento(id: string) {
  const sb = getSupabase();
  const { error } = await sb.from("pe_pagamentos").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/pagamentos");
}

export async function marcarPago(
  id: string,
  pago: boolean,
  dataPagamento?: string | null,
) {
  const sb = getSupabase();
  const { error } = await sb
    .from("pe_pagamentos")
    .update({ pago, data_pagamento: dataPagamento ?? null })
    .eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/pagamentos");
}

// ─── Fluxo de pagamentos (por bloco) ────────────────────────────────────────

export async function marcarBlocoFuncionariaPago(
  funcionario_id: string,
  mes: number,
  ano: number,
  pago: boolean,
  data_pagamento?: string | null,
) {
  const sb = getSupabase();

  // Sem upsert por onConflict: pe_pagamentos não tem unique nessas colunas.
  const { data: existente, error: selError } = await sb
    .from("pe_pagamentos")
    .select("id")
    .eq("funcionario_id", funcionario_id)
    .eq("mes", mes)
    .eq("ano", ano)
    .eq("tipo_pagamento", "resumo")
    .maybeSingle();
  if (selError) throw new Error(selError.message);

  const registro = {
    funcionario_id,
    mes,
    ano,
    despesa: `Resumo ${MESES[mes - 1]} ${ano}`,
    tipo_pagamento: "resumo",
    valor: 0,
    pago,
    data_pagamento: pago ? (data_pagamento ?? null) : null,
    observacao: null,
  };

  const { error } = existente
    ? await sb.from("pe_pagamentos").update(registro).eq("id", existente.id)
    : await sb.from("pe_pagamentos").insert(registro);

  if (error) throw new Error(error.message);
  revalidatePath("/pagamentos");
}

export async function upsertPagamentoAvulso(data: {
  id?: string;
  mes: number;
  ano: number;
  despesa: string;
  tipo_pagamento: string;
  valor: number;
  observacao?: string | null;
}) {
  const sb = getSupabase();
  const { id, ...campos } = data;
  const { error } = id
    ? await sb.from("pe_pagamentos").update(campos).eq("id", id)
    : await sb.from("pe_pagamentos").insert(campos);

  if (error) throw new Error(error.message);
  revalidatePath("/pagamentos");
}
