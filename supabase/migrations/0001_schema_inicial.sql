-- Migration 0001: Schema inicial do Planejamento & Escalas
-- Aplicar manualmente no SQL Editor do Supabase.

create extension if not exists "pgcrypto";

-- Pessoas: membros da família e funcionários
create table pe_pessoas (
  id        uuid    primary key default gen_random_uuid(),
  nome      text    not null,
  tipo      text    not null check (tipo in ('familiar', 'funcionario')),
  cargo     text    check (cargo in ('adulto', 'crianca', 'baba', 'diarista', 'faxineira', 'motorista', 'outro')),
  cor_hex   text    not null default '#6366f1',
  ativo     boolean not null default true,
  criado_em timestamptz not null default now()
);

-- Eventos: viagens, férias, folgas, aniversários, feriados, recessos…
create table pe_eventos (
  id          uuid    primary key default gen_random_uuid(),
  titulo      text    not null,
  tipo        text    not null check (tipo in (
                'viagem_familia',
                'viagem_trabalho',
                'ferias_escola',
                'recesso_escola',
                'aniversario',
                'feriado',
                'folga_funcionario',
                'ferias_funcionario',
                'outro'
              )),
  data_inicio date    not null,
  data_fim    date    not null,
  dia_todo    boolean not null default true,
  notas       text,
  cor_hex     text,
  criado_em   timestamptz not null default now(),
  check (data_fim >= data_inicio)
);

-- Relacionamento evento <-> pessoas (muitos-para-muitos)
create table pe_evento_pessoas (
  evento_id uuid not null references pe_eventos(id) on delete cascade,
  pessoa_id uuid not null references pe_pessoas(id) on delete cascade,
  primary key (evento_id, pessoa_id)
);

-- Escala mensal dos funcionários
create table pe_escala_mensal (
  id               uuid     primary key default gen_random_uuid(),
  funcionario_id   uuid     not null references pe_pessoas(id) on delete cascade,
  mes              smallint not null check (mes between 1 and 12),
  ano              smallint not null check (ano >= 2024),
  dias_trabalhados integer  not null default 0,
  dias_programados integer  not null default 0,
  saldo_vt         integer  not null default 0,
  notas            text,
  constraint pe_escala_mensal_unique unique (funcionario_id, mes, ano)
);

-- Índices para performance
create index pe_eventos_data_idx         on pe_eventos       (data_inicio, data_fim);
create index pe_evento_pessoas_pessoa_idx on pe_evento_pessoas (pessoa_id);
create index pe_escala_mensal_func_idx   on pe_escala_mensal  (funcionario_id, ano, mes);
