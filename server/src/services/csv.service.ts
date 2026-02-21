import { stringify } from 'csv-stringify/sync';
import { User, Attendance, AuditLog } from '../models';
import { AttendanceService } from './attendance.service';
import { AppError } from '../middleware';
import { Types } from 'mongoose';

export class CsvService {
  /**
   * Sanitize a cell value to prevent CSV injection attacks.
   */
  private static sanitizeCell(value: string): string {
    if (/^[=+\-@\t\r]/.test(value)) {
      return `'${value}`;
    }
    return value;
  }

  /**
   * Format minutes to HH:MM string
   */
  private static formatHours(minutes: number): string {
    const hrs = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hrs}h ${mins}m`;
  }

  /**
   * Format a Date to a nice time string
   */
  private static formatTime(date: Date | null): string {
    if (!date) return '-';
    return new Date(date).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  }

  /**
   * Generate all dates between start and end (inclusive) as YYYY-MM-DD strings
   */
  private static getDateRange(startDate: string, endDate: string): string[] {
    const dates: string[] = [];
    const current = new Date(startDate + 'T00:00:00');
    const end = new Date(endDate + 'T00:00:00');
    while (current <= end) {
      dates.push(current.toISOString().slice(0, 10));
      current.setDate(current.getDate() + 1);
    }
    return dates;
  }

  /**
   * Export attendance data for a specific employee for a given date range.
   * Includes every day (present, half-day, or absent) in the range.
   */
  static async exportEmployeeAttendance(
    employeeId: string,
    startDate: string,
    endDate: string,
    adminUserId: string,
    ipAddress: string
  ): Promise<{ csv: string; filename: string }> {
    const employee = await User.findById(employeeId).select('name email');
    if (!employee) {
      throw new AppError('Employee not found', 404);
    }

    // Validate dates
    if (!startDate || !endDate) {
      throw new AppError('Start date and end date are required', 400);
    }
    if (startDate > endDate) {
      throw new AppError('Start date must be before or equal to end date', 400);
    }

    // Fetch attendance records in the range
    const records = await AttendanceService.getDateRangeHistory(
      employeeId,
      startDate,
      endDate
    );

    // Build a map of date -> record for quick lookup
    const recordMap = new Map<string, typeof records[0]>();
    for (const r of records) {
      recordMap.set(r.date, r);
    }

    // Generate all days in the range and build rows
    const allDates = CsvService.getDateRange(startDate, endDate);
    const rows = allDates.map((dateStr) => {
      const record = recordMap.get(dateStr);
      const dayName = new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short' });

      if (record) {
        return [
          CsvService.sanitizeCell(dateStr),
          CsvService.sanitizeCell(dayName),
          CsvService.sanitizeCell(CsvService.formatTime(record.punchIn)),
          CsvService.sanitizeCell(CsvService.formatTime(record.punchOut)),
          CsvService.sanitizeCell(CsvService.formatHours(record.totalBreakMinutes || 0)),
          CsvService.sanitizeCell(CsvService.formatHours(record.totalWorkMinutes)),
          CsvService.sanitizeCell(record.status.charAt(0).toUpperCase() + record.status.slice(1)),
        ];
      } else {
        // No record → Absent
        return [
          CsvService.sanitizeCell(dateStr),
          CsvService.sanitizeCell(dayName),
          '-',
          '-',
          '-',
          '-',
          'Absent',
        ];
      }
    });

    // Summary stats
    const presentCount = rows.filter((r) => r[6] === 'Present').length;
    const halfDayCount = rows.filter((r) => r[6] === 'Half-day').length;
    const absentCount = rows.filter((r) => r[6] === 'Absent').length;

    // Add blank row + summary rows at the bottom
    rows.push(['', '', '', '', '', '', '']);
    rows.push(['SUMMARY', '', '', '', '', '', '']);
    rows.push(['Total Days', String(allDates.length), '', '', '', '', '']);
    rows.push(['Present', String(presentCount), '', '', '', '', '']);
    rows.push(['Half Days', String(halfDayCount), '', '', '', '', '']);
    rows.push(['Absent', String(absentCount), '', '', '', '', '']);
    rows.push(['Employee', employee.name, '', '', '', '', '']);
    rows.push(['Period', `${startDate} to ${endDate}`, '', '', '', '', '']);

    const csv = stringify(rows, {
      header: true,
      columns: ['Date', 'Day', 'Punch In', 'Punch Out', 'Break Time', 'Worked Hours', 'Status'],
    });

    // Generate filename
    const safeName = employee.name.replace(/[^a-zA-Z0-9]/g, '_');
    const safeStart = startDate.replace(/-/g, '');
    const safeEnd = endDate.replace(/-/g, '');
    const filename = `${safeName}_${safeStart}_to_${safeEnd}.csv`;

    // Log export in AuditLog
    await AuditLog.create({
      action: 'CSV_EXPORT',
      performedBy: new Types.ObjectId(adminUserId),
      targetUserId: new Types.ObjectId(employeeId),
      details: `Exported attendance for ${employee.name} (${startDate} to ${endDate})`,
      ipAddress,
    });

    return { csv, filename };
  }
}
