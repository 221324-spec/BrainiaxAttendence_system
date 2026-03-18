declare module 'node-zklib' {
  export class ZKLib {
    constructor(options: {
      ip: string;
      port: number;
      inport?: number;
      timeout?: number;
    });
    createSocket(): Promise<void>;
    disconnect(): Promise<void>;
    getAttendances(): Promise<any[]>;
    clearAttendanceLog(): Promise<void>;
    getUsers(): Promise<any[]>;
  }
}