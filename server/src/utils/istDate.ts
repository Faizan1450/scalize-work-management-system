/**
 * istDate.ts — IST-aware date utilities for Phase 3 business logic.
 *
 * IST = UTC+5:30. All date comparisons for tasks must use IST,
 * otherwise a task due at midnight IST could appear wrongly
 * computed on a UTC server.
 */

/**
 * Returns today's date as 'YYYY-MM-DD' in IST (UTC+5:30).
 */
export function todayIST(): string {
  const now = new Date();
  // Offset: IST = UTC + 5h30m = 330 minutes
  const istMs = now.getTime() + 330 * 60 * 1000;
  return new Date(istMs).toISOString().slice(0, 10);
}

/**
 * Returns true if dateStr is STRICTLY before today-IST.
 * (i.e., dateStr < todayIST())
 * Off-by-one safe: today itself returns FALSE.
 */
export function isBeforeTodayIST(dateStr: string): boolean {
  return dateStr < todayIST();
}

/**
 * Returns true if dateStr is STRICTLY after today-IST.
 * (i.e., dateStr > todayIST())
 */
export function isAfterTodayIST(dateStr: string): boolean {
  return dateStr > todayIST();
}

/**
 * Returns true if dateStr is today in IST.
 */
export function isTodayIST(dateStr: string): boolean {
  return dateStr === todayIST();
}
