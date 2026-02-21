
import { Attendance, IAttendance } from '../models';
import { AppError } from '../middleware';

export class AttendanceService {
  /**
   * Admin: Create or update an attendance record for any user/date.
   * Accepts all fields. Returns the upserted record.
   */
  static async adminUpsertRecord(
    userId: string,
    date: string,
    data: Partial<Omit<IAttendance, '_id' | 'userId' | 'date' | 'createdAt' | 'updatedAt'>>
  ): Promise<IAttendance> {
    // Validate date
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      throw new AppError('Date must be in YYYY-MM-DD format', 400);
    }
    // Upsert (create if not exists, update if exists)
    const record = await Attendance.findOneAndUpdate(
      { userId, date },
      { $set: { ...data } },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );
    return record as IAttendance;
  }
  /**
   * Get today's date string in YYYY-MM-DD format
   */
  static getTodayString(): string {
    const now = new Date();
    return now.toISOString().split('T')[0];
  }

  /**
   * Calculate total break minutes from the breaks array
   */
  private static calcBreakMinutes(breaks: { start: Date; end: Date | null }[]): number {
    return breaks.reduce((sum, b) => {
      if (!b.end) return sum; // open break — not counted yet
      return sum + Math.round((new Date(b.end).getTime() - new Date(b.start).getTime()) / 60000);
    }, 0);
  }

  /**
   * Punch in for today. Only allowed once per day.
   */
  static async punchIn(userId: string): Promise<IAttendance> {
    const today = AttendanceService.getTodayString();

    const existing = await Attendance.findOne({ userId, date: today });
    if (existing) {
      throw new AppError('Already punched in today', 400);
    }

    const attendance = await Attendance.create({
      userId,
      date: today,
      punchIn: new Date(),
      status: 'present',
    });

    return attendance;
  }

  /**
   * Punch out for today. Calculates net work time = shift time − break time.
   */
  static async punchOut(userId: string): Promise<IAttendance> {
    const today = AttendanceService.getTodayString();

    const attendance = await Attendance.findOne({ userId, date: today });
    if (!attendance) {
      throw new AppError('Must punch in before punching out', 400);
    }
    if (attendance.punchOut) {
      throw new AppError('Already punched out today', 400);
    }
    if (!attendance.punchIn) {
      throw new AppError('No punch-in record found', 400);
    }
    if (attendance.isOnBreak) {
      throw new AppError('End your break before punching out', 400);
    }

    const punchOutTime = new Date();
    const punchInTime = new Date(attendance.punchIn);
    const shiftMinutes = Math.round(
      (punchOutTime.getTime() - punchInTime.getTime()) / 60000
    );

    const totalBreakMinutes = AttendanceService.calcBreakMinutes(attendance.breaks);
    const totalWorkMinutes = Math.max(0, shiftMinutes - totalBreakMinutes);

    const hoursWorked = totalWorkMinutes / 60;
    let status: 'present' | 'half-day' = 'present';
    if (hoursWorked < 4) {
      status = 'half-day';
    }

    attendance.punchOut = punchOutTime;
    attendance.totalBreakMinutes = totalBreakMinutes;
    attendance.totalWorkMinutes = totalWorkMinutes;
    attendance.status = status;
    await attendance.save();

    return attendance;
  }

  /**
   * Start a break. Employee must be punched in and not already on break.
   */
  static async startBreak(userId: string): Promise<IAttendance> {
    const today = AttendanceService.getTodayString();

    const attendance = await Attendance.findOne({ userId, date: today });
    if (!attendance || !attendance.punchIn) {
      throw new AppError('Must punch in before starting a break', 400);
    }
    if (attendance.punchOut) {
      throw new AppError('Cannot start a break after punching out', 400);
    }
    if (attendance.isOnBreak) {
      throw new AppError('Already on a break', 400);
    }

    attendance.breaks.push({ start: new Date(), end: null });
    attendance.isOnBreak = true;
    await attendance.save();

    return attendance;
  }

  /**
   * End the current break.
   */
  static async endBreak(userId: string): Promise<IAttendance> {
    const today = AttendanceService.getTodayString();

    const attendance = await Attendance.findOne({ userId, date: today });
    if (!attendance) {
      throw new AppError('No attendance record found', 400);
    }
    if (!attendance.isOnBreak) {
      throw new AppError('Not currently on a break', 400);
    }

    // Close the last open break
    const openBreak = attendance.breaks[attendance.breaks.length - 1];
    if (openBreak) {
      openBreak.end = new Date();
    }

    attendance.isOnBreak = false;
    attendance.totalBreakMinutes = AttendanceService.calcBreakMinutes(attendance.breaks);
    await attendance.save();

    return attendance;
  }

  /**
   * Get today's attendance status for a user
   */
  static async getTodayStatus(userId: string): Promise<IAttendance | null> {
    const today = AttendanceService.getTodayString();
    return Attendance.findOne({ userId, date: today });
  }

  /**
   * Get attendance history for a user in a given month
   */
  static async getMonthlyHistory(
    userId: string,
    year: number,
    month: number
  ): Promise<IAttendance[]> {
    const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
    const endMonth = month === 12 ? 1 : month + 1;
    const endYear = month === 12 ? year + 1 : year;
    const endDate = `${endYear}-${String(endMonth).padStart(2, '0')}-01`;

    return Attendance.find({
      userId,
      date: { $gte: startDate, $lt: endDate },
    }).sort({ date: -1 });
  }

  /**
   * Get attendance history for a user between two dates (inclusive)
   */
  static async getDateRangeHistory(
    userId: string,
    startDate: string,
    endDate: string
  ): Promise<IAttendance[]> {
    return Attendance.find({
      userId,
      date: { $gte: startDate, $lte: endDate },
    }).sort({ date: 1 });
  }

  /**
   * Get monthly summary for an employee
   */
  static async getMonthlySummary(
    userId: string,
    year: number,
    month: number
  ): Promise<{
    totalDays: number;
    presentDays: number;
    absentDays: number;
    halfDays: number;
    totalWorkHours: number;
    totalBreakHours: number;
    averageWorkHours: number;
  }> {
    const records = await AttendanceService.getMonthlyHistory(userId, year, month);

    const presentDays = records.filter((r) => r.status === 'present').length;
    const absentDays = records.filter((r) => r.status === 'absent').length;
    const halfDays = records.filter((r) => r.status === 'half-day').length;
    const totalWorkMinutes = records.reduce((sum, r) => sum + r.totalWorkMinutes, 0);
    const totalBreakMinutes = records.reduce((sum, r) => sum + (r.totalBreakMinutes || 0), 0);
    const totalWorkHours = Math.round((totalWorkMinutes / 60) * 100) / 100;
    const totalBreakHours = Math.round((totalBreakMinutes / 60) * 100) / 100;
    const workedDays = presentDays + halfDays;
    const averageWorkHours =
      workedDays > 0 ? Math.round((totalWorkHours / workedDays) * 100) / 100 : 0;

    return {
      totalDays: records.length,
      presentDays,
      absentDays,
      halfDays,
      totalWorkHours,
      totalBreakHours,
      averageWorkHours,
    };
  }
}
