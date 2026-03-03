import { Types } from 'mongoose';
import { User, CompanyPolicy, AuditLog, getCompanyPolicy } from '../models';
import { AppError } from '../middleware';

export class CompanyPolicyService {
  /**
   * Get current company policy.
   */
  static async get() {
    return getCompanyPolicy();
  }

  /**
   * Update company policy (admin only).
   */
  static async update(
    data: { weeklyOffDay?: number; timezone?: string; minHoursForPresent?: number },
    adminUserId: string,
    ipAddress: string
  ) {
    const policy = await getCompanyPolicy();
    const oldValues = {
      weeklyOffDay: policy.weeklyOffDay,
      timezone: policy.timezone,
      minHoursForPresent: policy.minHoursForPresent,
    };

    if (data.weeklyOffDay !== undefined) policy.weeklyOffDay = data.weeklyOffDay;
    if (data.timezone !== undefined) policy.timezone = data.timezone;
    if (data.minHoursForPresent !== undefined) policy.minHoursForPresent = data.minHoursForPresent;

    await policy.save();

    await AuditLog.create({
      action: 'COMPANY_POLICY_UPDATE',
      performedBy: new Types.ObjectId(adminUserId),
      targetUserId: null,
      details: JSON.stringify({ oldValues, newValues: data }),
      ipAddress,
    });

    return policy;
  }

  /**
   * Update an employee's base monthly salary (admin only).
   * Creates audit log entry.
   */
  static async updateEmployeeSalary(
    employeeId: string,
    baseMonthlySalary: number,
    currency: string | undefined,
    adminUserId: string,
    ipAddress: string
  ) {
    const user = await User.findById(employeeId).select(
      '+baseMonthlySalary +currency +salaryEffectiveFrom'
    );
    if (!user) {
      throw new AppError('Employee not found', 404);
    }

    const oldValues = {
      baseMonthlySalary: user.baseMonthlySalary,
      currency: user.currency,
    };

    user.baseMonthlySalary = baseMonthlySalary;
    if (currency) user.currency = currency;
    user.salaryEffectiveFrom = new Date();
    await user.save();

    await AuditLog.create({
      action: 'SALARY_UPDATE',
      performedBy: new Types.ObjectId(adminUserId),
      targetUserId: new Types.ObjectId(employeeId),
      details: JSON.stringify({
        oldValues,
        newValues: { baseMonthlySalary, currency },
      }),
      ipAddress,
    });

    return {
      baseMonthlySalary: user.baseMonthlySalary,
      currency: user.currency,
      salaryEffectiveFrom: user.salaryEffectiveFrom,
    };
  }

  /**
   * Get an employee's salary info (admin only).
   */
  static async getEmployeeSalary(employeeId: string) {
    const user = await User.findById(employeeId).select(
      '+baseMonthlySalary +currency +salaryEffectiveFrom name email department'
    );
    if (!user) {
      throw new AppError('Employee not found', 404);
    }
    return {
      _id: user._id,
      name: user.name,
      email: user.email,
      department: user.department,
      baseMonthlySalary: user.baseMonthlySalary ?? 0,
      currency: user.currency ?? 'INR',
      salaryEffectiveFrom: user.salaryEffectiveFrom,
    };
  }
}
