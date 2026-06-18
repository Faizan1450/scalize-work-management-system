import React, { useEffect, useState } from 'react';
import { AlertCircle, X } from 'lucide-react';

interface ToastProps {
  message: string;
  onDismiss: () => void;
  durationMs?: number;
  type?: 'error' | 'success';
}

export function Toast({ message, onDismiss, durationMs = 3000, type = 'error' }: ToastProps) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false);
      setTimeout(onDismiss, 300); // wait for fade out
    }, durationMs);
    return () => clearTimeout(timer);
  }, [durationMs, onDismiss]);

  return (
    <div
      className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] flex items-center gap-3 px-4 py-3
        ${type === 'success' ? 'bg-emerald-600' : 'bg-red-600'} text-white text-sm font-medium rounded-xl shadow-2xl
        transition-all duration-300 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}`}
      role="alert"
      aria-live="assertive"
    >
      <AlertCircle size={16} className="flex-shrink-0" />
      <span>{message}</span>
      <button
        onClick={() => { setVisible(false); setTimeout(onDismiss, 300); }}
        className="ml-1 w-5 h-5 flex items-center justify-center rounded-full hover:bg-red-500 transition-colors"
        aria-label="Dismiss"
      >
        <X size={12} />
      </button>
    </div>
  );
}
