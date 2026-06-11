import { LeaveRequest } from '../types';
import { addDaysToISODate, today } from '../utils/date';

const t = today();

export const mockLeaveRequests: LeaveRequest[] = [
  {
    id: 'leave-001',
    employeeId: 'user-saif',
    date: addDaysToISODate(t, 3), // 3 days from now
    duration: 'full_day',
    reason: 'Family function — sister\'s engagement ceremony',
    status: 'pending',
  },
  {
    id: 'leave-002',
    employeeId: 'user-priya',
    date: addDaysToISODate(t, 5), // 5 days from now
    duration: 'half_day',
    reason: 'Medical appointment — routine health checkup',
    status: 'pending',
  },
  {
    id: 'leave-003',
    employeeId: 'user-kaif',
    date: addDaysToISODate(t, -3), // 3 days ago
    duration: 'full_day',
    reason: 'Personal work',
    status: 'approved',
  },
  {
    id: 'leave-004',
    employeeId: 'user-rajan',
    date: addDaysToISODate(t, -5), // 5 days ago
    duration: 'half_day',
    reason: 'Dentist appointment',
    status: 'rejected',
  },
];
