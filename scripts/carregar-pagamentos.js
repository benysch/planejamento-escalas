#!/usr/bin/env node

const XLSX = require('xlsx');
const { createClient } = require('@supabase/supabase-js');

const EXCEL_PATH = '/mnt/c/Users/murie/OneDrive/0. Organização Home/0. Pagamentos/FUNCIONÁRIAS_RESUMO GERAL PAGAMENTOS 2026.xlsx';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SECRET_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Erro: SUPABASE_URL e SUPABASE_SECRET_KEY não configuradas.');
  process.exit(1);
}

async function run() {
  try {
    console.log(`📖 Lendo planilha: ${EXCEL_PATH}`);

    const workbook = XLSX.readFile(EXCEL_PATH);
    const abaName = workbook.SheetNames.find(name =>
      name.toLowerCase().includes('resumo')
    );

    if (!abaName) {
      console.error('❌ Aba "Resumo de Pagamentos" não encontrada.');
      process.exit(1);
    }

    const sheet = workbook.Sheets[abaName];
    const dados = XLSX.utils.sheet_to_json(sheet, { defval: '' });

    // Encontrar a linha de cabeçalho (linha 5)
    const linhaHeader = dados.findIndex(row =>
      row['2025'] === 'TIPO PAGAMENTO' || row['2025'] === 'tipo pagamento'
    );

    if (linhaHeader === -1) {
      console.error('❌ Cabeçalho não encontrado');
      process.exit(1);
    }

    console.log(`✓ Cabeçalho encontrado na linha ${linhaHeader + 1}`);

    // Dados começam depois do cabeçalho
    const pagamentos = dados
      .slice(linhaHeader + 1)
      .filter(row => {
        // Filtrar linhas que têm pelo menos tipo_pagamento e despesa
        const tipo = String(row['2025'] || '').trim();
        const despesa = String(row['__EMPTY_1'] || '').trim();
        return tipo && despesa && tipo !== 'TIPO PAGAMENTO';
      })
      .map(row => {
        const tipo = String(row['2025'] || '').trim().toLowerCase();
        const despesa = String(row['__EMPTY_1'] || '').trim();

        // Parse valor com cuidado
        let valorStr = String(row[' R$ 2,025.00 '] || '0').trim();
        // Remover "R$" e espaços
        valorStr = valorStr.replace(/R\$\s*/g, '').trim();
        // Se tem ponto e vírgula, é formato BR: 1.234,56 → 1234.56
        if (valorStr.includes(',') && valorStr.includes('.')) {
          valorStr = valorStr.replace('.', '').replace(',', '.');
        } else if (valorStr.includes(',')) {
          // Só vírgula: 1234,56 → 1234.56
          valorStr = valorStr.replace(',', '.');
        }
        const valor = Math.round(parseFloat(valorStr || '0') * 100) / 100 || 0;
        const obs = row['2026_1'] ? String(row['2026_1']).trim() : null;
        const situacao = String(row['__EMPTY_3'] || '').trim().toUpperCase();
        const pago = situacao === 'OK' || situacao === 'PAGO';

        // Extrair mês/ano
        const ano = 2026;
        let mes = 5; // Default maio

        // Tentar extrair mês da observação (ex: "Dia 01/03" = 3º mês)
        const mesMatchObs = obs ? obs.match(/\/(\d{1,2})/) : null;
        if (mesMatchObs) {
          const m = parseInt(mesMatchObs[1]);
          if (m >= 1 && m <= 12) mes = m;
        }

        // Mapear tipos de pagamento
        const tipoMapeado = mapearTipo(tipo, despesa);

        return {
          despesa,
          tipo_pagamento: tipoMapeado,
          valor,
          observacao: obs,
          pago,
          data_pagamento: null, // Não temos data específica
          mes,
          ano,
        };
      });

    console.log(`✓ ${pagamentos.length} linhas processadas`);
    console.log(`\n📊 Primeiros 3 registros:`);
    console.table(pagamentos.slice(0, 3));

    if (pagamentos.length === 0) {
      console.warn('⚠️ Nenhum pagamento para carregar.');
      process.exit(0);
    }

    // Inicializar Supabase
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log(`\n⬆️ Carregando ${pagamentos.length} pagamentos no Supabase...`);

    const { error, data } = await supabase
      .from('pe_pagamentos')
      .insert(pagamentos)
      .select();

    if (error) {
      console.error('❌ Erro ao inserir:', error);
      process.exit(1);
    }

    console.log(`✅ ${data.length} pagamentos carregados com sucesso!`);

    // Estatísticas
    const totalValor = pagamentos.reduce((sum, p) => sum + p.valor, 0);
    const qtdPagos = pagamentos.filter(p => p.pago).length;
    const meses = [...new Set(pagamentos.map(p => p.mes))];

    console.log(`\n📊 Resumo:`);
    console.log(`- Total de linhas: ${pagamentos.length}`);
    console.log(`- Meses carregados: ${meses.sort((a, b) => a - b).join(', ')}`);
    console.log(`- Valor total: R$ ${totalValor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`);
    console.log(`- Pagos: ${qtdPagos}`);
    console.log(`- Pendentes: ${pagamentos.length - qtdPagos}`);

  } catch (error) {
    console.error('❌ Erro:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

function mapearTipo(tipo, despesa) {
  const typeStr = tipo.toLowerCase();

  if (typeStr.includes('folg') || typeStr.includes('fds')) return 'folguista';
  if (typeStr.includes('vt') || typeStr.includes('vale')) return 'vt';
  if (typeStr.includes('salário') || typeStr.includes('sal')) return 'salario';
  if (typeStr.includes('extra') || typeStr.includes('adicional')) return 'extra';
  if (typeStr.includes('adiant')) return 'adiantamento';
  if (typeStr.includes('encarg')) return 'encargos';
  if (typeStr.includes('e-social')) return 'encargos';
  if (typeStr.includes('contabil')) return 'encargos';

  return 'outro';
}

run();
