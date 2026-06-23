/**
 * LeadDashboard — Phase 3 real-API version.
 *
 * Data: GET /api/users (to find mapped employees) + GET /api/tasks (all visible tasks)
 * Mutations: createTask for assign-task flow
 */
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, UserPlus, Loader2, AlertCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { ApiUser } from '../../api/types';
import { Task } from '../../types';
import { listUsers } from '../../api/users';
import { listTasks, createTask } from '../../api/tasks';
import { Avatar } from '../../components/ui/Avatar';
import { Modal } from '../../components/ui/Modal';
import { EmptyState } from '../../components/ui/EmptyState';
import { WeekStrip } from '../../components/timeline/WeekStrip';
import { calculateOccupancy } from '../../utils/occupancy';
import { today, addDaysToISODate } from '../../utils/date';
import { ChevronRight } from 'lucide-react';
import { Toast } from '../../components/ui/Toast';

// ── AssignTaskModal ────────────────────────────────────────────────────────────

interface AssignTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  mappedEmployees: ApiUser[];
  onSuccess: () => void;
}

function AssignTaskModal({ isOpen, onClose, mappedEmployees, onSuccess }: AssignTaskModalProps) {
  const [form, setForm] = useState({
    assigneeId: mappedEmployees[0]?._id ?? '',
    title: '',
    description: '',
    durationMins: 60,
    taskDate: today(),
    recurrence: 'none' as 'none' | 'daily' | 'weekly' | 'monthly',
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showOffDayConfirm, setShowOffDayConfirm] = useState(false);

  async function handleSubmit(bypassConfirm = false) {
    if (!form.title.trim() || !form.assigneeId || submitting) return;

    if (!bypassConfirm && !showOffDayConfirm) {
      const assignee = mappedEmployees.find(u => u._id === form.assigneeId);
      if (assignee) {
        const targetDayOfWeek = new Date(form.taskDate + 'T00:00:00Z').getUTCDay();
        const dayKey = String(targetDayOfWeek);
        const workSched = (assignee.workSchedule as unknown as Record<string, number>) ?? {};
        if (workSched[dayKey] === 0) {
          setShowOffDayConfirm(true);
          return;
        }
      }
    }

    setSubmitting(true);
    setError(null);
    try {
      await createTask({
        title: form.title.trim(),
        description: form.description.trim(),
        estimatedDurationMins: form.durationMins,
        taskDate: form.taskDate,
        assigneeId: form.assigneeId,
        recurrence: form.recurrence,
      });
      setForm({
        assigneeId: mappedEmployees[0]?._id ?? '',
        title: '',
        description: '',
        durationMins: 60,
        taskDate: today(),
        recurrence: 'none',
      });
      setShowOffDayConfirm(false);
      onSuccess();
      onClose();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Failed to assign task';
      setError(msg);
      setShowOffDayConfirm(false);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={() => { onClose(); setShowOffDayConfirm(false); }} title="Assign Task" size="md" id="assign-task-modal">
      <div className="p-5 space-y-4">
        {error && (
          <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
        )}
        {showOffDayConfirm ? (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-3">
            <p className="text-xs text-amber-800 font-semibold">
              This is an off day for {mappedEmployees.find(u => u._id === form.assigneeId)?.name}. Assign anyway?
            </p>
            <div className="flex gap-2">
              <button
                id="confirm-off-day-assign-btn"
                onClick={() => handleSubmit(true)}
                className="btn-primary text-xs"
              >
                Assign anyway
              </button>
              <button
                onClick={() => setShowOffDayConfirm(false)}
                className="btn-secondary text-xs"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <>
            <div>
              <label htmlFor="assign-assignee" className="label">Assignee *</label>
              <select
                id="assign-assignee"
                value={form.assigneeId}
                onChange={(e) => setForm((f) => ({ ...f, assigneeId: e.target.value }))}
                className="input"
              >
                {mappedEmployees.map((u) => (
                  <option key={u._id} value={u._id}>{u.name}</option>
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
                <label htmlFor="assign-due" className="label">Date</label>
                <input
                  id="assign-due"
                  type="date"
                  value={form.taskDate}
                  onChange={(e) => setForm((f) => ({ ...f, taskDate: e.target.value }))}
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
              <p className="text-[11px] text-amber-600 mt-1 font-medium">Saved but not yet active (Phase 5)</p>
            </div>
            <div className="flex gap-2 pt-1">
              <button
                id="submit-assign-btn"
                onClick={() => handleSubmit(false)}
                disabled={!form.title.trim() || !form.assigneeId || submitting}
                className="btn-primary flex-1"
              >
                {submitting ? <Loader2 size={14} className="animate-spin" /> : <UserPlus size={14} />}
                Assign Task
              </button>
              <button id="cancel-assign-btn" onClick={onClose} className="btn-secondary">Cancel</button>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}

// ── LeadDashboard ─────────────────────────────────────────────────────────────

export function LeadDashboard() {
  const { authUser } = useAuth();
  const navigate = useNavigate();
  const [assignOpen, setAssignOpen] = useState(false);

  const [users, setUsers] = useState<ApiUser[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const todayStr = today();

  async function fetchData() {
    setLoading(true);
    setError(null);
    try {
      const [usersData, tasksData] = await Promise.all([
        listUsers(),
        listTasks({ from: addDaysToISODate(todayStr, -3), to: addDaysToISODate(todayStr, 7) }),
      ]);
      setUsers(usersData);
      setTasks(tasksData);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Failed to load data';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchData();
  }, []);

  // Employees mapped under this lead
  const mappedEmployees = authUser
    ? users.filter(
        (u) => u.roles.includes('employee')
      )
    : [];

  function getEmployeeStats(employee: ApiUser) {
    const todayTasks = tasks.filter(
      (t) => {
        const assigneeIdStr = typeof t.assigneeId === 'object' && t.assigneeId ? t.assigneeId._id : t.assigneeId;
        if (assigneeIdStr !== employee._id || t.isOpenTask) return false;

        // Three-bucket rule on client for today:
        const isScheduledToday = t.taskDate === todayStr;
        const isCarryOver = t.taskDate < todayStr && t.status !== 'completed';
        return isScheduledToday || isCarryOver;
      }
    );
    const scheduled = todayTasks.filter((t) => t.scheduledTime !== null);
    const todayDow = new Date().getDay() as 0|1|2|3|4|5|6;
    const workDayHours = (employee.workSchedule as unknown as Record<string, number>)[String(todayDow)] ?? 8;
    const occupancy = calculateOccupancy(scheduled, workDayHours);

    return {
      occupancy,
      notStarted: todayTasks.filter((t) => t.status === 'not_started').length,
      inProgress: todayTasks.filter((t) => t.status === 'in_progress').length,
      completed: todayTasks.filter((t) => t.status === 'completed').length,
      overdue: todayTasks.filter((t) => t.isOverdue).length,
      total: todayTasks.length,
    };
  }

  // Adapt ApiUser to the shape WeekStrip expects (it wants a User-like object)
  function toWeekStripUser(u: ApiUser) {
    return {
      _id: u._id,
      id: u._id,
      name: u.name,
      workSchedule: u.workSchedule as unknown as Record<'0'|'1'|'2'|'3'|'4'|'5'|'6', number>,
    };
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-lg font-bold text-slate-900">Team Overview</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {loading ? 'Loading...' : `${mappedEmployees.length} team ${mappedEmployees.length === 1 ? 'member' : 'members'} · Today`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {loading && <Loader2 size={16} className="animate-spin text-slate-400" />}
          <button
            id="lead-assign-task-btn"
            onClick={() => setAssignOpen(true)}
            disabled={mappedEmployees.length === 0 || loading}
            className="btn-primary"
          >
            <UserPlus size={15} />
            Assign Task
          </button>
        </div>
      </div>

      {/* Error banner */}
      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 rounded-xl px-4 py-3 flex items-center gap-2">
          <AlertCircle size={14} className="text-red-600 flex-shrink-0" />
          <p className="text-xs text-red-700">{error}</p>
          <button onClick={fetchData} className="ml-auto text-xs text-red-600 hover:underline">Retry</button>
        </div>
      )}

      {/* Team grid */}
      {!loading && !error && mappedEmployees.length === 0 ? (
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
              <div
                key={employee._id}
                id={`team-member-card-${employee._id}`}
                onClick={() => navigate(`/lead/member/${employee._id}`)}
                className="card p-4 text-left hover:shadow-md hover:border-slate-300 transition-all duration-150 group cursor-pointer"
              >
                {/* Employee header */}
                <div className="flex items-center gap-3 mb-4">
                  <div className="relative flex-shrink-0">
                    <Avatar name={employee.name} color={employee.avatarColor} size="md" />
                    <span
                      className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white ${stats.occupancy.bgColorClass}`}
                      title={`${stats.occupancy.label} — ${stats.occupancy.percentage}%`}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-900 truncate">{employee.name}</p>
                    <p className="text-xs text-slate-400">@{employee.userId}</p>
                  </div>
                  <ChevronRight size={14} className="text-slate-300 group-hover:text-slate-400 transition-colors" />
                </div>

                {/* Occupancy */}
                <div className="mb-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[11px] text-slate-500">
                      {stats.occupancy.isOffDay ? stats.occupancy.label : "Today's occupancy"}
                    </span>
                    <span className={`text-[11px] font-bold ${stats.occupancy.colorClass}`}>
                      {stats.occupancy.isOffDay ? '—' : `${stats.occupancy.percentage}%`}
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
                    onDateSelect={(date) => navigate(`/lead/member/${employee._id}?date=${date}`)}
                    tasks={tasks}
                    user={toWeekStripUser(employee) as Parameters<typeof WeekStrip>[0]['user']}
                    idPrefix={`card-${employee._id}`}
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
              </div>
            );
          })}
        </div>
      )}

      <AssignTaskModal
        isOpen={assignOpen}
        onClose={() => setAssignOpen(false)}
        mappedEmployees={mappedEmployees}
        onSuccess={() => {
          fetchData();
          setToast('Task assigned successfully');
        }}
      />

      {toast && (
        <Toast message={toast} type="success" onDismiss={() => setToast(null)} />
      )}
    </div>
  );
}
