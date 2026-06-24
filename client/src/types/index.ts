// ─── Core Domain Types ────────────────────────────────────────────────────────

export type Role = 'owner' | 'lead' | 'employee';

/** Server stores NOT_STARTED | IN_PROGRESS | COMPLETED only.
 *  'overdue' is derived client-side from isOverdue flag — never sent to server. */
export type TaskStatus = 'not_started' | 'in_progress' | 'completed';

export type Recurrence = 'none' | 'daily' | 'weekly' | 'monthly';

export interface User {
  /** MongoDB _id (string) — matches JWT sub */
  _id: string;
  id: string;             // alias for _id for backward compat during transition
  name: string;
  userId: string;
  roles: Role[];
  leadIds: string[];
  workSchedule: Record<'0'|'1'|'2'|'3'|'4'|'5'|'6', number>;
  avatarColor?: string;
  email?: string;
  phone?: string;
  designation?: string;
  joiningDate?: string;
  isActive: boolean;
}

export interface PopulatedUser {
  _id: string;
  name: string;
  userId: string;
  avatarColor?: string;
}

export interface TaskComment {
  _id?: string;
  id?: string;
  authorId: string | PopulatedUser;
  text: string;
  createdAt: string;
}

export interface TaskMoveRecord {
  fromDate: string;
  toDate: string;
  comment?: string;
}

export interface Task {
  /** MongoDB _id string */
  _id: string;
  id?: string;           // alias
  title: string;
  description: string;
  assigneeId: string | PopulatedUser | null;
  assignerId: string | PopulatedUser;
  /** Who originally raised this as an open task (set on creation, never overwritten). */
  raisedBy?: string | PopulatedUser | null;
  estimatedDurationMins: number;
  taskDate: string;
  scheduledTime: string | null;
  status: TaskStatus;
  /** Derived by server: taskDate < todayIST && status !== completed */
  isOverdue: boolean;
  comments: TaskComment[];
  recurrence: Recurrence;
  isOpenTask: boolean;
  priority?: 'high' | 'medium' | 'low' | null;
  movedHistory: TaskMoveRecord[];
  actualStartTime: string | null;
  actualEndTime: string | null;
  overdueNotifiedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Notification {
  _id: string;
  id?: string;
  recipientId: string;
  type:
    | 'task_assigned'
    | 'task_completed'
    | 'task_moved'
    | 'task_overdue'
    | 'task_updated'
    | 'task_reassigned'
    | 'task_deleted'
    | 'comment_added'
    | 'open_task_raised'
    | 'open_task_assigned'
    | 'leave_raised'
    | 'leave_decision';
  message: string;
  taskId?: string | null;
  read: boolean;
  createdAt: string;
}

export interface LeaveRequest {
  id: string;
  employeeId: string;
  date: string;
  duration: 'full_day' | 'half_day';
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  decisionComment?: string;
}

// ─── App State Types ──────────────────────────────────────────────────────────
// Slimmed to UI-only state — no tasks, notifications, users in context.
// All data comes from API hooks.

export interface AppState {
  currentRole: Role;
  selectedDate: string;    // 'YYYY-MM-DD' — for week strip / day view
}

// ─── Reducer Action Types ─────────────────────────────────────────────────────

export type AppAction =
  | { type: 'SET_ROLE'; role: Role }
  | { type: 'SET_DATE'; date: string }
  /** Called on logout — resets UI state to defaults */
  | { type: 'RESET_STATE' };
