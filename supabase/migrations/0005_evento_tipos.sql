-- Migration 0005: tabela de tipos de evento dinâmicos
create table pe_evento_tipos (
  id        uuid primary key default gen_random_uuid(),
  slug      text unique not null,
  label     text not null,
  cor_hex   text not null default '#64748b',
  sistema   boolean not null default false,
  ordem     int not null default 0,
  criado_em timestamptz default now()
);

alter table pe_evento_tipos enable row level security;
create policy "service role full access" on pe_evento_tipos using (true) with check (true);

insert into pe_evento_tipos (slug, label, cor_hex, sistema, ordem) values
  ('viagem_familia',    'Viagem família',       '#3b82f6', true, 1),
  ('viagem_trabalho',   'Viagem trabalho',      '#8b5cf6', true, 2),
  ('ferias_escola',     'Férias escola',        '#f59e0b', true, 3),
  ('recesso_escola',    'Recesso escolar',      '#f97316', true, 4),
  ('aniversario',       'Aniversário',          '#ec4899', true, 5),
  ('feriado',           'Feriado',              '#6b7280', true, 6),
  ('folga_funcionario', 'Folga funcionário',    '#14b8a6', true, 7),
  ('ferias_funcionario','Férias funcionário',   '#10b981', true, 8),
  ('outro',             'Outro',                '#64748b', true, 9);
