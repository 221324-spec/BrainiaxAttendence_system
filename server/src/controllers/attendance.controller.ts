import { Request, Response, NextFunction } from 'express';
import { AttendanceService } from '../services';

export class AttendanceController {
  static async punchIn(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const attendance = await AttendanceService.punchIn(req.user!.userId);
      res.status(201).json({ message: 'Punched in successfully', attendance });
    } catch (error) {
      next(error);
    }
  }

  static async punchOut(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const attendance = await AttendanceService.punchOut(req.user!.userId);
      res.json({ message: 'Punched out successfully', attendance });
    } catch (error) {
      next(error);
    }
  }

  static async startBreak(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const attendance = await AttendanceService.startBreak(req.user!.userId);
      res.json({ message: 'Break started', attendance });
    } catch (error) {
      next(error);
    }
  }

  static async endBreak(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const attendance = await AttendanceService.endBreak(req.user!.userId);
      res.json({ message: 'Break ended', attendance });
    } catch (error) {
      next(error);
    }
  }

  static async getTodayStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const attendance = await AttendanceService.getTodayStatus(req.user!.userId);
      res.json({ attendance });
    } catch (error) {
      next(error);
    }
  }

  static async getMonthlyHistory(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const year = parseInt(req.query.year as string) || new Date().getFullYear();
      const month = parseInt(req.query.month as string) || new Date().getMonth() + 1;

      const records = await AttendanceService.getMonthlyHistory(
        req.user!.userId,
        year,
        month
      );
      res.json({ records });
    } catch (error) {
      next(error);
    }
  }

  static async getMonthlySummary(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const year = parseInt(req.query.year as string) || new Date().getFullYear();
      const month = parseInt(req.query.month as string) || new Date().getMonth() + 1;

      const summary = await AttendanceService.getMonthlySummary(
        req.user!.userId,
        year,
        month
      );
      res.json({ summary });
    } catch (error) {
      next(error);
    }
  }
}
