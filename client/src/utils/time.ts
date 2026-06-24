// ─── Time Utilities ────────────────────────────────────────────────────────────
// All functions are pure and unit-testable

/**
 * Convert a "HH:MM" string to total minutes from midnight
 */
export function timeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

/**
 * Format a duration in minutes to a human-readable string:
 * e.g. 280 → "4h 40m", 90 → "1h 30m", 60 → "1h", 45 → "45m"
 */
export function formatDuration(mins: number): string {
  if (isNaN(mins) || mins <= 0) return '0m';
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h > 0 && m > 0) {
    return `${h}h ${m}m`;
  } else if (h > 0) {
    return `${h}h`;
  } else {
    return `${m}m`;
  }
}

/**
 * Convert total minutes from midnight to "HH:MM" string
 */
export function minutesToTime(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/**
 * Compute end time given a start time string and duration in minutes
 */
export function computeEndTime(startTime: string, durationMins: number): string {
  const startMins = timeToMinutes(startTime);
  return minutesToTime(startMins + durationMins);
}

/**
 * Format a time string for display e.g. "09:00" → "9:00 AM"
 */
export function formatTime(time: string): string {
  const [h, m] = time.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const displayH = h % 12 || 12;
  return `${displayH}:${String(m).padStart(2, '0')} ${ampm}`;
}

/**
 * Check if two time ranges overlap
 * Returns true if [start1, end1) and [start2, end2) overlap
 */
export function timeRangesOverlap(
  start1: string,
  end1: string,
  start2: string,
  end2: string
): boolean {
  const s1 = timeToMinutes(start1);
  const e1 = timeToMinutes(end1);
  const s2 = timeToMinutes(start2);
  const e2 = timeToMinutes(end2);
  return s1 < e2 && s2 < e1;
}

/**
 * Generate 30-minute slot labels for a day given work start and end times
 */
export function generateTimeSlots(startTime: string, endTime: string): string[] {
  const slots: string[] = [];
  let current = timeToMinutes(startTime);
  const end = timeToMinutes(endTime);
  while (current < end) {
    slots.push(minutesToTime(current));
    current += 30;
  }
  return slots;
}

/**
 * Calculate the pixel offset from the top of the timeline for a given time
 */
export function timeToTopOffset(
  time: string,
  workStartTime: string,
  slotHeightPx: number
): number {
  const timeMins = timeToMinutes(time);
  const startMins = timeToMinutes(workStartTime);
  const diffMins = timeMins - startMins;
  return (diffMins / 30) * slotHeightPx;
}

/**
 * Calculate the pixel height for a given duration
 */
export function durationToHeight(durationMins: number, slotHeightPx: number): number {
  return (durationMins / 30) * slotHeightPx;
}

/**
 * Snap a pixel offset to the nearest 30-minute slot
 */
export function snapToSlot(
  offsetPx: number,
  slotHeightPx: number,
  workStartTime: string
): string {
  const slotIndex = Math.round(offsetPx / slotHeightPx);
  const startMins = timeToMinutes(workStartTime);
  return minutesToTime(startMins + slotIndex * 30);
}

// ─── Overlap / Slot Utilities ──────────────────────────────────────────────────

export interface ScheduledBlock {
  startTime: string;   // "HH:MM"
  endTime: string;     // "HH:MM"
}

/**
 * Check whether a proposed slot [start, start+duration) collides with any existing block.
 */
export function hasCollision(
  proposedStart: string,
  durationMins: number,
  existingBlocks: ScheduledBlock[]
): boolean {
  const proposedEnd = minutesToTime(timeToMinutes(proposedStart) + durationMins);
  return existingBlocks.some((b) => timeRangesOverlap(proposedStart, proposedEnd, b.startTime, b.endTime));
}

/**
 * Find the nearest free 30-minute slot for a task of `durationMins`.
 *
 * Strategy:
 *   1. Try the preferredStart slot first.
 *   2. Walk forward in 30-min increments up to DAY_END_TIME.
 *   3. If none found, walk backward from preferredStart to DAY_START_TIME.
 *   4. Returns null if no slot exists anywhere in the day.
 *
 * @param existingBlocks  All already-scheduled blocks for the day (start+end strings)
 * @param durationMins    Duration of the task to place
 * @param preferredStart  The drop target time (e.g. "10:00")
 * @param dayStart        Earliest allowed start (default "08:00")
 * @param dayEnd          Latest allowed end (default "22:00")
 */
export function findAvailableSlot(
  existingBlocks: ScheduledBlock[],
  durationMins: number,
  preferredStart: string,
  dayStart = '08:00',
  dayEnd = '22:00'
): string | null {
  const dayStartMins = timeToMinutes(dayStart);
  const dayEndMins = timeToMinutes(dayEnd);
  const prefMins = timeToMinutes(preferredStart);

  // Snap preferred to nearest 30-min boundary within day
  const clampedPref = Math.max(
    dayStartMins,
    Math.min(prefMins, dayEndMins - durationMins)
  );

  // Walk forward from preferred slot
  let current = clampedPref;
  while (current + durationMins <= dayEndMins) {
    const candidateStart = minutesToTime(current);
    if (!hasCollision(candidateStart, durationMins, existingBlocks)) {
      return candidateStart;
    }
    current += 30;
  }

  // Walk backward from preferred slot
  current = clampedPref - 30;
  while (current >= dayStartMins) {
    const candidateStart = minutesToTime(current);
    if (!hasCollision(candidateStart, durationMins, existingBlocks)) {
      return candidateStart;
    }
    current -= 30;
  }

  return null; // No free slot found
}
