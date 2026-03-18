import * as cron from 'node-cron';
import { User, Attendance } from '../models';

export class BiometricService {
  private isConnected = false;
  private deviceIP: string;
  private devicePort: number;
  private zktClient: ZKTClient | null = null;

  constructor() {
    this.deviceIP = process.env.BIOMETRIC_DEVICE_IP || '192.168.18.200';
    this.devicePort = parseInt(process.env.BIOMETRIC_PORT || '4370');
    this.zktClient = new ZKTClient(this.deviceIP, this.devicePort);
  }

  async connect(): Promise<void> {
    try {
      console.log(`Attempting to connect to biometric device at ${this.deviceIP}:${this.devicePort}`);

      // Try custom ZKT client (our implementation)
      console.log('Trying custom ZKT client...');
      if (this.zktClient) {
        const zktConnected = await this.zktClient.connect();
        if (zktConnected) {
          this.isConnected = true;
          console.log(`✅ Successfully connected to ZKT K50 device at ${this.deviceIP}:${this.devicePort}`);
          return;
        }
      }

      console.error('❌ ZKT client connection failed');
      this.isConnected = false;
      console.warn('Device connection failed, but continuing without throwing error');

    } catch (error) {
      console.error('❌ Connection error:', error);
      this.isConnected = false;
      console.warn('Device connection failed, but continuing without throwing error');
    }
  }

  async disconnect(): Promise<void> {
    if (this.zktClient && this.zktClient.isConnected) {
      await this.zktClient.disconnect();
    }
    this.isConnected = false;
    console.log('Disconnected from biometric device');
  }

  async syncAttendanceLogs(): Promise<void> {
    try {
      console.log('🔄 Starting biometric attendance sync...');

      if (!this.isConnected) {
        console.log('📡 Device not connected, attempting connection...');
        await this.connect();
      }

      // Only use custom ZKT client
      if (this.zktClient && this.zktClient.isConnected) {
        console.log('📊 Fetching attendance logs using ZKT client...');
        const logs = await this.zktClient.getAttendances();
        console.log(`✅ Retrieved ${logs.length} attendance logs from ZKT device`);

        if (logs.length > 0) {
          console.log('📝 Processing attendance logs...');
          for (const log of logs) {
            console.log(`   Processing log: User ${log.userId} at ${log.timestamp}`);
            await this.processAttendanceLog(log);
          }

          // Clear logs from device after processing
          console.log('🗑️ Clearing attendance logs from device...');
          await this.zktClient.clearAttendanceLog();
          console.log('✅ Biometric attendance sync completed successfully');
        } else {
          console.log('⚠️ No attendance logs found on device');
        }
        return;
      }

      console.warn('❌ No biometric connection available for attendance sync - device may be offline');
    } catch (error) {
      console.error('❌ Error syncing biometric attendance:', error);
      console.error('Error details:', error instanceof Error ? error.message : String(error));
      // Don't throw error - just log it and continue
      console.warn('Biometric sync failed, but continuing without throwing error');
    }
  }

  async getDeviceUsers(): Promise<any[]> {
    try {
      if (!this.isConnected) {
        await this.connect();
      }

      // Only use custom ZKT client
      if (this.zktClient && this.zktClient.isConnected) {
        console.log('Fetching users using ZKT client...');
        const users = await this.zktClient.getUsers();
        console.log(`Fetched ${users.length} users from ZKT device`);
        return users;
      }

      console.warn('No biometric connection available - returning empty user list');
      return [];
    } catch (error) {
      console.error('Error fetching users from biometric device:', error);
      console.error('Error details:', error instanceof Error ? error.message : String(error));
      // Return empty array instead of throwing error
      console.warn('Returning empty user list due to device connection issues');
      return [];
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
    console.log(`Biometric sync scheduler DISABLED for testing`);
    // cron.schedule(`*/${interval} * * * *`, async () => {
    //   try {
    //     await this.syncAttendanceLogs();
    //   } catch (error) {
    //     console.error('Scheduled biometric sync failed:', error);
    //   }
    // });

    // console.log(`Biometric sync scheduler started - running every ${interval} minutes`);
  }

  async getDeviceStatus(): Promise<any> {
    try {
      if (!this.isConnected) {
        await this.connect();
      }

      if (this.zktClient && this.zktClient.isConnected) {
        const info = await this.zktClient.getDeviceInfo();
        return {
          connected: true,
          method: 'ZKT Protocol',
          info: info,
          users: await this.zktClient.getUsers(),
          attendanceCount: (await this.zktClient.getAttendances()).length
        };
      }

      return { connected: false, error: 'No active connection' };
    } catch (error) {
      console.error('Error getting device status:', error);
      return {
        connected: false,
        error: error instanceof Error ? error.message : String(error),
        users: [],
        attendanceCount: 0
      };
    }
  }

  async testConnectivity(): Promise<{ reachable: boolean; pingTime?: number; error?: string }> {
    const net = require('net');
    return new Promise((resolve) => {
      const socket = new net.Socket();
      const startTime = Date.now();

      socket.setTimeout(5000);

      socket.connect(this.devicePort, this.deviceIP, () => {
        const pingTime = Date.now() - startTime;
        socket.destroy();
        resolve({ reachable: true, pingTime });
      });

      socket.on('error', (error: any) => {
        resolve({ reachable: false, error: error.message });
      });

      socket.on('timeout', () => {
        socket.destroy();
        resolve({ reachable: false, error: 'Connection timeout' });
      });
    });
  }

  async testDeviceCommunication(): Promise<{ success: boolean; responses: any[]; error?: string }> {
    if (!this.isConnected) {
      await this.connect();
    }

    if (this.zktClient && this.zktClient.isConnected) {
      return await this.zktClient.testDeviceCommunication();
    }

    return { success: false, responses: [], error: 'No connection available' };
  }
}

// Custom ZKT Protocol Client for ZKT K50
class ZKTClient {
  private ip: string;
  private port: number;
  private socket: any = null;
  public isConnected = false;

  constructor(ip: string, port: number) {
    this.ip = ip;
    this.port = port;
  }

  async connect(): Promise<boolean> {
    const net = require('net');
    return new Promise((resolve) => {
      this.socket = new net.Socket();
      const timeout = setTimeout(() => {
        this.socket?.destroy();
        resolve(false);
      }, 10000);

      this.socket.connect(this.port, this.ip, () => {
        console.log('ZKT Socket connected');
        clearTimeout(timeout);
        this.isConnected = true;
        resolve(true);
      });

      this.socket.on('error', (error: any) => {
        clearTimeout(timeout);
        console.error('ZKT Socket error:', error.message);
        resolve(false);
      });

      this.socket.on('close', () => {
        console.log('ZKT Socket closed');
        this.isConnected = false;
      });
    });
  }

  async disconnect(): Promise<void> {
    if (this.socket) {
      this.socket.destroy();
      this.isConnected = false;
    }
  }

  private async receiveResponse(timeoutMs: number = 5000): Promise<Buffer | null> {
    return new Promise((resolve) => {
      if (!this.socket) {
        resolve(null);
        return;
      }

      const timeout = setTimeout(() => {
        resolve(null);
      }, timeoutMs);

      let responseBuffer = Buffer.alloc(0);

      const dataHandler = (chunk: Buffer) => {
        responseBuffer = Buffer.concat([responseBuffer, chunk]);
        const etxIndex = responseBuffer.indexOf(0x03);
        if (etxIndex !== -1 && responseBuffer.length > etxIndex + 1) {
          clearTimeout(timeout);
          this.socket.removeListener('data', dataHandler);
          resolve(responseBuffer);
        }
      };

      this.socket.on('data', dataHandler);
    });
  }

  private calculateChecksum(data: Buffer): number {
    let sum = 0;
    for (let i = 0; i < data.length; i++) {
      sum += data[i];
    }
    return sum & 0xFF;
  }

  private buildCommand(cmd: number, data: Buffer = Buffer.alloc(0)): Buffer {
    const stx = 0x02;
    const etx = 0x03;
    const dataLength = data.length;
    const lengthBytes = Buffer.alloc(2);
    lengthBytes.writeUInt16LE(dataLength, 0);

    const commandBuffer = Buffer.concat([
      Buffer.from([stx, cmd]),
      lengthBytes,
      data,
      Buffer.from([etx])
    ]);

    const checksum = this.calculateChecksum(commandBuffer.slice(1)); // Exclude STX
    return Buffer.concat([commandBuffer, Buffer.from([checksum])]);
  }

  private async sendCommand(cmd: number, data: Buffer = Buffer.alloc(0), timeoutMs: number = 30000): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      if (!this.socket || !this.isConnected) {
        reject(new Error('Not connected to device'));
        return;
      }

      const command = this.buildCommand(cmd, data);
      console.log(`📤 Sending ZKT command ${cmd} (${command.length} bytes): ${command.toString('hex')}`);

      const timeout = setTimeout(() => {
        console.log(`⏰ Command ${cmd} timed out after ${timeoutMs}ms`);
        this.socket.removeListener('data', dataHandler);
        reject(new Error(`Command timeout after ${timeoutMs}ms`));
      }, timeoutMs);

      let responseBuffer = Buffer.alloc(0);
      let responseComplete = false;
      let dataReceived = false;

      const dataHandler = (chunk: Buffer) => {
        if (responseComplete) return;

        dataReceived = true;
        console.log(`📥 Received ${chunk.length} bytes: ${chunk.toString('hex')}`);
        responseBuffer = Buffer.concat([responseBuffer, chunk]);

        // Check if we have a complete response
        // ZKT responses start with 0x02 (STX) and end with checksum after ETX
        if (responseBuffer.length >= 6) {
          const stxIndex = responseBuffer.indexOf(0x02);
          if (stxIndex !== -1) {
            console.log(`🔍 Found STX at index ${stxIndex}`);
            // Look for ETX (0x03) followed by checksum
            const etxIndex = responseBuffer.indexOf(0x03, stxIndex);
            if (etxIndex !== -1 && responseBuffer.length > etxIndex + 1) {
              console.log(`✅ Found complete response (ETX at ${etxIndex}, total length ${responseBuffer.length})`);
              // We have STX, data, ETX, and at least one checksum byte
              clearTimeout(timeout);
              this.socket.removeListener('data', dataHandler);
              responseComplete = true;
              resolve(responseBuffer.slice(stxIndex)); // Return from STX onwards
            } else {
              console.log(`⏳ Waiting for more data... (ETX not found yet, current length: ${responseBuffer.length})`);
            }
          } else {
            console.log(`❌ No STX found in response, received: ${responseBuffer.toString('hex')}`);
          }
        } else {
          console.log(`⏳ Response too short (${responseBuffer.length} bytes), waiting for more data...`);
        }

        // Safety check: if buffer gets too large, something is wrong
        if (responseBuffer.length > 1024 * 10) { // 10KB max
          console.log(`❌ Response buffer overflow (${responseBuffer.length} bytes)`);
          clearTimeout(timeout);
          this.socket.removeListener('data', dataHandler);
          reject(new Error('Response buffer overflow'));
        }
      };

      this.socket.on('data', dataHandler);
      this.socket.write(command);
      console.log(`📡 Command sent, waiting for response...`);
    });
  }

  async getDeviceInfo(): Promise<any> {
    try {
      const response = await this.sendCommand(0x01); // CMD_DEVICE_INFO
      // Parse response - this is simplified
      console.log('Device info response:', response.toString('hex'));
      return { success: true, data: response.toString('hex') };
    } catch (error) {
      console.error('Error getting device info:', error);
      throw error;
    }
  }

  async getUsers(): Promise<any[]> {
    try {
      const response = await this.sendCommand(0x09); // CMD_USER_ENROLL_DATA
      console.log('Users response:', response.toString('hex'));

      // Parse the response to extract user data
      const users: any[] = [];
      if (response.length > 8) { // Has data
        // Skip STX (1), CMD (1), LEN (2) = 4 bytes header
        let offset = 4;

        // ZKT user record format (approximate):
        // UserID (4), Privilege (1), Password (8), Name (24), CardNo (4), etc.
        while (offset + 41 <= response.length - 2) { // Minimum user record size + ETX + CHK
          try {
            const userId = response.readUInt32LE(offset);
            const privilege = response.readUInt8(offset + 4);
            const password = response.toString('ascii', offset + 5, offset + 13).replace(/\0/g, '');
            const name = response.toString('ascii', offset + 13, offset + 37).replace(/\0/g, '');
            const cardno = response.readUInt32LE(offset + 37);

            if (name.trim()) { // Only add if name is not empty
              users.push({
                userId: userId.toString(),
                name: name.trim(),
                privilege: privilege,
                password: password,
                cardno: cardno
              });
            }

            offset += 41; // Size of one user record
          } catch (parseError) {
            console.error('Error parsing user record at offset', offset, parseError);
            break;
          }
        }
      }

      console.log(`Parsed ${users.length} users from ZKT device`);
      return users;
    } catch (error) {
      console.error('Error getting users from ZKT device:', error);
      throw error;
    }
  }

  async getAttendances(): Promise<any[]> {
    try {
      console.log('📡 Sending attendance log request to device...');
      const response = await this.sendCommand(0x0D); // CMD_ATTLOG_RRQ
      console.log('📨 Raw attendance response from device:', response.toString('hex'));
      console.log('📏 Response length:', response.length, 'bytes');

      // Parse attendance logs
      const logs: any[] = [];
      if (response.length > 8) {
        console.log('🔍 Parsing attendance data...');
        // Skip STX (1), CMD (1), LEN (2) = 4 bytes header
        let offset = 4;
        console.log('📊 Starting parse at offset:', offset);

        // ZKT attendance record format:
        // UserID (4), Timestamp (4), Status (1) = 9 bytes per record
        let recordCount = 0;
        while (offset + 9 <= response.length - 2) { // Before ETX + CHK
          try {
            const userId = response.readUInt32LE(offset);
            const timestamp = response.readUInt32LE(offset + 4);
            const status = response.readUInt8(offset + 8);

            const date = new Date(timestamp * 1000); // Unix timestamp

            console.log(`   Record ${recordCount + 1}: UserID=${userId}, Timestamp=${date.toISOString()}, Status=${status}`);

            logs.push({
              userId: userId.toString(),
              timestamp: date,
              status: status
            });

            offset += 9;
            recordCount++;
          } catch (parseError) {
            console.error('❌ Error parsing attendance record at offset', offset, parseError);
            break;
          }
        }
        console.log(`✅ Parsed ${recordCount} attendance records`);
      } else {
        console.log('⚠️ Response too short for attendance data (length:', response.length, ')');
      }

      console.log(`📊 Total parsed ${logs.length} attendance logs from ZKT device`);
      return logs;
    } catch (error) {
      console.error('❌ Error getting attendance from ZKT device:', error);
      console.error('Error details:', error instanceof Error ? error.message : String(error));
      throw error;
    }
  }

  async clearAttendanceLog(): Promise<void> {
    try {
      await this.sendCommand(0x04); // CMD_CLEAR_ATTLOG
      console.log('Attendance log cleared from ZKT device');
    } catch (error) {
      console.error('Error clearing attendance log:', error);
      throw error;
    }
  }

  async testDeviceCommunication(): Promise<{ success: boolean; responses: any[]; error?: string }> {
    const results = { success: false, responses: [] as any[], error: undefined as string | undefined };

    try {
      console.log('🧪 Testing device communication with various commands...');

      // Test basic connectivity first
      const connectivity = await this.testConnectivity();
      results.responses.push({ test: 'tcp_connectivity', ...connectivity });

      if (!connectivity.reachable) {
        results.error = 'Device not reachable via TCP';
        return results;
      }

      // Test different ZKT commands
      const commands = [
        { name: 'device_info', cmd: 0x01 },
        { name: 'attendance_count', cmd: 0x0C },
        { name: 'attendance_logs', cmd: 0x0D },
        { name: 'user_count', cmd: 0x08 },
        { name: 'users', cmd: 0x09 }
      ];

      for (const command of commands) {
        try {
          console.log(`Testing command: ${command.name} (0x${command.cmd.toString(16)})`);
          const response = await this.sendCommand(command.cmd, Buffer.alloc(0), 5000); // 5 second timeout
          results.responses.push({
            command: command.name,
            cmd: `0x${command.cmd.toString(16)}`,
            success: true,
            responseHex: response.toString('hex'),
            responseLength: response.length
          });
          console.log(`✅ ${command.name} responded with ${response.length} bytes`);
        } catch (error) {
          results.responses.push({
            command: command.name,
            cmd: `0x${command.cmd.toString(16)}`,
            success: false,
            error: error instanceof Error ? error.message : String(error)
          });
          console.log(`❌ ${command.name} failed: ${error instanceof Error ? error.message : String(error)}`);
        }
      }

      // Check if any commands succeeded
      const successfulCommands = results.responses.filter(r => r.success && r.command !== 'tcp_connectivity');
      results.success = successfulCommands.length > 0;

      if (results.success) {
        console.log(`✅ Device communication test successful - ${successfulCommands.length} commands responded`);
      } else {
        console.log('❌ Device communication test failed - no commands responded');
        results.error = 'Device accepts TCP connections but does not respond to ZKT protocol commands';
      }

    } catch (error) {
      results.error = error instanceof Error ? error.message : String(error);
      console.error('❌ Device communication test error:', error);
    }

    return results;
  }

  private async testConnectivity(): Promise<{ reachable: boolean; pingTime?: number; error?: string }> {
    const net = require('net');
    return new Promise((resolve) => {
      const socket = new net.Socket();
      const startTime = Date.now();

      socket.setTimeout(5000);

      socket.connect(this.port, this.ip, () => {
        const pingTime = Date.now() - startTime;
        socket.destroy();
        resolve({ reachable: true, pingTime });
      });

      socket.on('error', (error: any) => {
        resolve({ reachable: false, error: error.message });
      });

      socket.on('timeout', () => {
        socket.destroy();
        resolve({ reachable: false, error: 'Connection timeout' });
      });
    });
  }
}