/**
 * TeamMemberDetail — Phase 3 real-API version.
 *
 * Lead can view a specific employee's timeline, assign tasks, edit tasks, and add comments.
 * Status change is not allowed (employee-only).
 * Move is not allowed (employee-only).
 */
import { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { DndContext } from '@dnd-kit/core';
import { ArrowLeft, ChevronLeft, ChevronRight, UserPlus, Loader2 } from 'lucide-react';
import { ApiUser } from '../../api/types';
import { Task } from '../../types';
import { listUsers } from '../../api/users';
import { listTasks, createTask, editTask } from '../../api/tasks';
import { Avatar } from '../../components/ui/Avatar';
import { TaskModal } from '../../components/tasks/TaskModal';
import { Modal } from '../../components/ui/Modal';
import { EmptyState } from '../../components/ui/EmptyState';
import { BacklogPanel } from '../../components/timeline/BacklogPanel';
import { TimelineGrid } from '../../components/timeline/TimelineGrid';
import { Toast } from '../../components/ui/Toast';
import { useAuth } from '../../context/AuthContext';
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
  const navigate = useNavigate();
  const { authUser } = useAuth();
  const [selectedDate, setSelectedDate] = useState(searchParams.get('date') ?? today());
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [assignOpen, setAssignOpen] = useState(false);
  const [assignForm, setAssignForm] = useState({
    title: '',
    description: '',
    durationMins: 60,
    dueDate: today(),
    recurrence: 'none' as 'none' | 'daily' | 'weekly' | 'monthly',
  });
  const [assignSubmitting, setAssignSubmitting] = useState(false);

  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [editForm, setEditForm] = useState({
    title: '',
    description: '',
    durationMins: 60,
    dueDate: today(),
    recurrence: 'none' as 'none' | 'daily' | 'weekly' | 'monthly',
  });
  const [editSubmitting, setEditSubmitting] = useState(false);

  const [member, setMember] = useState<ApiUser | null>(null);
  const [users, setUsers] = useState<ApiUser[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [weekTasks, setWeekTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  async function fetchData() {
    if (!id) return;
    setLoading(true);
    try {
      const [usersData, dayTasks, wkTasks] = await Promise.all([
        listUsers(),
        listTasks({ assigneeId: id, date: selectedDate }),
        listTasks({ assigneeId: id, from: addDaysToISODate(selectedDate, -3), to: addDaysToISODate(selectedDate, 7) }),
      ]);
      const found = usersData.find((u) => u._id === id) ?? null;
      setUsers(usersData);
      setMember(found);
      setTasks(dayTasks);
      setWeekTasks(wkTasks);
    } catch {
      setToast({ msg: 'Failed to load data', type: 'error' });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchData();
  }, [id, selectedDate]);

  const memberTasks = tasks.filter((t) => !t.isOpenTask);
  const scheduledTasks = memberTasks.filter((t) => t.plannedStartTime !== null);
  const selectedDow = new Date(selectedDate + 'T12:00:00').getDay() as 0|1|2|3|4|5|6;
  const memberWorkDayHours = member
    ? ((member.workSchedule as unknown as Record<string, number>)[String(selectedDow)] ?? 8)
    : 8;
  const occupancy = calculateOccupancy(scheduledTasks, memberWorkDayHours);

  // Only include team members that actually map to this lead (leadIds includes authUser._id).
  // This ensures the Reassign picker in TaskModal never shows out-of-team users.
  const mappedTeamMembers = users.filter(
    (u) =>
      u.roles.includes('employee') &&
      u.isActive !== false &&
      u.leadIds.includes(authUser?._id ?? '')
  );

  const isToday = isDateToday(selectedDate);

  async function handleAssign() {
    if (!assignForm.title.trim() || !id || assignSubmitting) return;
    setAssignSubmitting(true);
    try {
      await createTask({
        title: assignForm.title.trim(),
        description: assignForm.description.trim(),
        estimatedDurationMins: assignForm.durationMins,
        dueDate: assignForm.dueDate,
        assigneeId: id,
        recurrence: assignForm.recurrence,
        plannedDate: assignForm.dueDate,
      });
      setAssignOpen(false);
      setAssignForm({ title: '', description: '', durationMins: 60, dueDate: today(), recurrence: 'none' });
      setToast({ msg: 'Task assigned', type: 'success' });
      fetchData();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Failed to assign';
      setToast({ msg, type: 'error' });
    } finally {
      setAssignSubmitting(false);
    }
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

  async function handleSaveEdit() {
    if (!editingTask || !editForm.title.trim() || editSubmitting) return;
    setEditSubmitting(true);
    try {
      await editTask(editingTask._id, {
        title: editForm.title.trim(),
        description: editForm.description.trim(),
        estimatedDurationMins: editForm.durationMins,
        dueDate: editForm.dueDate,
        recurrence: editForm.recurrence,
      });
      setEditingTask(null);
      setToast({ msg: 'Task updated', type: 'success' });
      fetchData();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Failed to update';
      setToast({ msg, type: 'error' });
    } finally {
      setEditSubmitting(false);
    }
  }

  // Adapt ApiUser to WeekStrip user shape
  function toWeekStripUser(u: ApiUser) {
    return {
      _id: u._id,
      id: u._id,
      name: u.name,
      workSchedule: u.workSchedule as unknown as Record<'0'|'1'|'2'|'3'|'4'|'5'|'6', number>,
    };
  }

  if (!loading && !member) {
    return (
      <div className="p-6">
        <p className="text-slate-500">Member not found.</p>
        <button onClick={() => navigate('/lead')} className="btn-secondary mt-4">Back</button>
      </div>
    );
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
          {member && (
            <>
              <Avatar name={member.name} color={member.avatarColor} size="md" />
              <div>
                <h1 className="text-sm font-bold text-slate-900">{member.name}</h1>
                <p className="text-xs text-slate-400">@{member.userId}</p>
              </div>
            </>
          )}
          {loading && <Loader2 size={14} className="animate-spin text-slate-400" />}
        </div>
        <button
          id="member-assign-task-btn"
          onClick={() => setAssignOpen(true)}
          disabled={!member}
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
        <div className="ml-auto flex items-center gap-2">
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

      {/* Week-ahead occupancy strip */}
      <div className="border-b border-slate-100 bg-slate-50 px-6 py-2 flex-shrink-0">
        {member && (
          <WeekStrip
            selectedDate={selectedDate}
            onDateSelect={setSelectedDate}
            tasks={weekTasks}
            user={toWeekStripUser(member) as Parameters<typeof WeekStrip>[0]['user']}
            idPrefix={`lead-member-${member._id}`}
          />
        )}
      </div>

      {/* Read-only two-panel timeline */}
      <DndContext>
        <div className="flex-1 flex overflow-hidden">
          <div className="w-64 flex-shrink-0">
            <BacklogPanel
              tasks={memberTasks.filter((t) => !t.plannedStartTime)}
              onAddTask={() => setAssignOpen(true)}
              readOnly
              selectedDate={selectedDate}
              teamMembers={mappedTeamMembers}
              onTaskUpdated={fetchData}
              onToast={(msg) => setToast({ msg, type: 'error' })}
            />
          </div>

          <div className="flex-1 overflow-hidden">
            {memberTasks.length === 0 ? (
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
                teamMembers={mappedTeamMembers}
                onTaskUpdated={fetchData}
                onToast={(msg) => setToast({ msg, type: 'error' })}
              />
            )}
          </div>
        </div>
      </DndContext>

      {/* Task detail modal opened from task card click.
          Lead actions (Edit/Reassign/Delete) are visible here when guard conditions hold.
          Status change and Move are NOT available (employee-only actions). */}
      {selectedTask && (
        <TaskModal
          task={selectedTask}
          isOpen={!!selectedTask}
          onClose={() => setSelectedTask(null)}
          readOnly={false}
          allowComment={true}
          teamMembers={mappedTeamMembers}
          onTaskUpdated={() => { setSelectedTask(null); fetchData(); }}
          onToast={(msg) => setToast({ msg, type: 'error' })}
        />
      )}

      {/* Edit task modal */}
      <Modal
        isOpen={!!editingTask}
        onClose={() => setEditingTask(null)}
        title="Edit Task"
        size="md"
        id="lead-edit-task-modal"
      >
        <div className="p-5 space-y-4">
          {editingTask && member && (
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
            <p className="text-[11px] text-amber-600 mt-1 font-medium">Saved but not yet active (Phase 5)</p>
          </div>
          <p className="text-[11px] text-slate-400 italic">Assignee cannot be changed — contact owner to reassign.</p>
          <div className="flex gap-2 pt-1">
            <button
              id="save-lead-edit-task-btn"
              onClick={handleSaveEdit}
              disabled={!editForm.title.trim() || editSubmitting}
              className="btn-primary flex-1"
            >
              {editSubmitting ? <Loader2 size={14} className="animate-spin" /> : null}
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
          {member && (
            <div className="flex items-center gap-2 bg-slate-50 rounded-xl p-3">
              <Avatar name={member.name} color={member.avatarColor} size="sm" />
              <span className="text-sm font-medium text-slate-700">Assigning to {member.name}</span>
            </div>
          )}
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
            <p className="text-[11px] text-amber-600 mt-1 font-medium">Saved but not yet active (Phase 5)</p>
          </div>
          <div className="flex gap-2 pt-1">
            <button
              id="submit-member-assign-btn"
              onClick={handleAssign}
              disabled={!assignForm.title.trim() || assignSubmitting}
              className="btn-primary flex-1"
            >
              {assignSubmitting ? <Loader2 size={14} className="animate-spin" /> : <UserPlus size={14} />}
              Assign Task
            </button>
            <button id="cancel-member-assign-btn" onClick={() => setAssignOpen(false)} className="btn-secondary">Cancel</button>
          </div>
        </div>
      </Modal>

      {toast && (
        <Toast message={toast.msg} type={toast.type} onDismiss={() => setToast(null)} />
      )}
    </div>
  );
}
