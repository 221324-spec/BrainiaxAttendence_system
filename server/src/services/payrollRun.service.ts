import { Types } from 'mongoose';
import {
  User,
  PayrollRun,
  PayrollEmployeeLine,
  AuditLog,
  getCompanyPolicy,
} from '../models';
import { AttendanceSummaryAdapterService } from './attendanceSummaryAdapter.service';
import { AppError } from '../middleware';

export class PayrollRunService {
  /**
   * Generate a new payroll run for a given month/year.
   * Creates PayrollEmployeeLine (DRAFT) for every active employee.
   */
  static async generate(
    month: number,
    year: number,
    adminUserId: string,
    ipAddress: string
  ): Promise<{ run: any; lineCount: number }> {
    // Prevent duplicate
    const existing = await PayrollRun.findOne({ month, year });
    if (existing) {
      throw new AppError(
        `Payroll run already exists for ${month}/${year}. Use recalculate instead.`,
        409
      );
    }

    const policy = await getCompanyPolicy();
    const workingDays = AttendanceSummaryAdapterService.getWorkingDaysInMonth(
      year,
      month,
      policy.weeklyOffDay
    );

    // Create the run
    const run = await PayrollRun.create({
      month,
      year,
      status: 'OPEN',
      workingDaysInMonth: workingDays,
      generatedAt: new Date(),
      generatedBy: new Types.ObjectId(adminUserId),
    });

    // Get all active employees with salary fields
    const employees = await User.find({ role: 'employee', isActive: true })
      .select('+baseMonthlySalary +currency +salaryEffectiveFrom')
      .lean();

    const employeeIds = employees.map((e) => e._id.toString());

    // Batch fetch attendance summaries
    const summaries = await AttendanceSummaryAdapterService.getBatchMonthlySummaries(
      employeeIds,
      month,
      year
    );

    // Prepare bulk insert
    const bulkOps = employees.map((emp) => {
      const summary = summaries.get(emp._id.toString());
      const baseSalary = emp.baseMonthlySalary ?? 0;
      const dailyRate = workingDays > 0 ? baseSalary / workingDays : 0;
      const presentDays = summary?.presentDays ?? 0;
      const halfDays = summary?.halfDays ?? 0;
      const suggestedAbsentDays = summary?.suggestedAbsentDays ?? 0;
      const totalNetMinutes = summary?.totalNetMinutes ?? 0;
      const totalBreakMinutes = summary?.totalBreakMinutes ?? 0;

      // System suggestion: deduct for absent days only
      const calculatedPaySuggestion = Math.max(
        0,
        baseSalary - dailyRate * suggestedAbsentDays
      );

      return {
        payrollRunId: run._id,
        userId: emp._id,
        status: 'DRAFT' as const,
        baseMonthlySalarySnapshot: baseSalary,
        workingDays,
        presentDays: presentDays + halfDays, // combined for payroll
        suggestedAbsentDays,
        totalNetMinutes,
        totalBreakMinutes,
        calculatedPaySuggestion: Math.round(calculatedPaySuggestion * 100) / 100,
        // HR manual defaults
        unpaidDaysManual: 0,
        dockManualTotal: 0,
        bonusManualTotal: 0,
        manualNotes: '',
        adjustments: [],
        // Initially finalPay = suggested pay based on attendance (system-calculated)
        finalPay: Math.round(calculatedPaySuggestion * 100) / 100,
      };
    });

    if (bulkOps.length > 0) {
      await PayrollEmployeeLine.insertMany(bulkOps, { ordered: false });
    }

    // Store pre-aggregated totals on the run
    await PayrollRunService.refreshRunAggregates(run._id.toString());

    // Audit log
    await AuditLog.create({
      action: 'PAYROLL_GENERATE',
      performedBy: new Types.ObjectId(adminUserId),
      targetUserId: null,
      details: `Generated payroll run for ${month}/${year} with ${bulkOps.length} employee lines`,
      ipAddress,
    });

    return { run, lineCount: bulkOps.length };
  }

  /**
   * Recalculate system metrics for an existing payroll run.
   * - Updates SYSTEM fields only on DRAFT lines.
   * - FINAL lines: system metrics are updated but HR manual fields & finalPay are NOT touched.
   */
  static async recalculate(
    runId: string,
    adminUserId: string,
    ipAddress: string
  ): Promise<{ updatedDraft: number; skippedFinal: number }> {
    const run = await PayrollRun.findById(runId);
    if (!run) {
      throw new AppError('Payroll run not found', 404);
    }

    const policy = await getCompanyPolicy();
    // Use the stored workingDaysInMonth from the run (admin may have overridden)
    const workingDays = run.workingDaysInMonth;

    const lines = await PayrollEmployeeLine.find({ payrollRunId: run._id });
    const userIds = lines.map((l) => l.userId.toString());

    // Batch fetch updated attendance summaries
    const summaries = await AttendanceSummaryAdapterService.getBatchMonthlySummaries(
      userIds,
      run.month,
      run.year
    );

    // Batch fetch latest salaries from User model so DRAFT lines pick up salary changes
    const users = await User.find({ _id: { $in: userIds } })
      .select('+baseMonthlySalary')
      .lean();
    const userSalaryMap = new Map<string, number>();
    for (const u of users) {
      userSalaryMap.set(u._id.toString(), (u as any).baseMonthlySalary ?? 0);
    }

    let updatedDraft = 0;
    let skippedFinal = 0;
    const bulkOps: any[] = [];

    for (const line of lines) {
      const summary = summaries.get(line.userId.toString());
      const presentDays = (summary?.presentDays ?? 0) + (summary?.halfDays ?? 0);
      // Recalculate suggestedAbsentDays based on run's workingDaysInMonth, not policy
      const suggestedAbsentDays = Math.max(0, workingDays - presentDays);
      const totalNetMinutes = summary?.totalNetMinutes ?? 0;
      const totalBreakMinutes = summary?.totalBreakMinutes ?? 0;

      // For DRAFT lines, refresh the salary snapshot from the User model
      const currentBaseSalary = line.status === 'DRAFT'
        ? (userSalaryMap.get(line.userId.toString()) ?? line.baseMonthlySalarySnapshot)
        : line.baseMonthlySalarySnapshot;

      const dailyRate =
        workingDays > 0 ? currentBaseSalary / workingDays : 0;
      const calculatedPaySuggestion = Math.max(
        0,
        currentBaseSalary - dailyRate * suggestedAbsentDays
      );

      if (line.status === 'DRAFT') {
        // For DRAFT: recalc finalPay too based on current manual fields
        const adjustmentsTotal = (line.adjustments || []).reduce(
          (sum, a) => sum + a.amount,
          0
        );
        const finalPay = PayrollRunService.computeFinalPay(
          currentBaseSalary,
          workingDays,
          suggestedAbsentDays,
          line.unpaidDaysManual,
          line.dockManualTotal,
          line.bonusManualTotal,
          adjustmentsTotal
        );

        bulkOps.push({
          updateOne: {
            filter: { _id: line._id },
            update: {
              $set: {
                baseMonthlySalarySnapshot: currentBaseSalary,
                workingDays,
                presentDays,
                suggestedAbsentDays,
                totalNetMinutes,
                totalBreakMinutes,
                calculatedPaySuggestion: Math.round(calculatedPaySuggestion * 100) / 100,
                finalPay: Math.round(finalPay * 100) / 100,
              },
            },
          },
        });
        updatedDraft++;
      } else {
        // FINAL: update system metrics only, do NOT touch manual fields or finalPay
        bulkOps.push({
          updateOne: {
            filter: { _id: line._id },
            update: {
              $set: {
                workingDays,
                presentDays,
                suggestedAbsentDays,
                totalNetMinutes,
                totalBreakMinutes,
                calculatedPaySuggestion: Math.round(calculatedPaySuggestion * 100) / 100,
              },
            },
          },
        });
        skippedFinal++;
      }
    }

    if (bulkOps.length > 0) {
      await PayrollEmployeeLine.bulkWrite(bulkOps);
    }

    // Refresh pre-aggregated totals on the run
    await PayrollRunService.refreshRunAggregates(run._id.toString());

    // Update run metadata
    run.lastRecalculatedAt = new Date();
    run.lastRecalculatedBy = new Types.ObjectId(adminUserId);
    await run.save();

    // Audit log
    await AuditLog.create({
      action: 'PAYROLL_RECALCULATE',
      performedBy: new Types.ObjectId(adminUserId),
      targetUserId: null,
      details: `Recalculated payroll run ${run.month}/${run.year}: ${updatedDraft} DRAFT updated, ${skippedFinal} FINAL skipped`,
      ipAddress,
    });

    return { updatedDraft, skippedFinal };
  }

  /**
   * Get a payroll run by ID with summary stats.
   */
  static async getRunById(runId: string) {
    const run = await PayrollRun.findById(runId)
      .populate('generatedBy', 'name email')
      .populate('lastRecalculatedBy', 'name email');
    if (!run) {
      throw new AppError('Payroll run not found', 404);
    }

    const totalLines = await PayrollEmployeeLine.countDocuments({
      payrollRunId: run._id,
    });
    const draftLines = await PayrollEmployeeLine.countDocuments({
      payrollRunId: run._id,
      status: 'DRAFT',
    });
    const finalLines = await PayrollEmployeeLine.countDocuments({
      payrollRunId: run._id,
      status: 'FINAL',
    });

    return {
      run,
      summary: { totalLines, draftLines, finalLines },
    };
  }

  /**
   * Get payroll lines for a run, optionally filtered by status.
   */
  static async getRunLines(
    runId: string,
    statusFilter?: string
  ) {
    const query: any = { payrollRunId: runId };
    if (statusFilter && ['DRAFT', 'FINAL'].includes(statusFilter)) {
      query.status = statusFilter;
    }

    return PayrollEmployeeLine.find(query)
      .populate('userId', 'name email department')
      .sort({ 'userId.name': 1 });
  }

  /**
   * List all payroll runs (for dashboard).
   */
  static async listRuns() {
    return PayrollRun.find()
      .populate('generatedBy', 'name email')
      .sort({ year: -1, month: -1 });
  }

  /**
   * Compute final pay from components.
   * Deducts for both system-suggested absent days AND manual unpaid days.
   */
  static computeFinalPay(
    baseSalary: number,
    workingDays: number,
    suggestedAbsentDays: number,
    unpaidDaysManual: number,
    dockManualTotal: number,
    bonusManualTotal: number,
    adjustmentsTotal: number
  ): number {
    const dailyRate = workingDays > 0 ? baseSalary / workingDays : 0;
    // Total absent deduction = system absent + manual unpaid (capped at working days)
    const totalAbsentDays = Math.min(suggestedAbsentDays + unpaidDaysManual, workingDays);
    return Math.max(
      0,
      baseSalary -
      dailyRate * totalAbsentDays -
      dockManualTotal +
      bonusManualTotal +
      adjustmentsTotal
    );
  }

  /**
   * Refresh pre-aggregated totals stored on a PayrollRun document.
   * Called after generate and recalculate.
   */
  static async refreshRunAggregates(runId: string) {
    const agg = await PayrollEmployeeLine.aggregate([
      { $match: { payrollRunId: new Types.ObjectId(runId) } },
      {
        $group: {
          _id: null,
          totalPaid: { $sum: '$finalPay' },
          totalBase: { $sum: '$baseMonthlySalarySnapshot' },
          totalBonus: { $sum: '$bonusManualTotal' },
          totalDock: { $sum: '$dockManualTotal' },
          headcount: { $sum: 1 },
        },
      },
    ]);

    const row = agg[0] || { totalPaid: 0, totalBase: 0, totalBonus: 0, totalDock: 0, headcount: 0 };
    await PayrollRun.findByIdAndUpdate(runId, {
      $set: {
        aggTotalPaid: Math.round(row.totalPaid * 100) / 100,
        aggTotalBase: Math.round(row.totalBase * 100) / 100,
        aggTotalBonus: Math.round(row.totalBonus * 100) / 100,
        aggTotalDock: Math.round(row.totalDock * 100) / 100,
        aggHeadcount: row.headcount,
      },
    });
  }

  /**
   * Payroll overview — aggregated stats for dashboard visualisation.
   * Returns monthly payout trend, department breakdown, headline figures,
   * and latest-run budget breakdown for the Spend vs Budget chart.
   */
  static async getPayrollOverview(months: number = 6) {
    const MONTH_NAMES = [
      '', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
    ];

    // Fetch runs sorted ascending; limit to last N
    const allRuns = await PayrollRun.find().sort({ year: 1, month: 1 }).lean();
    const runs = allRuns.slice(-months);

    // ── Monthly trend from stored aggregates ──
    // For runs that have stored aggregates, use them directly.
    // For legacy runs without aggregates, fall back to line-level aggregation.
    const monthlyTrend: {
      month: number;
      year: number;
      label: string;
      totalPayout: number;
      totalBase: number;
      totalBonus: number;
      totalDock: number;
      headcount: number;
      avgSalary: number;
    }[] = [];

    let grandTotalPayout = 0;
    let grandTotalBonus = 0;
    let grandTotalDock = 0;
    let grandTotalBase = 0;
    let grandEmployeeCount = 0;

    const departmentTotals: Record<string, number> = {};

    for (const run of runs) {
      const hasAgg = (run as any).aggHeadcount > 0 || (run as any).aggTotalPaid > 0 || (run as any).aggTotalBase > 0;

      let paid: number, base: number, bonus: number, dock: number, hc: number;

      if (hasAgg) {
        // Use stored aggregates — no PayrollEmployeeLine queries needed
        paid = (run as any).aggTotalPaid ?? 0;
        base = (run as any).aggTotalBase ?? 0;
        bonus = (run as any).aggTotalBonus ?? 0;
        dock = (run as any).aggTotalDock ?? 0;
        hc = (run as any).aggHeadcount ?? 0;
      } else {
        // Legacy fallback: aggregate from lines
        const lines = await PayrollEmployeeLine.find({ payrollRunId: run._id }).lean();
        paid = 0; base = 0; bonus = 0; dock = 0; hc = lines.length;
        for (const line of lines) {
          paid += line.finalPay || 0;
          bonus += line.bonusManualTotal || 0;
          dock += line.dockManualTotal || 0;
          base += line.baseMonthlySalarySnapshot || 0;
        }
      }

      // Department aggregation (still needed for Payout by Dept donut — uses latest run only)
      if (run === runs[runs.length - 1]) {
        const lines = await PayrollEmployeeLine.find({ payrollRunId: run._id })
          .populate('userId', 'department')
          .lean();
        for (const line of lines) {
          const user = line.userId as any;
          if (user && typeof user === 'object' && user.department) {
            departmentTotals[user.department] =
              (departmentTotals[user.department] || 0) + (line.finalPay || 0);
          }
        }
      }

      grandTotalPayout += paid;
      grandTotalBonus += bonus;
      grandTotalDock += dock;
      grandTotalBase += base;
      grandEmployeeCount += hc;

      monthlyTrend.push({
        month: run.month,
        year: run.year,
        label: `${MONTH_NAMES[run.month]} ${run.year}`,
        totalPayout: Math.round(paid * 100) / 100,
        totalBase: Math.round(base * 100) / 100,
        totalBonus: Math.round(bonus * 100) / 100,
        totalDock: Math.round(dock * 100) / 100,
        headcount: hc,
        avgSalary: hc > 0 ? Math.round((paid / hc) * 100) / 100 : 0,
      });
    }

    // Department breakdown sorted by total descending
    const departmentBreakdown = Object.entries(departmentTotals)
      .map(([name, total]) => ({ name, total: Math.round(total * 100) / 100 }))
      .sort((a, b) => b.total - a.total);

    // Latest run stats
    const latestRun = monthlyTrend.length > 0 ? monthlyTrend[monthlyTrend.length - 1] : null;

    // ── Latest-run budget breakdown for Spend vs Budget chart ──
    const lastEntry = monthlyTrend.length > 0 ? monthlyTrend[monthlyTrend.length - 1] : null;

    return {
      totalRuns: allRuns.length,
      latestRun,
      grandTotalPayout: Math.round(grandTotalPayout * 100) / 100,
      grandTotalBonus: Math.round(grandTotalBonus * 100) / 100,
      grandTotalDock: Math.round(grandTotalDock * 100) / 100,
      grandTotalBase: Math.round(grandTotalBase * 100) / 100,
      grandEmployeeCount,
      highestPay: 0,
      lowestPay: 0,
      monthlyTrend,
      departmentBreakdown,
      // Latest run spend-vs-budget
      latestRunBudget: {
        base: lastEntry?.totalBase ?? 0,
        paid: lastEntry?.totalPayout ?? 0,
        bonus: lastEntry?.totalBonus ?? 0,
        dock: lastEntry?.totalDock ?? 0,
        label: lastEntry?.label ?? '',
        lineCount: lastEntry?.headcount ?? 0,
      },
    };
  }

  /**
   * Update the working days for a payroll run and recalculate all lines.
   * This allows admin to override the auto-calculated working days.
   */
  static async updateWorkingDays(
    runId: string,
    workingDays: number,
    adminUserId: string,
    ipAddress: string
  ): Promise<{ run: any; updatedLines: number }> {
    const run = await PayrollRun.findById(runId);
    if (!run) {
      throw new AppError('Payroll run not found', 404);
    }

    if (workingDays < 1 || workingDays > 31) {
      throw new AppError('Working days must be between 1 and 31', 400);
    }

    const oldWorkingDays = run.workingDaysInMonth;
    run.workingDaysInMonth = workingDays;
    await run.save();

    // Recalculate all lines with new working days
    const lines = await PayrollEmployeeLine.find({ payrollRunId: run._id });
    let updatedLines = 0;

    for (const line of lines) {
      const baseSalary = line.baseMonthlySalarySnapshot;
      const dailyRate = workingDays > 0 ? baseSalary / workingDays : 0;
      
      // Recalculate suggestedAbsentDays based on new working days
      const suggestedAbsentDays = Math.max(0, workingDays - line.presentDays);
      
      const calculatedPaySuggestion = Math.max(
        0,
        baseSalary - dailyRate * suggestedAbsentDays
      );

      line.workingDays = workingDays;
      line.suggestedAbsentDays = suggestedAbsentDays;
      line.calculatedPaySuggestion = Math.round(calculatedPaySuggestion * 100) / 100;

      // Recalculate finalPay for DRAFT lines
      if (line.status === 'DRAFT') {
        const adjustmentsTotal = (line.adjustments || []).reduce(
          (sum, a) => sum + a.amount,
          0
        );
        line.finalPay = PayrollRunService.computeFinalPay(
          baseSalary,
          workingDays,
          suggestedAbsentDays,
          line.unpaidDaysManual,
          line.dockManualTotal,
          line.bonusManualTotal,
          adjustmentsTotal
        );
      }

      await line.save();
      updatedLines++;
    }

    // Refresh aggregates
    await PayrollRunService.refreshRunAggregates(runId);

    // Audit log
    await AuditLog.create({
      action: 'PAYROLL_UPDATE_WORKING_DAYS',
      performedBy: new Types.ObjectId(adminUserId),
      targetUserId: null,
      details: `Updated working days for ${run.month}/${run.year} from ${oldWorkingDays} to ${workingDays}. ${updatedLines} lines recalculated.`,
      ipAddress,
    });

    return { run, updatedLines };
  }

  /**
   * Delete a payroll run and all associated employee lines.
   * Only allows deletion if no lines are FINAL.
   */
  static async deleteRun(
    runId: string,
    adminUserId: string,
    ipAddress: string
  ): Promise<{ deletedLines: number }> {
    const run = await PayrollRun.findById(runId);
    if (!run) {
      throw new AppError('Payroll run not found', 404);
    }

    // Check if any lines are finalized
    const finalizedCount = await PayrollEmployeeLine.countDocuments({
      payrollRunId: run._id,
      status: 'FINAL',
    });

    if (finalizedCount > 0) {
      throw new AppError(
        `Cannot delete payroll run with ${finalizedCount} finalized line(s). Revert them first.`,
        400
      );
    }

    // Delete all associated lines
    const deleteResult = await PayrollEmployeeLine.deleteMany({
      payrollRunId: run._id,
    });

    // Delete the run
    await PayrollRun.findByIdAndDelete(runId);

    // Audit log
    await AuditLog.create({
      action: 'PAYROLL_RUN_DELETED',
      performedBy: new Types.ObjectId(adminUserId),
      targetUserId: null,
      details: `Deleted payroll run for ${run.month}/${run.year}. ${deleteResult.deletedCount} lines removed.`,
      ipAddress,
    });

    return { deletedLines: deleteResult.deletedCount };
  }
}
