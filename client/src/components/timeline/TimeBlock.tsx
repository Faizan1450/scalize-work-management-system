import React, { useState } from 'react';
import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { Task } from '../../types';
import { useApp } from '../../context/AppContext';
import { formatTime } from '../../utils/time';
import { StatusBadge } from '../ui/StatusBadge';
import { TaskModal } from '../tasks/TaskModal';
import { isTaskOverdue } from '../../utils/date';

interface TimeBlockProps {
  task: Task;
  workStartTime: string;
  slotHeightPx: number;
  topOffset: number;
  height: number;
  readOnly?: boolean;
}

const statusBlockColors: Record<string, string> = {
  not_started: 'bg-slate-100 border-slate-300 text-slate-700',
  in_progress: 'bg-blue-50 border-blue-300 text-blue-800',
  completed: 'bg-emerald-50 border-emerald-300 text-emerald-800',
  overdue: 'bg-red-50 border-red-300 text-red-800',
};

export function TimeBlock({
  task,
  topOffset,
  height,
  readOnly = false,
}: TimeBlockProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: task.id,
    disabled: readOnly,
    data: { type: 'scheduled-task', task },
  });

  const isOverdue = isTaskOverdue(task.dueDate, task.status);
  const effectiveStatus = isOverdue && task.status !== 'completed' ? 'overdue' : task.status;
  const colorClass = statusBlockColors[effectiveStatus];

  const style: React.CSSProperties = {
    top: topOffset,
    height: Math.max(height, 28),
    transform: isDragging ? CSS.Translate.toString(transform) : undefined,
    zIndex: isDragging ? 50 : 10,
    opacity: isDragging ? 0.6 : 1,
  };

  const isShort = height < 48;

  return (
    <>
      <div
        ref={setNodeRef}
        {...attributes}
        {...listeners}
        style={style}
        onClick={(e) => {
          e.stopPropagation();
          setModalOpen(true);
        }}
        className={`
          absolute left-1 right-1 rounded-lg border px-2.5 cursor-pointer select-none
          transition-shadow duration-150 hover:shadow-md
          ${colorClass}
          ${isDragging ? 'shadow-xl' : ''}
          ${readOnly ? 'opacity-60 cursor-default' : ''}
        `}
        title={task.title}
      >
        <div className={`flex items-start justify-between gap-1 ${isShort ? 'pt-1' : 'pt-1.5'}`}>
          <p className={`font-medium leading-tight truncate ${isShort ? 'text-[10px]' : 'text-xs'}`}>
            {task.title}
          </p>
          {!isShort && <StatusBadge status={effectiveStatus} />}
        </div>
        {!isShort && task.plannedStartTime && (
          <p className="text-[10px] mt-0.5 opacity-70">
            {formatTime(task.plannedStartTime)} –{' '}
            {task.plannedEndTime ? formatTime(task.plannedEndTime) : '?'}
          </p>
        )}
      </div>

      <TaskModal
        task={task}
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        readOnly={readOnly}
      />
    </>
  );
}
