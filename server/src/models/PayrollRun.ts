import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IPayrollRun extends Document {
  _id: Types.ObjectId;
  month: number; // 1-12
  year: number;
  status: 'OPEN';
  workingDaysInMonth: number; // Admin can override this
  generatedAt: Date;
  generatedBy: Types.ObjectId;
  lastRecalculatedAt?: Date;
  lastRecalculatedBy?: Types.ObjectId;
  // Pre-aggregated totals (stored at generate / recalculate time)
  aggTotalPaid: number;
  aggTotalBase: number;
  aggTotalBonus: number;
  aggTotalDock: number;
  aggHeadcount: number;
  createdAt: Date;
  updatedAt: Date;
}

const payrollRunSchema = new Schema<IPayrollRun>(
  {
    month: {
      type: Number,
      required: true,
      min: 1,
      max: 12,
    },
    year: {
      type: Number,
      required: true,
      min: 2020,
    },
    status: {
      type: String,
      enum: ['OPEN'],
      default: 'OPEN',
    },
    workingDaysInMonth: {
      type: Number,
      required: true,
      min: 1,
      max: 31,
    },
    generatedAt: {
      type: Date,
      default: Date.now,
    },
    generatedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    lastRecalculatedAt: {
      type: Date,
      default: undefined,
    },
    lastRecalculatedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: undefined,
    },
    // Pre-aggregated totals
    aggTotalPaid: { type: Number, default: 0, min: 0 },
    aggTotalBase: { type: Number, default: 0, min: 0 },
    aggTotalBonus: { type: Number, default: 0, min: 0 },
    aggTotalDock: { type: Number, default: 0, min: 0 },
    aggHeadcount: { type: Number, default: 0, min: 0 },
  },
  {
    timestamps: true,
  }
);

// Only one payroll run per month/year
payrollRunSchema.index({ month: 1, year: 1 }, { unique: true });

export const PayrollRun = mongoose.model<IPayrollRun>('PayrollRun', payrollRunSchema);
