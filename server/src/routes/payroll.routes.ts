import { Router } from 'express';
import { PayrollController } from '../controllers/payroll.controller';
import { authenticate, authorize, validate } from '../middleware';
import {
  generatePayrollSchema,
  manualEditSchema,
  addAdjustmentSchema,
  finalizeSchema,
  revertSchema,
  updatePolicySchema,
  updateSalarySchema,
  updateWorkingDaysSchema,
} from '../validators/payroll.validator';

const router = Router();

// All payroll routes require admin auth
router.use(authenticate, authorize('admin'));

/* ─────────── Company Policy ─────────── */
router.get('/policy', PayrollController.getPolicy);
router.patch('/policy', validate(updatePolicySchema), PayrollController.updatePolicy);

/* ─────────── Employee Salary ─────────── */
router.get('/salary/:employeeId', PayrollController.getEmployeeSalary);
router.patch(
  '/salary/:employeeId',
  validate(updateSalarySchema),
  PayrollController.updateEmployeeSalary
);

/* ─────────── Payroll Runs ─────────── */
router.get('/overview', PayrollController.getPayrollOverview);
router.get('/runs', PayrollController.listRuns);
router.post('/generate', validate(generatePayrollSchema), PayrollController.generateRun);
router.post('/:runId/recalculate', PayrollController.recalculate);
router.patch('/:runId/working-days', validate(updateWorkingDaysSchema), PayrollController.updateWorkingDays);
router.get('/:runId', PayrollController.getRun);
router.get('/:runId/lines', PayrollController.getRunLines);

/* ─────────── Manual Edits ─────────── */
router.patch(
  '/:runId/line/:userId/manual',
  validate(manualEditSchema),
  PayrollController.updateManualFields
);
router.post(
  '/:runId/line/:userId/adjustment',
  validate(addAdjustmentSchema),
  PayrollController.addAdjustment
);

/* ─────────── Finalize / Revert ─────────── */
router.post(
  '/:runId/line/:userId/finalize',
  validate(finalizeSchema),
  PayrollController.finalize
);
router.post(
  '/:runId/line/:userId/revert',
  validate(revertSchema),
  PayrollController.revert
);

/* ─────────── CSV Export ─────────── */
router.get('/:runId/export/csv', PayrollController.exportCsv);

export default router;
