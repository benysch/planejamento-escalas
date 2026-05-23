-- Migration 0006: remove check constraint de tipo em pe_eventos
-- Permite tipos dinâmicos além dos 9 padrão (pe_evento_tipos)
alter table pe_eventos drop constraint if exists pe_eventos_tipo_check;
