import { z } from 'zod';

export const generatePayrollSchema = z.object({
  month: z.number().int().min(1).max(12),
  year: z.number().int().min(2020).max(2100),
});

export const manualEditSchema = z.object({
  unpaidDaysManual: z.number().min(0).optional(),
  dockManualTotal: z.number().min(0).optional(),
  bonusManualTotal: z.number().min(0).optional(),
  manualNotes: z.string().optional(),
  reason: z.string().min(1, 'Reason is required'),
});

export const addAdjustmentSchema = z.object({
  type: z.enum(['BONUS', 'DOCK', 'OTHER']),
  amount: z.number(),
  reason: z.string().min(1, 'Reason is required'),
});

export const finalizeSchema = z.object({
  reason: z.string().min(1, 'Reason is required'),
});

export const revertSchema = z.object({
  reason: z.string().min(1, 'Reason is required'),
});

export const updatePolicySchema = z.object({
  weeklyOffDay: z.number().int().min(-1).max(6).optional(),
  timezone: z.string().optional(),
  minHoursForPresent: z.number().min(0).optional(),
});

export const updateSalarySchema = z.object({
  baseMonthlySalary: z.number().min(0, 'Salary must be non-negative'),
  currency: z.string().optional(),
});

export const updateWorkingDaysSchema = z.object({
  workingDays: z.number().int().min(1).max(31),
});

export type GeneratePayrollInput = z.infer<typeof generatePayrollSchema>;
export type ManualEditInput = z.infer<typeof manualEditSchema>;
export type AddAdjustmentInput = z.infer<typeof addAdjustmentSchema>;
export type FinalizeInput = z.infer<typeof finalizeSchema>;
export type RevertInput = z.infer<typeof revertSchema>;
export type UpdatePolicyInput = z.infer<typeof updatePolicySchema>;
export type UpdateSalaryInput = z.infer<typeof updateSalarySchema>;
export type UpdateWorkingDaysInput = z.infer<typeof updateWorkingDaysSchema>;
