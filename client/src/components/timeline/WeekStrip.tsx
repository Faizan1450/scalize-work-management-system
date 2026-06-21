/**
 * WeekStrip — a horizontal row of day chips.
 *
 * Standard mode (compact=false, default):
 *   7 chips — today + next 6 days
 *   Each chip: weekday abbrev + date number, occupancy %, micro-bar, task count
 *
 * Compact mode (compact=true):
 *   7 mini-chips — yesterday + today + next 5 days
 *   Each chip: weekday initial + date number, colored dot for occupancy, today emphasized
 *   Past (yesterday) chips are slightly dimmed.
 *   Clicking a compact chip fires onDateSelect — caller decides where to navigate.
 *
 * Both modes:
 *   - Off-day chips are muted gray, labeled "Off" (standard) or just dimmed (compact)
 *   - Currently selected chip is highlighted with a ring
 *   - Colors use calculateOccupancy thresholds — no duplicated constants
 *   - Read-only — no drag-and-drop
 */

import React from 'react';
import { parseISO, format } from 'date-fns';
import { Task, User } from '../../types';
import { addDaysToISODate, today } from '../../utils/date';
import { calculateOccupancy, THRESHOLD_GREEN, THRESHOLD_AMBER } from '../../utils/occupancy';

interface WeekStripProps {
  /** ISO date currently selected / highlighted */
  selectedDate: string;
  /** Fires when a chip is clicked. In compact mode callers typically navigate to member detail. */
  onDateSelect: (isoDate: string) => void;
  /** All tasks in state — the strip filters internally per day */
  tasks: Task[];
  /** The user whose schedule is being shown */
  user: User;
  /** Unique prefix for chip button IDs, e.g. "emp" or "lead-member" */
  idPrefix?: string;
  /**
   * Compact mode renders dense mini-chips suitable for team-member cards.
   * Window = yesterday + today + next 5 days (7 total).
   * Default: false (standard view).
   */
  compact?: boolean;
}

export function WeekStrip({
  selectedDate,
  onDateSelect,
  tasks,
  user,
  idPrefix = 'week',
  compact = false,
}: WeekStripProps) {
  const start = today();
  // Standard: today + 6 forward; Compact: yesterday + today + 5 forward
  const offset = compact ? -1 : 0;
  const days = Array.from({ length: 7 }, (_, i) => addDaysToISODate(start, offset + i));

  return (
    <div className={`flex items-stretch overflow-x-auto scrollbar-none ${compact ? 'gap-1' : 'gap-1.5 pb-0.5'}`}>
      {days.map((isoDate) => {
        const date = parseISO(isoDate);
        const dayOfWeek = date.getDay() as 0|1|2|3|4|5|6;
        const workDayHours = user.workSchedule[String(dayOfWeek) as keyof User['workSchedule']];
        const isOff = workDayHours === 0;
        const isSelected = isoDate === selectedDate;
        const isPast = isoDate < start;
        const isToday = isoDate === start;

        const dayTasks = tasks.filter((t) => {
          const assigneeIdStr = typeof t.assigneeId === 'object' && t.assigneeId ? t.assigneeId._id : t.assigneeId;
          if (assigneeIdStr !== (user._id ?? user.id) || t.isOpenTask) return false;

          if (isToday) {
            // Three-bucket rule ONLY for the today chip
            const isScheduledToday = t.plannedDate === isoDate;
            const isUnscheduled = t.plannedDate === null && t.status !== 'completed';
            const isCarryOver = t.plannedDate !== null && t.plannedDate < isoDate && t.status !== 'completed';
            return isScheduledToday || isUnscheduled || isCarryOver;
          } else {
            // Other days: exact match only
            return t.plannedDate === isoDate;
          }
        });
        const scheduledTasks = dayTasks.filter((t) => t.plannedStartTime !== null);
        const occupancy = calculateOccupancy(scheduledTasks, workDayHours);

        // ── COMPACT CHIP ─────────────────────────────────────────────────────
        if (compact) {
          const weekdayInitial = format(date, 'EEEEE'); // Single letter: "M", "T", etc.
          const dayNum = format(date, 'd');

          // Chip color from occupancy — using exported thresholds, no duplication
          const dotColor = isOff
            ? 'bg-slate-200'
            : occupancy.percentage < THRESHOLD_GREEN
              ? 'bg-emerald-400'
              : occupancy.percentage <= THRESHOLD_AMBER
              ? 'bg-amber-400'
              : 'bg-red-400';

          const chipBg = isSelected
            ? 'bg-slate-900 text-white border-slate-900'
            : isToday
            ? 'bg-primary-50 border-primary-300 text-primary-900'
            : isPast
            ? 'bg-slate-50 border-slate-100 text-slate-400 opacity-60'
            : isOff
            ? 'bg-slate-50 border-slate-100 text-slate-300'
            : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300';

          return (
            <button
              key={isoDate}
              id={`${idPrefix}-compact-chip-${isoDate}`}
              onClick={(e) => {
                e.stopPropagation(); // prevent triggering the card button
                onDateSelect(isoDate);
              }}
              className={`relative flex flex-col items-center gap-0.5 px-1.5 py-1.5 rounded-lg border
                transition-all duration-100 cursor-pointer flex-shrink-0 min-w-[32px]
                ${chipBg}`}
              aria-pressed={isSelected}
              aria-label={`${format(date, 'EEE')} ${dayNum}${isOff ? ' — off day' : `, ${occupancy.percentage}% occupied`}`}
            >
              <span className="text-[9px] font-bold uppercase">{weekdayInitial}</span>
              <span className={`text-[11px] font-bold leading-none ${isSelected ? 'text-white' : ''}`}>{dayNum}</span>
              {/* Occupancy color dot */}
              <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${dotColor}`} />
              {/* Today ring */}
              {isToday && !isSelected && (
                <span className="absolute -top-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-primary-600" />
              )}
            </button>
          );
        }

        // ── STANDARD CHIP ────────────────────────────────────────────────────
        const weekdayShort = format(date, 'EEE');
        const dayNum = format(date, 'd');

        let chipBase =
          'relative flex flex-col items-center justify-between gap-1 px-3 py-2 rounded-xl border transition-all duration-150 cursor-pointer flex-shrink-0 min-w-[64px]';

        let chipStyle: string;
        if (isOff) {
          chipStyle = isSelected
            ? 'bg-slate-200 border-slate-400 ring-2 ring-slate-400 ring-offset-1'
            : 'bg-slate-100 border-slate-200 hover:border-slate-300 opacity-60';
        } else if (isSelected) {
          const ringColor = occupancy.percentage < THRESHOLD_GREEN
            ? 'ring-emerald-500'
            : occupancy.percentage <= THRESHOLD_AMBER
            ? 'ring-amber-500'
            : 'ring-red-500';
          chipStyle = `bg-white border-slate-300 shadow-sm ring-2 ${ringColor} ring-offset-1`;
        } else {
          chipStyle = 'bg-white border-slate-200 hover:border-slate-300 hover:shadow-sm';
        }

        return (
          <button
            key={isoDate}
            id={`${idPrefix}-week-chip-${isoDate}`}
            onClick={() => onDateSelect(isoDate)}
            className={`${chipBase} ${chipStyle}`}
            aria-pressed={isSelected}
            aria-label={`${weekdayShort} ${dayNum}${isOff ? ' — off day' : `, ${occupancy.percentage}% occupied, ${dayTasks.length} tasks`}`}
          >
            {/* Weekday + day number */}
            <div className="flex flex-col items-center gap-0">
              <span className={`text-[10px] font-semibold uppercase tracking-wide ${isOff ? 'text-slate-400' : 'text-slate-500'}`}>
                {weekdayShort}
              </span>
              <span className={`text-sm font-bold leading-none ${isOff ? 'text-slate-400' : isSelected ? 'text-slate-900' : 'text-slate-700'}`}>
                {dayNum}
              </span>
            </div>

            {/* Occupancy or Off label */}
            {isOff ? (
              <span className="text-[9px] font-semibold text-slate-400 uppercase tracking-wide">Off</span>
            ) : (
              <div className="flex flex-col items-center gap-0.5">
                <span className={`text-[11px] font-bold ${occupancy.colorClass}`}>
                  {occupancy.percentage}%
                </span>
                {/* Occupancy micro-bar */}
                <div className="w-8 h-1 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${occupancy.bgColorClass}`}
                    style={{ width: `${Math.min(occupancy.percentage, 100)}%` }}
                  />
                </div>
                {/* Task count */}
                <span className={`text-[9px] font-medium ${dayTasks.length > 0 ? 'text-slate-500' : 'text-slate-300'}`}>
                  {dayTasks.length} task{dayTasks.length !== 1 ? 's' : ''}
                </span>
              </div>
            )}

            {/* "Today" dot */}
            {isoDate === start && (
              <span className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-primary-600" />
            )}
          </button>
        );
      })}
    </div>
  );
}
