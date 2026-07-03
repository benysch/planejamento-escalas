import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { hojeSaoPaulo } from "@/lib/datas";
import { getSupabase } from "@/lib/supabase/server";
import { MESES, getEventoCor } from "@/lib/types";
import type { EventoComPessoas, Pessoa, TipoEvento } from "@/lib/types";

function ajustarAno(dateStr: string, ano: number): string {
  return `${ano}${dateStr.slice(4)}`;
}

async function getData(ano: number) {
  const sb = getSupabase();
  const [{ data: eventos }, { data: recorrentes }, { data: pessoas }, { data: tipos }] =
    await Promise.all([
      sb
        .from("pe_eventos")
        .select("*, pe_evento_pessoas(pessoa_id)")
        .eq("recorrente_anual", false)
        .gte("data_fim", `${ano}-01-01`)
        .lte("data_inicio", `${ano}-12-31`)
        .order("data_inicio"),
      sb
        .from("pe_eventos")
        .select("*, pe_evento_pessoas(pessoa_id)")
        .eq("recorrente_anual", true)
        .order("data_inicio"),
      sb.from("pe_pessoas").select("*").eq("ativo", true).order("nome"),
      sb.from("pe_evento_tipos").select("*").order("ordem"),
    ]);

  const pessoaMap = new Map<string, Pessoa>(
    (pessoas ?? []).map((p) => [p.id, p]),
  );

  function enrich(ev: Record<string, unknown>): EventoComPessoas {
    const { pe_evento_pessoas: links = [], ...resto } = ev as {
      pe_evento_pessoas?: { pessoa_id: string }[];
      [k: string]: unknown;
    };
    return {
      ...(resto as EventoComPessoas),
      pessoas: (links as { pessoa_id: string }[])
        .map((l) => pessoaMap.get(l.pessoa_id))
        .filter(Boolean) as Pessoa[],
    };
  }

  const recorrentesAjustados = (recorrentes ?? [])
    .map((ev) => ({
      ...ev,
      data_inicio: ajustarAno(ev.data_inicio, ano),
      data_fim: ajustarAno(ev.data_fim, ano),
    }))
    .filter(
      (ev) =>
        ev.data_inicio <= `${ano}-12-31` && ev.data_fim >= `${ano}-01-01`,
    );

  const eventosEnriquecidos: EventoComPessoas[] = [
    ...(eventos ?? []),
    ...recorrentesAjustados,
  ].map((ev) => enrich(ev as Record<string, unknown>));

  return { eventos: eventosEnriquecidos, tipos: (tipos ?? []) as TipoEvento[] };
}

function miniCalendario(ano: number, mes: number, eventos: EventoComPessoas[]) {
  const primeiroDia = new Date(ano, mes - 1, 1).getDay();
  const totalDias = new Date(ano, mes, 0).getDate();
  const cells: (number | null)[] = Array(primeiroDia).fill(null);
  for (let d = 1; d <= totalDias; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  const eventosDias = new Map<string, string[]>();
  for (const ev of eventos) {
    const start = new Date(ev.data_inicio + "T00:00:00");
    const end = new Date(ev.data_fim + "T00:00:00");
    const cur = new Date(start);
    while (cur <= end) {
      const k = cur.toISOString().split("T")[0];
      if (!eventosDias.has(k)) eventosDias.set(k, []);
      eventosDias
        .get(k)!
        .push(getEventoCor(ev));
      cur.setDate(cur.getDate() + 1);
    }
  }

  const hoje = hojeSaoPaulo();

  return (
    <div key={mes}>
      <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {MESES[mes - 1]}
      </h3>
      <div className="grid grid-cols-7 gap-px text-center">
        {["D", "S", "T", "Q", "Q", "S", "S"].map((d, i) => (
          <div key={i} className="text-[10px] text-muted-foreground py-0.5">
            {d}
          </div>
        ))}
        {cells.map((dia, idx) => {
          if (!dia) return <div key={idx} className="h-6" />;
          const dateStr = `${ano}-${String(mes).padStart(2, "0")}-${String(dia).padStart(2, "0")}`;
          const cores = eventosDias.get(dateStr) ?? [];
          const isHoje = dateStr === hoje;
          return (
            <div
              key={idx}
              className={`relative flex h-6 items-center justify-center rounded text-[11px] font-medium ${
                isHoje
                  ? "bg-primary text-primary-foreground"
                  : cores.length > 0
                    ? "text-foreground"
                    : "text-muted-foreground"
              }`}
            >
              {dia}
              {cores.length > 0 && !isHoje && (
                <div className="absolute bottom-0.5 left-1/2 -translate-x-1/2 flex gap-0.5">
                  {cores.slice(0, 3).map((cor, i) => (
                    <div
                      key={i}
                      className="size-1 rounded-full"
                      style={{ backgroundColor: cor }}
                    />
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default async function AnualPage({
  searchParams,
}: {
  searchParams: Promise<{ ano?: string }>;
}) {
  const sp = await searchParams;
  const anoAtual = parseInt(hojeSaoPaulo().slice(0, 4), 10);
  const ano = parseInt(sp.ano ?? String(anoAtual));
  const { eventos, tipos } = await getData(ano);

  const viagensFamilia = eventos.filter((e) => e.tipo === "viagem_familia");
  const viagensTrabalho = eventos.filter((e) => e.tipo === "viagem_trabalho");
  const feriasFuncionarios = eventos.filter(
    (e) => e.tipo === "ferias_funcionario",
  );

  function formatPeriodo(ev: EventoComPessoas) {
    const d1 = ev.data_inicio.split("-").reverse().join("/");
    const d2 = ev.data_fim.split("-").reverse().join("/");
    return d1 === d2 ? d1 : `${d1} – ${d2}`;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Visão Anual {ano}</h1>
          <p className="text-muted-foreground text-sm">
            Panorama do ano — todos os eventos em 12 meses.
          </p>
        </div>
        <div className="flex items-center gap-1">
          <Link
            href={`/anual?ano=${ano - 1}`}
            className="hover:bg-muted flex size-9 items-center justify-center rounded-md transition-colors"
            aria-label={`Ano ${ano - 1}`}
          >
            <ChevronLeft className="size-4" />
          </Link>
          {ano !== anoAtual && (
            <Link
              href="/anual"
              className="hover:bg-muted rounded-md px-3 py-2 text-sm font-medium transition-colors"
            >
              Hoje
            </Link>
          )}
          <Link
            href={`/anual?ano=${ano + 1}`}
            className="hover:bg-muted flex size-9 items-center justify-center rounded-md transition-colors"
            aria-label={`Ano ${ano + 1}`}
          >
            <ChevronRight className="size-4" />
          </Link>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 sm:gap-6">
          {Array.from({ length: 12 }, (_, i) => i + 1).map((mes) =>
            miniCalendario(ano, mes, eventos),
          )}
        </div>

        <div className="space-y-6">
          {viagensFamilia.length > 0 && (
            <div>
              <h3 className="mb-2 text-sm font-semibold">Viagens família</h3>
              <ul className="space-y-1">
                {viagensFamilia.map((ev) => (
                  <li key={ev.id} className="text-sm">
                    <span className="text-muted-foreground text-xs">
                      {formatPeriodo(ev)}
                    </span>{" "}
                    <span className="font-medium">{ev.titulo}</span>
                    {ev.notas && (
                      <span className="text-muted-foreground">
                        {" "}
                        · {ev.notas}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {viagensTrabalho.length > 0 && (
            <div>
              <h3 className="mb-2 text-sm font-semibold">Viagens trabalho</h3>
              <ul className="space-y-1">
                {viagensTrabalho.map((ev) => (
                  <li key={ev.id} className="text-sm">
                    <span className="text-muted-foreground text-xs">
                      {formatPeriodo(ev)}
                    </span>{" "}
                    <span className="font-medium">{ev.titulo}</span>
                    {ev.pessoas.length > 0 && (
                      <span className="text-muted-foreground">
                        {" "}
                        · {ev.pessoas.map((p) => p.nome).join(", ")}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {feriasFuncionarios.length > 0 && (
            <div>
              <h3 className="mb-2 text-sm font-semibold">
                Férias funcionários
              </h3>
              <ul className="space-y-1">
                {feriasFuncionarios.map((ev) => (
                  <li key={ev.id} className="text-sm">
                    <span className="text-muted-foreground text-xs">
                      {formatPeriodo(ev)}
                    </span>{" "}
                    <span className="font-medium">
                      {ev.pessoas.map((p) => p.nome).join(", ")}
                    </span>
                    {ev.notas && (
                      <span className="text-muted-foreground">
                        {" "}
                        · {ev.notas}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div>
            <h3 className="mb-2 text-sm font-semibold">Legenda</h3>
            <ul className="space-y-1">
              {tipos.map((t) => (
                <li key={t.id} className="flex items-center gap-2 text-xs">
                  <div
                    className="size-2.5 rounded-full"
                    style={{ backgroundColor: t.cor_hex }}
                  />
                  {t.label}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
