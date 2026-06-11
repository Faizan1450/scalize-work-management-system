import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Clock, CheckCircle2, Circle, AlertCircle, ChevronRight, UserPlus } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Task, User } from '../../types';
import { Avatar } from '../../components/ui/Avatar';
import { Modal } from '../../components/ui/Modal';
import { EmptyState } from '../../components/ui/EmptyState';
import { WeekStrip } from '../../components/timeline/WeekStrip';
import { calculateOccupancy } from '../../utils/occupancy';
import { today, isTaskOverdue } from '../../utils/date';
import { computeEndTime } from '../../utils/time';

interface AssignTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  mappedEmployees: User[];
}

function AssignTaskModal({ isOpen, onClose, mappedEmployees }: AssignTaskModalProps) {
  const { dispatch, currentUser, state } = useApp();
  const [form, setForm] = useState({
    assigneeId: mappedEmployees[0]?.id ?? '',
    title: '',
    description: '',
    durationMins: 60,
    dueDate: today(),
    recurrence: 'none' as const,
  });

  function handleSubmit() {
    if (!form.title.trim() || !form.assigneeId) return;

    const newTask: Task = {
      id: `task-assign-${Date.now()}`,
      title: form.title.trim(),
      description: form.description.trim(),
      assigneeId: form.assigneeId,
      assignerId: currentUser.id,
      estimatedDurationMins: form.durationMins,
      dueDate: form.dueDate,
      plannedDate: form.dueDate,
      plannedStartTime: null,
      plannedEndTime: null,
      status: 'not_started',
      comments: [],
      recurrence: form.recurrence,
      isOpenTask: false,
      movedHistory: [],
      createdAt: new Date().toISOString(),
    };

    dispatch({ type: 'ADD_TASK', task: newTask });

    setForm({
      assigneeId: mappedEmployees[0]?.id ?? '',
      title: '',
      description: '',
      durationMins: 60,
      dueDate: today(),
      recurrence: 'none',
    });
    onClose();
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Assign Task" size="md" id="assign-task-modal">
      <div className="p-5 space-y-4">
        <div>
          <label htmlFor="assign-assignee" className="label">Assignee *</label>
          <select
            id="assign-assignee"
            value={form.assigneeId}
            onChange={(e) => setForm((f) => ({ ...f, assigneeId: e.target.value }))}
            className="input"
          >
            {mappedEmployees.map((u) => (
              <option key={u.id} value={u.id}>{u.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="assign-title" className="label">Task Title *</label>
          <input
            id="assign-title"
            type="text"
            value={form.title}
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            placeholder="Task title..."
            className="input"
            autoFocus
          />
        </div>
        <div>
          <label htmlFor="assign-description" className="label">Description</label>
          <textarea
            id="assign-description"
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            className="input resize-none"
            rows={3}
            placeholder="Task details..."
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="assign-duration" className="label">Duration</label>
            <select
              id="assign-duration"
              value={form.durationMins}
              onChange={(e) => setForm((f) => ({ ...f, durationMins: Number(e.target.value) }))}
              className="input"
            >
              {[30, 60, 90, 120, 150, 180].map((v) => (
                <option key={v} value={v}>{v >= 60 ? `${v / 60}h` : `${v}m`}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="assign-due" className="label">Due Date</label>
            <input
              id="assign-due"
              type="date"
              value={form.dueDate}
              onChange={(e) => setForm((f) => ({ ...f, dueDate: e.target.value }))}
              className="input"
            />
          </div>
        </div>
        <div>
          <label htmlFor="assign-recurrence" className="label">Recurrence</label>
          <select
            id="assign-recurrence"
            value={form.recurrence}
            onChange={(e) => setForm((f) => ({ ...f, recurrence: e.target.value as typeof form.recurrence }))}
            className="input"
          >
            <option value="none">None</option>
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
          </select>
        </div>
        <div>
          <label className="label">Image Attach</label>
          <div
            className="input flex items-center gap-2 text-slate-400 cursor-not-allowed"
            title="Available in Phase 5"
          >
            <span className="text-xs">📎 Attach image (Phase 5)</span>
          </div>
        </div>
        <div className="flex gap-2 pt-1">
          <button id="submit-assign-btn" onClick={handleSubmit} className="btn-primary flex-1">
            <UserPlus size={14} />
            Assign Task
          </button>
          <button id="cancel-assign-btn" onClick={onClose} className="btn-secondary">Cancel</button>
        </div>
      </div>
    </Modal>
  );
}

export function LeadDashboard() {
  const { state, currentUser } = useApp();
  const navigate = useNavigate();
  const [assignOpen, setAssignOpen] = useState(false);

  // Get employees that report to this lead
  const mappedEmployees = state.users.filter(
    (u) => u.leadIds.includes(currentUser.id) && u.roles.includes('employee')
  );

  const todayStr = today();

  function getEmployeeStats(employee: User) {
    const todayTasks = state.tasks.filter(
      (t) => t.assigneeId === employee.id && !t.isOpenTask && t.plannedDate === todayStr
    );
    const scheduled = todayTasks.filter((t) => t.plannedStartTime !== null);
    const todayDow = new Date().getDay() as 0|1|2|3|4|5|6;
    const workDayHours = employee.workSchedule[String(todayDow) as keyof typeof employee.workSchedule];
    const occupancy = calculateOccupancy(scheduled, workDayHours);

    const notStarted = todayTasks.filter((t) => t.status === 'not_started').length;
    const inProgress = todayTasks.filter((t) => t.status === 'in_progress').length;
    const completed = todayTasks.filter((t) => t.status === 'completed').length;
    const overdue = todayTasks.filter((t) => isTaskOverdue(t.dueDate, t.status)).length;

    return { occupancy, notStarted, inProgress, completed, overdue, total: todayTasks.length };
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-lg font-bold text-slate-900">Team Overview</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {mappedEmployees.length} team{' '}
            {mappedEmployees.length === 1 ? 'member' : 'members'} · Today
          </p>
        </div>
        <button
          id="lead-assign-task-btn"
          onClick={() => setAssignOpen(true)}
          disabled={mappedEmployees.length === 0}
          className="btn-primary"
        >
          <UserPlus size={15} />
          Assign Task
        </button>
      </div>

      {/* Team grid */}
      {mappedEmployees.length === 0 ? (
        <EmptyState
          icon={<Users size={24} />}
          title="No team members"
          description="No employees are mapped to report to you yet. Contact the owner to configure hierarchy."
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {mappedEmployees.map((employee) => {
            const stats = getEmployeeStats(employee);
            return (
              <button
                key={employee.id}
                id={`team-member-card-${employee.id}`}
                onClick={() => navigate(`/lead/member/${employee.id}`)}
                className="card p-4 text-left hover:shadow-md hover:border-slate-300 transition-all duration-150 group"
              >
                {/* Employee header */}
                <div className="flex items-center gap-3 mb-4">
                  <div className="relative flex-shrink-0">
                    <Avatar name={employee.name} color={employee.avatarColor} size="md" />
                    {/* Occupancy dot — lower-right of avatar */}
                    <span
                      className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white ${stats.occupancy.bgColorClass}`}
                      title={`${stats.occupancy.label} — ${stats.occupancy.percentage}%`}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-900 truncate">{employee.name}</p>
                    <p className="text-xs text-slate-400">@{employee.userId}</p>
                  </div>
                  <ChevronRight
                    size={14}
                    className="text-slate-300 group-hover:text-slate-400 transition-colors"
                  />
                </div>

                {/* Occupancy */}
                <div className="mb-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[11px] text-slate-500">Today's occupancy</span>
                    <span className={`text-[11px] font-bold ${stats.occupancy.colorClass}`}>
                      {stats.occupancy.percentage}%
                    </span>
                  </div>
                  <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${stats.occupancy.bgColorClass}`}
                      style={{ width: `${Math.min(stats.occupancy.percentage, 100)}%` }}
                    />
                  </div>
                </div>

                {/* Week-ahead compact chip strip */}
                <div className="mb-3" onClick={(e) => e.stopPropagation()}>
                  <WeekStrip
                    selectedDate={todayStr}
                    onDateSelect={(date) => navigate(`/lead/member/${employee.id}?date=${date}`)}
                    tasks={state.tasks}
                    user={employee}
                    idPrefix={`card-${employee.id}`}
                    compact
                  />
                </div>

                {/* Task counts */}
                <div className="grid grid-cols-4 gap-1 text-center">
                  <div className="bg-slate-50 rounded-lg py-1.5">
                    <p className="text-sm font-bold text-slate-700">{stats.notStarted}</p>
                    <p className="text-[9px] text-slate-400">Pending</p>
                  </div>
                  <div className="bg-blue-50 rounded-lg py-1.5">
                    <p className="text-sm font-bold text-blue-600">{stats.inProgress}</p>
                    <p className="text-[9px] text-blue-400">Active</p>
                  </div>
                  <div className="bg-emerald-50 rounded-lg py-1.5">
                    <p className="text-sm font-bold text-emerald-600">{stats.completed}</p>
                    <p className="text-[9px] text-emerald-400">Done</p>
                  </div>
                  <div className="bg-red-50 rounded-lg py-1.5">
                    <p className="text-sm font-bold text-red-600">{stats.overdue}</p>
                    <p className="text-[9px] text-red-400">Overdue</p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}

      <AssignTaskModal
        isOpen={assignOpen}
        onClose={() => setAssignOpen(false)}
        mappedEmployees={mappedEmployees}
      />
    </div>
  );
}
