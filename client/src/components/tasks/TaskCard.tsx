import React from 'react';
import { Clock, User as UserIcon, ArrowRight } from 'lucide-react';
import { Task } from '../../types';
import { StatusBadge } from '../ui/StatusBadge';
import { Avatar } from '../ui/Avatar';
import { useApp } from '../../context/AppContext';
import { isTaskOverdue } from '../../utils/date';
import { formatTime } from '../../utils/time';

interface TaskCardProps {
  task: Task;
  onClick: () => void;
  compact?: boolean;
  dragHandle?: React.ReactNode;
  isDragging?: boolean;
}

export function TaskCard({ task, onClick, compact = false, dragHandle, isDragging = false }: TaskCardProps) {
  const { state } = useApp();

  const assigner = state.users.find((u) => u.id === task.assignerId);
  const isOverdue = isTaskOverdue(task.dueDate, task.status);
  const effectiveStatus = isOverdue && task.status !== 'completed' ? 'overdue' : task.status;

  const durationLabel =
    task.estimatedDurationMins >= 60
      ? `${task.estimatedDurationMins / 60}h`
      : `${task.estimatedDurationMins}m`;

  return (
    <div
      onClick={onClick}
      className={`
        group bg-white border rounded-xl p-3 cursor-pointer select-none
        transition-all duration-150
        ${isDragging ? 'shadow-lg border-primary-300 rotate-1 scale-105 opacity-90' : 'border-slate-200 hover:border-slate-300 hover:shadow-sm'}
        ${compact ? 'py-2' : ''}
      `}
    >
      <div className="flex items-start gap-2">
        {dragHandle && (
          <div className="mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity text-slate-300 cursor-grab">
            {dragHandle}
          </div>
        )}
        <div className="flex-1 min-w-0">
          {/* Title */}
          <p className={`text-sm font-medium text-slate-800 leading-snug truncate ${compact ? 'text-xs' : ''}`}>
            {task.title}
          </p>

          {!compact && (
            <p className="text-xs text-slate-400 line-clamp-1 mt-0.5">
              {task.description}
            </p>
          )}

          {/* Meta row */}
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            <StatusBadge status={effectiveStatus} />

            <span className="flex items-center gap-1 text-[11px] text-slate-400">
              <Clock size={10} />
              {durationLabel}
            </span>

            {task.plannedStartTime && (
              <span className="flex items-center gap-1 text-[11px] text-slate-400">
                {formatTime(task.plannedStartTime)}
                <ArrowRight size={9} />
                {task.plannedEndTime ? formatTime(task.plannedEndTime) : '—'}
              </span>
            )}

            {assigner && task.assignerId !== task.assigneeId && (
              <div className="flex items-center gap-1 text-[11px] text-slate-400">
                <UserIcon size={10} />
                <span>{assigner.name.split(' ')[0]}</span>
              </div>
            )}

            {task.assignerId === task.assigneeId && (
              <span className="text-[11px] text-slate-400 italic">self</span>
            )}
          </div>
        </div>

        {assigner && (
          <div className="flex-shrink-0">
            <Avatar name={assigner.name} color={assigner.avatarColor} size="sm" />
          </div>
        )}
      </div>
    </div>
  );
}
