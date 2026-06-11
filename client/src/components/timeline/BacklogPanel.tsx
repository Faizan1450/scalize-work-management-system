import React, { useState } from 'react';
import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Plus } from 'lucide-react';
import { Task } from '../../types';
import { TaskCard } from '../tasks/TaskCard';
import { TaskModal } from '../tasks/TaskModal';
import { EmptyState } from '../ui/EmptyState';

interface BacklogPanelProps {
  tasks: Task[];
  onAddTask: () => void;
  readOnly?: boolean;
  selectedDate: string;
}

interface DraggableTaskCardProps {
  task: Task;
  readOnly: boolean;
}

function DraggableTaskCard({ task, readOnly }: DraggableTaskCardProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: task.id,
    disabled: readOnly,
    data: { type: 'backlog-task', task },
  });

  const style = transform
    ? { transform: CSS.Translate.toString(transform) }
    : undefined;

  return (
    <>
      <div
        ref={setNodeRef}
        style={style}
        className={isDragging ? 'z-50 relative' : ''}
      >
        <TaskCard
          task={task}
          onClick={() => setModalOpen(true)}
          isDragging={isDragging}
          dragHandle={
            !readOnly ? (
              <span
                {...attributes}
                {...listeners}
                className="text-slate-300 hover:text-slate-400 cursor-grab active:cursor-grabbing"
              >
                <GripVertical size={14} />
              </span>
            ) : undefined
          }
        />
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

export function BacklogPanel({ tasks, onAddTask, readOnly = false, selectedDate }: BacklogPanelProps) {
  return (
    <div className="h-full flex flex-col bg-white border-r border-slate-200">
      {/* Header */}
      <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between flex-shrink-0">
        <div>
          <h2 className="text-xs font-semibold text-slate-700 uppercase tracking-wide">
            Backlog
          </h2>
          <p className="text-[10px] text-slate-400 mt-0.5">
            {tasks.length} unscheduled {tasks.length === 1 ? 'task' : 'tasks'}
          </p>
        </div>
        {!readOnly && (
          <button
            id="add-task-btn"
            onClick={onAddTask}
            className="w-7 h-7 flex items-center justify-center rounded-lg bg-primary-700 text-white hover:bg-primary-800 transition-colors"
            title="Add task"
          >
            <Plus size={14} />
          </button>
        )}
      </div>

      {/* Task list */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {tasks.length === 0 ? (
          <EmptyState
            title="Backlog is clear"
            description="All tasks for this day are scheduled on the timeline."
          />
        ) : (
          tasks.map((task) => (
            <DraggableTaskCard key={task.id} task={task} readOnly={readOnly} />
          ))
        )}
      </div>
    </div>
  );
}
