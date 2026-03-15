import { User, Attendance } from '../models';
import { AttendanceService } from './attendance.service';
import argon2 from 'argon2';

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
      .select('name email department profilePicture')
      .lean();
  }

  /** Soft-delete an employee by marking isActive = false */
  static async deleteEmployee(employeeId: string): Promise<void> {
    await User.updateOne({ _id: employeeId, role: 'employee' }, { $set: { isActive: false } });
  }

  /** Reset an employee's password to a new value */
  static async resetEmployeePassword(employeeId: string, newPassword: string): Promise<{ email: string }> {
    const user = await User.findOne({ _id: employeeId, role: 'employee', isActive: true });
    if (!user) throw Object.assign(new Error('Employee not found'), { statusCode: 404 });
    const hashed = await argon2.hash(newPassword);
    user.password = hashed;
    user.plaintextPassword = newPassword;
    await user.save();
    return { email: user.email };
  }

  /** Update an employee's salary */
  static async updateEmployeeSalary(
    employeeId: string,
    baseMonthlySalary: number,
    currency: string = 'PKR'
  ): Promise<{ name: string; baseMonthlySalary: number; currency: string }> {
    const user = await User.findOneAndUpdate(
      { _id: employeeId, role: 'employee', isActive: true },
      {
        $set: {
          baseMonthlySalary,
          currency,
          salaryEffectiveFrom: new Date(),
        },
      },
      { new: true }
    ).select('+baseMonthlySalary +currency');
    if (!user) throw Object.assign(new Error('Employee not found'), { statusCode: 404 });
    return {
      name: user.name,
      baseMonthlySalary: user.baseMonthlySalary || 0,
      currency: user.currency || 'PKR',
    };
  }

  /** Get employee salary info */
  static async getEmployeeSalary(employeeId: string): Promise<{
    baseMonthlySalary: number;
    currency: string;
    salaryEffectiveFrom: Date | null;
  }> {
    const user = await User.findOne({ _id: employeeId, role: 'employee', isActive: true })
      .select('+baseMonthlySalary +currency +salaryEffectiveFrom');
    if (!user) throw Object.assign(new Error('Employee not found'), { statusCode: 404 });
    return {
      baseMonthlySalary: user.baseMonthlySalary || 0,
      currency: user.currency || 'PKR',
      salaryEffectiveFrom: user.salaryEffectiveFrom || null,
    };
  }

  /** Get full employee profile (admin view) */
  static async getEmployeeProfile(employeeId: string): Promise<{
    _id: string;
    name: string;
    email: string;
    department: string;
    profilePicture?: string;
    baseMonthlySalary: number;
    currency: string;
    salaryEffectiveFrom: Date | null;
    plaintextPassword: string;
    createdAt: Date;
  }> {
    const user = await User.findOne({ _id: employeeId, role: 'employee', isActive: true })
      .select('+baseMonthlySalary +currency +salaryEffectiveFrom +profilePicture +plaintextPassword');
    if (!user) throw Object.assign(new Error('Employee not found'), { statusCode: 404 });
    return {
      _id: user._id.toString(),
      name: user.name,
      email: user.email,
      department: user.department,
      profilePicture: user.profilePicture,
      baseMonthlySalary: user.baseMonthlySalary || 0,
      currency: user.currency || 'PKR',
      salaryEffectiveFrom: user.salaryEffectiveFrom || null,
      plaintextPassword: user.plaintextPassword || '',
      createdAt: user.createdAt,
    };
  }

  /** Update employee profile (admin can update all fields) */
  static async updateEmployeeProfile(
    employeeId: string,
    updates: {
      name?: string;
      email?: string;
      department?: string;
      employeeType?: 'remote' | 'onsite';
      biometricUserId?: number;
      baseMonthlySalary?: number;
      currency?: string;
      profilePicture?: string;
      password?: string;
    }
  ): Promise<{ name: string; email: string }> {
    const updateData: any = {};
    if (updates.name) updateData.name = updates.name;
    if (updates.email) updateData.email = updates.email;
    if (updates.department) updateData.department = updates.department;
    if (updates.employeeType) updateData.employeeType = updates.employeeType;
    if (updates.biometricUserId !== undefined) updateData.biometricUserId = updates.biometricUserId;
    if (updates.profilePicture !== undefined) updateData.profilePicture = updates.profilePicture;
    if (updates.baseMonthlySalary !== undefined) {
      updateData.baseMonthlySalary = updates.baseMonthlySalary;
      updateData.currency = updates.currency || 'PKR';
      updateData.salaryEffectiveFrom = new Date();
    }
    if (updates.password && updates.password.length >= 6) {
      updateData.password = await argon2.hash(updates.password);
      updateData.plaintextPassword = updates.password;
    }

    const user = await User.findOneAndUpdate(
      { _id: employeeId, role: 'employee', isActive: true },
      { $set: updateData },
      { new: true }
    );
    if (!user) throw Object.assign(new Error('Employee not found'), { statusCode: 404 });
    return { name: user.name, email: user.email };
  }

  /** Get all onsite employees */
  static async getOnsiteEmployees(): Promise<any[]> {
    return User.find({ role: 'employee', employeeType: 'onsite', isActive: true })
      .select('name email department biometricUserId profilePicture')
      .lean();
  }

  /** Get onsite attendance records with filtering */
  static async getOnsiteAttendance(date?: string, employeeId?: string, department?: string): Promise<any[]> {
    const matchConditions: any = {
      source: 'biometric'
    };

    if (date) {
      matchConditions.date = date;
    }

    if (employeeId) {
      matchConditions.userId = employeeId;
    }

    const records = await Attendance.find(matchConditions)
      .populate('userId', 'name email department')
      .sort({ date: -1, createdAt: -1 })
      .lean();

    // Filter by department if specified
    if (department) {
      return records.filter(record => (record.userId as any)?.department === department);
    }

    return records;
  }

  /** Import onsite attendance from CSV */
  static async importOnsiteAttendanceCsv(buffer: Buffer, filename: string): Promise<{ imported: number; errors: string[] }> {
    const errors: string[] = [];
    let imported = 0;

    try {
      const csvContent = buffer.toString('utf-8');
      const lines = csvContent.split('\n').filter(line => line.trim());

      if (lines.length < 2) {
        throw new Error('CSV file must have at least a header row and one data row');
      }

      // Parse header
      const header = lines[0].split(',').map(h => h.trim().toLowerCase());

      // Expected columns
      const expectedColumns = ['employee_id', 'name', 'date', 'check_in', 'check_out', 'department'];
      const columnIndices: { [key: string]: number } = {};

      for (const col of expectedColumns) {
        const index = header.indexOf(col);
        if (index === -1) {
          throw new Error(`Missing required column: ${col}`);
        }
        columnIndices[col] = index;
      }

      // Process each data row
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        const columns = line.split(',').map(col => col.trim().replace(/"/g, ''));

        try {
          const employeeId = columns[columnIndices.employee_id];
          const name = columns[columnIndices.name];
          const date = columns[columnIndices.date];
          const checkIn = columns[columnIndices.check_in];
          const checkOut = columns[columnIndices.check_out];
          const department = columns[columnIndices.department];

          // Validate required fields
          if (!employeeId || !date) {
            errors.push(`Row ${i + 1}: Missing employee ID or date`);
            continue;
          }

          // Find user by employee ID (assuming employeeId is stored in _id or we need to map it)
          const user = await User.findOne({
            $or: [
              { _id: employeeId },
              { email: employeeId }
            ],
            employeeType: 'onsite',
            isActive: true
          });

          if (!user) {
            errors.push(`Row ${i + 1}: Employee not found - ${employeeId}`);
            continue;
          }

          // Parse times
          let punchIn: Date | null = null;
          let punchOut: Date | null = null;

          if (checkIn && checkIn !== '') {
            const [hours, minutes] = checkIn.split(':');
            punchIn = new Date(date);
            punchIn.setHours(parseInt(hours), parseInt(minutes), 0, 0);
          }

          if (checkOut && checkOut !== '') {
            const [hours, minutes] = checkOut.split(':');
            punchOut = new Date(date);
            punchOut.setHours(parseInt(hours), parseInt(minutes), 0, 0);
          }

          // Create or update attendance record
          const attendanceData: any = {
            userId: user._id,
            date,
            source: 'biometric',
            status: punchIn ? 'present' : 'absent'
          };

          if (punchIn) attendanceData.punchIn = punchIn;
          if (punchOut) attendanceData.punchOut = punchOut;

          // Calculate work minutes if both times exist
          if (punchIn && punchOut) {
            const workMs = punchOut.getTime() - punchIn.getTime();
            attendanceData.totalWorkMinutes = Math.floor(workMs / (1000 * 60));
          }

          await Attendance.findOneAndUpdate(
            { userId: user._id, date },
            attendanceData,
            { upsert: true, new: true, setDefaultsOnInsert: true }
          );

          imported++;

        } catch (rowError: any) {
          errors.push(`Row ${i + 1}: ${rowError.message}`);
        }
      }

    } catch (error: any) {
      errors.push(`File processing error: ${error.message}`);
    }

    return { imported, errors };
  }

  /** Update profile picture */
  static async updateProfilePicture(userId: string, profilePicture: string): Promise<void> {
    const result = await User.updateOne(
      { _id: userId, isActive: true },
      { $set: { profilePicture } }
    );
    if (result.matchedCount === 0) {
      throw Object.assign(new Error('User not found'), { statusCode: 404 });
    }
  }
}
