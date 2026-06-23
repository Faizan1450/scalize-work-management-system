import { format, addDays, subDays, isToday, isPast, isFuture, parseISO } from 'date-fns';

/**
 * Format a Date object to ISO date string "YYYY-MM-DD"
 */
export function toISODate(date: Date): string {
  return format(date, 'yyyy-MM-dd');
}

/**
 * Get today's ISO date string
 */
export function today(): string {
  return toISODate(new Date());
}

/**
 * Get yesterday's ISO date string
 */
export function yesterday(): string {
  return toISODate(subDays(new Date(), 1));
}

/**
 * Get tomorrow's ISO date string
 */
export function tomorrow(): string {
  return toISODate(addDays(new Date(), 1));
}

/**
 * Add N days to an ISO date string, returns ISO date string
 */
export function addDaysToISODate(isoDate: string, days: number): string {
  return toISODate(addDays(parseISO(isoDate), days));
}

/**
 * Find the next working day skipping specified off days
 * offDays: 0=Sunday, 1=Monday ... 6=Saturday
 */
export function nextWorkingDay(fromDate: string, offDays: number[]): string {
  let d = addDays(parseISO(fromDate), 1);
  while (offDays.includes(d.getDay())) {
    d = addDays(d, 1);
  }
  return toISODate(d);
}

/**
 * Check if an ISO date string is today
 */
export function isDateToday(isoDate: string): boolean {
  return isToday(parseISO(isoDate));
}

/**
 * Check if an ISO date string is in the past (before today)
 */
export function isDatePast(isoDate: string): boolean {
  const d = parseISO(isoDate);
  return isPast(d) && !isToday(d);
}

/**
 * Check if an ISO date string is in the future
 */
export function isDateFuture(isoDate: string): boolean {
  return isFuture(parseISO(isoDate));
}

/**
 * Format an ISO date string for display e.g. "Mon, Jun 10"
 */
export function formatDisplayDate(isoDate: string): string {
  return format(parseISO(isoDate), 'EEE, MMM d');
}

/**
 * Format an ISO date string for long display e.g. "Monday, June 10, 2026"
 */
export function formatLongDate(isoDate: string): string {
  return format(parseISO(isoDate), 'EEEE, MMMM d, yyyy');
}

/**
 * Format a datetime ISO string for notification display
 */
export function formatRelativeTime(isoString: string): string {
  const then = new Date(isoString);
  const now = new Date();
  const diffMs = now.getTime() - then.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHrs = Math.floor(diffMins / 60);
  if (diffHrs < 24) return `${diffHrs}h ago`;
  const diffDays = Math.floor(diffHrs / 24);
  return `${diffDays}d ago`;
}

/**
 * Check if a task is overdue: taskDate < today AND status !== completed
 */
export function isTaskOverdue(taskDate: string, status: string): boolean {
  return isDatePast(taskDate) && status !== 'completed';
}
