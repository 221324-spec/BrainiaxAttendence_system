import mongoose, { Schema, Document, Types } from 'mongoose';

export type AttendanceStatus = 'present' | 'absent' | 'half-day';

export interface IBreakPeriod {
  start: Date;
  end: Date | null;
}

export interface IAttendance extends Document {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  date: string; // YYYY-MM-DD format
  punchIn: Date | null;
  punchOut: Date | null;
  breaks: IBreakPeriod[];
  totalBreakMinutes: number;
  totalWorkMinutes: number;
  status: AttendanceStatus;
  isOnBreak: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const breakPeriodSchema = new Schema(
  {
    start: { type: Date, required: true },
    end: { type: Date, default: null },
  },
  { _id: false }
);

const attendanceSchema = new Schema<IAttendance>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
      index: true,
    },
    date: {
      type: String,
      required: [true, 'Date is required'],
      match: [/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'],
      index: true,
    },
    punchIn: {
      type: Date,
      default: null,
    },
    punchOut: {
      type: Date,
      default: null,
    },
    breaks: {
      type: [breakPeriodSchema],
      default: [],
    },
    totalBreakMinutes: {
      type: Number,
      default: 0,
      min: 0,
    },
    totalWorkMinutes: {
      type: Number,
      default: 0,
      min: 0,
    },
    status: {
      type: String,
      enum: ['present', 'absent', 'half-day'],
      default: 'present',
    },
    isOnBreak: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// Unique compound index: one record per user per day
attendanceSchema.index({ userId: 1, date: 1 }, { unique: true });

export const Attendance = mongoose.model<IAttendance>('Attendance', attendanceSchema);
