-- Migration 0007: rotinas semanais editáveis
create table pe_rotinas (
  id         uuid primary key default gen_random_uuid(),
  dia_semana int not null check (dia_semana between 1 and 5),
  texto      text not null,
  hora       text,
  ordem      int not null default 0,
  ativo      boolean not null default true,
  criado_em  timestamptz default now()
);

alter table pe_rotinas enable row level security;
create policy "service role full access" on pe_rotinas using (true) with check (true);

insert into pe_rotinas (dia_semana, texto, hora, ordem) values
  (1, 'Lia — Escola',                        '7:45 – 14:45',  1),
  (1, 'Ilan — Hebraica (Brincar livre)',      '8:30 – 14:00',  2),
  (1, 'Lia — Ballet',                         '15:15 – 16:00', 3),
  (2, 'Lia — Escola',                        '7:45 – 14:45',  1),
  (2, 'Ilan — Natação',                       '8:45 – 9:20',   2),
  (2, 'Lia e Ilan em casa',                   null,            3),
  (3, 'Lia — Escola',                        '7:45 – 14:45',  1),
  (3, 'Ilan — Clube Jacaré / Musicalização', '15:00 – 15:40', 2),
  (3, 'Lia — Ballet',                         '15:15 – 16:00', 3),
  (4, 'Faxineira em casa',                    null,            1),
  (4, 'Lia — Escola',                        '7:45 – 14:45',  2),
  (4, 'Ilan — Hebraica (Brincar livre)',      '8:30 – 14:00',  3),
  (4, 'Tia Syl pegar Lia na escola',          null,            4),
  (4, 'Lia e Ilan em casa — tarde',           null,            5),
  (5, 'Lia — Escola',                        '7:45 – 14:45',  1),
  (5, 'Ilan em casa',                         null,            2),
  (5, 'Lia — Natação (Muri pegar)',           '15:15 – 16:00', 3),
  (5, 'Jantar nos Avós (Abra e Arlete)',      null,            4);
