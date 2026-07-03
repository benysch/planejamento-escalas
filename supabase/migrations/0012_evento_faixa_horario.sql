-- 0012_evento_faixa_horario.sql
-- Faixa de horário estimada para ordenar as atividades dentro do dia no calendário.
alter table pe_eventos
  add column if not exists faixa_horario text;

comment on column pe_eventos.faixa_horario is
  'Faixa de horário estimada (08_10, 10_12, 12_14, 14_16, 16_18, 18_mais) usada para ordenar os eventos dentro do dia. NULL = sem horário (vai para o fim).';
