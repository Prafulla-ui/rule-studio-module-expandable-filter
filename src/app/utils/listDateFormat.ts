const LIST_CREATED_DATE_OPTIONS: Intl.DateTimeFormatOptions = {
  year: 'numeric',
  month: 'short',
  day: 'numeric',
};

export function parseListDateValue(value: string): Date | null {
  const trimmed = value.trim();
  if (!trimmed) return null;

  const isoMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoMatch) {
    const year = Number(isoMatch[1]);
    const month = Number(isoMatch[2]) - 1;
    const day = Number(isoMatch[3]);
    const date = new Date(year, month, day);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  const parsed = new Date(trimmed);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function formatListCreatedDate(value: string | undefined | null): string {
  if (!value?.trim()) {
    return '—';
  }

  const parsed = parseListDateValue(value);
  if (!parsed) {
    return value.trim();
  }

  return parsed.toLocaleDateString('en-GB', LIST_CREATED_DATE_OPTIONS);
}
