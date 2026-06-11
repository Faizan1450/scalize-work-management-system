import mongoose, { Schema, Document, Model } from 'mongoose';

// Schema only — no routes in Phase 2. Routes come in Phase 3.

export type TaskStatus = 'not_started' | 'in_progress' | 'completed' | 'overdue';
export type Recurrence = 'none' | 'daily' | 'weekly' | 'monthly';

interface ITaskComment {
  authorId: mongoose.Types.ObjectId;
  text: string;
  createdAt: Date;
}

interface IMovedRecord {
  fromDate: string;
  toDate: string;
  comment: string;
}

export interface ITask {
  title: string;
  description: string;
  assigneeId: mongoose.Types.ObjectId | null; // null only while isOpenTask
  assignerId: mongoose.Types.ObjectId;
  estimatedDurationMins: number;
  dueDate: string;          // "YYYY-MM-DD" IST
  plannedDate: string | null;
  plannedStartTime: string | null; // "HH:mm" IST
  plannedEndTime: string | null;   // "HH:mm" IST
  status: TaskStatus;
  actualStartTime: Date | null;
  actualEndTime: Date | null;
  comments: ITaskComment[];
  recurrence: Recurrence;
  isOpenTask: boolean;
  movedHistory: IMovedRecord[];
  imageUrls: string[];
  createdAt: Date;
  updatedAt: Date;
}

export type ITaskDocument = ITask & Document;

const taskSchema = new Schema<ITaskDocument>(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    assigneeId: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    assignerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    estimatedDurationMins: { type: Number, required: true, min: 1 },
    dueDate: { type: String, required: true },
    plannedDate: { type: String, default: null },
    plannedStartTime: { type: String, default: null },
    plannedEndTime: { type: String, default: null },
    status: {
      type: String,
      enum: ['not_started', 'in_progress', 'completed', 'overdue'],
      default: 'not_started',
    },
    actualStartTime: { type: Date, default: null },
    actualEndTime: { type: Date, default: null },
    comments: [
      {
        authorId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
        text: { type: String, required: true },
        createdAt: { type: Date, default: Date.now },
        _id: false,
      },
    ],
    recurrence: {
      type: String,
      enum: ['none', 'daily', 'weekly', 'monthly'],
      default: 'none',
    },
    isOpenTask: { type: Boolean, default: false },
    movedHistory: [
      {
        fromDate: String,
        toDate: String,
        comment: { type: String, default: '' },
        _id: false,
      },
    ],
    imageUrls: [{ type: String }],
  },
  { timestamps: true }
);

// Indexes for common query patterns (Phase 3)
taskSchema.index({ assigneeId: 1, plannedDate: 1 });
taskSchema.index({ assignerId: 1 });
taskSchema.index({ status: 1 });

export const Task: Model<ITaskDocument> = mongoose.models['Task'] as Model<ITaskDocument>
  ?? mongoose.model<ITaskDocument>('Task', taskSchema);
