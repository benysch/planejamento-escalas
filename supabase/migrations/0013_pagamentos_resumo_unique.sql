-- Garante um único registro "resumo" (marcador de pago do bloco da
-- funcionária) por funcionário/mês/ano. O código não depende mais de
-- ON CONFLICT, mas o índice protege contra duplicatas.

CREATE UNIQUE INDEX IF NOT EXISTS pe_pagamentos_resumo_unique
  ON pe_pagamentos (funcionario_id, mes, ano)
  WHERE tipo_pagamento = 'resumo';
