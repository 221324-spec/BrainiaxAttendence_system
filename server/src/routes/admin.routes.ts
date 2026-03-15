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
router.delete('/employees/:id', AdminController.deleteEmployee);
router.patch('/employees/:id/reset-password', AdminController.resetEmployeePassword);
router.get('/employees/:id/salary', AdminController.getEmployeeSalary);
router.patch('/employees/:id/salary', AdminController.updateEmployeeSalary);
router.get('/employees/:id/profile', AdminController.getEmployeeProfile);
router.patch('/employees/:id/profile', AdminController.updateEmployeeProfile);

// Onsite employee management
router.get('/onsite-employees', AdminController.getOnsiteEmployees);
router.post('/onsite-employee', AdminController.createOnsiteEmployee);
router.put('/onsite-employee/:id', AdminController.updateOnsiteEmployee);
router.delete('/onsite-employee/:id', AdminController.deleteOnsiteEmployee);

// Manual correction (admin)
router.post('/attendance/correct', AdminController.adminUpsertAttendance);
router.get('/export/:employeeId', AdminController.exportCsv);

// Onsite attendance management
router.get('/onsite-attendance', AdminController.getOnsiteAttendance);
router.post('/onsite-attendance/import-csv', (req: any, res, next) => {
  req.upload.single('csvFile')(req, res, (err: any) => {
    if (err) {
      return res.status(400).json({ message: err.message });
    }
    next();
  });
}, AdminController.importOnsiteAttendanceCsv);

export default router;
