import React, { useState, useRef, useEffect } from 'react';
import { Bell, Check, CheckCheck, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../hooks/useNotifications';
import { getTask } from '../../api/tasks';
import { formatRelativeTime } from '../../utils/date';
import { Notification, Role } from '../../types';

// ── Navigation mapping ────────────────────────────────────────────────────────

/**
 * Resolves where a notification click should navigate to.
 * Returns the destination URL and the date to set in AppContext.
 * Fetches the task if needed to get its taskDate.
 */
async function resolveNotifNav(
  notif: Notification
): Promise<{ destination: string; requiredRole: Role; date: string }> {
  const todayStr = new Date().toISOString().slice(0, 10);

  // For task-linked types, fetch the task to get its actual date
  let taskDate: string = todayStr;
  if (notif.taskId) {
    try {
      const task = await getTask(notif.taskId);
      taskDate = task.taskDate ?? todayStr;
    } catch {
      // Task deleted or not accessible — fall back to today
    }
  }

  switch (notif.type) {
    // ── Owner ──────────────────────────────────────────────────────────────
    case 'open_task_raised':
      return { destination: '/owner/open-tasks', requiredRole: 'owner', date: todayStr };

    case 'leave_raised':
      return { destination: '/owner/leaves', requiredRole: 'owner', date: todayStr };

    // ── Employee: go to the task's date ────────────────────────────────────
    case 'open_task_assigned':
    case 'task_assigned':
    case 'task_updated':
    case 'task_overdue':
    case 'leave_decision':
      return { destination: `/employee?date=${taskDate}`, requiredRole: 'employee', date: taskDate };

    // ── Task removed from employee — land on today in employee view ─────────
    case 'task_deleted':
    case 'task_reassigned': // task was taken away from me — go to today
      return { destination: `/employee?date=${todayStr}`, requiredRole: 'employee', date: todayStr };

    // ── Lead notifications: go to lead view at the task's date ─────────────
    // comment_added → recipient may be assigner (lead) or the assignee (employee)
    // We navigate to lead if the user has that role; otherwise employee — handled below.
    case 'task_completed':
    case 'task_moved':
    case 'comment_added':
      return { destination: `/lead?date=${taskDate}`, requiredRole: 'lead', date: taskDate };

    default:
      return { destination: `/employee?date=${taskDate}`, requiredRole: 'employee', date: taskDate };
  }
}

// ── Component ─────────────────────────────────────────────────────────────────

export function NotificationDropdown() {
  const { dispatch } = useApp();
  const { authUser } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const {
    notifications,
    unreadCount,
    loading,
    error,
    refetch,
    markRead,
    markAllRead,
  } = useNotifications();

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  async function handleNotifClick(notif: Notification) {
    // Mark read via real API (optimistic)
    await markRead(notif._id);

    // Resolve destination + date by fetching task info if needed
    const { destination, requiredRole, date } = await resolveNotifNav(notif);

    const userHasRole = authUser?.roles.includes(requiredRole) ?? false;

    // Always set the date in AppContext so the view jumps to the right day
    dispatch({ type: 'SET_DATE', date });

    if (userHasRole) {
      dispatch({ type: 'SET_ROLE', role: requiredRole });
      navigate(destination);
    } else {
      // Fallback: user doesn't have the required role — go to employee at the task's date
      dispatch({ type: 'SET_ROLE', role: 'employee' });
      navigate(`/employee?date=${date}`);
    }

    setOpen(false);
  }

  async function handleMarkAll() {
    await markAllRead();
  }


  const notifTypeIcon: Record<string, string> = {
    task_assigned: '📋',
    task_completed: '✅',
    task_moved: '📅',
    task_overdue: '⚠️',
    task_updated: '✏️',
    task_reassigned: '🔄',
    task_deleted: '🗑️',
    comment_added: '💬',
    open_task_raised: '📬',
    open_task_assigned: '📬',
    leave_raised: '🌴',
    leave_decision: '🌴',
  };

  return (
    <div ref={ref} className="relative">
      <button
        id="notification-bell-btn"
        onClick={() => setOpen((v) => !v)}
        className="relative w-9 h-9 flex items-center justify-center rounded-lg text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-colors"
        aria-label={`Notifications${unreadCount > 0 ? `, ${unreadCount} unread` : ''}`}
      >
        {loading ? (
          <Loader2 size={18} className="animate-spin text-slate-400" />
        ) : (
          <Bell size={18} />
        )}
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center leading-none">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div
          id="notification-dropdown"
          className="absolute right-0 top-11 w-96 bg-white border border-slate-200 rounded-xl shadow-xl z-50 overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-slate-900">Notifications</span>
              {unreadCount > 0 && (
                <span className="px-1.5 py-0.5 bg-red-50 text-red-600 text-xs font-semibold rounded-full">
                  {unreadCount} new
                </span>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                id="mark-all-read-btn"
                onClick={handleMarkAll}
                className="flex items-center gap-1 text-xs text-primary-700 hover:text-primary-800 font-medium"
              >
                <CheckCheck size={13} />
                Mark all read
              </button>
            )}
          </div>

          {/* List */}
          <div className="max-h-80 overflow-y-auto">
            {error ? (
              <div className="py-6 px-4 text-center">
                <p className="text-xs text-red-600 mb-2">{error}</p>
                <button
                  id="retry-notifications-btn"
                  onClick={refetch}
                  className="text-xs text-red-700 font-semibold hover:underline"
                >
                  Retry
                </button>
              </div>
            ) : notifications.length === 0 ? (
              <div className="py-10 text-center">
                <p className="text-sm text-slate-400">No notifications</p>
              </div>
            ) : (
              notifications.map((notif) => (
                <button
                  key={notif._id}
                  id={`notif-item-${notif._id}`}
                  onClick={() => handleNotifClick(notif)}
                  className={`w-full text-left px-4 py-3 flex items-start gap-3 hover:bg-slate-50 transition-colors border-b border-slate-50 last:border-0 ${
                    !notif.read ? 'bg-blue-50/40' : ''
                  }`}
                >
                  <span className="text-base mt-0.5 flex-shrink-0">
                    {notifTypeIcon[notif.type] ?? '🔔'}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className={`text-xs leading-relaxed ${!notif.read ? 'font-medium text-slate-800' : 'text-slate-600'}`}>
                      {notif.message}
                    </p>
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      {formatRelativeTime(notif.createdAt)}
                    </p>
                  </div>
                  {!notif.read && (
                    <span className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0 mt-1" />
                  )}
                  {notif.read && (
                    <Check size={12} className="text-slate-300 flex-shrink-0 mt-1" />
                  )}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
