import React from 'react';
import { TaskStatus } from '../../types';

/** 'overdue' is a UI-only display status — derived from isOverdue flag, never stored */
type DisplayStatus = TaskStatus | 'overdue';

interface StatusBadgeProps {
  status: DisplayStatus;
  size?: 'sm' | 'md';
}

const statusConfig: Record<
  DisplayStatus,
  { label: string; className: string }
> = {
  not_started: {
    label: 'Not Started',
    className: 'bg-slate-100 text-slate-600',
  },
  in_progress: {
    label: 'In Progress',
    className: 'bg-blue-50 text-blue-700',
  },
  completed: {
    label: 'Completed',
    className: 'bg-emerald-50 text-emerald-700',
  },
  overdue: {
    label: 'Overdue',
    className: 'bg-red-50 text-red-700',
  },
};

export function StatusBadge({ status, size = 'sm' }: StatusBadgeProps) {
  const { label, className } = statusConfig[status];
  const sizeClass = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-sm';

  return (
    <span
      className={`inline-flex items-center gap-1 ${sizeClass} font-medium rounded-full ${className}`}
    >
      <span
        className={`w-1.5 h-1.5 rounded-full ${
          status === 'not_started'
            ? 'bg-slate-400'
            : status === 'in_progress'
            ? 'bg-blue-500'
            : status === 'completed'
            ? 'bg-emerald-500'
            : 'bg-red-500'
        }`}
      />
      {label}
    </span>
  );
}

interface StatusSelectorProps {
  status: DisplayStatus;
  onChange: (status: TaskStatus) => void;
  disabled?: boolean;
}

export function StatusSelector({ status, onChange, disabled = false }: StatusSelectorProps) {
  const statuses: TaskStatus[] = ['not_started', 'in_progress', 'completed'];

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {statuses.map((s) => {
        const { label, className } = statusConfig[s];
        const isActive = status === s;
        return (
          <button
            key={s}
            id={`status-btn-${s}`}
            onClick={() => !disabled && onChange(s)}
            disabled={disabled}
            className={`px-3 py-1.5 text-sm font-medium rounded-lg border transition-all duration-150
              ${isActive
                ? `${className} border-current shadow-sm`
                : 'border-slate-200 text-slate-500 hover:border-slate-300 hover:bg-slate-50'
              }
              ${disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}
            `}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}
