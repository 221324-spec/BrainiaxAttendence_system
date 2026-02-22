import { User, Attendance } from '../models';
import { AttendanceService } from './attendance.service';

export class AdminService {
  /**
   * Get dashboard statistics
   */
  static async getDashboardStats(): Promise<{
    totalEmployees: number;
    presentToday: number;
    absentToday: number;
    attendancePercentage: number;
  }> {
    const today = AttendanceService.getTodayString();

    const totalEmployees = await User.countDocuments({
      role: 'employee',
      isActive: true,
    });

    // Only count attendance for employees that still exist
    const activeEmployeeIds = await User.find({ role: 'employee', isActive: true }).distinct('_id');
    const presentToday = await Attendance.countDocuments({
      date: today,
      userId: { $in: activeEmployeeIds },
      status: { $in: ['present', 'half-day'] },
    });

    const absentToday = totalEmployees - presentToday;
    const attendancePercentage =
      totalEmployees > 0
        ? Math.round((presentToday / totalEmployees) * 10000) / 100
        : 0;

    return {
      totalEmployees,
      presentToday,
      absentToday,
      attendancePercentage,
    };
  }

  /**
   * Get all employees with their today's attendance status
   */
  static async getEmployeesWithStatus(): Promise<any[]> {
    const today = AttendanceService.getTodayString();

    const employees = await User.find({ role: 'employee', isActive: true })
      .select('name email department')
      .lean();

    const todayAttendance = await Attendance.find({ date: today }).lean();
    const attendanceMap = new Map(
      todayAttendance.map((a) => [a.userId.toString(), a])
    );

    return employees.map((emp) => ({
      ...emp,
      todayAttendance: attendanceMap.get(emp._id.toString()) || null,
    }));
  }

  /**
   * Get list of all employees (for CSV export selector)
   */
  static async getAllEmployees(): Promise<any[]> {
    return User.find({ role: 'employee', isActive: true })
      .select('name email department')
      .lean();
  }

  /** Soft-delete an employee by marking isActive = false */
  static async deleteEmployee(employeeId: string): Promise<void> {
    await User.updateOne({ _id: employeeId, role: 'employee' }, { $set: { isActive: false } });
  }
}
