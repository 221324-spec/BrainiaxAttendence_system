import { Router } from 'express';
import { AttendanceController } from '../controllers/attendance.controller';
import { authenticate } from '../middleware';

const router = Router();

// All routes require authentication
router.use(authenticate);

router.post('/punch-in', AttendanceController.punchIn);
router.post('/punch-out', AttendanceController.punchOut);
router.post('/break-start', AttendanceController.startBreak);
router.post('/break-end', AttendanceController.endBreak);
router.get('/today', AttendanceController.getTodayStatus);
router.get('/history', AttendanceController.getMonthlyHistory);
router.get('/summary', AttendanceController.getMonthlySummary);

export default router;
