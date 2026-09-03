import * as XLSX from 'xlsx';
import * as path from 'path';

const pathSpreadSheet = path.resolve(
  __dirname,
  '..',
  '..',
  'spreadsheet',
  'base-dados-frota.xlsx',
);

const spreadSheet = XLSX.readFile(pathSpreadSheet);

console.log('Abas encontradas:', spreadSheet.SheetNames);

const drivers = XLSX.utils.sheet_to_json(spreadSheet.Sheets['Motoristas'], {
  raw: false,
  defval: '',
});

const trips = XLSX.utils.sheet_to_json(spreadSheet.Sheets['Viagens'], {
  raw: false,
  defval: '',
});