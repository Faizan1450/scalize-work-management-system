import React from 'react';
import { CalendarOff } from 'lucide-react';
import { EmptyState } from '../../components/ui/EmptyState';

export function LeaveRequests() {
  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-lg font-bold text-slate-900">Leave Requests</h1>
        <p className="text-sm text-slate-500 mt-0.5">Manage employee leave requests</p>
      </div>
      <EmptyState
        icon={<CalendarOff size={24} />}
        title="Leave management coming in Phase 5"
        description="Leave requests, approval workflows, and calendar integrations are scheduled for Phase 5."
      />
    </div>
  );
}
