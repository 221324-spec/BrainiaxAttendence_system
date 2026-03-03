import { Types } from 'mongoose';
import { PayrollEmployeeLine, AuditLog } from '../models';
import { AppError } from '../middleware';

export class PayrollFinalizeService {
  /**
   * Finalize a single employee's payroll line.
   * Requires reason. Changes status from DRAFT -> FINAL.
   */
  static async finalize(
    runId: string,
    userId: string,
    reason: string,
    adminUserId: string,
    ipAddress: string
  ) {
    const line = await PayrollEmployeeLine.findOne({
      payrollRunId: runId,
      userId,
    });
    if (!line) {
      throw new AppError('Payroll line not found', 404);
    }
    if (line.status === 'FINAL') {
      throw new AppError('Payroll line is already FINAL', 400);
    }

    const oldStatus = line.status;
    line.status = 'FINAL';
    await line.save();

    // Audit log
    await AuditLog.create({
      action: 'PAYROLL_FINALIZE',
      performedBy: new Types.ObjectId(adminUserId),
      targetUserId: new Types.ObjectId(userId),
      details: JSON.stringify({
        reason,
        oldStatus,
        newStatus: 'FINAL',
        finalPay: line.finalPay,
        runId,
      }),
      ipAddress,
    });

    return line;
  }

  /**
   * Revert a FINAL payroll line back to DRAFT.
   * Requires reason. This is an explicit action by HR.
   */
  static async revert(
    runId: string,
    userId: string,
    reason: string,
    adminUserId: string,
    ipAddress: string
  ) {
    const line = await PayrollEmployeeLine.findOne({
      payrollRunId: runId,
      userId,
    });
    if (!line) {
      throw new AppError('Payroll line not found', 404);
    }
    if (line.status === 'DRAFT') {
      throw new AppError('Payroll line is already DRAFT', 400);
    }

    const oldStatus = line.status;
    line.status = 'DRAFT';
    await line.save();

    // Audit log
    await AuditLog.create({
      action: 'PAYROLL_REVERT_TO_DRAFT',
      performedBy: new Types.ObjectId(adminUserId),
      targetUserId: new Types.ObjectId(userId),
      details: JSON.stringify({
        reason,
        oldStatus,
        newStatus: 'DRAFT',
        finalPay: line.finalPay,
        runId,
      }),
      ipAddress,
    });

    return line;
  }
}
