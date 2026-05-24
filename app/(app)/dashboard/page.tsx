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
import type { EventoComPessoas, Pessoa, Rotina, TipoEvento } from "@/lib/types";

const DIAS_SEMANA = [
  "Domingo", "Segunda-feira", "Terça-feira", "Quarta-feira",
  "Quinta-feira", "Sexta-feira", "Sábado",
];

async function getDashboardData() {
  const sb = getSupabase();
  const today = new Date().toISOString().split("T")[0];
  const amanha = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split("T")[0];

  const anoAtual = new Date().getFullYear();
  const em14dias = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000)
    .toISOString()
    .split("T")[0];

  const [
    { data: pessoas },
    { data: eventosHoje },
    { data: proximosEventos },
    { data: tipos },
    { data: rotinas },
    { data: escalaDoisDias },
    { data: eventosAmanha },
  ] = await Promise.all([
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
    sb.from("pe_rotinas").select("*").eq("ativo", true).order("dia_semana").order("ordem"),
    sb.from("pe_escala_dias").select("funcionario_id, data").gte("data", today).lte("data", amanha),
    sb
      .from("pe_eventos")
      .select("*, pe_evento_pessoas(pessoa_id)")
      .lte("data_inicio", amanha)
      .gte("data_fim", amanha)
      .in("tipo", ["folga_funcionario", "ferias_funcionario"]),
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

  const programadosHoje = new Set(
    (escalaDoisDias ?? []).filter((d) => d.data === today).map((d) => d.funcionario_id),
  );
  const programadosAmanha = new Set(
    (escalaDoisDias ?? []).filter((d) => d.data === amanha).map((d) => d.funcionario_id),
  );

  const ausenciasHoje = eventosHojeEnriquecidos.filter((e) =>
    ["folga_funcionario", "ferias_funcionario"].includes(e.tipo),
  );
  const ausentes = new Set(
    ausenciasHoje.flatMap((e) => e.pessoas.map((p) => p.id)),
  );
  const ausentesAmanha = new Set(
    (eventosAmanha ?? [])
      .map(enrichEvento)
      .flatMap((e) => e.pessoas.map((p) => p.id)),
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
    ausentesAmanha,
    programadosHoje,
    programadosAmanha,
    conflitos,
    today,
    amanha,
    anoAtual,
    tipos: (tipos ?? []) as TipoEvento[],
    rotinas: (rotinas ?? []) as Rotina[],
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

function StatusDia({
  programado,
  ausente,
}: {
  programado: boolean;
  ausente: boolean;
}) {
  if (ausente)
    return (
      <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
        Folga
      </span>
    );
  if (programado)
    return (
      <span className="inline-flex items-center rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-medium text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400">
        ✓ Prog.
      </span>
    );
  return <span className="text-muted-foreground/50 text-xs">—</span>;
}

export default async function DashboardPage() {
  const {
    funcionarios,
    eventosHoje,
    proximos,
    ausentes,
    ausentesAmanha,
    programadosHoje,
    programadosAmanha,
    conflitos,
    today,
    amanha,
    tipos,
    rotinas,
  } = await getDashboardData();

  const [y, m, d] = today.split("-");
  const dataFormatada = `${d} de ${MESES[parseInt(m) - 1]} de ${y}`;

  const diaSemana = new Date(`${today}T12:00:00`).getDay();
  const nomeDia = DIAS_SEMANA[diaSemana];
  const feriadoHoje = eventosHoje.find((e) => e.tipo === "feriado") ?? null;
  const isWeekend = diaSemana === 0 || diaSemana === 6;
  const showGreeting = isWeekend || !!feriadoHoje;

  const greeting = (() => {
    if (diaSemana === 6) return { texto: "Bom Sábado!", emoji: "☀️", sub: "Aproveite o fim de semana!" };
    if (diaSemana === 0) return { texto: "Bom Domingo!", emoji: "🌿", sub: "Aproveite o descanso!" };
    if (feriadoHoje) return { texto: `Bom Feriado de ${feriadoHoje.titulo}!`, emoji: "🎉", sub: "Dia de descanso — sem rotina hoje." };
    return null;
  })();

  const rotinaHoje = !showGreeting && diaSemana >= 1 && diaSemana <= 5
    ? rotinas.filter((r) => r.dia_semana === diaSemana)
    : null;

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

      {greeting && (
        <div className="rounded-xl border bg-gradient-to-br from-amber-50 to-orange-50 px-8 py-10 dark:from-amber-950/20 dark:to-orange-950/20 dark:border-amber-900/30">
          <div className="text-5xl mb-3">{greeting.emoji}</div>
          <p className="text-3xl font-bold tracking-tight">{greeting.texto}</p>
          <p className="text-muted-foreground mt-1 text-sm">{greeting.sub}</p>
        </div>
      )}

      {rotinaHoje && rotinaHoje.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <ListChecks className="size-4" />
              Rotina de hoje — {nomeDia}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {rotinaHoje.map((item) => (
                <li key={item.id} className="flex items-center gap-3 text-sm">
                  {item.hora ? (
                    <span className="flex items-center gap-1 shrink-0 text-xs font-medium text-muted-foreground w-24">
                      <Clock className="size-3" />
                      {item.hora}
                    </span>
                  ) : (
                    <span className="w-24 shrink-0" />
                  )}
                  <span>{item.texto}</span>
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
              Funcionários
            </CardTitle>
          </CardHeader>
          <CardContent>
            {funcionarios.length === 0 ? (
              <p className="text-muted-foreground text-sm">
                Nenhum funcionário cadastrado.
              </p>
            ) : (
              <div>
                {/* Cabeçalho colunas */}
                <div className="grid grid-cols-[1fr_64px_64px] gap-1 pb-2 mb-1 border-b">
                  <div />
                  <span className="text-[10px] font-medium text-muted-foreground text-center uppercase tracking-wide">
                    Hoje
                  </span>
                  <span className="text-[10px] font-medium text-muted-foreground text-center uppercase tracking-wide">
                    Amanhã
                  </span>
                </div>
                <ul className="space-y-1">
                  {funcionarios.map((f) => (
                    <li
                      key={f.id}
                      className="grid grid-cols-[1fr_64px_64px] items-center gap-1 py-1"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <div
                          className="size-2 shrink-0 rounded-full"
                          style={{ backgroundColor: f.cor_hex }}
                        />
                        <span className="text-sm truncate">{f.nome}</span>
                      </div>
                      <div className="flex justify-center">
                        <StatusDia
                          programado={programadosHoje.has(f.id)}
                          ausente={ausentes.has(f.id)}
                        />
                      </div>
                      <div className="flex justify-center">
                        <StatusDia
                          programado={programadosAmanha.has(f.id)}
                          ausente={ausentesAmanha.has(f.id)}
                        />
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
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
