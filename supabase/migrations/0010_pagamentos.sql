-- Tabela de pagamentos: uma linha por linha da aba "Resumo de Pagamentos"

CREATE TABLE pe_pagamentos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mes int NOT NULL CHECK (mes BETWEEN 1 AND 12),
  ano int NOT NULL CHECK (ano >= 2024),
  despesa text NOT NULL,
  funcionario_id uuid REFERENCES pe_pessoas(id) ON DELETE SET NULL,
  tipo_pagamento text NOT NULL,
  valor numeric(10, 2) NOT NULL DEFAULT 0,
  observacao text,
  pago boolean NOT NULL DEFAULT false,
  data_pagamento date,
  criado_em timestamptz DEFAULT now()
);

CREATE INDEX ON pe_pagamentos (ano, mes);
