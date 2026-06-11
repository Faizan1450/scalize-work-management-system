import React, { useState, useRef, useEffect } from 'react';
import { Bell, ChevronDown, Check, CheckCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { formatRelativeTime } from '../../utils/date';
import { Notification, Role } from '../../types';

// ── Navigation mapping ────────────────────────────────────────────────────────

/**
 * FIX 7: Resolve a notification to { destination, requiredRole }.
 *
 * requiredRole = the role view the destination belongs to.
 * destination  = the path to navigate to.
 *
 * If the user lacks the requiredRole, we fall back to '/employee' (always accessible).
 *
 * taskDate is used when the notification has a taskId and we know the task's
 * plannedDate (or fallback to today's ISO string).
 */
function resolveNotifNav(
  notif: Notification,
  taskDate: string | undefined
): { destination: string; requiredRole: Role } {
  const date = taskDate ?? new Date().toISOString().slice(0, 10);

  switch (notif.type) {
    case 'open_task_raised':
      return { destination: '/owner/open-tasks', requiredRole: 'owner' };

    case 'open_task_assigned':
    case 'task_assigned':
      // Employee view at the task's planned date (or today as fallback)
      return { destination: `/employee?date=${date}`, requiredRole: 'employee' };

    case 'task_completed':
    case 'task_moved':
    case 'comment_added':
      // Lead view: team member detail if we had the member id; but at this
      // phase taskId doesn't map to a DB record yet — navigate to lead dashboard.
      // Falls through to lead if authUser has lead role; otherwise employee.
      return { destination: `/lead`, requiredRole: 'lead' };

    case 'leave_raised':
      return { destination: '/owner/leaves', requiredRole: 'owner' };

    case 'leave_decision':
      return { destination: `/employee?date=${date}`, requiredRole: 'employee' };

    default:
      return { destination: '/employee', requiredRole: 'employee' };
  }
}

// ── Component ─────────────────────────────────────────────────────────────────

export function NotificationDropdown() {
  const { state, dispatch, currentUser } = useApp();
  const { authUser } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const myNotifications = state.notifications
    .filter((n) => n.recipientId === currentUser.id)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const unreadCount = myNotifications.filter((n) => !n.read).length;

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  function handleMarkRead(id: string) {
    dispatch({ type: 'MARK_NOTIFICATION_READ', notificationId: id });
  }

  function handleMarkAll() {
    dispatch({ type: 'MARK_ALL_NOTIFICATIONS_READ' });
  }

  /**
   * FIX 7: click handler — mark read, then navigate with role-switch.
   *
   * Role-switch logic (per Correction 4):
   * 1. Resolve destination + requiredRole for the notification type.
   * 2. If authUser has requiredRole → SET_ROLE + navigate.
   * 3. If authUser lacks requiredRole → navigate to /employee (always accessible).
   * 4. Close dropdown.
   */
  function handleNotifClick(notif: Notification) {
    // Mark read first
    dispatch({ type: 'MARK_NOTIFICATION_READ', notificationId: notif.id });

    // Resolve the task's date (from mock tasks) for date-sensitive destinations
    const task = notif.taskId ? state.tasks.find((t) => t.id === notif.taskId) : undefined;
    const taskDate = task?.plannedDate ?? task?.dueDate ?? undefined;

    const { destination, requiredRole } = resolveNotifNav(notif, taskDate);

    const userHasRole = authUser?.roles.includes(requiredRole) ?? false;

    if (userHasRole) {
      // Switch to the required role view, then navigate
      dispatch({ type: 'SET_ROLE', role: requiredRole });
      navigate(destination);
    } else {
      // Fallback: navigate to employee view (always accessible to any authenticated user)
      dispatch({ type: 'SET_ROLE', role: 'employee' });
      navigate('/employee');
    }

    // Close dropdown
    setOpen(false);
  }

  const notifTypeIcon: Record<string, string> = {
    task_assigned: '📋',
    task_completed: '✅',
    task_moved: '📅',
    task_overdue: '⚠️',
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
        <Bell size={18} />
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
            {myNotifications.length === 0 ? (
              <div className="py-10 text-center">
                <p className="text-sm text-slate-400">No notifications</p>
              </div>
            ) : (
              myNotifications.map((notif) => (
                <button
                  key={notif.id}
                  id={`notif-item-${notif.id}`}
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
