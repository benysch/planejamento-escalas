export type PessoaTipo = "familiar" | "funcionario";

export type PessoaCargo =
  | "adulto"
  | "crianca"
  | "baba"
  | "diarista"
  | "faxineira"
  | "motorista"
  | "outro";

export type Pessoa = {
  id: string;
  nome: string;
  tipo: PessoaTipo;
  cargo: PessoaCargo | null;
  cor_hex: string;
  ativo: boolean;
  criado_em: string;
};

export type EventoTipo =
  | "viagem_familia"
  | "viagem_trabalho"
  | "ferias_escola"
  | "recesso_escola"
  | "aniversario"
  | "feriado"
  | "folga_funcionario"
  | "ferias_funcionario"
  | "outro";

export type TipoEvento = {
  id: string;
  slug: string;
  label: string;
  cor_hex: string;
  sistema: boolean;
  ordem: number;
};

export type Evento = {
  id: string;
  titulo: string;
  tipo: string;
  data_inicio: string;
  data_fim: string;
  dia_todo: boolean;
  notas: string | null;
  cor_hex: string | null;
  emoji: string | null;
  trava_agenda: boolean;
  recorrente_anual: boolean;
  faixa_horario: string | null;
  criado_em: string;
};

export type EventoComPessoas = Evento & {
  pessoas: Pessoa[];
};

export type Rotina = {
  id: string;
  dia_semana: number;
  texto: string;
  hora: string | null;
  ordem: number;
  ativo: boolean;
};

export type TipoAlocacao = 'normal' | 'folguista' | 'especial';

export type EscalaDia = {
  id: string;
  funcionario_id: string;
  data: string; // YYYY-MM-DD
  tipo_alocacao: TipoAlocacao;
  obs: string | null;
};

export type EscalaMensal = {
  id: string;
  funcionario_id: string;
  mes: number;
  ano: number;
  dias_trabalhados: number;
  dias_programados: number;
  saldo_vt: number;
  notas: string | null;
};

export const EVENTO_TIPO_LABEL: Record<EventoTipo, string> = {
  viagem_familia: "Viagem família",
  viagem_trabalho: "Viagem trabalho",
  ferias_escola: "Férias escola",
  recesso_escola: "Recesso escolar",
  aniversario: "Aniversário",
  feriado: "Feriado",
  folga_funcionario: "Folga funcionário",
  ferias_funcionario: "Férias funcionário",
  outro: "Outro",
};

export const EVENTO_TIPO_COR: Record<EventoTipo, string> = {
  viagem_familia: "#3b82f6",
  viagem_trabalho: "#8b5cf6",
  ferias_escola: "#f59e0b",
  recesso_escola: "#f97316",
  aniversario: "#ec4899",
  feriado: "#6b7280",
  folga_funcionario: "#14b8a6",
  ferias_funcionario: "#10b981",
  outro: "#64748b",
} as Record<EventoTipo, string>;

/** Faixas de horário estimadas para ordenar atividades dentro de um dia.
 *  A ordem do array define a ordem de exibição no calendário. */
export const FAIXAS_HORARIO = [
  { value: "08_10", label: "8h–10h" },
  { value: "10_12", label: "10h–12h" },
  { value: "12_14", label: "12h–14h" },
  { value: "14_16", label: "14h–16h" },
  { value: "16_18", label: "16h–18h" },
  { value: "18_mais", label: "Depois das 18h" },
] as const;

export const FAIXA_HORARIO_ORDEM: Record<string, number> = Object.fromEntries(
  FAIXAS_HORARIO.map((f, i) => [f.value, i]),
);

export const CARGO_LABEL: Record<PessoaCargo, string> = {
  adulto: "Adulto",
  crianca: "Criança",
  baba: "Babá",
  diarista: "Funcionária",
  faxineira: "Faxineira",
  motorista: "Motorista",
  outro: "Outro",
};

export const EMOJIS_EVENTO = [
  { emoji: "✡️", label: "Estrela de Davi" },
  { emoji: "🎂", label: "Bolo" },
  { emoji: "✈️", label: "Avião" },
  { emoji: "🏖️", label: "Praia" },
  { emoji: "🎉", label: "Festa" },
  { emoji: "🎈", label: "Balão" },
  { emoji: "🌴", label: "Férias" },
  { emoji: "🎓", label: "Formatura" },
  { emoji: "🏡", label: "Casa" },
  { emoji: "🤒", label: "Doente" },
  { emoji: "🩺", label: "Médico" },
  { emoji: "⚽", label: "Esporte" },
  { emoji: "🏊", label: "Natação" },
  { emoji: "🎵", label: "Aula de música" },
  { emoji: "🎭", label: "Show/Teatro" },
];

/** Cor de exibição de um evento no calendário:
 *  - Se há funcionário envolvido → cor do funcionário
 *  - Senão → cor escolhida no evento (cor_hex)
 *  - Fallback → cor por tipo
 */
export function getEventoCor(evento: EventoComPessoas): string {
  const func = evento.pessoas.find((p) => p.tipo === "funcionario");
  if (func) return func.cor_hex;
  if (evento.cor_hex) return evento.cor_hex;
  return EVENTO_TIPO_COR[evento.tipo as EventoTipo] ?? "#6366f1";
}

export type TipoPagamento =
  | "salario"
  | "vt"
  | "folguista"
  | "extra"
  | "adiantamento"
  | "encargos"
  | "resumo"
  | "outro";

export type Pagamento = {
  id: string;
  mes: number;
  ano: number;
  despesa: string;
  funcionario_id: string | null;
  tipo_pagamento: TipoPagamento;
  valor: number;
  observacao: string | null;
  pago: boolean;
  data_pagamento: string | null;
  criado_em: string;
};

export type ConfigFinanceira = {
  id: string;
  funcionario_id: string;
  salario_base: number;
  valor_vt_dia: number;
  valor_folguista_dia: number;
};

export const MESES = [
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
