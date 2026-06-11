import { Notification } from '../types';

function iso(offset = 0): string {
  const d = new Date();
  d.setHours(d.getHours() - offset);
  return d.toISOString();
}

export const mockNotifications: Notification[] = [
  {
    id: 'notif-001',
    recipientId: 'user-saif',
    type: 'task_assigned',
    message: 'Afroz Khan assigned you "Create LinkedIn post for Cohort 11"',
    taskId: 'task-001',
    read: false,
    createdAt: iso(24),
  },
  {
    id: 'notif-002',
    recipientId: 'user-saif',
    type: 'task_assigned',
    message: 'Mishti Agarwal assigned you "Design AI Workshop slides — Module 3"',
    taskId: 'task-002',
    read: false,
    createdAt: iso(48),
  },
  {
    id: 'notif-003',
    recipientId: 'user-afroz',
    type: 'task_completed',
    message: 'Kaif Siddiqui completed "Reply to YouTube comments — AI Basics video"',
    taskId: 'task-003',
    read: false,
    createdAt: iso(1),
  },
  {
    id: 'notif-004',
    recipientId: 'user-udit',
    type: 'open_task_raised',
    message: 'Saif Ali raised an open task: "Upload GenAI Notes — Session 7"',
    taskId: 'task-open-001',
    read: false,
    createdAt: iso(2),
  },
  {
    id: 'notif-005',
    recipientId: 'user-udit',
    type: 'open_task_raised',
    message: 'Priya Mehta raised an open task: "Create welcome kit for Cohort 12"',
    taskId: 'task-open-002',
    read: true,
    createdAt: iso(5),
  },
  {
    id: 'notif-006',
    recipientId: 'user-faizan',
    type: 'task_assigned',
    message: 'Udit Sharma assigned you a team lead task for lead Q&A session',
    taskId: 'task-012',
    read: true,
    createdAt: iso(6),
  },
  {
    id: 'notif-007',
    recipientId: 'user-afroz',
    type: 'task_overdue',
    message: 'Task "Fix bug in quiz submission portal" assigned to Rajan Gupta is overdue',
    taskId: 'task-011',
    read: false,
    createdAt: iso(12),
  },
  {
    id: 'notif-008',
    recipientId: 'user-faizan',
    type: 'task_moved',
    message: 'Rajan Gupta moved "Fix bug in quiz submission portal" to next day',
    taskId: 'task-011',
    read: true,
    createdAt: iso(22),
  },
  {
    id: 'notif-009',
    recipientId: 'user-mishti',
    type: 'comment_added',
    message: 'Arjun Verma commented on "Conduct mock interview session"',
    taskId: 'task-009',
    read: false,
    createdAt: iso(20),
  },
  {
    id: 'notif-010',
    recipientId: 'user-udit',
    type: 'leave_raised',
    message: 'Saif Ali has requested a leave for next Monday',
    read: false,
    createdAt: iso(10),
  },
];
