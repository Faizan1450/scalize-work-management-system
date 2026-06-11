import mongoose, { Schema, Document, Model } from 'mongoose';

// Schema only — no routes in Phase 2.

export type LeaveStatus = 'pending' | 'approved' | 'rejected';
export type LeaveDuration = 'full_day' | 'half_day';

export interface ILeaveRequest {
  employeeId: mongoose.Types.ObjectId;
  date: string;              // "YYYY-MM-DD" IST
  duration: LeaveDuration;
  reason: string;
  status: LeaveStatus;
  decidedBy: mongoose.Types.ObjectId | null;
  decisionComment: string;   // optional note from owner on approve/reject
  createdAt: Date;
  updatedAt: Date;
}

export type ILeaveRequestDocument = ILeaveRequest & Document;

const leaveRequestSchema = new Schema<ILeaveRequestDocument>(
  {
    employeeId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    date: { type: String, required: true },
    duration: {
      type: String,
      enum: ['full_day', 'half_day'],
      required: true,
    },
    reason: { type: String, required: true, trim: true },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
    },
    decidedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    decisionComment: { type: String, default: '' },
  },
  { timestamps: true }
);

leaveRequestSchema.index({ employeeId: 1, status: 1 });

export const LeaveRequest: Model<ILeaveRequestDocument> =
  mongoose.models['LeaveRequest'] as Model<ILeaveRequestDocument>
  ?? mongoose.model<ILeaveRequestDocument>('LeaveRequest', leaveRequestSchema);
