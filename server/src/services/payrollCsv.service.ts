import { stringify } from 'csv-stringify/sync';
import { Types } from 'mongoose';
import { PayrollEmployeeLine, PayrollRun, AuditLog } from '../models';
import { AppError } from '../middleware';

export class PayrollCsvService {
  /**
   * Sanitize a cell value to prevent CSV injection.
   */
  private static sanitizeCell(value: string): string {
    if (/^[=+\-@\t\r]/.test(value)) {
      return `'${value}`;
    }
    return value;
  }

  /**
   * Export payroll lines for a run as CSV.
   */
  static async exportPayrollCsv(
    runId: string,
    adminUserId: string,
    ipAddress: string
  ): Promise<{ csv: string; filename: string }> {
    const run = await PayrollRun.findById(runId);
    if (!run) {
      throw new AppError('Payroll run not found', 404);
    }

    const lines = await PayrollEmployeeLine.find({ payrollRunId: run._id })
      .populate('userId', 'name email department')
      .sort({ 'userId.name': 1 })
      .lean();

    const rows = lines.map((line: any) => {
      const emp = line.userId;
      const adjustmentsTotal = (line.adjustments || []).reduce(
        (sum: number, a: any) => sum + a.amount,
        0
      );

      return [
        PayrollCsvService.sanitizeCell(emp?.name || 'Unknown'),
        PayrollCsvService.sanitizeCell(emp?.email || ''),
        PayrollCsvService.sanitizeCell(emp?.department || ''),
        String(line.baseMonthlySalarySnapshot),
        String(line.workingDays),
        String(line.presentDays),
        String(line.suggestedAbsentDays),
        String(line.calculatedPaySuggestion),
        String(line.unpaidDaysManual),
        String(line.dockManualTotal),
        String(line.bonusManualTotal),
        String(adjustmentsTotal),
        String(line.finalPay),
        line.status,
        PayrollCsvService.sanitizeCell(line.manualNotes || ''),
      ];
    });

    const csv = stringify(rows, {
      header: true,
      columns: [
        'Employee Name',
        'Email',
        'Department',
        'Base Salary',
        'Working Days',
        'Present Days',
        'Suggested Absent Days',
        'Suggested Pay',
        'Unpaid Days (Manual)',
        'Dock (Manual)',
        'Bonus (Manual)',
        'Adjustments Total',
        'Final Pay',
        'Status',
        'Notes',
      ],
    });

    const filename = `Payroll_${run.month}_${run.year}.csv`;

    // Audit log
    await AuditLog.create({
      action: 'PAYROLL_CSV_EXPORT',
      performedBy: new Types.ObjectId(adminUserId),
      targetUserId: null,
      details: `Exported payroll CSV for ${run.month}/${run.year}`,
      ipAddress,
    });

    return { csv, filename };
  }
}
