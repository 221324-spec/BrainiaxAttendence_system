
import { Request, Response, NextFunction } from 'express';
import { AdminService, CsvService, AuthService, AttendanceService, BiometricService } from '../services';
import { User } from '../models';

export class AdminController {
  /**
   * Admin: Manually create or update an attendance record for any user/date.
   * Body: { punchIn, punchOut, breaks, totalBreakMinutes, totalWorkMinutes, status, isOnBreak }
   */
  static async adminUpsertAttendance(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { userId, date } = req.body;
      if (!userId || !date) {
        res.status(400).json({ message: 'userId and date are required' });
        return;
      }
      const allowedFields = [
        'punchIn', 'punchOut', 'breaks', 'totalBreakMinutes', 'totalWorkMinutes', 'status', 'isOnBreak'
      ];
      const data: any = {};
      for (const key of allowedFields) {
        if (req.body[key] !== undefined) data[key] = req.body[key];
      }
      const record = await AttendanceService.adminUpsertRecord(userId, date, data);
      res.json({ message: 'Attendance record updated', attendance: record });
    } catch (error) {
      next(error);
    }
  }
  static async getDashboardStats(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const stats = await AdminService.getDashboardStats();
      res.json(stats);
    } catch (error) {
      next(error);
    }
  }

  static async getEmployeesWithStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const employees = await AdminService.getEmployeesWithStatus();
      res.json({ employees });
    } catch (error) {
      next(error);
    }
  }

  static async getAllEmployees(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const employees = await AdminService.getAllEmployees();
      res.json({ employees });
    } catch (error) {
      next(error);
    }
  }

  static async createEmployee(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { name, email, password, department, baseMonthlySalary, currency } = req.body;
      const result = await AuthService.register({
        name,
        email,
        password,
        department,
        role: 'employee',
        baseMonthlySalary: baseMonthlySalary ? Number(baseMonthlySalary) : undefined,
        currency: currency || 'PKR',
      });
      res.status(201).json({ message: 'Employee created successfully', user: result.user });
    } catch (error) {
      next(error);
    }
  }

  static async exportCsv(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { employeeId } = req.params;
      const startDate = req.query.startDate as string;
      const endDate = req.query.endDate as string;

      const ipAddress =
        (req.headers['x-forwarded-for'] as string) ||
        req.socket.remoteAddress ||
        '';

      const { csv, filename } = await CsvService.exportEmployeeAttendance(
        employeeId,
        startDate,
        endDate,
        req.user!.userId,
        ipAddress
      );

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.send(csv);
    } catch (error) {
      next(error);
    }
  }

  static async deleteEmployee(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      if (!id) {
        res.status(400).json({ message: 'employee id is required' });
        return;
      }
      await AdminService.deleteEmployee(id);
      res.json({ message: 'Employee removed' });
    } catch (error) {
      next(error);
    }
  }

  static async resetEmployeePassword(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const { newPassword } = req.body;
      if (!id || !newPassword) {
        res.status(400).json({ message: 'Employee id and newPassword are required' });
        return;
      }
      if (newPassword.length < 6) {
        res.status(400).json({ message: 'Password must be at least 6 characters' });
        return;
      }
      const { email } = await AdminService.resetEmployeePassword(id, newPassword);
      res.json({ message: `Password reset successfully for ${email}` });
    } catch (error: any) {
      if (error.statusCode === 404) {
        res.status(404).json({ message: error.message });
        return;
      }
      next(error);
    }
  }

  static async updateEmployeeSalary(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const { baseMonthlySalary, currency } = req.body;
      if (!id || baseMonthlySalary === undefined) {
        res.status(400).json({ message: 'Employee id and baseMonthlySalary are required' });
        return;
      }
      const result = await AdminService.updateEmployeeSalary(id, Number(baseMonthlySalary), currency || 'PKR');
      res.json({ message: `Salary updated for ${result.name}`, salary: result });
    } catch (error: any) {
      if (error.statusCode === 404) {
        res.status(404).json({ message: error.message });
        return;
      }
      next(error);
    }
  }

  static async getEmployeeSalary(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      if (!id) {
        res.status(400).json({ message: 'Employee id is required' });
        return;
      }
      const salary = await AdminService.getEmployeeSalary(id);
      res.json({ salary });
    } catch (error: any) {
      if (error.statusCode === 404) {
        res.status(404).json({ message: error.message });
        return;
      }
      next(error);
    }
  }

  static async getEmployeeProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      if (!id) {
        res.status(400).json({ message: 'Employee id is required' });
        return;
      }
      const profile = await AdminService.getEmployeeProfile(id);
      res.json({ profile });
    } catch (error: any) {
      if (error.statusCode === 404) {
        res.status(404).json({ message: error.message });
        return;
      }
      next(error);
    }
  }

  static async updateEmployeeProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const { name, email, department, baseMonthlySalary, currency, profilePicture, password } = req.body;
      if (!id) {
        res.status(400).json({ message: 'Employee id is required' });
        return;
      }
      const result = await AdminService.updateEmployeeProfile(id, {
        name,
        email,
        department,
        baseMonthlySalary: baseMonthlySalary !== undefined ? Number(baseMonthlySalary) : undefined,
        currency,
        profilePicture,
        password,
      });
      res.json({ message: `Profile updated for ${result.name}` });
    } catch (error: any) {
      if (error.statusCode === 404) {
        res.status(404).json({ message: error.message });
        return;
      }
      next(error);
    }
  }

  // Onsite Employee Management
  static async getOnsiteEmployees(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const employees = await AdminService.getOnsiteEmployees();
      res.json({ employees });
    } catch (error) {
      next(error);
    }
  }

  static async createOnsiteEmployee(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { name, email, password, department, biometricUserId, baseMonthlySalary, currency } = req.body;
      const result = await AuthService.register({
        name,
        email,
        password,
        department,
        role: 'employee',
        employeeType: 'onsite',
        biometricUserId: biometricUserId ? Number(biometricUserId) : undefined,
        baseMonthlySalary: baseMonthlySalary ? Number(baseMonthlySalary) : undefined,
        currency: currency || 'PKR',
      });
      res.status(201).json({ message: 'Onsite employee created successfully', user: result.user });
    } catch (error) {
      next(error);
    }
  }

  static async updateOnsiteEmployee(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const { name, email, department, biometricUserId, baseMonthlySalary, currency, profilePicture, password } = req.body;
      if (!id) {
        res.status(400).json({ message: 'Employee id is required' });
        return;
      }
      const result = await AdminService.updateEmployeeProfile(id, {
        name,
        email,
        department,
        employeeType: 'onsite',
        biometricUserId: biometricUserId ? Number(biometricUserId) : undefined,
        baseMonthlySalary: baseMonthlySalary !== undefined ? Number(baseMonthlySalary) : undefined,
        currency,
        profilePicture,
        password,
      });
      res.json({ message: `Onsite employee updated for ${result.name}` });
    } catch (error: any) {
      if (error.statusCode === 404) {
        res.status(404).json({ message: error.message });
        return;
      }
      next(error);
    }
  }

  static async deleteOnsiteEmployee(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      if (!id) {
        res.status(400).json({ message: 'employee id is required' });
        return;
      }
      await AdminService.deleteEmployee(id);
      res.json({ message: 'Onsite employee removed' });
    } catch (error) {
      next(error);
    }
  }

  // Onsite Attendance Management
  static async getOnsiteAttendance(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { date, employeeId, department } = req.query;
      const records = await AdminService.getOnsiteAttendance(
        date as string,
        employeeId as string,
        department as string
      );
      res.json({ records });
    } catch (error) {
      next(error);
    }
  }

  static async importOnsiteAttendanceCsv(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.file) {
        res.status(400).json({ message: 'No CSV file uploaded' });
        return;
      }

      const result = await AdminService.importOnsiteAttendanceCsv(req.file.buffer, req.file.originalname);
      res.json({
        message: 'CSV imported successfully',
        imported: result.imported,
        errors: result.errors
      });
    } catch (error) {
      next(error);
    }
  }

  // Biometric Device Management
  static async getBiometricDeviceUsers(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const biometricService = new BiometricService();
      const users = await biometricService.getDeviceUsers();
      res.json({ users });
    } catch (error) {
      next(error);
    }
  }

  static async syncBiometricAttendance(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const biometricService = new BiometricService();
      await biometricService.syncAttendanceLogs();
      res.json({ message: 'Biometric attendance sync completed successfully' });
    } catch (error) {
      next(error);
    }
  }

  static async getBiometricDeviceStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const biometricService = new BiometricService();
      const status = await biometricService.getDeviceStatus();
      res.json(status);
    } catch (error) {
      next(error);
    }
  }

  static async testBiometricDeviceCommunication(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const biometricService = new BiometricService();
      const testResult = await biometricService.testDeviceCommunication();
      res.json(testResult);
    } catch (error) {
      next(error);
    }
  }

  static async importBiometricUsers(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const biometricService = new BiometricService();
      const deviceUsers = await biometricService.getDeviceUsers();

      const imported = [];
      const errors = [];

      for (const deviceUser of deviceUsers) {
        try {
          // Check if user already exists
          const existingUser = await User.findOne({ biometricUserId: deviceUser.uid });
          if (existingUser) {
            errors.push(`User with biometric ID ${deviceUser.uid} already exists`);
            continue;
          }

          // Create new onsite employee
          const result = await AuthService.register({
            name: deviceUser.name || `User ${deviceUser.uid}`,
            email: `biometric${deviceUser.uid}@example.com`, // Placeholder email
            password: 'defaultpassword', // Should be changed
            department: 'Onsite',
            role: 'employee',
            employeeType: 'onsite',
            biometricUserId: deviceUser.uid,
            baseMonthlySalary: 0, // Set later
            currency: 'PKR',
          });

          imported.push(result.user);
        } catch (error: any) {
          errors.push(`Failed to import user ${deviceUser.uid}: ${error.message}`);
        }
      }

      res.json({
        message: 'Import completed',
        imported: imported.length,
        errors,
        users: imported
      });
    } catch (error) {
      next(error);
    }
  }
}
