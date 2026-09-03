export function normalizeCpf(value: string): string | null {
  if (!value) return null;

  const digitsOnly = String(value).replace(/\D/g, '');

  if (digitsOnly.length !== 11) return null;

  return digitsOnly;
}

export function normalizeDate(value: string): string | null {
  if (!value) return null;

  const text = String(value).trim();

  const parts = text.split(' ');
  const datePart = parts[0];
  const timePart = parts[1] || '00:00';

  let year: string;
  let month: string;
  let day: string;

  if (datePart.includes('-')) {
    const chunks = datePart.split('-');
    if (chunks.length !== 3) return null;
    [year, month, day] = chunks;
  } else if (datePart.includes('/')) {
    const chunks = datePart.split('/');
    if (chunks.length !== 3) return null;
    [day, month, year] = chunks;

    if (year.length === 2) {
      year = '20' + year;
    }
  } else {
    return null;
  }

  if (year.length !== 4) return null;

  day = day.padStart(2, '0');
  month = month.padStart(2, '0');

  const date = new Date(`${year}-${month}-${day}T${timePart}:00`);

  if (isNaN(date.getTime())) return null;

  return `${year}-${month}-${day}T${timePart}:00`;
}

export function normalizeNumber(value: string): number | null {
  if (value === null || value === undefined || value === '') return null;

  let text = String(value).trim();

  if (text === '') return null;

  if (text.includes(',')) {
    text = text.replace(/\./g, '').replace(',', '.');
  }

  const parsed = Number(text);

  if (isNaN(parsed)) return null;

  return parsed;
}

export function normalizeBoolean(value: string): boolean | null {
  if (value === null || value === undefined) return null;

  const text = String(value).trim().toUpperCase();

  if (text === '') return null;

  const trueValues = ['SIM', 'S', '1', 'TRUE', 'VERDADEIRO'];
  const falseValues = ['NAO', 'NÃO', 'N', '0', 'FALSE', 'FALSO'];

  if (trueValues.includes(text)) return true;
  if (falseValues.includes(text)) return false;

  return null;
}

export function normalizeStatus(value: string): string | null {
  if (!value) return null;

  const text = String(value)
    .trim()
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, '_');

  const validStatuses = ['PLANEJADA', 'EM_ANDAMENTO', 'CONCLUIDA', 'CANCELADA'];

  if (validStatuses.includes(text)) return text;

  return null;
}