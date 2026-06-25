/**
 * Returns today's date as YYYY-MM-DD in the user's local timezone.
 * Suitable for HTML date input `max` attributes.
 */
export function getMaxDateInputValue(): string {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Returns the earliest allowed birth date (default 150 years ago) as YYYY-MM-DD.
 */
export function getMinBirthDateInputValue(maxAgeYears = 150): string {
  const minDate = new Date();
  minDate.setFullYear(minDate.getFullYear() - maxAgeYears);
  const year = minDate.getFullYear();
  const month = String(minDate.getMonth() + 1).padStart(2, '0');
  const day = String(minDate.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Formats a stored ISO/date string for HTML date inputs without local timezone drift.
 */
export function formatStoredDateForInput(value?: string | null): string {
  if (!value) return '';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';

  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Checks whether a YYYY-MM-DD value is after today (local calendar date).
 */
export function isDateInputInFuture(dateValue: string): boolean {
  const trimmed = dateValue.trim();
  if (!trimmed) return false;
  return trimmed > getMaxDateInputValue();
}

/**
 * Returns a YYYY-MM-DD string for the API, or undefined when empty.
 */
export function prepareOptionalDateForApi(dateValue: string): string | undefined {
  const trimmed = dateValue.trim();
  return trimmed || undefined;
}
