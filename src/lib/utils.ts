export function formatCurrency(amount: number | null | undefined): string {
  if (amount === null || amount === undefined || isNaN(amount)) return '$ 0';
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatWeight(kg: number | null | undefined): string {
  if (kg === null || kg === undefined || isNaN(kg)) return 'Sin pesarse';
  return new Intl.NumberFormat('es-AR', {
    minimumFractionDigits: 3,
    maximumFractionDigits: 3,
  }).format(kg) + ' kg';
}

export function formatDate(dateString: string | null | undefined): string {
  if (!dateString) return '-';
  // dateString is YYYY-MM-DD
  const parts = dateString.split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return dateString;
}

export function roundToCentena(precio: number): number {
  if (!precio || isNaN(precio)) return 0;
  return Math.round(precio / 100) * 100;
}

export function parseDecimal(val: string | number | null | undefined): number {
  if (val === null || val === undefined || val === '') return 0;
  if (typeof val === 'number') return isNaN(val) ? 0 : val;
  const normalized = val.toString().replace(',', '.').trim();
  const num = parseFloat(normalized);
  return isNaN(num) ? 0 : num;
}

export function parseDecimalOrNull(val: string | number | null | undefined): number | null {
  if (val === null || val === undefined || val === '') return null;
  if (typeof val === 'number') return isNaN(val) ? null : val;
  const normalized = val.toString().replace(',', '.').trim();
  const num = parseFloat(normalized);
  return isNaN(num) ? null : num;
}
