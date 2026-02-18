// ============================================================
// Input Validation — Server-side checks
// ============================================================

export function validateDebtInput(data: Record<string, unknown>): string | null {
  if (!data.name || typeof data.name !== 'string' || data.name.trim().length === 0) {
    return 'Name ist erforderlich.';
  }
  if (data.name.length > 200) return 'Name ist zu lang (max. 200 Zeichen).';

  const amount = Number(data.original_amount);
  if (isNaN(amount) || amount <= 0 || amount > 99_999_999) {
    return 'Gesamtbetrag muss zwischen 0,01 und 99.999.999 liegen.';
  }

  const rate = Number(data.monthly_rate);
  if (isNaN(rate) || rate < 0 || rate > 99_999_999) {
    return 'Rate muss zwischen 0 und 99.999.999 liegen.';
  }

  if (data.due_date && typeof data.due_date === 'string') {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(data.due_date)) {
      return 'Ungültiges Datumsformat (YYYY-MM-DD erwartet).';
    }
  }

  if (data.emoji && typeof data.emoji === 'string' && data.emoji.length > 10) {
    return 'Emoji ist zu lang.';
  }

  return null; // valid
}

export function validatePaymentInput(data: Record<string, unknown>): string | null {
  if (!data.debt_id || typeof data.debt_id !== 'string') {
    return 'Schulden-ID ist erforderlich.';
  }

  const amount = Number(data.amount);
  if (isNaN(amount) || amount <= 0 || amount > 99_999_999) {
    return 'Betrag muss zwischen 0,01 und 99.999.999 liegen.';
  }

  if (data.date && typeof data.date === 'string') {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(data.date)) {
      return 'Ungültiges Datumsformat.';
    }
  }

  return null;
}

/** Sanitize string fields — trim and limit length */
export function sanitize(val: unknown, maxLen = 500): string {
  if (typeof val !== 'string') return '';
  return val.trim().slice(0, maxLen);
}
