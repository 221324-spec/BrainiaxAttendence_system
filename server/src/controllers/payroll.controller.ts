import { Request, Response, NextFunction } from 'express';
import {
  PayrollRunService,
  PayrollManualEditService,
  PayrollFinalizeService,
  PayrollCsvService,
  CompanyPolicyService,
} from '../services';

function getIp(req: Request): string {
  return (
    (req.headers['x-forwarded-for'] as string) ||
    req.socket.remoteAddress ||
    ''
  );
}

export class PayrollController {
  /* ─────────── Payroll Run ─────────── */

  static async generateRun(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { month, year } = req.body;
      const result = await PayrollRunService.generate(
        month,
        year,
        req.user!.userId,
        getIp(req)
      );
      res.status(201).json({
        message: `Payroll run generated for ${month}/${year}`,
        run: result.run,
        lineCount: result.lineCount,
      });
    } catch (error) {
      next(error);
    }
  }

  static async recalculate(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { runId } = req.params;
      const result = await PayrollRunService.recalculate(
        runId,
        req.user!.userId,
        getIp(req)
      );
      res.json({
        message: 'Payroll recalculated',
        updatedDraft: result.updatedDraft,
        skippedFinal: result.skippedFinal,
      });
    } catch (error) {
      next(error);
    }
  }

  static async updateWorkingDays(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { runId } = req.params;
      const { workingDays } = req.body;
      const result = await PayrollRunService.updateWorkingDays(
        runId,
        workingDays,
        req.user!.userId,
        getIp(req)
      );
      res.json({
        message: `Working days updated to ${workingDays}`,
        run: result.run,
        updatedLines: result.updatedLines,
      });
    } catch (error) {
      next(error);
    }
  }

  static async getRun(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { runId } = req.params;
      const result = await PayrollRunService.getRunById(runId);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  static async getRunLines(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { runId } = req.params;
      const status = req.query.status as string | undefined;
      const lines = await PayrollRunService.getRunLines(runId, status);
      res.json({ lines });
    } catch (error) {
      next(error);
    }
  }

  static async listRuns(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const runs = await PayrollRunService.listRuns();
      res.json({ runs });
    } catch (error) {
      next(error);
    }
  }

  /* ─────────── Manual Edits ─────────── */

  static async updateManualFields(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { runId, userId } = req.params;
      const line = await PayrollManualEditService.updateManualFields(
        runId,
        userId,
        req.body,
        req.user!.userId,
        getIp(req)
      );
      res.json({ message: 'Payroll line updated', line });
    } catch (error) {
      next(error);
    }
  }

  static async addAdjustment(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { runId, userId } = req.params;
      const line = await PayrollManualEditService.addAdjustment(
        runId,
        userId,
        req.body,
        req.user!.userId,
        getIp(req)
      );
      res.json({ message: 'Adjustment added', line });
    } catch (error) {
      next(error);
    }
  }

  /* ─────────── Finalize / Revert ─────────── */

  static async finalize(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { runId, userId } = req.params;
      const { reason } = req.body;
      const line = await PayrollFinalizeService.finalize(
        runId,
        userId,
        reason,
        req.user!.userId,
        getIp(req)
      );
      res.json({ message: 'Payroll line finalized', line });
    } catch (error) {
      next(error);
    }
  }

  static async revert(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { runId, userId } = req.params;
      const { reason } = req.body;
      const line = await PayrollFinalizeService.revert(
        runId,
        userId,
        reason,
        req.user!.userId,
        getIp(req)
      );
      res.json({ message: 'Payroll line reverted to DRAFT', line });
    } catch (error) {
      next(error);
    }
  }

  /* ─────────── CSV Export ─────────── */

  static async exportCsv(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { runId } = req.params;
      const { csv, filename } = await PayrollCsvService.exportPayrollCsv(
        runId,
        req.user!.userId,
        getIp(req)
      );

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.send(csv);
    } catch (error) {
      next(error);
    }
  }

  /* ─────────── Company Policy ─────────── */

  static async getPolicy(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const policy = await CompanyPolicyService.get();
      res.json({ policy });
    } catch (error) {
      next(error);
    }
  }

  static async updatePolicy(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const policy = await CompanyPolicyService.update(
        req.body,
        req.user!.userId,
        getIp(req)
      );
      res.json({ message: 'Company policy updated', policy });
    } catch (error) {
      next(error);
    }
  }

  /* ─────────── Employee Salary ─────────── */

  static async getEmployeeSalary(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { employeeId } = req.params;
      const salary = await CompanyPolicyService.getEmployeeSalary(employeeId);
      res.json({ salary });
    } catch (error) {
      next(error);
    }
  }

  static async updateEmployeeSalary(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { employeeId } = req.params;
      const { baseMonthlySalary, currency } = req.body;
      const result = await CompanyPolicyService.updateEmployeeSalary(
        employeeId,
        baseMonthlySalary,
        currency,
        req.user!.userId,
        getIp(req)
      );
      res.json({ message: 'Salary updated', salary: result });
    } catch (error) {
      next(error);
    }
  }

  /* ─────────── Payroll Overview (Dashboard) ─────────── */

  static async getPayrollOverview(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const months = Math.min(Math.max(parseInt(req.query.months as string) || 6, 1), 24);
      const overview = await PayrollRunService.getPayrollOverview(months);
      res.json(overview);
    } catch (error) {
      next(error);
    }
  }

  /* ─────────── Delete Payroll Run ─────────── */

  static async deleteRun(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { runId } = req.params;
      const result = await PayrollRunService.deleteRun(
        runId,
        req.user!.userId,
        getIp(req)
      );
      res.json({
        message: 'Payroll run deleted successfully',
        deletedLines: result.deletedLines,
      });
    } catch (error) {
      next(error);
    }
  }
}
