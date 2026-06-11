/**
 * API types for the real backend user (authUser).
 * Separate from the client-side mock User type in types/index.ts.
 * In Phase 3, these will be unified.
 */
export interface ApiWorkSchedule {
  '0': number;
  '1': number;
  '2': number;
  '3': number;
  '4': number;
  '5': number;
  '6': number;
}

export interface ApiUser {
  _id: string;
  name: string;
  userId: string;
  roles: ('owner' | 'lead' | 'employee')[];
  leadIds: string[];
  workSchedule: ApiWorkSchedule;
  phone: string;
  email: string;
  joiningDate: string;
  designation: string;
  isActive: boolean;
  avatarColor: string;
  createdAt: string;
  updatedAt: string;
}
