import React, { useState } from 'react';
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { ChevronLeft, ChevronRight, AlertCircle, Plus, Inbox } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Task, Notification } from '../../types';
import { BacklogPanel } from '../../components/timeline/BacklogPanel';
import { TimelineGrid } from '../../components/timeline/TimelineGrid';
import { TaskCard } from '../../components/tasks/TaskCard';
import { Modal } from '../../components/ui/Modal';
import { Toast } from '../../components/ui/Toast';
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
  const { state, dispatch, currentUser } = useApp();
  const [selectedDate, setSelectedDate] = useState(today());
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Add Task modal
  const [addTaskOpen, setAddTaskOpen] = useState(false);
  const [taskForm, setTaskForm] = useState({
    title: '',
    description: '',
    durationMins: 60,
    dueDate: today(),
  });

  // Open Task modal
  const [openTaskOpen, setOpenTaskOpen] = useState(false);
  const [openTaskForm, setOpenTaskForm] = useState({ title: '', description: '' });

  const isPast = isDatePast(selectedDate);
  const isToday = isDateToday(selectedDate);

  // Filter tasks belonging to current user for selected date
  const myTasks = state.tasks.filter(
    (t) => t.assigneeId === currentUser.id && !t.isOpenTask
  );

  const tasksForDate = myTasks.filter((t) => t.plannedDate === selectedDate);
  const backlogTasks = tasksForDate.filter((t) => !t.plannedStartTime);
  const scheduledTasks = tasksForDate.filter((t) => t.plannedStartTime !== null);

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  function handleDragStart(event: DragStartEvent) {
    const task = event.active.data.current?.task as Task | undefined;
    if (task) setActiveTask(task);
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveTask(null);
    const { active, over } = event;
    if (!over) return;

    const overId = String(over.id);
    if (!overId.startsWith('slot-')) return;

    const droppedSlotTime = overId.replace('slot-', '');
    const taskId = String(active.id);
    const task = state.tasks.find((t) => t.id === taskId);
    if (!task) return;

    // Build list of existing blocks, excluding the task being dragged
    const existingBlocks: ScheduledBlock[] = scheduledTasks
      .filter((t) => t.id !== taskId && t.plannedStartTime && t.plannedEndTime)
      .map((t) => ({ startTime: t.plannedStartTime!, endTime: t.plannedEndTime! }));

    const freeSlot = findAvailableSlot(
      existingBlocks,
      task.estimatedDurationMins,
      droppedSlotTime,
      '08:00',
      '22:00',
    );

    if (!freeSlot) {
      setToastMessage('No free slot available for this duration today');
      return;
    }

    const endTime = computeEndTime(freeSlot, task.estimatedDurationMins);
    dispatch({
      type: 'SCHEDULE_TASK',
      taskId,
      plannedDate: selectedDate,
      plannedStartTime: freeSlot,
      plannedEndTime: endTime,
    });
  }

  function navigateDate(direction: -1 | 1) {
    setSelectedDate((d) => addDaysToISODate(d, direction));
  }

  function handleAddTask() {
    if (!taskForm.title.trim()) return;
    const newTask: Task = {
      id: `task-self-${Date.now()}`,
      title: taskForm.title.trim(),
      description: taskForm.description.trim(),
      assigneeId: currentUser.id,
      assignerId: currentUser.id,
      estimatedDurationMins: taskForm.durationMins,
      dueDate: taskForm.dueDate,
      plannedDate: selectedDate,
      plannedStartTime: null,
      plannedEndTime: null,
      status: 'not_started',
      comments: [],
      recurrence: 'none',
      isOpenTask: false,
      movedHistory: [],
      createdAt: new Date().toISOString(),
    };
    dispatch({ type: 'ADD_TASK', task: newTask });
    setAddTaskOpen(false);
    setTaskForm({ title: '', description: '', durationMins: 60, dueDate: today() });
  }

  function handleRaiseOpenTask() {
    if (!openTaskForm.title.trim()) return;
    const newOpenTask: Task = {
      id: `task-open-${Date.now()}`,
      title: openTaskForm.title.trim(),
      description: openTaskForm.description.trim(),
      assigneeId: '',
      assignerId: currentUser.id,
      estimatedDurationMins: 60,
      dueDate: addDaysToISODate(today(), 3),
      plannedDate: null,
      plannedStartTime: null,
      plannedEndTime: null,
      status: 'not_started',
      comments: [],
      recurrence: 'none',
      isOpenTask: true,
      movedHistory: [],
      createdAt: new Date().toISOString(),
    };
    dispatch({ type: 'ADD_TASK', task: newOpenTask });

    // Notify owner(s)
    const owners = state.users.filter((u) => u.roles.includes('owner'));
    owners.forEach((owner) => {
      const notif: Notification = {
        id: `notif-open-${Date.now()}-${owner.id}`,
        recipientId: owner.id,
        type: 'open_task_raised',
        message: `${currentUser.name} raised an open task: "${newOpenTask.title}"`,
        taskId: newOpenTask.id,
        read: false,
        createdAt: new Date().toISOString(),
      };
      dispatch({ type: 'ADD_NOTIFICATION', notification: notif });
    });

    setOpenTaskOpen(false);
    setOpenTaskForm({ title: '', description: '' });
  }

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
              {/* Clicking the displayed date opens the native date picker */}
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
              {/* Hidden native date input — positioned over label so click propagates */}
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
          {!isPast && (
            <div className="flex items-center gap-2">
              <button
                id="raise-open-task-btn"
                onClick={() => setOpenTaskOpen(true)}
                className="btn-secondary text-xs py-1.5"
              >
                <Inbox size={13} />
                Raise Open Task
              </button>
            </div>
          )}
        </div>

        {/* Week-ahead occupancy strip */}
        <div className="border-b border-slate-100 bg-slate-50 px-4 py-2 flex-shrink-0">
          <WeekStrip
            selectedDate={selectedDate}
            onDateSelect={setSelectedDate}
            tasks={state.tasks}
            user={currentUser}
            idPrefix="emp"
          />
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

        {/* Two-panel layout */}
        <div className={`flex-1 flex overflow-hidden ${isPast ? 'opacity-90' : ''}`}>
          {/* Backlog panel */}
          <div className="w-72 flex-shrink-0">
            <BacklogPanel
              tasks={backlogTasks}
              onAddTask={() => setAddTaskOpen(true)}
              readOnly={isPast}
              selectedDate={selectedDate}
            />
          </div>

          {/* Timeline panel */}
          <div className="flex-1 overflow-hidden">
            <TimelineGrid
              scheduledTasks={scheduledTasks}
              workDayHours={currentUser.workSchedule[String(new Date(selectedDate + 'T12:00:00').getDay()) as '0'|'1'|'2'|'3'|'4'|'5'|'6']}
              selectedDate={selectedDate}
              readOnly={isPast}
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
            <button id="submit-new-task-btn" onClick={handleAddTask} className="btn-primary flex-1">
              <Plus size={14} />
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
          <div className="flex gap-2 pt-1">
            <button id="submit-open-task-btn" onClick={handleRaiseOpenTask} className="btn-primary flex-1">
              <Inbox size={14} />
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
