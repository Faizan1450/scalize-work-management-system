import React from 'react';

export interface AvatarProps {
  name: string;
  color?: string;
  size?: 'sm' | 'md' | 'lg';
  showName?: boolean;
}

const sizeMap = {
  sm: 'w-7 h-7 text-xs',
  md: 'w-9 h-9 text-sm',
  lg: 'w-11 h-11 text-base',
};

export function Avatar({ name, color = '#1e3a5f', size = 'md', showName = false }: AvatarProps) {
  const initials = name
    .split(' ')
    .slice(0, 2)
    .map((n) => n[0])
    .join('')
    .toUpperCase();

  return (
    <div className="flex items-center gap-2">
      <div
        className={`${sizeMap[size]} rounded-full flex items-center justify-center font-semibold text-white flex-shrink-0`}
        style={{ backgroundColor: color }}
        title={name}
      >
        {initials}
      </div>
      {showName && (
        <span className="text-sm font-medium text-slate-700">{name}</span>
      )}
    </div>
  );
}
