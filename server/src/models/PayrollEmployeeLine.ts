import mongoose, { Schema, Document, Types } from 'mongoose';

export type PayrollLineStatus = 'DRAFT' | 'FINAL';

export interface IAdjustment {
  type: 'BONUS' | 'DOCK' | 'OTHER';
  amount: number;
  reason: string;
  createdBy: Types.ObjectId;
  createdAt: Date;
}

export interface IPayrollEmployeeLine extends Document {
  _id: Types.ObjectId;
  payrollRunId: Types.ObjectId;
  userId: Types.ObjectId;
  status: PayrollLineStatus;

  // Snapshot from User at generation time
  baseMonthlySalarySnapshot: number;

  // SYSTEM metrics (from existing attendance summaries)
  workingDays: number;
  presentDays: number;
  suggestedAbsentDays: number;
  totalNetMinutes: number;
  totalBreakMinutes: number;
  calculatedPaySuggestion: number;

  // HR manual fields (Excel-like inputs)
  unpaidDaysManual: number;
  dockManualTotal: number;
  bonusManualTotal: number;
  manualNotes: string;

  // Optional detail adjustments
  adjustments: IAdjustment[];

  // Final computed pay
  finalPay: number;

  createdAt: Date;
  updatedAt: Date;
}

const adjustmentSchema = new Schema<IAdjustment>(
  {
    type: {
      type: String,
      enum: ['BONUS', 'DOCK', 'OTHER'],
      required: true,
    },
    amount: {
      type: Number,
      required: true,
    },
    reason: {
      type: String,
      required: true,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }
);

const payrollEmployeeLineSchema = new Schema<IPayrollEmployeeLine>(
  {
    payrollRunId: {
      type: Schema.Types.ObjectId,
      ref: 'PayrollRun',
      required: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    status: {
      type: String,
      enum: ['DRAFT', 'FINAL'],
      default: 'DRAFT',
    },
    baseMonthlySalarySnapshot: {
      type: Number,
      required: true,
      min: 0,
    },

    // System metrics
    workingDays: { type: Number, default: 0, min: 0 },
    presentDays: { type: Number, default: 0, min: 0 },
    suggestedAbsentDays: { type: Number, default: 0, min: 0 },
    totalNetMinutes: { type: Number, default: 0, min: 0 },
    totalBreakMinutes: { type: Number, default: 0, min: 0 },
    calculatedPaySuggestion: { type: Number, default: 0, min: 0 },

    // HR manual
    unpaidDaysManual: { type: Number, default: 0, min: 0 },
    dockManualTotal: { type: Number, default: 0, min: 0 },
    bonusManualTotal: { type: Number, default: 0, min: 0 },
    manualNotes: { type: String, default: '' },

    // Adjustments
    adjustments: { type: [adjustmentSchema], default: [] },

    // Final pay
    finalPay: { type: Number, default: 0 },
  },
  {
    timestamps: true,
  }
);

// Unique: one line per employee per payroll run
payrollEmployeeLineSchema.index({ payrollRunId: 1, userId: 1 }, { unique: true });
payrollEmployeeLineSchema.index({ payrollRunId: 1, status: 1 });
payrollEmployeeLineSchema.index({ userId: 1 });

export const PayrollEmployeeLine = mongoose.model<IPayrollEmployeeLine>(
  'PayrollEmployeeLine',
  payrollEmployeeLineSchema
);
