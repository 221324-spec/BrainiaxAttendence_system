
import { Request, Response, NextFunction } from 'express';
import { AdminService, CsvService, AuthService, AttendanceService } from '../services';

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
      const { name, email, password, department } = req.body;
      const result = await AuthService.register({
        name,
        email,
        password,
        department,
        role: 'employee',
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
}
