import { useState } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { DndContext } from '@dnd-kit/core';
import { ArrowLeft, ChevronLeft, ChevronRight, UserPlus, Edit2 } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Task } from '../../types';
import { Avatar } from '../../components/ui/Avatar';
import { TaskModal } from '../../components/tasks/TaskModal';
import { Modal } from '../../components/ui/Modal';
import { EmptyState } from '../../components/ui/EmptyState';
import { BacklogPanel } from '../../components/timeline/BacklogPanel';
import { TimelineGrid } from '../../components/timeline/TimelineGrid';
import {
  today,
  formatDisplayDate,
  isDateToday,
  addDaysToISODate,
} from '../../utils/date';
import { calculateOccupancy } from '../../utils/occupancy';
import { WeekStrip } from '../../components/timeline/WeekStrip';

export function TeamMemberDetail() {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const { state, dispatch, currentUser } = useApp();
  const navigate = useNavigate();
  // If navigated from a compact chip, use the chip's date; otherwise default to today
  const [selectedDate, setSelectedDate] = useState(searchParams.get('date') ?? today());
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [assignOpen, setAssignOpen] = useState(false);
  const [assignForm, setAssignForm] = useState({
    title: '',
    description: '',
    durationMins: 60,
    dueDate: today(),
    recurrence: 'none' as const,
  });

  // Edit task state — only for tasks where assignerId === currentUser.id
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [editForm, setEditForm] = useState({
    title: '',
    description: '',
    durationMins: 60,
    dueDate: today(),
    recurrence: 'none' as 'none' | 'daily' | 'weekly' | 'monthly',
  });

  const member = state.users.find((u) => u.id === id);
  const memberId = member?.id ?? '';

  if (!member) {
    return (
      <div className="p-6">
        <p className="text-slate-500">Member not found.</p>
        <button onClick={() => navigate('/lead')} className="btn-secondary mt-4">Back</button>
      </div>
    );
  }

  const memberTasks = state.tasks.filter(
    (t) => t.assigneeId === memberId && !t.isOpenTask && t.plannedDate === selectedDate
  );
  const scheduledTasks = memberTasks.filter((t) => t.plannedStartTime !== null);
  const selectedDow = new Date(selectedDate + 'T12:00:00').getDay() as 0|1|2|3|4|5|6;
  const memberWorkDayHours = member.workSchedule[String(selectedDow) as keyof typeof member.workSchedule];
  const occupancy = calculateOccupancy(scheduledTasks, memberWorkDayHours);

  const isToday = isDateToday(selectedDate);

  function handleAssign() {
    if (!assignForm.title.trim() || !memberId) return;
    const newTask: Task = {
      id: `task-lead-${Date.now()}`,
      title: assignForm.title.trim(),
      description: assignForm.description.trim(),
      assigneeId: memberId,
      assignerId: currentUser.id,
      estimatedDurationMins: assignForm.durationMins,
      dueDate: assignForm.dueDate,
      plannedDate: assignForm.dueDate,
      plannedStartTime: null,
      plannedEndTime: null,
      status: 'not_started',
      comments: [],
      recurrence: assignForm.recurrence,
      isOpenTask: false,
      movedHistory: [],
      createdAt: new Date().toISOString(),
    };
    dispatch({ type: 'ADD_TASK', task: newTask });
    setAssignOpen(false);
    setAssignForm({ title: '', description: '', durationMins: 60, dueDate: today(), recurrence: 'none' });
  }

  function handleOpenEdit(task: Task) {
    setEditingTask(task);
    setEditForm({
      title: task.title,
      description: task.description,
      durationMins: task.estimatedDurationMins,
      dueDate: task.dueDate,
      recurrence: task.recurrence,
    });
  }

  function handleSaveEdit() {
    if (!editingTask || !editForm.title.trim()) return;
    dispatch({
      type: 'UPDATE_TASK',
      task: {
        ...editingTask,
        title: editForm.title.trim(),
        description: editForm.description.trim(),
        estimatedDurationMins: editForm.durationMins,
        dueDate: editForm.dueDate,
        recurrence: editForm.recurrence,
      },
    });
    setEditingTask(null);
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="px-6 py-4 border-b border-slate-200 bg-white flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <button
            id="back-to-team-btn"
            onClick={() => navigate('/lead')}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100"
          >
            <ArrowLeft size={16} />
          </button>
          <Avatar name={member.name} color={member.avatarColor} size="md" />
          <div>
            <h1 className="text-sm font-bold text-slate-900">{member.name}</h1>
            <p className="text-xs text-slate-400">@{member.userId}</p>
          </div>
        </div>
        <button
          id="member-assign-task-btn"
          onClick={() => setAssignOpen(true)}
          className="btn-primary"
        >
          <UserPlus size={14} />
          Assign Task
        </button>
      </div>

      {/* Date nav */}
      <div className="px-6 py-2.5 border-b border-slate-100 bg-white flex items-center gap-3 flex-shrink-0">
        <button
          id="member-prev-day-btn"
          onClick={() => setSelectedDate((d) => addDaysToISODate(d, -1))}
          className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100"
        >
          <ChevronLeft size={15} />
        </button>
        <span className="text-sm font-semibold text-slate-700">{formatDisplayDate(selectedDate)}</span>
        {isToday && <span className="text-[10px] bg-primary-700 text-white px-1.5 py-0.5 rounded-full font-semibold">Today</span>}
        <button
          id="member-next-day-btn"
          onClick={() => setSelectedDate((d) => addDaysToISODate(d, 1))}
          className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100"
        >
          <ChevronRight size={15} />
        </button>
        {!isToday && (
          <button onClick={() => setSelectedDate(today())} className="text-xs text-primary-700 font-medium hover:underline">
            Today
          </button>
        )}

        {/* Occupancy */}
        <div className="ml-auto flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className={`text-xs font-semibold ${occupancy.colorClass}`}>
              {occupancy.label}
            </span>
            <div className="w-24 h-1.5 bg-slate-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full ${occupancy.bgColorClass}`}
                style={{ width: `${Math.min(occupancy.percentage, 100)}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Week-ahead occupancy strip for the member */}
      <div className="border-b border-slate-100 bg-slate-50 px-6 py-2 flex-shrink-0">
        <WeekStrip
          selectedDate={selectedDate}
          onDateSelect={setSelectedDate}
          tasks={state.tasks}
          user={member}
          idPrefix={`lead-member-${member.id}`}
        />
      </div>

      {/* Read-only two-panel timeline (mirrors employee view) */}
      <DndContext>
        <div className="flex-1 flex overflow-hidden">
          {/* Unscheduled tasks panel */}
          <div className="w-64 flex-shrink-0">
            <BacklogPanel
              tasks={memberTasks.filter((t) => !t.plannedStartTime)}
              onAddTask={() => setAssignOpen(true)}
              readOnly
              selectedDate={selectedDate}
            />
          </div>

          {/* Read-only timeline */}
          <div className="flex-1 overflow-hidden">
            {memberTasks.filter((t) => t.plannedStartTime).length === 0 &&
              memberTasks.filter((t) => !t.plannedStartTime).length === 0 ? (
                <EmptyState
                  title={`No tasks for ${formatDisplayDate(selectedDate)}`}
                  description="No tasks are planned for this member on this day."
                />
              ) : (
                <TimelineGrid
                  scheduledTasks={memberTasks.filter((t) => !!t.plannedStartTime)}
                  workDayHours={memberWorkDayHours}
                  selectedDate={selectedDate}
                  readOnly
                />
              )}
          </div>
        </div>
      </DndContext>

      {/* Task detail modal — lead can comment but not change status/move */}
      {selectedTask && (
        <TaskModal
          task={selectedTask}
          isOpen={!!selectedTask}
          onClose={() => setSelectedTask(null)}
          readOnly
          allowComment
        />
      )}

      {/* Edit task modal — only for tasks assigned by this lead */}
      <Modal
        isOpen={!!editingTask}
        onClose={() => setEditingTask(null)}
        title="Edit Task"
        size="md"
        id="lead-edit-task-modal"
      >
        <div className="p-5 space-y-4">
          {editingTask && (
            <div className="flex items-center gap-2 bg-blue-50 border border-blue-100 rounded-xl p-3">
              <Avatar name={member.name} color={member.avatarColor} size="sm" />
              <span className="text-sm font-medium text-slate-700">Assigned to {member.name}</span>
            </div>
          )}
          <div>
            <label htmlFor="edit-lead-task-title" className="label">Task Title *</label>
            <input
              id="edit-lead-task-title"
              type="text"
              value={editForm.title}
              onChange={(e) => setEditForm((f) => ({ ...f, title: e.target.value }))}
              className="input"
              autoFocus
            />
          </div>
          <div>
            <label htmlFor="edit-lead-task-desc" className="label">Description</label>
            <textarea
              id="edit-lead-task-desc"
              value={editForm.description}
              onChange={(e) => setEditForm((f) => ({ ...f, description: e.target.value }))}
              className="input resize-none"
              rows={3}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="edit-lead-task-duration" className="label">Duration</label>
              <select
                id="edit-lead-task-duration"
                value={editForm.durationMins}
                onChange={(e) => setEditForm((f) => ({ ...f, durationMins: Number(e.target.value) }))}
                className="input"
              >
                {[30, 60, 90, 120, 150, 180].map((v) => (
                  <option key={v} value={v}>{v >= 60 ? `${v / 60}h` : `${v}m`}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="edit-lead-task-due" className="label">Due Date</label>
              <input
                id="edit-lead-task-due"
                type="date"
                value={editForm.dueDate}
                onChange={(e) => setEditForm((f) => ({ ...f, dueDate: e.target.value }))}
                className="input"
              />
            </div>
          </div>
          <div>
            <label htmlFor="edit-lead-task-recurrence" className="label">Recurrence</label>
            <select
              id="edit-lead-task-recurrence"
              value={editForm.recurrence}
              onChange={(e) => setEditForm((f) => ({ ...f, recurrence: e.target.value as typeof editForm.recurrence }))}
              className="input"
            >
              <option value="none">None</option>
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
            </select>
          </div>
          <p className="text-[11px] text-slate-400 italic">Assignee cannot be changed — contact owner to reassign.</p>
          <div className="flex gap-2 pt-1">
            <button id="save-lead-edit-task-btn" onClick={handleSaveEdit} className="btn-primary flex-1">
              Save Changes
            </button>
            <button id="cancel-lead-edit-task-btn" onClick={() => setEditingTask(null)} className="btn-secondary">
              Cancel
            </button>
          </div>
        </div>
      </Modal>

      {/* Assign task modal */}
      <Modal isOpen={assignOpen} onClose={() => setAssignOpen(false)} title="Assign Task" size="md" id="member-assign-modal">
        <div className="p-5 space-y-4">
          <div className="flex items-center gap-2 bg-slate-50 rounded-xl p-3">
            <Avatar name={member.name} color={member.avatarColor} size="sm" />
            <span className="text-sm font-medium text-slate-700">Assigning to {member.name}</span>
          </div>
          <div>
            <label htmlFor="member-task-title" className="label">Task Title *</label>
            <input id="member-task-title" type="text" value={assignForm.title}
              onChange={(e) => setAssignForm((f) => ({ ...f, title: e.target.value }))}
              placeholder="Task title..." className="input" autoFocus />
          </div>
          <div>
            <label htmlFor="member-task-desc" className="label">Description</label>
            <textarea id="member-task-desc" value={assignForm.description}
              onChange={(e) => setAssignForm((f) => ({ ...f, description: e.target.value }))}
              className="input resize-none" rows={3} placeholder="Details..." />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="member-task-duration" className="label">Duration</label>
              <select id="member-task-duration" value={assignForm.durationMins}
                onChange={(e) => setAssignForm((f) => ({ ...f, durationMins: Number(e.target.value) }))}
                className="input">
                {[30, 60, 90, 120, 150, 180].map((v) => (
                  <option key={v} value={v}>{v >= 60 ? `${v / 60}h` : `${v}m`}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="member-task-due" className="label">Due Date</label>
              <input id="member-task-due" type="date" value={assignForm.dueDate}
                onChange={(e) => setAssignForm((f) => ({ ...f, dueDate: e.target.value }))}
                className="input" />
            </div>
          </div>
          <div>
            <label htmlFor="member-task-recurrence" className="label">Recurrence</label>
            <select id="member-task-recurrence" value={assignForm.recurrence}
              onChange={(e) => setAssignForm((f) => ({ ...f, recurrence: e.target.value as typeof assignForm.recurrence }))}
              className="input">
              <option value="none">None</option>
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
            </select>
          </div>
          <div className="flex gap-2 pt-1">
            <button id="submit-member-assign-btn" onClick={handleAssign} className="btn-primary flex-1">
              <UserPlus size={14} /> Assign Task
            </button>
            <button id="cancel-member-assign-btn" onClick={() => setAssignOpen(false)} className="btn-secondary">Cancel</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
