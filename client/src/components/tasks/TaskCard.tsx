import React from 'react';
import { Clock, User as UserIcon, ArrowRight } from 'lucide-react';
import { Task } from '../../types';
import { StatusBadge } from '../ui/StatusBadge';
import { Avatar } from '../ui/Avatar';
import { formatTime, computeEndTime, formatDuration } from '../../utils/time';
import { today } from '../../utils/date';

interface TaskCardProps {
  task: Task;
  onClick: () => void;
  compact?: boolean;
  dragHandle?: React.ReactNode;
  isDragging?: boolean;
  /** Optional: pass assigner display name to avoid a user-list lookup */
  assignerName?: string;
  assignerColor?: string;
}

export function TaskCard({
  task,
  onClick,
  compact = false,
  dragHandle,
  isDragging = false,
  assignerName,
  assignerColor,
}: TaskCardProps) {
  // Use server-derived isOverdue (already computed by API)
  const isOverdue = task.isOverdue;
  const effectiveStatus = isOverdue && task.status !== 'completed' ? 'overdue' : task.status;

  const isCarriedOver = task.taskDate < today() && task.status !== 'completed';

  const durationLabel = formatDuration(task.estimatedDurationMins);

  const assignerIdStr = typeof task.assignerId === 'object' && task.assignerId ? task.assignerId._id : task.assignerId;
  const assigneeIdStr = typeof task.assigneeId === 'object' && task.assigneeId ? task.assigneeId._id : task.assigneeId;
  const isSelfTask = assignerIdStr === assigneeIdStr;

  const displayAssignerName = typeof task.assignerId === 'object' && task.assignerId ? task.assignerId.name : (assignerName ?? task.assignerId);
  const displayAssignerColor = typeof task.assignerId === 'object' && task.assignerId ? task.assignerId.avatarColor : assignerColor;

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
            {isCarriedOver ? (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full bg-red-50 text-red-700">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                Carried over · Overdue
              </span>
            ) : (
              <StatusBadge status={effectiveStatus as 'not_started' | 'in_progress' | 'completed' | 'overdue'} />
            )}

            {task.priority && task.priority !== 'medium' && (
              <span className={`inline-flex items-center px-1.5 py-0.5 text-[10px] font-semibold rounded border ${
                task.priority === 'high'
                  ? 'bg-amber-50 text-amber-700 border-amber-200'
                  : 'bg-slate-100 text-slate-600 border-slate-200'
              }`}>
                {task.priority === 'high' ? 'High' : 'Low'}
              </span>
            )}

            <span className="flex items-center gap-1 text-[11px] text-slate-400">
              <Clock size={10} />
              {durationLabel}
            </span>

            {task.scheduledTime && (
              <span className="flex items-center gap-1 text-[11px] text-slate-400">
                {formatTime(task.scheduledTime)}
                <ArrowRight size={9} />
                {formatTime(computeEndTime(task.scheduledTime, task.estimatedDurationMins))}
              </span>
            )}

            {displayAssignerName && !isSelfTask && (
              <div className="flex items-center gap-1 text-[11px] text-slate-400">
                <UserIcon size={10} />
                <span>{displayAssignerName.split(' ')[0]}</span>
              </div>
            )}

            {isSelfTask && (
              <span className="text-[11px] text-slate-400 italic">self</span>
            )}
          </div>
        </div>

        {displayAssignerName && (
          <div className="flex-shrink-0">
            <Avatar name={displayAssignerName} color={displayAssignerColor} size="sm" />
          </div>
        )}
      </div>
    </div>
  );
}
