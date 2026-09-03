import * as XLSX from 'xlsx';
import * as path from 'path';
import * as fs from 'fs';
import {
  normalizeCpf,
  normalizeDate,
  normalizeBoolean,
  normalizeNumber,
  normalizeStatus,
} from '../common/normalizers';

const spreadsheetPath = path.resolve(
  __dirname,
  '..',
  '..',
  'spreadsheet',
  'base-dados-frota.xlsx',
);

const workbook = XLSX.readFile(spreadsheetPath);

const driverRows = XLSX.utils.sheet_to_json(workbook.Sheets['Motoristas'], {
  raw: false,
  defval: '',
}) as any[];

const rejections: { sheet: string; row: number; reason: string }[] = [];
const drivers: any[] = [];
const seenCpfs = new Set<string>();

const VALID_CNH_CATEGORIES = ['A', 'B', 'C', 'D', 'E'];

driverRows.forEach((row, index) => {
  const spreadsheetRow = index + 2;

  const cpf = normalizeCpf(row.cpf);
  if (cpf === null) {
    rejections.push({
      sheet: 'Motoristas',
      row: spreadsheetRow,
      reason: `CPF invalido: "${row.cpf}"`,
    });
    return;
  }

  if (seenCpfs.has(cpf)) {
    rejections.push({
      sheet: 'Motoristas',
      row: spreadsheetRow,
      reason: `CPF duplicado: ${cpf}`,
    });
    return;
  }

  const name = String(row.nome || '').trim();
  if (name === '') {
    rejections.push({
      sheet: 'Motoristas',
      row: spreadsheetRow,
      reason: 'Nome vazio',
    });
    return;
  }

  const cnhCategory = String(row.categoria_cnh || '').trim().toUpperCase();
  if (!VALID_CNH_CATEGORIES.includes(cnhCategory)) {
    rejections.push({
      sheet: 'Motoristas',
      row: spreadsheetRow,
      reason: `Categoria de CNH invalida: "${row.categoria_cnh}"`,
    });
    return;
  }

  const active = normalizeBoolean(row.ativo);
  if (active === null) {
    rejections.push({
      sheet: 'Motoristas',
      row: spreadsheetRow,
      reason: `Campo ativo invalido ou vazio: "${row.ativo}"`,
    });
    return;
  }

  const createdAt = normalizeDate(row.criado_em);
  if (createdAt === null) {
    rejections.push({
      sheet: 'Motoristas',
      row: spreadsheetRow,
      reason: `Data de criacao invalida: "${row.criado_em}"`,
    });
    return;
  }

  seenCpfs.add(cpf);

  drivers.push({
    id: cpf,
    nome: name,
    cpf: cpf,
    cnh: String(row.cnh || '').trim(),
    categoria_cnh: cnhCategory,
    telefone: String(row.telefone || '').trim(),
    ativo: active,
    criado_em: createdAt,
  });
});

const tripRows = XLSX.utils.sheet_to_json(workbook.Sheets['Viagens'], {
  raw: false,
  defval: '',
}) as any[];

const trips: any[] = [];
const seenTripKeys = new Set<string>();
const driversInProgress = new Set<string>();

const validCpfs = new Set(drivers.map((d) => d.cpf));
const activeCpfs = new Set(drivers.filter((d) => d.ativo).map((d) => d.cpf));

let tripId = 1;

tripRows.forEach((row, index) => {
  const spreadsheetRow = index + 2;

  const cpf = normalizeCpf(row.motorista_cpf);
  if (cpf === null) {
    rejections.push({
      sheet: 'Viagens',
      row: spreadsheetRow,
      reason: `CPF do motorista invalido: "${row.motorista_cpf}"`,
    });
    return;
  }

  if (!validCpfs.has(cpf)) {
    rejections.push({
      sheet: 'Viagens',
      row: spreadsheetRow,
      reason: `Motorista nao encontrado na base: ${cpf}`,
    });
    return;
  }

  const status = normalizeStatus(row.status);
  if (status === null) {
    rejections.push({
      sheet: 'Viagens',
      row: spreadsheetRow,
      reason: `Status invalido ou vazio: "${row.status}"`,
    });
    return;
  }

  const departureDate = normalizeDate(row.data_saida);
  if (departureDate === null) {
    rejections.push({
      sheet: 'Viagens',
      row: spreadsheetRow,
      reason: `Data de saida invalida: "${row.data_saida}"`,
    });
    return;
  }

  const returnDate = row.data_retorno ? normalizeDate(row.data_retorno) : null;
  if (row.data_retorno && returnDate === null) {
    rejections.push({
      sheet: 'Viagens',
      row: spreadsheetRow,
      reason: `Data de retorno invalida: "${row.data_retorno}"`,
    });
    return;
  }

  if (returnDate !== null && returnDate < departureDate) {
    rejections.push({
      sheet: 'Viagens',
      row: spreadsheetRow,
      reason: 'Data de retorno anterior a data de saida',
    });
    return;
  }

  const startKm = normalizeNumber(row.km_inicial);
  if (startKm === null) {
    rejections.push({
      sheet: 'Viagens',
      row: spreadsheetRow,
      reason: `Km inicial invalido: "${row.km_inicial}"`,
    });
    return;
  }

  const endKm = row.km_final ? normalizeNumber(row.km_final) : null;
  if (row.km_final && endKm === null) {
    rejections.push({
      sheet: 'Viagens',
      row: spreadsheetRow,
      reason: `Km final invalido: "${row.km_final}"`,
    });
    return;
  }

  if (endKm !== null && endKm < startKm) {
    rejections.push({
      sheet: 'Viagens',
      row: spreadsheetRow,
      reason: 'Km final menor que km inicial',
    });
    return;
  }

  const duplicateKey = `${cpf}|${departureDate}|${row.origem}|${row.destino}`;
  if (seenTripKeys.has(duplicateKey)) {
    rejections.push({
      sheet: 'Viagens',
      row: spreadsheetRow,
      reason: 'Viagem duplicada',
    });
    return;
  }

  if (status === 'EM_ANDAMENTO') {
    if (driversInProgress.has(cpf)) {
      rejections.push({
        sheet: 'Viagens',
        row: spreadsheetRow,
        reason: `Motorista ja possui viagem EM_ANDAMENTO: ${cpf}`,
      });
      return;
    }
    driversInProgress.add(cpf);
  }

  if (status !== 'CANCELADA' && !activeCpfs.has(cpf)) {
    rejections.push({
      sheet: 'Viagens',
      row: spreadsheetRow,
      reason: `Motorista inativo nao pode ter viagem: ${cpf}`,
    });
    return;
  }

  if (status === 'CONCLUIDA' && (returnDate === null || endKm === null)) {
    rejections.push({
      sheet: 'Viagens',
      row: spreadsheetRow,
      reason: 'Viagem CONCLUIDA sem data_retorno ou km_final',
    });
    return;
  }

  seenTripKeys.add(duplicateKey);

  trips.push({
    id: tripId++,
    motorista_cpf: cpf,
    origem: String(row.origem || '').trim(),
    destino: String(row.destino || '').trim(),
    data_saida: departureDate,
    data_retorno: returnDate,
    km_inicial: startKm,
    km_final: endKm,
    status: status,
  });
});

const outputPath = path.resolve(__dirname, '..', '..', 'dados.json');

fs.writeFileSync(
  outputPath,
  JSON.stringify({ motoristas: drivers, viagens: trips }, null, 2),
  'utf-8',
);

const reportPath = path.resolve(__dirname, '..', '..', 'relatorio-importacao.txt');
const reportLines = [
  '=== RELATORIO DE IMPORTACAO ===',
  '',
  `Motoristas aceitos: ${drivers.length}`,
  `Viagens aceitas: ${trips.length}`,
  `Total rejeitado: ${rejections.length}`,
  '',
  'Rejeicoes:',
  ...rejections.map((r) => `  [${r.sheet}] Linha ${r.row}: ${r.reason}`),
];


console.log('=== RELATORIO DE IMPORTACAO ===\n');
console.log('Motoristas aceitos:', drivers.length);
console.log('Viagens aceitas:', trips.length);
console.log('Total rejeitado:', rejections.length);
console.log('\nRejeicoes:');
rejections.forEach((r) => {
  console.log(`  [${r.sheet}] Linha ${r.row}: ${r.reason}`);
});

fs.writeFileSync(reportPath, reportLines.join('\n'), 'utf-8');

console.log('\nArquivos gerados: dados.json e relatorio-importacao.txt');