-- Adiciona tipo de alocação em cada dia da escala
ALTER TABLE pe_escala_dias
  ADD COLUMN tipo_alocacao text NOT NULL DEFAULT 'normal'
    CHECK (tipo_alocacao IN ('normal', 'folguista', 'especial'));

-- Observação para dias especiais (e.g. "extra", "plantão")
ALTER TABLE pe_escala_dias
  ADD COLUMN obs text;

-- Adiciona valor do dia folguista na config financeira
ALTER TABLE pe_config_financeira
  ADD COLUMN valor_folguista_dia numeric(10,2) NOT NULL DEFAULT 0;
