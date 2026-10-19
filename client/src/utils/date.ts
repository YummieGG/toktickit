export function formatTicketDateTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toISOString().slice(0, 16).replace('T', ' ');
}

export function formatBangkokDateTime(value: string | Date): string {
  const date = typeof value === 'string' ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return typeof value === 'string' ? value : '';
  try {
    return date.toLocaleString('sv-SE', { timeZone: 'Asia/Bangkok' }).slice(0, 16);
  } catch {
    return date.toISOString().slice(0, 16).replace('T', ' ');
  }
}

export function formatBangkokDate(value: string | Date): string {
  const date = typeof value === 'string' ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return typeof value === 'string' ? value : '';
  try {
    return date.toLocaleDateString('sv-SE', { timeZone: 'Asia/Bangkok' });
  } catch {
    return date.toISOString().slice(0, 10);
  }
}
