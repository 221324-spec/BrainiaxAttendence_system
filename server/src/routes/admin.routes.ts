import { Router } from 'express';
import { AdminController } from '../controllers/admin.controller';
import { authenticate, authorize } from '../middleware';

const router = Router();

// All admin routes require authentication + admin role
router.use(authenticate, authorize('admin'));

router.get('/dashboard', AdminController.getDashboardStats);
router.get('/employees', AdminController.getAllEmployees);
router.get('/employees/status', AdminController.getEmployeesWithStatus);
router.post('/employees', AdminController.createEmployee);

// Manual correction (admin)
router.post('/attendance/correct', AdminController.adminUpsertAttendance);
router.get('/export/:employeeId', AdminController.exportCsv);

export default router;
