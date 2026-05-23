-- Migration 0008: escala dia a dia por funcionário
create table pe_escala_dias (
  id             uuid primary key default gen_random_uuid(),
  funcionario_id uuid not null references pe_pessoas(id) on delete cascade,
  data           date not null,
  criado_em      timestamptz default now(),
  unique(funcionario_id, data)
);

alter table pe_escala_dias enable row level security;
create policy "service role full access" on pe_escala_dias using (true) with check (true);
