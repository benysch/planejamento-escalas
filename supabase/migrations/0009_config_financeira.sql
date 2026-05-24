-- Configuração financeira: salário base + valor de VT por dia, por funcionário

CREATE TABLE pe_config_financeira (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  funcionario_id uuid NOT NULL REFERENCES pe_pessoas(id) ON DELETE CASCADE,
  salario_base numeric(10, 2) NOT NULL DEFAULT 0,
  valor_vt_dia numeric(10, 2) NOT NULL DEFAULT 0,
  criado_em timestamptz DEFAULT now(),
  UNIQUE (funcionario_id)
);
