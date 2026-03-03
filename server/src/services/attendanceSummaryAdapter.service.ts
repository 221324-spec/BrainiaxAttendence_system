import { AttendanceService } from './attendance.service';
import { getCompanyPolicy } from '../models';

export interface EmployeeMonthlySummary {
  presentDays: number;
  halfDays: number;
  absentDays: number;
  suggestedAbsentDays: number;
  totalNetMinutes: number;
  totalBreakMinutes: number;
  totalDays: number;
}

/**
 * Thin adapter that reads from the existing AttendanceService.getMonthlySummary
 * and maps it into the format needed by the payroll module.
 */
export class AttendanceSummaryAdapterService {
  /**
   * Get an employee's monthly attendance summary in payroll-friendly format.
   * Reuses existing AttendanceService — NO redesign of attendance logic.
   */
  static async getEmployeeMonthlySummary(
    userId: string,
    month: number,
    year: number
  ): Promise<EmployeeMonthlySummary> {
    const summary = await AttendanceService.getMonthlySummary(userId, year, month);
    const policy = await getCompanyPolicy();

    // suggestedAbsentDays: days the system thinks are absent
    // = working days in month - presentDays - halfDays
    const workingDays = AttendanceSummaryAdapterService.getWorkingDaysInMonth(
      year,
      month,
      policy.weeklyOffDay
    );

    // From the existing summary, absentDays already means records with status "absent"
    // But we also need to account for days with no record at all (not in totalDays)
    const suggestedAbsentDays = Math.max(
      0,
      workingDays - summary.presentDays - summary.halfDays
    );

    return {
      presentDays: summary.presentDays,
      halfDays: summary.halfDays,
      absentDays: summary.absentDays,
      suggestedAbsentDays,
      totalNetMinutes: Math.round(summary.totalWorkHours * 60),
      totalBreakMinutes: Math.round(summary.totalBreakHours * 60),
      totalDays: summary.totalDays,
    };
  }

  /**
   * Batch: get summaries for multiple employees at once to avoid N+1.
   */
  static async getBatchMonthlySummaries(
    userIds: string[],
    month: number,
    year: number
  ): Promise<Map<string, EmployeeMonthlySummary>> {
    const result = new Map<string, EmployeeMonthlySummary>();
    // Use Promise.all for concurrent reads (each is a single aggregation)
    const summaries = await Promise.all(
      userIds.map(async (uid) => ({
        uid,
        summary: await AttendanceSummaryAdapterService.getEmployeeMonthlySummary(
          uid,
          month,
          year
        ),
      }))
    );
    for (const { uid, summary } of summaries) {
      result.set(uid, summary);
    }
    return result;
  }

  /**
   * Calculate number of working days in a month excluding the weekly off day.
   */
  static getWorkingDaysInMonth(
    year: number,
    month: number,
    weeklyOffDay: number
  ): number {
    const daysInMonth = new Date(year, month, 0).getDate();
    let workingDays = 0;
    for (let d = 1; d <= daysInMonth; d++) {
      const dayOfWeek = new Date(year, month - 1, d).getDay();
      if (dayOfWeek !== weeklyOffDay) {
        workingDays++;
      }
    }
    return workingDays;
  }
}
