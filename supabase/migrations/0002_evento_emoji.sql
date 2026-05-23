-- Migration 0002: adiciona campo emoji opcional em pe_eventos
alter table pe_eventos add column emoji text;
