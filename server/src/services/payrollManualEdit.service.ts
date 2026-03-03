import { Types } from 'mongoose';
import { PayrollEmployeeLine, AuditLog } from '../models';
import { PayrollRunService } from './payrollRun.service';
import { AppError } from '../middleware';

export interface ManualEditInput {
  unpaidDaysManual?: number;
  dockManualTotal?: number;
  bonusManualTotal?: number;
  manualNotes?: string;
  reason: string;
}

export interface AdjustmentInput {
  type: 'BONUS' | 'DOCK' | 'OTHER';
  amount: number;
  reason: string;
}

export class PayrollManualEditService {
  /**
   * Update HR manual fields on a payroll line.
   * Requires the line to be in DRAFT status.
   * Recomputes finalPay after edit.
   * Audit logs every change with old/new values.
   */
  static async updateManualFields(
    runId: string,
    userId: string,
    input: ManualEditInput,
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
      throw new AppError(
        'Cannot edit a FINAL payroll line. Revert to DRAFT first.',
        400
      );
    }

    // Capture old values for audit
    const oldValues = {
      unpaidDaysManual: line.unpaidDaysManual,
      dockManualTotal: line.dockManualTotal,
      bonusManualTotal: line.bonusManualTotal,
      manualNotes: line.manualNotes,
      finalPay: line.finalPay,
    };

    // Apply changes (only provided fields)
    if (input.unpaidDaysManual !== undefined) {
      line.unpaidDaysManual = input.unpaidDaysManual;
    }
    if (input.dockManualTotal !== undefined) {
      line.dockManualTotal = input.dockManualTotal;
    }
    if (input.bonusManualTotal !== undefined) {
      line.bonusManualTotal = input.bonusManualTotal;
    }
    if (input.manualNotes !== undefined) {
      line.manualNotes = input.manualNotes;
    }

    // Recompute finalPay
    const adjustmentsTotal = (line.adjustments || []).reduce(
      (sum, a) => sum + a.amount,
      0
    );
    line.finalPay =
      Math.round(
        PayrollRunService.computeFinalPay(
          line.baseMonthlySalarySnapshot,
          line.workingDays,
          line.suggestedAbsentDays,
          line.unpaidDaysManual,
          line.dockManualTotal,
          line.bonusManualTotal,
          adjustmentsTotal
        ) * 100
      ) / 100;

    await line.save();

    const newValues = {
      unpaidDaysManual: line.unpaidDaysManual,
      dockManualTotal: line.dockManualTotal,
      bonusManualTotal: line.bonusManualTotal,
      manualNotes: line.manualNotes,
      finalPay: line.finalPay,
    };

    // Audit log
    await AuditLog.create({
      action: 'PAYROLL_MANUAL_EDIT',
      performedBy: new Types.ObjectId(adminUserId),
      targetUserId: new Types.ObjectId(userId),
      details: JSON.stringify({
        reason: input.reason,
        oldValues,
        newValues,
      }),
      ipAddress,
    });

    return line;
  }

  /**
   * Add a detailed adjustment (BONUS/DOCK/OTHER) to a payroll line.
   * Only allowed on DRAFT lines.
   */
  static async addAdjustment(
    runId: string,
    userId: string,
    input: AdjustmentInput,
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
      throw new AppError(
        'Cannot add adjustment to a FINAL payroll line. Revert to DRAFT first.',
        400
      );
    }

    const adjustment = {
      type: input.type,
      amount: input.amount,
      reason: input.reason,
      createdBy: new Types.ObjectId(adminUserId),
      createdAt: new Date(),
    };

    line.adjustments.push(adjustment);

    // Recompute finalPay
    const adjustmentsTotal = line.adjustments.reduce(
      (sum, a) => sum + a.amount,
      0
    );
    line.finalPay =
      Math.round(
        PayrollRunService.computeFinalPay(
          line.baseMonthlySalarySnapshot,
          line.workingDays,
          line.suggestedAbsentDays,
          line.unpaidDaysManual,
          line.dockManualTotal,
          line.bonusManualTotal,
          adjustmentsTotal
        ) * 100
      ) / 100;

    await line.save();

    // Audit log
    await AuditLog.create({
      action: 'PAYROLL_ADD_ADJUSTMENT',
      performedBy: new Types.ObjectId(adminUserId),
      targetUserId: new Types.ObjectId(userId),
      details: JSON.stringify({
        adjustment,
        newFinalPay: line.finalPay,
      }),
      ipAddress,
    });

    return line;
  }
}
