"use server";

import { revalidatePath } from "next/cache";

import { getSupabase } from "@/lib/supabase/server";
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

export async function getConfigFinanceira() {
  const sb = getSupabase();
  const { data, error } = await sb.from("pe_config_financeira").select("*");
  if (error) throw new Error(error.message);
  return data;
}

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

export async function listPagamentos(mes: number, ano: number) {
  const sb = getSupabase();
  const { data, error } = await sb
    .from("pe_pagamentos")
    .select("*")
    .eq("mes", mes)
    .eq("ano", ano)
    .order("despesa")
    .order("tipo_pagamento");
  if (error) throw new Error(error.message);
  return data;
}

export async function upsertPagamento(data: {
  id?: string;
  mes: number;
  ano: number;
  despesa: string;
  funcionario_id?: string | null;
  tipo_pagamento: string;
  valor: number;
  observacao?: string | null;
  pago?: boolean;
  data_pagamento?: string | null;
}) {
  const sb = getSupabase();
  const { error } = await sb
    .from("pe_pagamentos")
    .upsert(
      { ...data, pago: data.pago ?? false },
      { onConflict: "id" },
    );
  if (error) throw new Error(error.message);
  revalidatePath("/pagamentos");
}

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

// ─── Geração Automática de Pagamentos ───────────────────────────────────────

export async function gerarPagamentosDoMes(mes: number, ano: number) {
  const sb = getSupabase();

  // 1. Get all funcionários, escala_dias, escala_mensal, config, eventos
  const [
    { data: funcionarios },
    { data: escalaDias },
    { data: escalaMensal },
    { data: configFinanceira },
    { data: eventos },
  ] = await Promise.all([
    sb.from("pe_pessoas").select("*").eq("tipo", "funcionario"),
    sb
      .from("pe_escala_dias")
      .select("*")
      .gte("data", `${ano}-${String(mes).padStart(2, "0")}-01`)
      .lte("data", `${ano}-${String(mes).padStart(2, "0")}-31`),
    sb
      .from("pe_escala_mensal")
      .select("*")
      .eq("mes", mes)
      .eq("ano", ano),
    sb.from("pe_config_financeira").select("*"),
    sb.from("pe_eventos").select("*"),
  ]);

  // 2. Build maps
  const escalaDiasMap = new Map<string, Set<string>>();
  (escalaDias || []).forEach((ed) => {
    if (!escalaDiasMap.has(ed.funcionario_id)) {
      escalaDiasMap.set(ed.funcionario_id, new Set());
    }
    escalaDiasMap.get(ed.funcionario_id)!.add(ed.data);
  });

  type EscalaMensalType = {
    id: string;
    funcionario_id: string;
    mes: number;
    ano: number;
    dias_trabalhados: number;
    dias_programados: number;
    saldo_vt: number;
    notas: string | null;
  };

  const escalaMensalMap = new Map<string, EscalaMensalType>();
  (escalaMensal || []).forEach((em) => {
    escalaMensalMap.set(em.funcionario_id, em);
  });

  type ConfigFinanceiraType = {
    id: string;
    funcionario_id: string;
    salario_base: number;
    valor_vt_dia: number;
  };

  const configMap = new Map<string, ConfigFinanceiraType>();
  (configFinanceira || []).forEach((cfg) => {
    configMap.set(cfg.funcionario_id, cfg);
  });

  // Get feriados for the month
  const feriados = new Set<string>();
  (eventos || []).forEach((ev) => {
    if (ev.tipo === "feriado") {
      const inicio = new Date(ev.data_inicio);
      const fim = new Date(ev.data_fim);
      for (let d = new Date(inicio); d <= fim; d.setDate(d.getDate() + 1)) {
        const dateStr = d.toISOString().split("T")[0];
        feriados.add(dateStr);
      }
    }
  });

  // Count working days in the month (Mon-Fri, excluding feriados)
  const diasUtil = [];
  const firstDay = new Date(ano, mes - 1, 1);
  const lastDay = new Date(ano, mes, 0);
  for (let d = new Date(firstDay); d <= lastDay; d.setDate(d.getDate() + 1)) {
    const dayOfWeek = d.getDay();
    const dateStr = d.toISOString().split("T")[0];
    if (dayOfWeek >= 1 && dayOfWeek <= 5 && !feriados.has(dateStr)) {
      diasUtil.push(dateStr);
    }
  }
  const totalDiasUteis = diasUtil.length;

  // 3. Generate pagamentos for each funcionário
  const pagamentosAInserir: any[] = [];

  (funcionarios || []).forEach((func) => {
    const diasTrabalhados = escalaDiasMap.get(func.id)?.size ?? 0;
    const escalaMensalData = escalaMensalMap.get(func.id);
    const configData = configMap.get(func.id);

    if (!configData || diasTrabalhados === 0) return; // Skip if no config or no working days

    const { salario_base, valor_vt_dia } = configData;
    const saldoVt = escalaMensalData?.saldo_vt ?? 0;

    // Salário
    if (salario_base > 0) {
      const salarioLiquido =
        totalDiasUteis > 0
          ? (salario_base * diasTrabalhados) / totalDiasUteis
          : salario_base;
      pagamentosAInserir.push({
        mes,
        ano,
        despesa: func.nome,
        funcionario_id: func.id,
        tipo_pagamento: "salario",
        valor: salarioLiquido,
        observacao: `${diasTrabalhados} dias trabalhados`,
        pago: false,
      });
    }

    // VT
    if (valor_vt_dia > 0 && saldoVt > 0) {
      pagamentosAInserir.push({
        mes,
        ano,
        despesa: func.nome,
        funcionario_id: func.id,
        tipo_pagamento: "vt",
        valor: valor_vt_dia * saldoVt,
        observacao: `${saldoVt} dias VT`,
        pago: false,
      });
    }

    // Folguistas: dias marcados na escala que caem em sábado/domingo/feriado
    const folguistas = new Set<string>();
    (escalaDiasMap.get(func.id) || []).forEach((data) => {
      const d = new Date(data);
      const dayOfWeek = d.getDay();
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
      const isFeriado = feriados.has(data);

      if ((isWeekend || isFeriado) && saldoVt > 0) {
        folguistas.add(data);
      }
    });

    if (folguistas.size > 0) {
      // Calculate folguista adicional (proportional bonus)
      // Simplified: assume 10% of daily salary for each folguista day
      const totalDiasEscala = escalaDiasMap.get(func.id)?.size ?? 1;
      const diaAdicional =
        totalDiasEscala > 0 ? salario_base / totalDiasEscala : 0;
      const adicionalFolguista = diaAdicional * folguistas.size * 0.1;

      if (adicionalFolguista > 0) {
        pagamentosAInserir.push({
          mes,
          ano,
          despesa: func.nome,
          funcionario_id: func.id,
          tipo_pagamento: "folguista",
          valor: adicionalFolguista,
          observacao: `${folguistas.size} dias (fim de semana/feriado)`,
          pago: false,
        });
      }
    }
  });

  // 4. Insert all pagamentos (skip if already exist for the month)
  if (pagamentosAInserir.length > 0) {
    const { error } = await sb
      .from("pe_pagamentos")
      .insert(pagamentosAInserir);
    if (error) throw new Error(error.message);
    revalidatePath("/pagamentos");
  }

  return {
    success: true,
    count: pagamentosAInserir.length,
  };
}

// ─── Novo fluxo de pagamentos (por bloco) ───────────────────────────────────

export async function marcarBlocoFuncionariaPago(
  funcionario_id: string,
  mes: number,
  ano: number,
  pago: boolean,
  data_pagamento?: string | null,
) {
  const sb = getSupabase();
  const totalValor = 0; // será calculado no servidor se necessário

  const { error } = await sb
    .from("pe_pagamentos")
    .upsert(
      {
        funcionario_id,
        mes,
        ano,
        despesa: `Resumo ${MESES[mes - 1]} ${ano}`,
        tipo_pagamento: "resumo",
        valor: totalValor,
        pago,
        data_pagamento: pago ? data_pagamento : null,
        observacao: null,
      },
      { onConflict: "funcionario_id,mes,ano,tipo_pagamento" },
    );

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
  const { error } = await sb
    .from("pe_pagamentos")
    .upsert(data, { onConflict: "id" });

  if (error) throw new Error(error.message);
  revalidatePath("/pagamentos");
}

// ─── Constantes ─────────────────────────────────────────────────────────────

const MESES = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];
