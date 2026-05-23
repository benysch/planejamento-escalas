import { AlertTriangle, CalendarCheck, Clock, ListChecks, User2, Users } from "lucide-react";

import { getSupabase } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { MESES } from "@/lib/types";
import type { EventoComPessoas, Pessoa, TipoEvento } from "@/lib/types";

// ─── Rotinas semanais ───────────────────────────────────────────────────────

type RotinaItem = { texto: string; hora?: string };

const ROTINAS: Record<number, RotinaItem[]> = {
  1: [
    { texto: "Lia — Escola", hora: "7:45 – 14:45" },
    { texto: "Ilan — Hebraica (Brincar livre)", hora: "8:30 – 14:00" },
    { texto: "Lia — Ballet", hora: "15:15 – 16:00" },
  ],
  2: [
    { texto: "Lia — Escola", hora: "7:45 – 14:45" },
    { texto: "Ilan — Natação", hora: "8:45 – 9:20" },
    { texto: "Lia e Ilan em casa" },
  ],
  3: [
    { texto: "Lia — Escola", hora: "7:45 – 14:45" },
    { texto: "Ilan — Clube Jacaré / Musicalização", hora: "15:00 – 15:40" },
    { texto: "Lia — Ballet", hora: "15:15 – 16:00" },
  ],
  4: [
    { texto: "Faxineira em casa" },
    { texto: "Lia — Escola", hora: "7:45 – 14:45" },
    { texto: "Ilan — Hebraica (Brincar livre)", hora: "8:30 – 14:00" },
    { texto: "Tia Syl pegar Lia na escola" },
    { texto: "Lia e Ilan em casa — tarde" },
  ],
  5: [
    { texto: "Lia — Escola", hora: "7:45 – 14:45" },
    { texto: "Ilan em casa" },
    { texto: "Lia — Natação (Muri pegar)", hora: "15:15 – 16:00" },
    { texto: "Jantar nos Avós (Abra e Arlete)" },
  ],
};

const DIAS_SEMANA = [
  "Domingo", "Segunda-feira", "Terça-feira", "Quarta-feira",
  "Quinta-feira", "Sexta-feira", "Sábado",
];

// ─── Data ────────────────────────────────────────────────────────────────────

async function getDashboardData() {
  const sb = getSupabase();
  const today = new Date().toISOString().split("T")[0];

  const anoAtual = new Date().getFullYear();
  const em14dias = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000)
    .toISOString()
    .split("T")[0];

  const [{ data: pessoas }, { data: eventosHoje }, { data: proximosEventos }, { data: tipos }] =
    await Promise.all([
      sb.from("pe_pessoas").select("*").eq("ativo", true).order("nome"),
      sb
        .from("pe_eventos")
        .select("*, pe_evento_pessoas(pessoa_id)")
        .lte("data_inicio", today)
        .gte("data_fim", today)
        .order("data_inicio"),
      sb
        .from("pe_eventos")
        .select("*, pe_evento_pessoas(pessoa_id)")
        .gt("data_inicio", today)
        .lte("data_inicio", em14dias)
        .order("data_inicio")
        .limit(10),
      sb.from("pe_evento_tipos").select("*").order("ordem"),
    ]);

  const pessoaMap = new Map<string, Pessoa>(
    (pessoas ?? []).map((p) => [p.id, p]),
  );

  function enrichEvento(ev: {
    pe_evento_pessoas?: { pessoa_id: string }[];
    [key: string]: unknown;
  }): EventoComPessoas {
    const { pe_evento_pessoas: links = [], ...resto } = ev;
    return {
      ...(resto as EventoComPessoas),
      pessoas: links
        .map((l) => pessoaMap.get(l.pessoa_id))
        .filter(Boolean) as Pessoa[],
    };
  }

  const eventosHojeEnriquecidos = (eventosHoje ?? []).map(enrichEvento);
  const proximosEnriquecidos = (proximosEventos ?? []).map(enrichEvento);

  const funcionarios = (pessoas ?? []).filter((p) => p.tipo === "funcionario");
  const ausenciasHoje = eventosHojeEnriquecidos.filter((e) =>
    ["folga_funcionario", "ferias_funcionario"].includes(e.tipo),
  );
  const ausentes = new Set(
    ausenciasHoje.flatMap((e) => e.pessoas.map((p) => p.id)),
  );

  const conflitos: string[] = [];
  const viagensAdultos = eventosHojeEnriquecidos.filter(
    (e) =>
      e.tipo === "viagem_trabalho" &&
      e.pessoas.some((p) => p.tipo === "familiar" && p.cargo === "adulto"),
  );
  if (viagensAdultos.length > 0 && ausentes.size > 0) {
    conflitos.push(
      "Adulto viajando a trabalho e funcionário ausente hoje — verificar cobertura.",
    );
  }

  return {
    pessoas: pessoas ?? [],
    funcionarios,
    eventosHoje: eventosHojeEnriquecidos,
    proximos: proximosEnriquecidos,
    ausentes,
    conflitos,
    today,
    anoAtual,
    tipos: (tipos ?? []) as TipoEvento[],
  };
}

function formatDate(iso: string) {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

function EventoItem({ evento, tipos }: { evento: EventoComPessoas; tipos: TipoEvento[] }) {
  function tipoLabel(slug: string) {
    return tipos.find((t) => t.slug === slug)?.label ?? slug;
  }
  const isSingleDay = evento.data_inicio === evento.data_fim;
  return (
    <div className="flex items-start gap-3 py-2">
      <div
        className="mt-0.5 size-2.5 shrink-0 rounded-full"
        style={{ backgroundColor: evento.cor_hex ?? "#6366f1" }}
      />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium leading-snug">
          {evento.emoji && <span className="mr-1">{evento.emoji}</span>}
          {evento.titulo}
        </p>
        <p className="text-muted-foreground text-xs">
          {isSingleDay
            ? formatDate(evento.data_inicio)
            : `${formatDate(evento.data_inicio)} – ${formatDate(evento.data_fim)}`}
          {evento.pessoas.length > 0 && (
            <span className="ml-1">
              · {evento.pessoas.map((p) => p.nome).join(", ")}
            </span>
          )}
        </p>
      </div>
      <Badge variant="secondary" className="shrink-0 text-xs">
        {tipoLabel(evento.tipo)}
      </Badge>
    </div>
  );
}

export default async function DashboardPage() {
  const { funcionarios, eventosHoje, proximos, ausentes, conflitos, today, tipos } =
    await getDashboardData();

  const [y, m, d] = today.split("-");
  const dataFormatada = `${d} de ${MESES[parseInt(m) - 1]} de ${y}`;

  const diaSemana = new Date(`${today}T12:00:00`).getDay();
  const nomeDia = DIAS_SEMANA[diaSemana];
  const rotinaHoje = ROTINAS[diaSemana] ?? null;
  const hasFeriado = eventosHoje.some((e) => e.tipo === "feriado");
  const hasViagemFamilia = eventosHoje.some((e) => e.tipo === "viagem_familia");
  const rotinaSuspensa = hasFeriado || hasViagemFamilia;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground text-sm">{dataFormatada}</p>
      </div>

      {conflitos.length > 0 && (
        <div className="bg-destructive/10 border-destructive/20 rounded-lg border p-4">
          <div className="flex items-center gap-2">
            <AlertTriangle className="text-destructive size-4 shrink-0" />
            <p className="text-destructive text-sm font-medium">
              Atenção: conflito de agenda
            </p>
          </div>
          <ul className="mt-1 space-y-0.5">
            {conflitos.map((c, i) => (
              <li key={i} className="text-destructive/80 text-sm">
                {c}
              </li>
            ))}
          </ul>
        </div>
      )}

      {rotinaHoje && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <ListChecks className="size-4" />
              Rotina de hoje — {nomeDia}
            </CardTitle>
            {rotinaSuspensa && (
              <div className="flex items-center gap-2 rounded-md bg-amber-50 border border-amber-200 px-3 py-2 text-amber-800 dark:bg-amber-950/30 dark:border-amber-800 dark:text-amber-300">
                <AlertTriangle className="size-3.5 shrink-0" />
                <span className="text-xs font-medium">
                  Rotina possivelmente alterada —{" "}
                  {hasFeriado ? "feriado" : "viagem família"} hoje
                </span>
              </div>
            )}
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {rotinaHoje.map((item, i) => (
                <li key={i} className="flex items-center gap-3 text-sm">
                  {item.hora ? (
                    <span className="flex items-center gap-1 shrink-0 text-xs font-medium text-muted-foreground w-24">
                      <Clock className="size-3" />
                      {item.hora}
                    </span>
                  ) : (
                    <span className="w-24 shrink-0" />
                  )}
                  <span className={rotinaSuspensa ? "text-muted-foreground line-through" : ""}>
                    {item.texto}
                  </span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Users className="size-4" />
              Funcionários hoje
            </CardTitle>
          </CardHeader>
          <CardContent>
            {funcionarios.length === 0 ? (
              <p className="text-muted-foreground text-sm">
                Nenhum funcionário cadastrado.
              </p>
            ) : (
              <ul className="space-y-1.5">
                {funcionarios.map((f) => (
                  <li key={f.id} className="flex items-center gap-2 text-sm">
                    <div
                      className="size-2 rounded-full"
                      style={{ backgroundColor: f.cor_hex }}
                    />
                    <span className="flex-1">{f.nome}</span>
                    {ausentes.has(f.id) ? (
                      <Badge variant="secondary" className="text-xs">
                        Ausente
                      </Badge>
                    ) : (
                      <Badge className="text-xs">Presente</Badge>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <CalendarCheck className="size-4" />
              Eventos de hoje
            </CardTitle>
          </CardHeader>
          <CardContent>
            {eventosHoje.length === 0 ? (
              <p className="text-muted-foreground text-sm">
                Nenhum evento hoje.
              </p>
            ) : (
              <div className="divide-y">
                {eventosHoje.map((e) => (
                  <EventoItem key={e.id} evento={e} tipos={tipos} />
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="sm:col-span-2 lg:col-span-1">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <User2 className="size-4" />
              Próximos 14 dias
            </CardTitle>
            <CardDescription>Eventos agendados</CardDescription>
          </CardHeader>
          <CardContent>
            {proximos.length === 0 ? (
              <p className="text-muted-foreground text-sm">
                Nenhum evento próximo.
              </p>
            ) : (
              <div className="divide-y">
                {proximos.map((e) => (
                  <EventoItem key={e.id} evento={e} tipos={tipos} />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
