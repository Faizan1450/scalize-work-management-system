import mongoose, { Schema, Document, Model } from 'mongoose';

// Schema only — no routes in Phase 2.

export type NotificationType =
  | 'task_assigned'
  | 'task_completed'
  | 'task_moved'
  | 'task_overdue'
  | 'comment_added'
  | 'open_task_raised'
  | 'open_task_assigned'
  | 'leave_raised'
  | 'leave_decision';

export interface INotification {
  recipientId: mongoose.Types.ObjectId;
  type: NotificationType;
  message: string;
  taskId: mongoose.Types.ObjectId | null;
  read: boolean;
  createdAt: Date;
}

export type INotificationDocument = INotification & Document;

const notificationSchema = new Schema<INotificationDocument>(
  {
    recipientId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    type: {
      type: String,
      enum: [
        'task_assigned', 'task_completed', 'task_moved', 'task_overdue',
        'comment_added', 'open_task_raised', 'open_task_assigned',
        'leave_raised', 'leave_decision',
      ],
      required: true,
    },
    message: { type: String, required: true },
    taskId: { type: Schema.Types.ObjectId, ref: 'Task', default: null },
    read: { type: Boolean, default: false },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

// Compound index — used to fetch unread notifications per recipient efficiently
notificationSchema.index({ recipientId: 1, read: 1 });

export const Notification: Model<INotificationDocument> =
  mongoose.models['Notification'] as Model<INotificationDocument>
  ?? mongoose.model<INotificationDocument>('Notification', notificationSchema);
