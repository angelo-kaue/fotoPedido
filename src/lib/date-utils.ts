/**
 * Parse a date string (YYYY-MM-DD) without timezone shift.
 * Uses UTC to avoid off-by-one day errors.
 */
export function parseLocalDate(dateStr: string | null | undefined): Date | null {
  if (!dateStr) return null;
  const iso = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) {
    return new Date(Date.UTC(+iso[1], +iso[2] - 1, +iso[3]));
  }
  return null;
}

/**
 * Format a date string (YYYY-MM-DD) for display in pt-BR without timezone shift.
 */
export function formatDateBR(dateStr: string | null | undefined, options?: { long?: boolean }): string {
  const date = parseLocalDate(dateStr);
  if (!date) return '';
  if (options?.long) {
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      timeZone: 'UTC',
    });
  }
  return date.toLocaleDateString('pt-BR', { timeZone: 'UTC' });
}
