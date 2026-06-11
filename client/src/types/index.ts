// ─── Core Domain Types ────────────────────────────────────────────────────────

export type Role = 'owner' | 'lead' | 'employee';

export type TaskStatus = 'not_started' | 'in_progress' | 'completed' | 'overdue';

export type Recurrence = 'none' | 'daily' | 'weekly' | 'monthly';

export interface User {
  id: string;
  name: string;
  userId: string;            // login id (display only in Phase 1)
  roles: Role[];             // one person can have multiple roles
  leadIds: string[];         // an employee can report to MULTIPLE leads
  /**
   * workSchedule — hours per day for each weekday.
   * Key: "0"=Sunday, "1"=Monday … "6"=Saturday.
   * Value: hours (0 = off day, e.g. { "0": 0 } means Sunday is off).
   *
   * Replaces Phase 1 fields: workHoursPerDay, workStartTime, workEndTime, offDays.
   * Timeline is fixed to 08:00–22:00 for all users.
   */
  workSchedule: Record<'0'|'1'|'2'|'3'|'4'|'5'|'6', number>;
  avatarColor: string;
}

export interface TaskComment {
  id: string;
  authorId: string;
  text: string;
  createdAt: string;
}

export interface TaskMoveRecord {
  fromDate: string;
  toDate: string;
  comment?: string;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  assigneeId: string;        // EXACTLY one assignee
  assignerId: string;        // who created it ('self' tasks: assigneeId === assignerId)
  estimatedDurationMins: number;
  dueDate: string;           // ISO date string
  plannedDate: string | null;
  plannedStartTime: string | null;  // "10:00"
  plannedEndTime: string | null;    // computed: start + duration
  status: TaskStatus;
  comments: TaskComment[];
  recurrence: Recurrence;
  isOpenTask: boolean;       // open tasks have assigneeId = '' until owner assigns
  movedHistory: TaskMoveRecord[];
  createdAt: string;
}

export interface Notification {
  id: string;
  recipientId: string;
  type:
    | 'task_assigned'
    | 'task_completed'
    | 'task_moved'
    | 'task_overdue'
    | 'comment_added'
    | 'open_task_raised'
    | 'open_task_assigned'
    | 'leave_raised'
    | 'leave_decision';
  message: string;
  taskId?: string;
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
  /** Optional note from the owner when approving or rejecting */
  decisionComment?: string;
}

// ─── App State Types ──────────────────────────────────────────────────────────

export interface AppState {
  currentUserId: string;
  currentRole: Role;
  users: User[];
  tasks: Task[];
  notifications: Notification[];
  leaveRequests: LeaveRequest[];
}

// ─── Reducer Action Types ─────────────────────────────────────────────────────

export type AppAction =
  | { type: 'SET_ROLE'; role: Role }
  | { type: 'SET_USER'; userId: string }
  | { type: 'SCHEDULE_TASK'; taskId: string; plannedDate: string; plannedStartTime: string; plannedEndTime: string }
  | { type: 'MOVE_TASK'; taskId: string; toDate: string; comment?: string }
  | { type: 'UPDATE_STATUS'; taskId: string; status: TaskStatus }
  | { type: 'ADD_COMMENT'; taskId: string; comment: TaskComment }
  | { type: 'ASSIGN_TASK'; taskId: string; assigneeId: string }
  | { type: 'APPROVE_LEAVE'; leaveId: string; decisionComment?: string }
  | { type: 'REJECT_LEAVE'; leaveId: string; decisionComment?: string }
  | { type: 'ADD_TASK'; task: Task }
  | { type: 'ADD_NOTIFICATION'; notification: Notification }
  | { type: 'MARK_NOTIFICATION_READ'; notificationId: string }
  | { type: 'MARK_ALL_NOTIFICATIONS_READ' }
  | { type: 'ADD_USER'; user: User }
  | { type: 'UPDATE_USER'; user: User }
  | { type: 'UPDATE_TASK'; task: Task }
  | { type: 'UPDATE_LEAD_MAPPING'; employeeId: string; leadIds: string[] }
  /** Called on real logout — resets mock currentUser + currentRole to safe defaults */
  | { type: 'RESET_MOCK_STATE' };
