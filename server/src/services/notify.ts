/**
 * notify.ts — single source of truth for notification creation.
 *
 * ALL notification creation in Phase 3 goes through createNotification().
 * No inline Notification.create() calls in controllers.
 */

import mongoose from 'mongoose';
import { Notification, NotificationType } from '../models/Notification';

/**
 * Creates a single notification document.
 *
 * @param recipientId  MongoDB ObjectId of the recipient user
 * @param type         One of the NotificationType enum values
 * @param message      Human-readable message string
 * @param taskId       Optional — links the notification to a task (for navigation)
 */
export async function createNotification(
  recipientId: mongoose.Types.ObjectId,
  type: NotificationType,
  message: string,
  taskId?: mongoose.Types.ObjectId | null
): Promise<void> {
  await Notification.create({
    recipientId,
    type,
    message,
    taskId: taskId ?? null,
    read: false,
  });
}

/**
 * Convenience: notify two parties at once (e.g. assignee + assigner on overdue).
 * De-duplicates: if recipientA === recipientB, only one notification is created.
 */
export async function createNotificationForTwo(
  recipientA: mongoose.Types.ObjectId,
  recipientB: mongoose.Types.ObjectId,
  type: NotificationType,
  message: string,
  taskId?: mongoose.Types.ObjectId | null
): Promise<void> {
  if (recipientA.toString() === recipientB.toString()) {
    // Same person — send only once
    await createNotification(recipientA, type, message, taskId);
  } else {
    await Promise.all([
      createNotification(recipientA, type, message, taskId),
      createNotification(recipientB, type, message, taskId),
    ]);
  }
}
