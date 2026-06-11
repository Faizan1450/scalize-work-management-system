import React, { useState } from 'react';
import { Inbox, Edit2, UserPlus } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Task, Notification } from '../../types';
import { Avatar } from '../../components/ui/Avatar';
import { Modal } from '../../components/ui/Modal';
import { EmptyState } from '../../components/ui/EmptyState';
import { formatDisplayDate } from '../../utils/date';

export function OpenTaskQueue() {
  const { state, dispatch, currentUser } = useApp();
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [assigningTask, setAssigningTask] = useState<Task | null>(null);
  const [assigneeId, setAssigneeId] = useState('');
  const [editForm, setEditForm] = useState({ title: '', description: '' });

  const openTasks = state.tasks.filter((t) => t.isOpenTask);

  const allEmployees = state.users.filter((u) => u.roles.includes('employee'));

  function handleOpenEdit(task: Task) {
    setEditingTask(task);
    setEditForm({ title: task.title, description: task.description });
  }

  function handleSaveEdit() {
    if (!editingTask || !editForm.title.trim()) return;
    dispatch({
      type: 'UPDATE_TASK',
      task: { ...editingTask, title: editForm.title.trim(), description: editForm.description.trim() },
    });
    setEditingTask(null);
  }

  function handleOpenAssign(task: Task) {
    setAssigningTask(task);
    setAssigneeId(allEmployees[0]?.id ?? '');
  }

  function handleAssign() {
    if (!assigningTask || !assigneeId) return;
    dispatch({ type: 'ASSIGN_TASK', taskId: assigningTask.id, assigneeId });
    setAssigningTask(null);
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-lg font-bold text-slate-900">Open Task Queue</h1>
        <p className="text-sm text-slate-500 mt-0.5">
          {openTasks.length} open {openTasks.length === 1 ? 'task' : 'tasks'} awaiting assignment
        </p>
      </div>

      {openTasks.length === 0 ? (
        <EmptyState
          icon={<Inbox size={24} />}
          title="Open task queue is empty"
          description="No open tasks have been raised by team members."
        />
      ) : (
        <div className="space-y-3">
          {openTasks.map((task) => {
            const raiser = state.users.find((u) => u.id === task.assignerId);
            return (
              <div key={task.id} className="card p-4">
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
                      {raiser && (
                        <div className="flex items-center gap-1.5">
                          <Avatar name={raiser.name} color={raiser.avatarColor} size="sm" />
                          <span>Raised by {raiser.name}</span>
                        </div>
                      )}
                      <span>Due {formatDisplayDate(task.dueDate)}</span>
                      <span>{task.estimatedDurationMins >= 60 ? `${task.estimatedDurationMins / 60}h` : `${task.estimatedDurationMins}m`}</span>
                    </div>
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    <button
                      id={`edit-open-task-${task.id}-btn`}
                      onClick={() => handleOpenEdit(task)}
                      className="btn-secondary text-xs py-1.5"
                    >
                      <Edit2 size={12} />
                      Edit
                    </button>
                    <button
                      id={`assign-open-task-${task.id}-btn`}
                      onClick={() => handleOpenAssign(task)}
                      className="btn-primary text-xs py-1.5"
                    >
                      <UserPlus size={12} />
                      Assign
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Edit Modal */}
      <Modal isOpen={!!editingTask} onClose={() => setEditingTask(null)} title="Edit Open Task" size="sm" id="edit-open-task-modal">
        <div className="p-5 space-y-4">
          <div>
            <label htmlFor="edit-task-title" className="label">Title</label>
            <input id="edit-task-title" type="text" value={editForm.title}
              onChange={(e) => setEditForm((f) => ({ ...f, title: e.target.value }))}
              className="input" />
          </div>
          <div>
            <label htmlFor="edit-task-desc" className="label">Description</label>
            <textarea id="edit-task-desc" value={editForm.description}
              onChange={(e) => setEditForm((f) => ({ ...f, description: e.target.value }))}
              className="input resize-none" rows={3} />
          </div>
          <div className="flex gap-2">
            <button id="save-edit-open-task-btn" onClick={handleSaveEdit} className="btn-primary flex-1">Save</button>
            <button id="cancel-edit-open-task-btn" onClick={() => setEditingTask(null)} className="btn-secondary">Cancel</button>
          </div>
        </div>
      </Modal>

      {/* Assign Modal */}
      <Modal isOpen={!!assigningTask} onClose={() => setAssigningTask(null)} title="Assign Task" size="sm" id="assign-open-task-modal">
        <div className="p-5 space-y-4">
          {assigningTask && (
            <div className="bg-slate-50 rounded-xl p-3">
              <p className="text-xs font-semibold text-slate-700">{assigningTask.title}</p>
            </div>
          )}
          <div>
            <label htmlFor="assign-open-assignee" className="label">Assign to *</label>
            <select
              id="assign-open-assignee"
              value={assigneeId}
              onChange={(e) => setAssigneeId(e.target.value)}
              className="input"
            >
              {allEmployees.map((u) => (
                <option key={u.id} value={u.id}>{u.name}</option>
              ))}
            </select>
          </div>
          <div className="flex gap-2">
            <button id="confirm-assign-open-btn" onClick={handleAssign} className="btn-primary flex-1">
              <UserPlus size={14} />
              Assign
            </button>
            <button id="cancel-assign-open-btn" onClick={() => setAssigningTask(null)} className="btn-secondary">Cancel</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
