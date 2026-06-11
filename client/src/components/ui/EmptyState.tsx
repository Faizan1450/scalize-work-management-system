import React from 'react';
import { ClipboardList } from 'lucide-react';

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
      <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center mb-4 text-slate-400">
        {icon ?? <ClipboardList size={24} />}
      </div>
      <p className="text-sm font-semibold text-slate-700 mb-1">{title}</p>
      {description && (
        <p className="text-xs text-slate-400 mb-4 max-w-xs">{description}</p>
      )}
      {action}
    </div>
  );
}
