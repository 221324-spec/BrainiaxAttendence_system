import { ZKLib } from 'node-zklib';
import * as cron from 'node-cron';
import { User, Attendance } from '../models';

export class BiometricService {
  private zk: ZKLib | null = null;
  private isConnected = false;
  private deviceIP: string;
  private devicePort: number;

  constructor() {
    this.deviceIP = process.env.BIOMETRIC_DEVICE_IP || '192.168.1.100';
    this.devicePort = parseInt(process.env.BIOMETRIC_PORT || '4370');
  }

  async connect(): Promise<void> {
    try {
      this.zk = new ZKLib({
        ip: this.deviceIP,
        port: this.devicePort,
        inport: this.devicePort,
        timeout: 5000,
      });

      await this.zk.createSocket();
      this.isConnected = true;
      console.log(`Connected to biometric device at ${this.deviceIP}:${this.devicePort}`);
    } catch (error) {
      console.error('Failed to connect to biometric device:', error);
      this.isConnected = false;
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    if (this.zk && this.isConnected) {
      try {
        await this.zk.disconnect();
        this.isConnected = false;
      console.log('Disconnected from biometric device');
      } catch (error) {
        console.error('Error disconnecting from biometric device:', error);
      }
    }
  }

  async syncAttendanceLogs(): Promise<void> {
    if (!this.isConnected) {
      await this.connect();
    }

    try {
      // Get attendance logs from device
      const logs = await this.zk!.getAttendances();

      console.log(`Fetched ${logs.length} attendance logs from device`);

      for (const log of logs) {
        await this.processAttendanceLog(log);
      }

      // Clear logs from device after processing
      await this.zk!.clearAttendanceLog();

      console.log('Biometric attendance sync completed');
    } catch (error) {
      console.error('Error syncing biometric attendance:', error);
      throw error;
    }
  }

  private async processAttendanceLog(log: any): Promise<void> {
    try {
      const user = await User.findOne({ biometricUserId: log.userId, employeeType: 'onsite' });
      if (!user) {
        console.warn(`No onsite user found for biometricUserId: ${log.userId}`);
        return;
      }

      const timestamp = new Date(log.timestamp);
      const dateStr = timestamp.toISOString().split('T')[0]; // YYYY-MM-DD

      // Check if attendance record exists for this user and date
      let attendance = await Attendance.findOne({ userId: user._id, date: dateStr });

      if (!attendance) {
        // Create new attendance record
        attendance = new Attendance({
          userId: user._id,
          date: dateStr,
          source: 'biometric',
        });
      }

      // Determine if this is check-in or check-out
      // First log of the day is check-in, last is check-out
      const existingLogs = await this.getBiometricLogsForDate(user._id.toString(), dateStr);

      if (existingLogs.length === 0) {
        // First log - check-in
        attendance.punchIn = timestamp;
      } else {
        // Check if this timestamp is later than existing punchOut
        if (!attendance.punchOut || timestamp > attendance.punchOut) {
          attendance.punchOut = timestamp;
        }
      }

      // Calculate total work minutes if both punchIn and punchOut exist
      if (attendance.punchIn && attendance.punchOut) {
        const workMs = attendance.punchOut.getTime() - attendance.punchIn.getTime();
        attendance.totalWorkMinutes = Math.floor(workMs / (1000 * 60));
      }

      await attendance.save();

      // Store individual log to prevent duplicates (you might want a separate collection for this)
      // For now, we'll rely on the device's clearAttendanceLog to prevent reprocessing

    } catch (error) {
      console.error(`Error processing biometric log for userId ${log.userId}:`, error);
    }
  }

  private async getBiometricLogsForDate(userId: string, date: string): Promise<any[]> {
    // This is a placeholder - in a real implementation, you might store individual logs
    // For now, we'll just check existing attendance records
    return [];
  }

  startSyncScheduler(): void {
    const interval = process.env.SYNC_INTERVAL || '5'; // minutes
    cron.schedule(`*/${interval} * * * *`, async () => {
      try {
        await this.syncAttendanceLogs();
      } catch (error) {
        console.error('Scheduled biometric sync failed:', error);
      }
    });

    console.log(`Biometric sync scheduler started - running every ${interval} minutes`);
  }

  getConnectionStatus(): boolean {
    return this.isConnected;
  }
}