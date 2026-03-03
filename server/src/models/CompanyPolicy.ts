import mongoose, { Schema, Document, Types } from 'mongoose';

export interface ICompanyPolicy extends Document {
  _id: Types.ObjectId;
  weeklyOffDay: number; // -1=No Off Day, 0=Sunday … 6=Saturday
  timezone: string;
  minHoursForPresent: number;
  createdAt: Date;
  updatedAt: Date;
}

const companyPolicySchema = new Schema<ICompanyPolicy>(
  {
    weeklyOffDay: {
      type: Number,
      min: -1,
      max: 6,
      default: 0, // Sunday
    },
    timezone: {
      type: String,
      default: 'Asia/Kolkata',
    },
    minHoursForPresent: {
      type: Number,
      default: 6,
      min: 0,
    },
  },
  {
    timestamps: true,
  }
);

export const CompanyPolicy = mongoose.model<ICompanyPolicy>('CompanyPolicy', companyPolicySchema);

/**
 * Get the singleton CompanyPolicy document.
 * Creates a default one if none exists.
 */
export async function getCompanyPolicy(): Promise<ICompanyPolicy> {
  let policy = await CompanyPolicy.findOne();
  if (!policy) {
    policy = await CompanyPolicy.create({});
  }
  return policy;
}
