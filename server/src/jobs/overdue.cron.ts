/**
 * overdue.cron.ts — Daily job that creates overdue notifications.
 *
 * Schedule: 21:00 IST every day.
 * Correction 1: uses node-cron timezone option — environment-independent,
 * no UTC math in the expression.
 *
 * Registration (final line, verbatim):
 *   cron.schedule('0 21 * * *', runOverdueJob, { timezone: 'Asia/Kolkata' });
 *
 * Dedup: overdueNotifiedAt is set on each task after notification.
 * Re-running the job never double-notifies.
 */

import cron from 'node-cron';
import mongoose from 'mongoose';
import { Task } from '../models/Task';
import { User } from '../models/User';
import { createNotificationForTwo } from '../services/notify';
import { todayIST } from '../utils/istDate';

export async function runOverdueJob(): Promise<void> {
  const today = todayIST();
  console.log(`[overdue-cron] Running at ${new Date().toISOString()} | today-IST: ${today}`);

  try {
    // Find incomplete tasks where taskDate is in the past AND not yet notified
    const overdueTasks = await Task.find({
      status: { $ne: 'completed' },
      taskDate: { $lt: today },
      overdueNotifiedAt: null,
      isOpenTask: false,
      assigneeId: { $ne: null },
    });

    console.log(`[overdue-cron] Found ${overdueTasks.length} overdue task(s) to notify`);

    for (const task of overdueTasks) {
      const assignee = await User.findById(task.assigneeId).select('name');
      const assigner = await User.findById(task.assignerId).select('name');

      if (!assignee || !task.assigneeId) continue;

      const message = `Task "${task.title}" is overdue (due: ${task.taskDate})`;

      // Notify both assignee and assigner (dedup: one notification if same person)
      await createNotificationForTwo(
        task.assigneeId as mongoose.Types.ObjectId,
        task.assignerId,
        'task_overdue',
        message,
        task._id
      );

      // Mark as notified — prevents duplicate notifications on future runs
      task.overdueNotifiedAt = new Date();
      await task.save();
    }

    console.log('[overdue-cron] Done.');
  } catch (err) {
    console.error('[overdue-cron] Error:', err);
  }
}

/**
 * Start the overdue cron job.
 * Call this AFTER the MongoDB connection is established.
 *
 * Final cron registration line (verbatim per Step 7 report requirement):
 */
export function startOverdueCron(): void {
  cron.schedule('0 21 * * *', runOverdueJob, { timezone: 'Asia/Kolkata' });
  console.log('[overdue-cron] Scheduled: 0 21 * * * (21:00 IST daily) | timezone: Asia/Kolkata');
}
