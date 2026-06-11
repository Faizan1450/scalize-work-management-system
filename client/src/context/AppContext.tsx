import React, { createContext, useContext, useReducer, ReactNode } from 'react';
import { AppState, AppAction, Role, Task, Notification, User, TaskStatus } from '../types';
import { mockUsers } from '../data/users';
import { mockTasks } from '../data/tasks';
import { mockNotifications } from '../data/notifications';
import { mockLeaveRequests } from '../data/leaves';



// ─── Reducer ──────────────────────────────────────────────────────────────────

function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'SET_ROLE':
      return { ...state, currentRole: action.role };

    case 'SET_USER':
      return { ...state, currentUserId: action.userId };

    case 'SCHEDULE_TASK':
      return {
        ...state,
        tasks: state.tasks.map((t) =>
          t.id === action.taskId
            ? {
                ...t,
                plannedStartTime: action.plannedStartTime,
                plannedEndTime: action.plannedEndTime,
                plannedDate: action.plannedDate,
              }
            : t
        ),
      };

    case 'MOVE_TASK': {
      const task = state.tasks.find((t) => t.id === action.taskId);
      if (!task) return state;
      const currentUser = state.users.find((u) => u.id === state.currentUserId);
      const toDate = action.toDate;

      const moveRecord = {
        fromDate: task.plannedDate ?? task.dueDate,
        toDate,
        comment: action.comment,
      };

      const moveNotifications: Notification[] = [];
      // Only notify assigner if this is not a self-task
      if (task.assignerId && task.assignerId !== task.assigneeId) {
        moveNotifications.push({
          id: `notif-move-${Date.now()}`,
          recipientId: task.assignerId,
          type: 'task_moved',
          message: `${currentUser?.name ?? 'Someone'} moved "${task.title}" to ${toDate}${action.comment ? ` — "${action.comment}"` : ''}`,
          taskId: task.id,
          read: false,
          createdAt: new Date().toISOString(),
        });
      }

      return {
        ...state,
        tasks: state.tasks.map((t) =>
          t.id === action.taskId
            ? {
                ...t,
                plannedDate: toDate,
                plannedStartTime: null,
                plannedEndTime: null,
                movedHistory: [...t.movedHistory, moveRecord],
              }
            : t
        ),
        notifications: [...state.notifications, ...moveNotifications],
      };
    }

    case 'UPDATE_STATUS': {
      const task = state.tasks.find((t) => t.id === action.taskId);
      if (!task) return state;
      const currentUser = state.users.find((u) => u.id === state.currentUserId);

      const updatedTasks = state.tasks.map((t): Task =>
        t.id === action.taskId ? { ...t, status: action.status as TaskStatus } : t
      );

      const newNotifications: Notification[] = [];

      if (action.status === 'completed' && task.assignerId !== task.assigneeId) {
        newNotifications.push({
          id: `notif-done-${Date.now()}`,
          recipientId: task.assignerId,
          type: 'task_completed',
          message: `${currentUser?.name ?? 'Someone'} completed "${task.title}"`,
          taskId: task.id,
          read: false,
          createdAt: new Date().toISOString(),
        });
      }

      return {
        ...state,
        tasks: updatedTasks,
        notifications: [...state.notifications, ...newNotifications],
      };
    }

    case 'ADD_COMMENT': {
      const task = state.tasks.find((t) => t.id === action.taskId);
      if (!task) return state;

      const commenterId = action.comment.authorId;
      const commenterUser = state.users.find((u) => u.id === commenterId);
      const commentNotifications: Notification[] = [];

      // Routing rules:
      // 1. Commenter is assignee → notify assigner (unless self-task)
      // 2. Commenter is assigner → notify assignee (unless self-task)
      // 3. Commenter is anyone else (third-party lead) → notify assignee
      // In all cases: skip if recipient === commenter (no self-notification)
      if (task.assigneeId && task.assignerId) {
        let recipientId: string | null = null;

        if (commenterId === task.assigneeId) {
          // Assignee commented → tell assigner
          if (task.assignerId !== commenterId) recipientId = task.assignerId;
        } else if (commenterId === task.assignerId) {
          // Assigner commented → tell assignee
          if (task.assigneeId !== commenterId) recipientId = task.assigneeId;
        } else {
          // Third-party (e.g. another lead) → always tell assignee
          recipientId = task.assigneeId;
        }

        if (recipientId) {
          commentNotifications.push({
            id: `notif-comment-${Date.now()}`,
            recipientId,
            type: 'comment_added',
            message: `${commenterUser?.name ?? 'Someone'} commented on "${task.title}"`,
            taskId: task.id,
            read: false,
            createdAt: new Date().toISOString(),
          });
        }
      }

      return {
        ...state,
        tasks: state.tasks.map((t) =>
          t.id === action.taskId
            ? { ...t, comments: [...t.comments, action.comment] }
            : t
        ),
        notifications: [...state.notifications, ...commentNotifications],
      };
    }

    case 'ASSIGN_TASK': {
      const task = state.tasks.find((t) => t.id === action.taskId);
      if (!task) return state;

      const notification: Notification = {
        id: `notif-assign-${Date.now()}`,
        recipientId: action.assigneeId,
        type: task.isOpenTask ? 'open_task_assigned' : 'task_assigned',
        message: `You have been assigned "${task.title}"`,
        taskId: task.id,
        read: false,
        createdAt: new Date().toISOString(),
      };

      return {
        ...state,
        tasks: state.tasks.map((t) =>
          t.id === action.taskId
            ? { ...t, assigneeId: action.assigneeId, isOpenTask: false }
            : t
        ),
        notifications: [...state.notifications, notification],
      };
    }

    case 'APPROVE_LEAVE': {
      const leave = state.leaveRequests.find((l) => l.id === action.leaveId);
      if (!leave) return state;

      const approveMsg = action.decisionComment
        ? `Your leave for ${leave.date} was approved — "${action.decisionComment}"`
        : `Your leave request for ${leave.date} has been approved`;

      const approveNotif: Notification = {
        id: `notif-leave-${Date.now()}`,
        recipientId: leave.employeeId,
        type: 'leave_decision',
        message: approveMsg,
        read: false,
        createdAt: new Date().toISOString(),
      };

      return {
        ...state,
        leaveRequests: state.leaveRequests.map((l) =>
          l.id === action.leaveId
            ? { ...l, status: 'approved', decisionComment: action.decisionComment }
            : l
        ),
        notifications: [...state.notifications, approveNotif],
      };
    }

    case 'REJECT_LEAVE': {
      const leave = state.leaveRequests.find((l) => l.id === action.leaveId);
      if (!leave) return state;

      const rejectMsg = action.decisionComment
        ? `Your leave for ${leave.date} was rejected — "${action.decisionComment}"`
        : `Your leave request for ${leave.date} has been rejected`;

      const rejectNotif: Notification = {
        id: `notif-leave-${Date.now()}`,
        recipientId: leave.employeeId,
        type: 'leave_decision',
        message: rejectMsg,
        read: false,
        createdAt: new Date().toISOString(),
      };

      return {
        ...state,
        leaveRequests: state.leaveRequests.map((l) =>
          l.id === action.leaveId
            ? { ...l, status: 'rejected', decisionComment: action.decisionComment }
            : l
        ),
        notifications: [...state.notifications, rejectNotif],
      };
    }

    case 'ADD_TASK': {
      const newTaskNotifications: Notification[] = [];
      // Notify assignee when a lead/owner assigns a task (not a self-task, not an open task)
      if (
        !action.task.isOpenTask &&
        action.task.assigneeId &&
        action.task.assignerId !== action.task.assigneeId
      ) {
        const assigner = state.users.find((u) => u.id === action.task.assignerId);
        newTaskNotifications.push({
          id: `notif-task-assign-${Date.now()}`,
          recipientId: action.task.assigneeId,
          type: 'task_assigned',
          message: `${assigner?.name ?? 'Someone'} assigned you "${action.task.title}"`,
          taskId: action.task.id,
          read: false,
          createdAt: new Date().toISOString(),
        });
      }
      return {
        ...state,
        tasks: [...state.tasks, action.task],
        notifications: [...state.notifications, ...newTaskNotifications],
      };
    }

    case 'ADD_NOTIFICATION':
      return {
        ...state,
        notifications: [...state.notifications, action.notification],
      };

    case 'MARK_NOTIFICATION_READ':
      return {
        ...state,
        notifications: state.notifications.map((n) =>
          n.id === action.notificationId ? { ...n, read: true } : n
        ),
      };

    case 'MARK_ALL_NOTIFICATIONS_READ':
      return {
        ...state,
        notifications: state.notifications.map((n) => ({ ...n, read: true })),
      };

    case 'ADD_USER':
      return { ...state, users: [...state.users, action.user] };

    case 'UPDATE_USER':
      return {
        ...state,
        users: state.users.map((u) =>
          u.id === action.user.id ? action.user : u
        ),
      };

    case 'UPDATE_TASK':
      return {
        ...state,
        tasks: state.tasks.map((t) =>
          t.id === action.task.id ? action.task : t
        ),
      };

    case 'UPDATE_LEAD_MAPPING': {
      // Owners are the root of the hierarchy — they can never report to anyone.
      // Silently reject any attempt to assign leadIds to a pure-owner user.
      const targetUser = state.users.find((u) => u.id === action.employeeId);
      if (targetUser?.roles.includes('owner') && !targetUser.roles.includes('employee')) {
        return state; // no-op: owners cannot have leads
      }
      return {
        ...state,
        users: state.users.map((u) =>
          u.id === action.employeeId ? { ...u, leadIds: action.leadIds } : u
        ),
      };
    }

    case 'RESET_MOCK_STATE':
      // Called on real logout — snap mock state back to safe defaults
      // so the next login (potentially a different real user) starts clean.
      return { ...initialState };

    default:
      return state;
  }
}

// ─── Context Definition ───────────────────────────────────────────────────────

interface AppContextValue {
  state: AppState;
  dispatch: React.Dispatch<AppAction>;
  currentUser: User;
}

const AppContext = createContext<AppContextValue | null>(null);

// ─── Initial State ────────────────────────────────────────────────────────────

const initialState: AppState = {
  currentUserId: 'user-udit',   // start as Udit who has all roles
  currentRole: 'owner',
  users: mockUsers,
  tasks: mockTasks,
  notifications: mockNotifications,
  leaveRequests: mockLeaveRequests,
};

// ─── Provider ─────────────────────────────────────────────────────────────────

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(appReducer, initialState);

  const currentUser = state.users.find((u) => u.id === state.currentUserId) ?? mockUsers[0];

  return (
    <AppContext.Provider value={{ state, dispatch, currentUser }}>
      {children}
    </AppContext.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) {
    throw new Error('useApp must be used within AppProvider');
  }
  return ctx;
}

