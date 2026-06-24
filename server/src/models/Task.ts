import mongoose, { Schema, Document, Model } from 'mongoose';

// Phase 3: 'overdue' is COMPUTED (never stored). DB enum: not_started | in_progress | completed.
export type TaskStatus = 'not_started' | 'in_progress' | 'completed';
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
  assignerId: mongoose.Types.ObjectId;        // owner after claim; raiser before claim
  /** Who originally raised this as an open task. Set on creation, never mutated. */
  raisedBy: mongoose.Types.ObjectId | null;
  estimatedDurationMins: number;
  taskDate: string;          // "YYYY-MM-DD" IST
  scheduledTime: string | null; // "HH:mm" IST
  status: TaskStatus;
  actualStartTime: Date | null;
  actualEndTime: Date | null;
  comments: ITaskComment[];
  recurrence: Recurrence;
  isOpenTask: boolean;
  movedHistory: IMovedRecord[];
  imageUrls: string[];
  overdueNotifiedAt: Date | null; // set by cron after notifying; null = not yet notified
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
    estimatedDurationMins: { type: Number, required: true, min: 10, max: 480 },
    taskDate: { type: String, required: true },
    scheduledTime: { type: String, default: null },
    status: {
      type: String,
      enum: ['not_started', 'in_progress', 'completed'],
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
    /** Preserved forever once set; shows "raised by" in open-task queue */
    raisedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    movedHistory: [
      {
        fromDate: String,
        toDate: String,
        comment: { type: String, default: '' },
        _id: false,
      },
    ],
    imageUrls: [{ type: String }],
    overdueNotifiedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

taskSchema.pre('find', function() {
  this.populate('assigneeId', 'name userId avatarColor')
      .populate('assignerId', 'name userId avatarColor')
      .populate('raisedBy', 'name userId avatarColor')
      .populate('comments.authorId', 'name userId avatarColor');
});

taskSchema.pre('findOne', function() {
  this.populate('assigneeId', 'name userId avatarColor')
      .populate('assignerId', 'name userId avatarColor')
      .populate('raisedBy', 'name userId avatarColor')
      .populate('comments.authorId', 'name userId avatarColor');
});

taskSchema.post('save', async function(doc) {
  await doc.populate([
    { path: 'assigneeId', select: 'name userId avatarColor' },
    { path: 'assignerId', select: 'name userId avatarColor' },
    { path: 'raisedBy', select: 'name userId avatarColor' },
    { path: 'comments.authorId', select: 'name userId avatarColor' }
  ]);
});

// Indexes for common query patterns (Phase 3)
taskSchema.index({ assigneeId: 1, taskDate: 1 });
taskSchema.index({ assignerId: 1 });
taskSchema.index({ status: 1 });
taskSchema.index({ isOpenTask: 1, assigneeId: 1 }); // Phase 3: open-task queries

export const Task: Model<ITaskDocument> = mongoose.models['Task'] as Model<ITaskDocument>
  ?? mongoose.model<ITaskDocument>('Task', taskSchema);
