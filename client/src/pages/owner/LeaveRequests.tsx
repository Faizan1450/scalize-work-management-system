import React, { useState } from 'react';
import { Check, X, CalendarOff, MessageSquare } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Avatar } from '../../components/ui/Avatar';
import { EmptyState } from '../../components/ui/EmptyState';
import { formatLongDate } from '../../utils/date';

const statusConfig = {
  pending: { label: 'Pending', className: 'bg-amber-100 text-amber-700' },
  approved: { label: 'Approved', className: 'bg-emerald-100 text-emerald-700' },
  rejected: { label: 'Rejected', className: 'bg-red-100 text-red-700' },
};

type ConfirmState = {
  leaveId: string;
  action: 'approve' | 'reject';
  comment: string;
};

export function LeaveRequests() {
  const { state, dispatch } = useApp();
  const [confirming, setConfirming] = useState<ConfirmState | null>(null);

  const sortedLeaves = [...state.leaveRequests].sort((a, b) => {
    if (a.status === 'pending' && b.status !== 'pending') return -1;
    if (a.status !== 'pending' && b.status === 'pending') return 1;
    return new Date(b.date).getTime() - new Date(a.date).getTime();
  });

  const pendingCount = state.leaveRequests.filter((l) => l.status === 'pending').length;

  function openConfirm(leaveId: string, action: 'approve' | 'reject') {
    setConfirming({ leaveId, action, comment: '' });
  }

  function handleDecide() {
    if (!confirming) return;
    const actionType = confirming.action === 'approve' ? 'APPROVE_LEAVE' : 'REJECT_LEAVE';
    dispatch({
      type: actionType,
      leaveId: confirming.leaveId,
      decisionComment: confirming.comment.trim() || undefined,
    });
    setConfirming(null);
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-lg font-bold text-slate-900">Leave Requests</h1>
        <p className="text-sm text-slate-500 mt-0.5">
          {pendingCount > 0
            ? `${pendingCount} pending ${pendingCount === 1 ? 'request' : 'requests'}`
            : 'All requests resolved'}
        </p>
      </div>

      {sortedLeaves.length === 0 ? (
        <EmptyState
          icon={<CalendarOff size={24} />}
          title="No leave requests"
          description="No leave requests have been submitted."
        />
      ) : (
        <div className="space-y-3">
          {sortedLeaves.map((leave) => {
            const employee = state.users.find((u) => u.id === leave.employeeId);
            const sc = statusConfig[leave.status];
            const isConfirmingThis = confirming?.leaveId === leave.id;

            return (
              <div
                key={leave.id}
                className={`card p-4 ${leave.status === 'pending' ? 'border-amber-200 bg-amber-50/30' : ''}`}
              >
                <div className="flex items-start gap-4">
                  {/* Employee info */}
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      {employee && <Avatar name={employee.name} color={employee.avatarColor} size="md" />}
                      <div>
                        <p className="text-sm font-semibold text-slate-800">
                          {employee?.name ?? 'Unknown Employee'}
                        </p>
                        <p className="text-xs text-slate-400">@{employee?.userId}</p>
                      </div>
                      <span className={`badge ${sc.className} ml-auto`}>
                        {sc.label}
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-3 text-xs text-slate-600 bg-slate-50 rounded-xl p-3">
                      <div>
                        <p className="text-slate-400 font-medium mb-0.5">Date</p>
                        <p className="font-medium">{formatLongDate(leave.date)}</p>
                      </div>
                      <div>
                        <p className="text-slate-400 font-medium mb-0.5">Duration</p>
                        <p className="font-medium capitalize">{leave.duration.replace('_', ' ')}</p>
                      </div>
                      <div>
                        <p className="text-slate-400 font-medium mb-0.5">Reason</p>
                        <p className="font-medium">{leave.reason}</p>
                      </div>
                    </div>

                    {/* Decision comment (shown for decided requests) */}
                    {leave.status !== 'pending' && leave.decisionComment && (
                      <div className="mt-2 flex items-start gap-1.5 text-xs text-slate-500 bg-slate-50 rounded-lg px-3 py-2">
                        <MessageSquare size={11} className="mt-0.5 flex-shrink-0 text-slate-400" />
                        <span>Owner note: <em>"{leave.decisionComment}"</em></span>
                      </div>
                    )}

                    {/* Confirm step — replaces action buttons inline */}
                    {leave.status === 'pending' && isConfirmingThis && (
                      <div className={`mt-3 rounded-xl border p-4 space-y-3 ${
                        confirming?.action === 'approve'
                          ? 'bg-emerald-50 border-emerald-200'
                          : 'bg-red-50 border-red-200'
                      }`}>
                        <p className={`text-xs font-semibold ${
                          confirming?.action === 'approve' ? 'text-emerald-800' : 'text-red-800'
                        }`}>
                          {confirming?.action === 'approve' ? 'Approve' : 'Reject'} this leave request?
                        </p>
                        <div>
                          <label
                            htmlFor={`leave-decision-comment-${leave.id}`}
                            className="label text-[11px] mb-1"
                          >
                            Add a note (optional)
                          </label>
                          <textarea
                            id={`leave-decision-comment-${leave.id}`}
                            value={confirming?.comment ?? ''}
                            onChange={(e) =>
                              setConfirming((c) => c ? { ...c, comment: e.target.value } : c)
                            }
                            placeholder="e.g. hand over the slides to Kaif first..."
                            className="input text-xs resize-none"
                            rows={2}
                          />
                        </div>
                        <div className="flex gap-2">
                          <button
                            id={`confirm-leave-decision-${leave.id}-btn`}
                            onClick={handleDecide}
                            className={`flex items-center gap-1.5 px-3 py-2 text-white text-xs font-medium rounded-lg transition-colors ${
                              confirming?.action === 'approve'
                                ? 'bg-emerald-600 hover:bg-emerald-700'
                                : 'bg-red-600 hover:bg-red-700'
                            }`}
                          >
                            {confirming?.action === 'approve' ? <Check size={12} /> : <X size={12} />}
                            Confirm {confirming?.action === 'approve' ? 'Approval' : 'Rejection'}
                          </button>
                          <button
                            id={`cancel-leave-decision-${leave.id}-btn`}
                            onClick={() => setConfirming(null)}
                            className="btn-secondary text-xs"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Primary action buttons — only shown when not in confirm step */}
                  {leave.status === 'pending' && !isConfirmingThis && (
                    <div className="flex gap-2 flex-shrink-0">
                      <button
                        id={`approve-leave-${leave.id}-btn`}
                        onClick={() => openConfirm(leave.id, 'approve')}
                        className="flex items-center gap-1.5 px-3 py-2 bg-emerald-600 text-white text-xs font-medium rounded-lg hover:bg-emerald-700 transition-colors"
                      >
                        <Check size={13} />
                        Approve
                      </button>
                      <button
                        id={`reject-leave-${leave.id}-btn`}
                        onClick={() => openConfirm(leave.id, 'reject')}
                        className="flex items-center gap-1.5 px-3 py-2 bg-white text-red-600 text-xs font-medium rounded-lg border border-red-200 hover:bg-red-50 transition-colors"
                      >
                        <X size={13} />
                        Reject
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
