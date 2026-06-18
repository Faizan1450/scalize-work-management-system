/**
 * TimelineGrid — Phase 2.
 *
 * The visible window is fixed to 08:00–22:00 for all users.
 * Occupancy bar is driven by workDayHours (from workSchedule) rather than start/end times.
 */

import React, { useRef } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { Task } from '../../types';
import { TimeBlock } from './TimeBlock';
import {
  generateTimeSlots,
  timeToTopOffset,
  durationToHeight,
  formatTime,
} from '../../utils/time';
import { calculateOccupancy } from '../../utils/occupancy';

const SLOT_HEIGHT_PX = 56;
const TIMELINE_START = '08:00';
const TIMELINE_END = '22:00';

interface TimelineGridProps {
  scheduledTasks: Task[];
  /** Hours available from workSchedule for this specific day (0 = off day) */
  workDayHours: number;
  selectedDate: string;
  readOnly?: boolean;
  onTaskUpdated?: () => void;
  onToast?: (msg: string) => void;
  teamMembers?: import('../../api/types').ApiUser[];
}

interface DroppableSlotProps {
  time: string;
  height: number;
  children?: React.ReactNode;
}

function DroppableSlot({ time, height, children }: DroppableSlotProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: `slot-${time}`,
    data: { time },
  });

  return (
    <div
      ref={setNodeRef}
      style={{ height }}
      className={`relative border-b border-slate-100 transition-colors duration-100 ${
        isOver ? 'bg-blue-50' : ''
      }`}
    >
      {children}
    </div>
  );
}

export function TimelineGrid({
  scheduledTasks,
  workDayHours,
  readOnly = false,
  onTaskUpdated,
  onToast,
  teamMembers,
}: TimelineGridProps) {
  const slots = generateTimeSlots(TIMELINE_START, TIMELINE_END);
  const occupancy = calculateOccupancy(scheduledTasks, workDayHours);

  return (
    <div className="flex flex-col h-full">
      {/* Occupancy bar */}
      <div className="px-4 py-3 border-b border-slate-200 flex-shrink-0">
        <div className="flex items-center justify-between mb-1.5">
          <p className={`text-xs font-semibold ${occupancy.colorClass}`}>
            {occupancy.label}
          </p>
          <span className={`text-xs font-bold ${occupancy.colorClass}`}>
            {occupancy.isOffDay ? '—' : `${occupancy.percentage}%`}
          </span>
        </div>
        <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${occupancy.bgColorClass}`}
            style={{ width: `${Math.min(occupancy.percentage, 100)}%` }}
          />
        </div>
      </div>

      {/* Timeline — fixed 08:00–22:00 */}
      <div className="flex-1 overflow-y-auto relative">
        <div className="flex min-h-full">
          {/* Time labels */}
          <div className="w-16 flex-shrink-0 border-r border-slate-100 bg-slate-50/50">
            {slots.map((time) => (
              <div
                key={time}
                style={{ height: SLOT_HEIGHT_PX }}
                className="flex items-start justify-end pr-2 pt-1"
              >
                <span className="text-[10px] text-slate-400 font-medium">
                  {formatTime(time)}
                </span>
              </div>
            ))}
          </div>

          {/* Slot area */}
          <div className="flex-1 relative">
            {slots.map((time) => (
              <DroppableSlot key={time} time={time} height={SLOT_HEIGHT_PX} />
            ))}

            {/* Task blocks */}
            <div className="absolute inset-0 pointer-events-none">
              <div className="relative h-full pointer-events-auto">
                {scheduledTasks
                  .filter((t) => t.plannedStartTime)
                  .map((task) => {
                    const top = timeToTopOffset(
                      task.plannedStartTime!,
                      TIMELINE_START,
                      SLOT_HEIGHT_PX
                    );
                    const height = durationToHeight(
                      task.estimatedDurationMins,
                      SLOT_HEIGHT_PX
                    );
                    return (
                      <TimeBlock
                        key={task._id}
                        task={task}
                        workStartTime={TIMELINE_START}
                        slotHeightPx={SLOT_HEIGHT_PX}
                        topOffset={top}
                        height={height}
                        readOnly={readOnly}
                        onTaskUpdated={onTaskUpdated}
                        onToast={onToast}
                        teamMembers={teamMembers}
                      />
                    );
                  })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
