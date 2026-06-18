/**
 * useTasks.ts — Fetches tasks from the real API with loading/error state.
 * Re-exported as a simple hook for both Employee and Lead views.
 *
 * Usage:
 *   const { tasks, loading, error, refetch } = useTasks({ date: '2026-06-11' });
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

  useEffect(() => {
    fetchTasks();
  }, [
    fetchTasks,
    // Re-run when any param changes
    params.assigneeId,
    params.date,
    params.from,
    params.to,
    params.isOpenTask,
  ]);

  return { tasks, loading, error, refetch: fetchTasks, setTasks };
}
