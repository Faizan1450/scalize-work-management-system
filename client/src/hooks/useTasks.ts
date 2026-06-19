/**
 * useTasks.ts — Fetches tasks from the real API with loading/error state.
 * Re-exported as a simple hook for both Employee and Lead views.
 *
 * Usage:
 *   const { tasks, loading, error, refetch } = useTasks({ date: '2026-06-11' });
 *
 * Auto-refresh strategy (no websockets):
 *   - Re-fetch when any param changes (date navigation, assigneeId, etc.)
 *   - Re-fetch on window focus  → picks up tasks assigned from another session
 *   - Re-fetch every 60 seconds → same cadence as useNotifications polling
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import { listTasks, ListTasksParams } from '../api/tasks';
import { Task } from '../types';

interface UseTasksResult {
  tasks: Task[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
  setTasks: React.Dispatch<React.SetStateAction<Task[]>>;
}

export function useTasks(params: ListTasksParams = {}): UseTasksResult {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Stable reference to params to avoid infinite loops
  const paramsRef = useRef(params);
  paramsRef.current = params;

  const fetchTasks = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await listTasks(paramsRef.current);
      setTasks(data);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } }; message?: string })
        ?.response?.data?.error ?? (err as { message?: string })?.message ?? 'Failed to load tasks';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  // Re-fetch when params change (date navigation, assigneeId, etc.)
  useEffect(() => {
    fetchTasks();
  }, [
    fetchTasks,
    params.assigneeId,
    params.date,
    params.from,
    params.to,
    params.isOpenTask,
  ]);

  // Re-fetch on window focus — picks up tasks assigned in another session/tab
  useEffect(() => {
    const handleFocus = () => fetchTasks();
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [fetchTasks]);

  // 60-second polling — same cadence as useNotifications, keeps view in sync
  useEffect(() => {
    const id = setInterval(fetchTasks, 60_000);
    return () => clearInterval(id);
  }, [fetchTasks]);

  return { tasks, loading, error, refetch: fetchTasks, setTasks };
}

