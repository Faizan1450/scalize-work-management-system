import { Task } from '../types';

export interface OccupancyResult {
  scheduledMins: number;
  totalWorkMins: number;
  percentage: number;
  label: string;
  colorClass: string;
  bgColorClass: string;
  isOffDay: boolean;
}

// Single source of truth for occupancy thresholds — do NOT duplicate these constants
const THRESHOLD_GREEN = 40;  // < 40% = green
const THRESHOLD_AMBER = 75;  // 40–75% = amber; > 75% = red

/**
 * Pure function: calculate day occupancy from a list of scheduled tasks.
 * Tasks must already be filtered to the target date.
 *
 * @param scheduledTasks     - tasks for the day that have plannedStartTime
 * @param workDayHours       - hours available on this day from workSchedule[weekday]
 *                             0 means off day — returns isOffDay: true
 */
export function calculateOccupancy(
  scheduledTasks: Task[],
  workDayHours: number
): OccupancyResult {
  if (workDayHours === 0) {
    return {
      scheduledMins: 0,
      totalWorkMins: 0,
      percentage: 0,
      label: 'Off day',
      colorClass: 'text-slate-400',
      bgColorClass: 'bg-slate-300',
      isOffDay: true,
    };
  }

  const totalWorkMins = Math.round(workDayHours * 60);

  const scheduledMins = scheduledTasks
    .filter((t) => t.plannedStartTime !== null)
    .reduce((sum, t) => sum + t.estimatedDurationMins, 0);

  const percentage =
    totalWorkMins > 0 ? Math.round((scheduledMins / totalWorkMins) * 100) : 0;

  const scheduledHours = (scheduledMins / 60).toFixed(1);
  const label = `${scheduledHours}h / ${workDayHours}h scheduled (${percentage}%)`;

  let colorClass: string;
  let bgColorClass: string;
  if (percentage < THRESHOLD_GREEN) {
    colorClass = 'text-emerald-700';
    bgColorClass = 'bg-emerald-500';
  } else if (percentage <= THRESHOLD_AMBER) {
    colorClass = 'text-amber-700';
    bgColorClass = 'bg-amber-500';
  } else {
    colorClass = 'text-red-700';
    bgColorClass = 'bg-red-500';
  }

  return { scheduledMins, totalWorkMins, percentage, label, colorClass, bgColorClass, isOffDay: false };
}

// Export thresholds so WeekStrip can colour chips without duplicating constants
export { THRESHOLD_GREEN, THRESHOLD_AMBER };
