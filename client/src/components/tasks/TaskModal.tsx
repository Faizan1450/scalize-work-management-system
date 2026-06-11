import React, { useState } from 'react';
import { Send, Clock, Calendar, RotateCcw } from 'lucide-react';
import { Task, TaskComment, TaskStatus } from '../../types';
import { Modal } from '../ui/Modal';
import { StatusBadge, StatusSelector } from '../ui/StatusBadge';
import { Avatar } from '../ui/Avatar';
import { useApp } from '../../context/AppContext';
import { formatDisplayDate, formatRelativeTime, formatLongDate, nextWorkingDay } from '../../utils/date';
import { formatTime } from '../../utils/time';

interface TaskModalProps {
  task: Task;
  isOpen: boolean;
  onClose: () => void;
  readOnly?: boolean;
  /** Explicitly allow comment input regardless of readOnly. Defaults to !readOnly. */
  allowComment?: boolean;
}

export function TaskModal({ task, isOpen, onClose, readOnly = false, allowComment }: TaskModalProps) {
  const { state, dispatch, currentUser } = useApp();
  const [commentText, setCommentText] = useState('');
  const [showMoveConfirm, setShowMoveConfirm] = useState(false);
  const [moveComment, setMoveComment] = useState('');

  const assigner = state.users.find((u) => u.id === task.assignerId);
  const assignee = state.users.find((u) => u.id === task.assigneeId);

  function handleStatusChange(status: TaskStatus) {
    dispatch({ type: 'UPDATE_STATUS', taskId: task.id, status });
  }

  function handleAddComment() {
    if (!commentText.trim()) return;
    const comment: TaskComment = {
      id: `cmt-${Date.now()}`,
      authorId: currentUser.id,
      text: commentText.trim(),
      createdAt: new Date().toISOString(),
    };
    dispatch({ type: 'ADD_COMMENT', taskId: task.id, comment });
    setCommentText('');
  }

  function handleMoveToNextDay() {
    // Derive off-day numbers from workSchedule (where hours === 0)
    const offDays = ([0,1,2,3,4,5,6] as const).filter(
      (d) => currentUser.workSchedule[String(d) as keyof typeof currentUser.workSchedule] === 0
    );
    const toDate = nextWorkingDay(task.plannedDate ?? task.dueDate, offDays);
    dispatch({
      type: 'MOVE_TASK',
      taskId: task.id,
      toDate,
      comment: moveComment.trim() || undefined,
    });
    setShowMoveConfirm(false);
    setMoveComment('');
    onClose();
  }

  const isCurrentUserAssignee = currentUser.id === task.assigneeId;
  const canChangeStatus = isCurrentUserAssignee && !readOnly;
  // canComment: use explicit prop if provided, else fall back to !readOnly
  const canComment = allowComment !== undefined ? allowComment : !readOnly;
  const canMove = isCurrentUserAssignee && task.status !== 'completed' && !readOnly;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Task Details"
      size="lg"
      id="task-detail-modal"
    >
      <div className="p-6 space-y-5">
        {/* Title & status */}
        <div>
          <h3 className="text-base font-semibold text-slate-900 leading-snug mb-2">
            {task.title}
          </h3>
          <StatusBadge status={task.status} size="md" />
        </div>

        {/* Description */}
        {task.description && (
          <p className="text-sm text-slate-600 leading-relaxed">{task.description}</p>
        )}

        {/* Metadata grid */}
        <div className="grid grid-cols-2 gap-3 bg-slate-50 rounded-xl p-4 text-xs">
          <div>
            <p className="text-slate-400 font-medium mb-0.5">Assigner</p>
            {assigner ? (
              <div className="flex items-center gap-1.5">
                <Avatar name={assigner.name} color={assigner.avatarColor} size="sm" />
                <span className="font-medium text-slate-700">{assigner.name}</span>
              </div>
            ) : (
              <span className="text-slate-400">—</span>
            )}
          </div>
          <div>
            <p className="text-slate-400 font-medium mb-0.5">Assignee</p>
            {assignee ? (
              <div className="flex items-center gap-1.5">
                <Avatar name={assignee.name} color={assignee.avatarColor} size="sm" />
                <span className="font-medium text-slate-700">{assignee.name}</span>
              </div>
            ) : (
              <span className="text-slate-400">Unassigned</span>
            )}
          </div>
          <div>
            <p className="text-slate-400 font-medium mb-0.5 flex items-center gap-1">
              <Clock size={11} /> Duration
            </p>
            <span className="font-medium text-slate-700">
              {task.estimatedDurationMins >= 60
                ? `${task.estimatedDurationMins / 60}h`
                : `${task.estimatedDurationMins}m`}
            </span>
          </div>
          <div>
            <p className="text-slate-400 font-medium mb-0.5 flex items-center gap-1">
              <Calendar size={11} /> Due Date
            </p>
            <span className="font-medium text-slate-700">
              {formatDisplayDate(task.dueDate)}
            </span>
          </div>
          {task.plannedDate && (
            <div>
              <p className="text-slate-400 font-medium mb-0.5">Planned</p>
              <span className="font-medium text-slate-700">
                {formatDisplayDate(task.plannedDate)}
                {task.plannedStartTime && ` · ${formatTime(task.plannedStartTime)}`}
              </span>
            </div>
          )}
          {task.recurrence !== 'none' && (
            <div>
              <p className="text-slate-400 font-medium mb-0.5">Recurrence</p>
              <span className="font-medium text-slate-700 capitalize">{task.recurrence}</span>
            </div>
          )}
        </div>

        {/* Status change */}
        {canChangeStatus && (
          <div>
            <p className="text-xs font-medium text-slate-500 mb-2">Update Status</p>
            <StatusSelector
              status={task.status}
              onChange={handleStatusChange}
            />
          </div>
        )}

        {/* Move to next day */}
        {canMove && (
          <div>
            {!showMoveConfirm ? (
              <button
                id="move-next-day-btn"
                onClick={() => setShowMoveConfirm(true)}
                className="flex items-center gap-2 text-sm text-amber-700 font-medium hover:text-amber-800 transition-colors"
              >
                <RotateCcw size={14} />
                Move to Next Day
              </button>
            ) : (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-3">
                <p className="text-xs font-semibold text-amber-800">
                  Moving to next working day. Optional reason:
                </p>
                <textarea
                  id="move-comment-input"
                  value={moveComment}
                  onChange={(e) => setMoveComment(e.target.value)}
                  placeholder="Reason for moving (optional)..."
                  className="input text-xs resize-none"
                  rows={2}
                />
                <div className="flex gap-2">
                  <button id="confirm-move-btn" onClick={handleMoveToNextDay} className="btn-primary text-xs">
                    Confirm Move
                  </button>
                  <button
                    id="cancel-move-btn"
                    onClick={() => setShowMoveConfirm(false)}
                    className="btn-secondary text-xs"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Move history */}
        {task.movedHistory.length > 0 && (
          <div>
            <p className="text-xs font-medium text-slate-500 mb-2">Move History</p>
            <div className="space-y-1.5">
              {task.movedHistory.map((m, i) => (
                <div
                  key={i}
                  className="flex items-start gap-2 text-xs text-slate-500 bg-slate-50 rounded-lg px-3 py-2"
                >
                  <RotateCcw size={11} className="mt-0.5 flex-shrink-0 text-slate-400" />
                  <span>
                    {formatDisplayDate(m.fromDate)} → {formatDisplayDate(m.toDate)}
                    {m.comment && `: "${m.comment}"`}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Comments */}
        <div>
          <p className="text-xs font-medium text-slate-500 mb-3">
            Comments ({task.comments.length})
          </p>

          {task.comments.length > 0 && (
            <div className="space-y-3 mb-4">
              {task.comments.map((cmt) => {
                const author = state.users.find((u) => u.id === cmt.authorId);
                return (
                  <div key={cmt.id} className="flex items-start gap-2.5">
                    {author && <Avatar name={author.name} color={author.avatarColor} size="sm" />}
                    <div className="flex-1 bg-slate-50 rounded-xl px-3 py-2.5">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-semibold text-slate-700">
                          {author?.name ?? 'Unknown'}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          {formatRelativeTime(cmt.createdAt)}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 leading-relaxed">{cmt.text}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {canComment && (
            <div className="flex gap-2 items-end">
              <Avatar name={currentUser.name} color={currentUser.avatarColor} size="sm" />
              <div className="flex-1 flex gap-2">
                <textarea
                  id="comment-input"
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  placeholder="Add a comment..."
                  className="input text-xs resize-none flex-1"
                  rows={2}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && e.metaKey) handleAddComment();
                  }}
                />
                <button
                  id="submit-comment-btn"
                  onClick={handleAddComment}
                  disabled={!commentText.trim()}
                  className="btn-primary self-end"
                >
                  <Send size={14} />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}
