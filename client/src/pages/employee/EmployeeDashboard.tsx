/**
 * EmployeeDashboard — Phase 3 real-API version.
 *
 * Data: useTasks() hook → GET /api/tasks with date/assigneeId params.
 * Mutations: scheduleTask, createTask, updateStatus, moveTask via real API.
 * Optimistic drag-to-schedule with rollback on 4xx/5xx.
 */
import React, { useState, useCallback } from 'react';
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { ChevronLeft, ChevronRight, AlertCircle, Plus, Inbox, Loader2, RefreshCw } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { Task } from '../../types';
import { useTasks } from '../../hooks/useTasks';
import { BacklogPanel } from '../../components/timeline/BacklogPanel';
import { TimelineGrid } from '../../components/timeline/TimelineGrid';
import { TaskCard } from '../../components/tasks/TaskCard';
import { Modal } from '../../components/ui/Modal';
import { Toast } from '../../components/ui/Toast';
import { scheduleTask, createTask } from '../../api/tasks';
import {
  today,
  isDatePast,
  isDateToday,
  formatDisplayDate,
  addDaysToISODate,
} from '../../utils/date';
import { computeEndTime, findAvailableSlot, ScheduledBlock } from '../../utils/time';
import { WeekStrip } from '../../components/timeline/WeekStrip';

export function EmployeeDashboard() {
  const { state, dispatch } = useApp();
  const { authUser } = useAuth();

  // Use selectedDate from AppContext (shared with WeekStrip / other components)
  const selectedDate = state.selectedDate;
  const setSelectedDate = useCallback(
    (d: string) => dispatch({ type: 'SET_DATE', date: d }),
    [dispatch]
  );

  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastType, setToastType] = useState<'error' | 'success'>('error');

  // Add Task modal
  const [addTaskOpen, setAddTaskOpen] = useState(false);
  const [taskForm, setTaskForm] = useState({
    title: '',
    description: '',
    durationMins: 60,
    dueDate: today(),
  });
  const [taskSubmitting, setTaskSubmitting] = useState(false);

  // Open Task modal
  const [openTaskOpen, setOpenTaskOpen] = useState(false);
  const [openTaskForm, setOpenTaskForm] = useState({ title: '', description: '', dueDate: addDaysToISODate(today(), 3) });
  const [openTaskSubmitting, setOpenTaskSubmitting] = useState(false);

  const isPast = isDatePast(selectedDate);
  const isToday = isDateToday(selectedDate);

  // ── Real API data ─────────────────────────────────────────────────────────
  const { tasks, loading, error, refetch, setTasks } = useTasks(
    authUser ? { assigneeId: authUser._id, date: selectedDate } : {}
  );

  // Split: backlog = no plannedStartTime or carry-over, scheduled = scheduled for selectedDate
  const backlogTasks = tasks.filter(
    (t) =>
      !t.isOpenTask &&
      (t.plannedDate === null ||
        t.plannedDate < selectedDate ||
        (t.plannedDate === selectedDate && t.plannedStartTime === null))
  );
  const scheduledTasks = tasks.filter(
    (t) =>
      !t.isOpenTask &&
      t.plannedDate === selectedDate &&
      t.plannedStartTime !== null
  );

  // Week strip needs all tasks for occupancy — ranged fetch
  const { tasks: weekTasks } = useTasks(
    authUser ? {
      assigneeId: authUser._id,
      from: addDaysToISODate(selectedDate, -3),
      to: addDaysToISODate(selectedDate, 7),
    } : {}
  );

  // ── DnD sensors ───────────────────────────────────────────────────────────
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  function handleDragStart(event: DragStartEvent) {
    const task = event.active.data.current?.task as Task | undefined;
    if (task) setActiveTask(task);
  }

  async function handleDragEnd(event: DragEndEvent) {
    setActiveTask(null);
    const { active, over } = event;
    if (!over) return;

    const overId = String(over.id);
    if (!overId.startsWith('slot-')) return;

    const droppedSlotTime = overId.replace('slot-', '');
    const taskId = String(active.id);
    const task = tasks.find((t) => t._id === taskId);
    if (!task) return;

    if (isPast) {
      setToastMessage('Past days are read-only — cannot reschedule');
      setToastType('error');
      return;
    }

    // Build existing blocks for slot finder
    const existingBlocks: ScheduledBlock[] = scheduledTasks
      .filter((t) => t._id !== taskId && t.plannedStartTime && t.plannedEndTime)
      .map((t) => ({ startTime: t.plannedStartTime!, endTime: t.plannedEndTime! }));

    const freeSlot = findAvailableSlot(
      existingBlocks,
      task.estimatedDurationMins,
      droppedSlotTime,
      '08:00',
      '22:00',
    );

    if (!freeSlot) {
      setToastMessage('No free slot available for this duration');
      setToastType('error');
      return;
    }

    const endTime = computeEndTime(freeSlot, task.estimatedDurationMins);

    // Keep backup for rollback
    const originalTasks = [...tasks];

    // Optimistically update task in local tasks state
    setTasks((prev) =>
      prev.map((t) =>
        t._id === taskId
          ? {
              ...t,
              plannedDate: selectedDate,
              plannedStartTime: freeSlot,
              plannedEndTime: endTime,
            }
          : t
      )
    );

    try {
      await scheduleTask(task._id, selectedDate, freeSlot);
      refetch(); // pull fresh data with server-computed endTime
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Failed to schedule task';
      setToastMessage(msg);
      setToastType('error');
      setTasks(originalTasks); // rollback
    }
  }

  function navigateDate(direction: -1 | 1) {
    setSelectedDate(addDaysToISODate(selectedDate, direction));
  }

  async function handleAddTask() {
    if (!taskForm.title.trim() || !authUser || taskSubmitting) return;
    setTaskSubmitting(true);
    try {
      await createTask({
        title: taskForm.title.trim(),
        description: taskForm.description.trim(),
        estimatedDurationMins: taskForm.durationMins,
        dueDate: taskForm.dueDate,
        assigneeId: authUser._id, // self-task
        plannedDate: selectedDate, // place in current day backlog
      });
      refetch();
      setAddTaskOpen(false);
      setTaskForm({ title: '', description: '', durationMins: 60, dueDate: today() });
      setToastMessage('Task created');
      setToastType('success');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Failed to create task';
      setToastMessage(msg);
      setToastType('error');
    } finally {
      setTaskSubmitting(false);
    }
  }

  async function handleRaiseOpenTask() {
    if (!openTaskForm.title.trim() || !authUser || openTaskSubmitting) return;
    setOpenTaskSubmitting(true);
    try {
      await createTask({
        title: openTaskForm.title.trim(),
        description: openTaskForm.description.trim(),
        estimatedDurationMins: 60,
        dueDate: openTaskForm.dueDate,
        isOpenTask: true,
      });
      refetch();
      setOpenTaskOpen(false);
      setOpenTaskForm({ title: '', description: '', dueDate: addDaysToISODate(today(), 3) });
      setToastMessage('Open task raised — owner will assign it');
      setToastType('success');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Failed to raise open task';
      setToastMessage(msg);
      setToastType('error');
    } finally {
      setOpenTaskSubmitting(false);
    }
  }

  // authUser workSchedule for WeekStrip/TimelineGrid
  const workSchedule = (authUser?.workSchedule as unknown as Record<string, number>)
    ?? { '0': 0, '1': 8, '2': 8, '3': 8, '4': 8, '5': 8, '6': 0 };
  const dayOfWeek = String(new Date(selectedDate + 'T12:00:00').getDay()) as '0'|'1'|'2'|'3'|'4'|'5'|'6';
  const workDayHours = workSchedule[dayOfWeek] ?? 8;

  // Adapt authUser to the shape WeekStrip expects
  const weekStripUser = authUser ? {
    _id: authUser._id,
    id: authUser._id,
    name: authUser.name,
    workSchedule: workSchedule as Record<'0'|'1'|'2'|'3'|'4'|'5'|'6', number>,
  } : null;

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="h-full flex flex-col">
        {/* Top bar */}
        <div className="h-12 border-b border-slate-200 bg-white flex items-center justify-between px-4 flex-shrink-0">
          {/* Date navigation */}
          <div className="flex items-center gap-2">
            <button
              id="prev-day-btn"
              onClick={() => navigateDate(-1)}
              className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 transition-colors"
            >
              <ChevronLeft size={16} />
            </button>

            <div className="text-center relative">
              <label htmlFor="employee-date-picker" className="cursor-pointer group">
                <span className="text-sm font-semibold text-slate-800 group-hover:text-primary-700 transition-colors">
                  {formatDisplayDate(selectedDate)}
                </span>
              </label>
              {isToday && (
                <span className="ml-2 text-[10px] bg-primary-700 text-white px-1.5 py-0.5 rounded-full font-semibold">
                  Today
                </span>
              )}
              {isPast && (
                <span className="ml-2 text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full font-semibold">
                  Read Only
                </span>
              )}
              <input
                id="employee-date-picker"
                type="date"
                value={selectedDate}
                onChange={(e) => { if (e.target.value) setSelectedDate(e.target.value); }}
                className="absolute inset-0 opacity-0 w-full cursor-pointer"
                aria-label="Jump to date"
              />
            </div>

            <button
              id="next-day-btn"
              onClick={() => navigateDate(1)}
              className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 transition-colors"
            >
              <ChevronRight size={16} />
            </button>

            {!isToday && (
              <button
                id="go-today-btn"
                onClick={() => setSelectedDate(today())}
                className="text-xs text-primary-700 hover:text-primary-800 font-medium px-2 py-1 hover:bg-primary-50 rounded-lg transition-colors"
              >
                Today
              </button>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            {loading && <Loader2 size={14} className="text-slate-400 animate-spin" />}
            {error && (
              <button
                onClick={refetch}
                className="flex items-center gap-1 text-xs text-red-600 hover:text-red-700"
              >
                <RefreshCw size={12} />
                Retry
              </button>
            )}
            {!isPast && (
              <>
                <button
                  id="add-self-task-btn"
                  onClick={() => setAddTaskOpen(true)}
                  className="btn-secondary text-xs py-1.5"
                >
                  <Plus size={13} />
                  Add Task
                </button>
                <button
                  id="raise-open-task-btn"
                  onClick={() => setOpenTaskOpen(true)}
                  className="btn-secondary text-xs py-1.5"
                >
                  <Inbox size={13} />
                  Raise Open Task
                </button>
              </>
            )}
          </div>
        </div>

        {/* Week-ahead occupancy strip */}
        <div className="border-b border-slate-100 bg-slate-50 px-4 py-2 flex-shrink-0">
          {weekStripUser && (
            <WeekStrip
              selectedDate={selectedDate}
              onDateSelect={setSelectedDate}
              tasks={weekTasks}
              user={weekStripUser as Parameters<typeof WeekStrip>[0]['user']}
              idPrefix="emp"
            />
          )}
        </div>

        {/* Past day warning */}
        {isPast && (
          <div className="bg-amber-50 border-b border-amber-200 px-4 py-2 flex items-center gap-2 flex-shrink-0">
            <AlertCircle size={13} className="text-amber-600 flex-shrink-0" />
            <p className="text-xs text-amber-700">
              Past day — timeline is read-only. Tasks cannot be rescheduled.
            </p>
          </div>
        )}

        {/* Error banner */}
        {error && (
          <div className="bg-red-50 border-b border-red-200 px-4 py-2 flex items-center gap-2 flex-shrink-0">
            <AlertCircle size={13} className="text-red-600 flex-shrink-0" />
            <p className="text-xs text-red-700">Failed to load tasks: {error}</p>
            <button onClick={refetch} className="ml-auto text-xs text-red-600 hover:underline">
              Retry
            </button>
          </div>
        )}

        {/* Two-panel layout */}
        <div className={`flex-1 flex overflow-hidden ${isPast ? 'opacity-90' : ''}`}>
          {/* Backlog panel */}
          <div className="w-72 flex-shrink-0">
            <BacklogPanel
              tasks={backlogTasks}
              onAddTask={() => setAddTaskOpen(true)}
              readOnly={isPast}
              selectedDate={selectedDate}
              onTaskUpdated={refetch}
              onToast={(msg) => { setToastMessage(msg); setToastType('error'); }}
            />
          </div>

          {/* Timeline panel */}
          <div className="flex-1 overflow-hidden">
            <TimelineGrid
              scheduledTasks={scheduledTasks}
              workDayHours={workDayHours}
              selectedDate={selectedDate}
              readOnly={isPast}
              onTaskUpdated={refetch}
              onToast={(msg) => { setToastMessage(msg); setToastType('error'); }}
            />
          </div>
        </div>
      </div>

      {/* Drag overlay */}
      <DragOverlay>
        {activeTask && (
          <div className="w-64 rotate-2 opacity-90 shadow-2xl">
            <TaskCard task={activeTask} onClick={() => {}} isDragging />
          </div>
        )}
      </DragOverlay>

      {/* Toast notification */}
      {toastMessage && (
        <Toast
          message={toastMessage}
          type={toastType}
          onDismiss={() => setToastMessage(null)}
        />
      )}

      {/* Add Task Modal */}
      <Modal
        isOpen={addTaskOpen}
        onClose={() => setAddTaskOpen(false)}
        title="Add Self Task"
        size="sm"
        id="add-task-modal"
      >
        <div className="p-5 space-y-4">
          <div>
            <label htmlFor="new-task-title" className="label">
              Task Title *
            </label>
            <input
              id="new-task-title"
              type="text"
              value={taskForm.title}
              onChange={(e) => setTaskForm((f) => ({ ...f, title: e.target.value }))}
              placeholder="What needs to be done?"
              className="input"
              autoFocus
            />
          </div>
          <div>
            <label htmlFor="new-task-description" className="label">
              Description
            </label>
            <textarea
              id="new-task-description"
              value={taskForm.description}
              onChange={(e) => setTaskForm((f) => ({ ...f, description: e.target.value }))}
              placeholder="Add details..."
              className="input resize-none"
              rows={3}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="new-task-duration" className="label">
                Duration (mins)
              </label>
              <select
                id="new-task-duration"
                value={taskForm.durationMins}
                onChange={(e) =>
                  setTaskForm((f) => ({ ...f, durationMins: Number(e.target.value) }))
                }
                className="input"
              >
                {[30, 60, 90, 120, 150, 180].map((v) => (
                  <option key={v} value={v}>
                    {v >= 60 ? `${v / 60}h` : `${v}m`}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="new-task-due" className="label">
                Due Date
              </label>
              <input
                id="new-task-due"
                type="date"
                value={taskForm.dueDate}
                onChange={(e) => setTaskForm((f) => ({ ...f, dueDate: e.target.value }))}
                className="input"
              />
            </div>
          </div>
          <div className="flex gap-2 pt-1">
            <button
              id="submit-new-task-btn"
              onClick={handleAddTask}
              disabled={!taskForm.title.trim() || taskSubmitting}
              className="btn-primary flex-1"
            >
              {taskSubmitting ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
              Add Task
            </button>
            <button
              id="cancel-new-task-btn"
              onClick={() => setAddTaskOpen(false)}
              className="btn-secondary"
            >
              Cancel
            </button>
          </div>
        </div>
      </Modal>

      {/* Raise Open Task Modal */}
      <Modal
        isOpen={openTaskOpen}
        onClose={() => setOpenTaskOpen(false)}
        title="Raise Open Task"
        size="sm"
        id="raise-open-task-modal"
      >
        <div className="p-5 space-y-4">
          <p className="text-xs text-slate-500 bg-amber-50 border border-amber-200 rounded-lg p-3">
            Open tasks have no assignee yet. The owner will assign this task to an appropriate team member.
          </p>
          <div>
            <label htmlFor="open-task-title" className="label">
              Task Title *
            </label>
            <input
              id="open-task-title"
              type="text"
              value={openTaskForm.title}
              onChange={(e) => setOpenTaskForm((f) => ({ ...f, title: e.target.value }))}
              placeholder="Task title..."
              className="input"
              autoFocus
            />
          </div>
          <div>
            <label htmlFor="open-task-description" className="label">
              Description
            </label>
            <textarea
              id="open-task-description"
              value={openTaskForm.description}
              onChange={(e) => setOpenTaskForm((f) => ({ ...f, description: e.target.value }))}
              placeholder="Describe what needs to be done..."
              className="input resize-none"
              rows={3}
            />
          </div>
          <div>
            <label htmlFor="open-task-due" className="label">Due Date</label>
            <input
              id="open-task-due"
              type="date"
              value={openTaskForm.dueDate}
              onChange={(e) => setOpenTaskForm((f) => ({ ...f, dueDate: e.target.value }))}
              className="input"
            />
          </div>
          <div className="flex gap-2 pt-1">
            <button
              id="submit-open-task-btn"
              onClick={handleRaiseOpenTask}
              disabled={!openTaskForm.title.trim() || openTaskSubmitting}
              className="btn-primary flex-1"
            >
              {openTaskSubmitting ? <Loader2 size={14} className="animate-spin" /> : <Inbox size={14} />}
              Raise Task
            </button>
            <button
              id="cancel-open-task-btn"
              onClick={() => setOpenTaskOpen(false)}
              className="btn-secondary"
            >
              Cancel
            </button>
          </div>
        </div>
      </Modal>
    </DndContext>
  );
}
