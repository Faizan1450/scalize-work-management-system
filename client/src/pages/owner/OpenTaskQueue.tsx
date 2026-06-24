/**
 * OpenTaskQueue — Phase 3 real-API version.
 * Owner can view, edit, and assign open tasks.
 */
import React, { useState, useEffect } from 'react';
import { Inbox, Edit2, UserPlus, Loader2, AlertCircle } from 'lucide-react';
import { Task } from '../../types';
import { ApiUser } from '../../api/types';
import { listTasks, editTask, claimOpenTask } from '../../api/tasks';
import { listUsers } from '../../api/users';
import { Avatar } from '../../components/ui/Avatar';
import { Modal } from '../../components/ui/Modal';
import { EmptyState } from '../../components/ui/EmptyState';
import { Toast } from '../../components/ui/Toast';
import { formatDisplayDate } from '../../utils/date';

export function OpenTaskQueue() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [users, setUsers] = useState<ApiUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [assigningTask, setAssigningTask] = useState<Task | null>(null);
  const [assigneeId, setAssigneeId] = useState('');
  const [assignTaskDate, setAssignTaskDate] = useState('');
  const [assignTaskPriority, setAssignTaskPriority] = useState<'high' | 'medium' | 'low'>('medium');
  const [editForm, setEditForm] = useState({ title: '', description: '' });
  const [submitting, setSubmitting] = useState(false);

  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  async function fetchData() {
    setLoading(true);
    setError(null);
    try {
      const [taskData, userData] = await Promise.all([
        listTasks({ isOpenTask: true }),
        listUsers(),
      ]);
      setTasks(taskData);
      setUsers(userData);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Failed to load';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchData();
  }, []);

  const allEmployees = users.filter((u) => u.roles.includes('employee'));

  function handleOpenEdit(task: Task) {
    setEditingTask(task);
    setEditForm({ title: task.title, description: task.description });
  }

  async function handleSaveEdit() {
    if (!editingTask || !editForm.title.trim() || submitting) return;
    setSubmitting(true);
    try {
      await editTask(editingTask._id, { title: editForm.title.trim(), description: editForm.description.trim() });
      setEditingTask(null);
      setToast({ msg: 'Task updated', type: 'success' });
      fetchData();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Failed to update';
      setToast({ msg, type: 'error' });
    } finally {
      setSubmitting(false);
    }
  }

  function handleOpenAssign(task: Task) {
    setAssigningTask(task);
    setAssigneeId(allEmployees[0]?._id ?? '');
    setAssignTaskDate(task.taskDate);
    setAssignTaskPriority(task.priority ?? 'medium');
  }

  async function handleAssign() {
    if (!assigningTask || !assigneeId || !assignTaskDate || submitting) return;
    setSubmitting(true);
    try {
      await claimOpenTask(assigningTask._id, assigneeId, {
        taskDate: assignTaskDate,
        priority: assignTaskPriority,
      });
      setAssigningTask(null);
      setToast({ msg: 'Task assigned', type: 'success' });
      fetchData();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Failed to assign';
      setToast({ msg, type: 'error' });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-slate-900">Open Task Queue</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {loading ? 'Loading...' : `${tasks.length} open ${tasks.length === 1 ? 'task' : 'tasks'} awaiting assignment`}
          </p>
        </div>
        {loading && <Loader2 size={16} className="animate-spin text-slate-400" />}
      </div>

      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 rounded-xl px-4 py-3 flex items-center gap-2">
          <AlertCircle size={14} className="text-red-600 flex-shrink-0" />
          <p className="text-xs text-red-700">{error}</p>
          <button onClick={fetchData} className="ml-auto text-xs text-red-600 hover:underline">Retry</button>
        </div>
      )}

      {!loading && !error && tasks.length === 0 ? (
        <EmptyState
          icon={<Inbox size={24} />}
          title="Open task queue is empty"
          description="No open tasks have been raised by team members."
        />
      ) : (
        <div className="space-y-3">
          {tasks.map((task) => {
            // raisedBy is the original raiser — show this in the queue ("raised by Kaif")
            // Falls back to assignerId for legacy tasks that predate this field
            const raiserPopulated = task.raisedBy ?? task.assignerId;
            const raiserId = typeof raiserPopulated === 'object' && raiserPopulated ? raiserPopulated._id : raiserPopulated;
            const raiser = users.find((u) => u._id === raiserId);
            const displayRaiserName = typeof raiserPopulated === 'object' && raiserPopulated
              ? raiserPopulated.name
              : (raiser?.name ?? String(raiserPopulated));
            const displayRaiserColor = typeof raiserPopulated === 'object' && raiserPopulated
              ? raiserPopulated.avatarColor
              : raiser?.avatarColor;
            return (
              <div key={task._id} className="card p-4">
                <div className="flex items-start gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start gap-2 mb-1">
                      <h3 className="text-sm font-semibold text-slate-800">{task.title}</h3>
                      <span className="flex-shrink-0 px-2 py-0.5 text-[10px] font-semibold bg-amber-100 text-amber-700 rounded-full">
                        Open
                      </span>
                    </div>
                    {task.description && (
                      <p className="text-xs text-slate-500 line-clamp-2 mb-2">{task.description}</p>
                    )}
                    <div className="flex items-center gap-3 text-xs text-slate-400">
                      {displayRaiserName && (
                        <div className="flex items-center gap-1.5">
                          <Avatar name={displayRaiserName} color={displayRaiserColor} size="sm" />
                          <span>{displayRaiserName}</span>
                        </div>
                      )}
                      <span>Date: {formatDisplayDate(task.taskDate)}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      id={`edit-open-task-btn-${task._id}`}
                      onClick={() => handleOpenEdit(task)}
                      className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50"
                      title="Edit task"
                    >
                      <Edit2 size={13} />
                    </button>
                    <button
                      id={`assign-open-task-btn-${task._id}`}
                      onClick={() => handleOpenAssign(task)}
                      className="btn-primary text-xs py-1.5"
                    >
                      <UserPlus size={13} />
                      Assign
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Edit modal */}
      <Modal isOpen={!!editingTask} onClose={() => setEditingTask(null)} title="Edit Open Task" size="sm" id="edit-open-task-modal">
        <div className="p-5 space-y-4">
          <div>
            <label htmlFor="edit-open-title" className="label">Task Title *</label>
            <input
              id="edit-open-title"
              type="text"
              value={editForm.title}
              onChange={(e) => setEditForm((f) => ({ ...f, title: e.target.value }))}
              className="input"
              autoFocus
            />
          </div>
          <div>
            <label htmlFor="edit-open-desc" className="label">Description</label>
            <textarea
              id="edit-open-desc"
              value={editForm.description}
              onChange={(e) => setEditForm((f) => ({ ...f, description: e.target.value }))}
              className="input resize-none"
              rows={3}
            />
          </div>
          <div className="flex gap-2 pt-1">
            <button id="save-open-edit-btn" onClick={handleSaveEdit} disabled={!editForm.title.trim() || submitting} className="btn-primary flex-1">
              {submitting ? <Loader2 size={14} className="animate-spin" /> : null}
              Save
            </button>
            <button onClick={() => setEditingTask(null)} className="btn-secondary">Cancel</button>
          </div>
        </div>
      </Modal>

      {/* Assign modal */}
      <Modal isOpen={!!assigningTask} onClose={() => setAssigningTask(null)} title="Assign Open Task" size="sm" id="assign-open-task-modal">
        <div className="p-5 space-y-4">
          {assigningTask && (
            <div className="bg-slate-50 rounded-xl p-3">
              <p className="text-xs font-medium text-slate-700">{assigningTask.title}</p>
            </div>
          )}
          <div>
            <label htmlFor="assign-open-assignee" className="label">Assign To *</label>
            <select
              id="assign-open-assignee"
              value={assigneeId}
              onChange={(e) => setAssigneeId(e.target.value)}
              className="input"
            >
              {allEmployees.map((u) => (
                <option key={u._id} value={u._id}>{u.name} (@{u.userId})</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="assign-open-date" className="label">Date *</label>
              <input
                id="assign-open-date"
                type="date"
                value={assignTaskDate}
                onChange={(e) => setAssignTaskDate(e.target.value)}
                className="input"
              />
            </div>
            <div>
              <label htmlFor="assign-open-priority" className="label">Priority *</label>
              <select
                id="assign-open-priority"
                value={assignTaskPriority}
                onChange={(e) => setAssignTaskPriority(e.target.value as any)}
                className="input"
              >
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>
          </div>
          <div className="flex gap-2 pt-1">
            <button
              id="confirm-assign-open-btn"
              onClick={handleAssign}
              disabled={!assigneeId || !assignTaskDate || submitting}
              className="btn-primary flex-1"
            >
              {submitting ? <Loader2 size={14} className="animate-spin" /> : <UserPlus size={14} />}
              Assign Task
            </button>
            <button onClick={() => setAssigningTask(null)} className="btn-secondary">Cancel</button>
          </div>
        </div>
      </Modal>

      {toast && (
        <Toast message={toast.msg} type={toast.type} onDismiss={() => setToast(null)} />
      )}
    </div>
  );
}
