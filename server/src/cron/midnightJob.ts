import cron from 'node-cron';
import { User, Attendance } from '../models';

/**
 * Midnight job: runs at 23:59 every day.
 * Marks all active employees who have not punched in as "absent".
 */
export function startMidnightJob(): void {
  cron.schedule('59 23 * * *', async () => {
    try {
      console.log('[CRON] Running midnight absent-marking job...');

      const today = new Date().toISOString().split('T')[0];

      // Get all active employees
      const employees = await User.find({ role: 'employee', isActive: true }).select('_id');
      const employeeIds = employees.map((e) => e._id.toString());

      // Get IDs of employees who have attendance today
      const presentRecords = await Attendance.find({ date: today }).select('userId');
      const presentIds = new Set(presentRecords.map((r) => r.userId.toString()));

      // Find employees who haven't punched in
      const absentIds = employeeIds.filter((id) => !presentIds.has(id));

      if (absentIds.length > 0) {
        const absentRecords = absentIds.map((userId) => ({
          userId,
          date: today,
          punchIn: null,
          punchOut: null,
          totalWorkMinutes: 0,
          status: 'absent' as const,
        }));

        await Attendance.insertMany(absentRecords, { ordered: false }).catch(() => {
          // Ignore duplicate key errors (records might already exist)
        });
      }

      console.log(
        `[CRON] Marked ${absentIds.length} employees as absent for ${today}`
      );
    } catch (error) {
      console.error('[CRON] Error in midnight job:', error);
    }
  });

  console.log('[CRON] Midnight absent-marking job scheduled (23:59 daily)');
}
