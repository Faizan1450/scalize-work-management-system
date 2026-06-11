import mongoose, { Schema, Document, Model } from 'mongoose';

// ── TypeScript interfaces ─────────────────────────────────────────────────────

export type Role = 'owner' | 'lead' | 'employee';

export interface IWorkSchedule {
  '0': number; // Sunday
  '1': number; // Monday
  '2': number; // Tuesday
  '3': number; // Wednesday
  '4': number; // Thursday
  '5': number; // Friday
  '6': number; // Saturday
}

export interface IUser {
  _id: mongoose.Types.ObjectId;
  name: string;
  userId: string;
  passwordHash: string;
  roles: Role[];
  leadIds: mongoose.Types.ObjectId[];
  workSchedule: IWorkSchedule;
  phone?: string;
  email?: string;
  joiningDate?: string; // "YYYY-MM-DD"
  designation?: string;
  isActive: boolean;
  avatarColor: string;
  createdAt: Date;
  updatedAt: Date;
}

export type IUserDocument = IUser & Document;

// ── Schema ────────────────────────────────────────────────────────────────────

const workScheduleSchema = new Schema<IWorkSchedule>(
  {
    '0': { type: Number, required: true, min: 0, max: 24 },
    '1': { type: Number, required: true, min: 0, max: 24 },
    '2': { type: Number, required: true, min: 0, max: 24 },
    '3': { type: Number, required: true, min: 0, max: 24 },
    '4': { type: Number, required: true, min: 0, max: 24 },
    '5': { type: Number, required: true, min: 0, max: 24 },
    '6': { type: Number, required: true, min: 0, max: 24 },
  },
  { _id: false }
);

const userSchema = new Schema<IUserDocument>(
  {
    name: { type: String, required: true, trim: true },
    userId: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^[a-z0-9.]+$/, 'userId must be lowercase alphanumeric with dots only'],
    },
    passwordHash: { type: String, required: true },
    roles: {
      type: [String],
      enum: ['owner', 'lead', 'employee'],
      default: ['employee'],
    },
    leadIds: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    workSchedule: { type: workScheduleSchema, required: true },
    phone: { type: String, default: '' },
    email: { type: String, default: '' },
    joiningDate: { type: String, default: '' }, // "YYYY-MM-DD"
    designation: { type: String, default: '' },
    isActive: { type: Boolean, default: true },
    avatarColor: { type: String, required: true },
  },
  {
    timestamps: true,
    toJSON: {
      transform(_doc, ret) {
        // NEVER serialize passwordHash — strip it from every JSON response
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const r = ret as any;
        delete r.passwordHash;
        delete r.__v;
        return r;
      },
    },
  }
);

// ── Model ─────────────────────────────────────────────────────────────────────

export const User: Model<IUserDocument> = mongoose.models['User'] as Model<IUserDocument>
  ?? mongoose.model<IUserDocument>('User', userSchema);
