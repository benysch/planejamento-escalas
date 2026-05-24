#!/usr/bin/env node

const XLSX = require('xlsx');

const EXCEL_PATH = '/mnt/c/Users/murie/OneDrive/0. Organização Home/0. Pagamentos/FUNCIONÁRIAS_RESUMO GERAL PAGAMENTOS 2026.xlsx';

try {
  console.log(`📖 Lendo planilha: ${EXCEL_PATH}\n`);

  const workbook = XLSX.readFile(EXCEL_PATH);
  const abaName = workbook.SheetNames.find(name =>
    name.toLowerCase().includes('resumo')
  );

  console.log(`Abas disponíveis: ${workbook.SheetNames.join(', ')}\n`);
  console.log(`Usando aba: ${abaName}\n`);

  const sheet = workbook.Sheets[abaName];

  // Ver dados brutos (primeiras 20 linhas)
  const dados = XLSX.utils.sheet_to_json(sheet, { defval: '' });

  console.log(`Total de linhas: ${dados.length}\n`);
  console.log('Primeiras 5 linhas (completas):');
  console.log(JSON.stringify(dados.slice(0, 5), null, 2));

  console.log('\n\nÚltimas 5 linhas:');
  console.log(JSON.stringify(dados.slice(-5), null, 2));

  // Tentar com range específico
  console.log('\n\nTentando ler com referência de célula...');
  const range = XLSX.utils.decode_range(sheet['!ref']);
  console.log(`Range da planilha: ${sheet['!ref']}`);
  console.log(`Linhas: ${range.s.r + 1} a ${range.e.r + 1}`);
  console.log(`Colunas: ${range.s.c} a ${range.e.c}`);

} catch (error) {
  console.error('❌ Erro:', error.message);
}
