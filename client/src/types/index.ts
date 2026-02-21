export interface User {
  _id: string;
  name: string;
  email: string;
  role: 'admin' | 'employee';
  department: string;
  isActive: boolean;
  createdAt: string;
}

export interface BreakPeriod {
  start: string;
  end: string | null;
}

export interface Attendance {
  _id: string;
  userId: string;
  date: string;
  punchIn: string | null;
  punchOut: string | null;
  breaks: BreakPeriod[];
  totalBreakMinutes: number;
  totalWorkMinutes: number;
  status: 'present' | 'absent' | 'half-day';
  isOnBreak: boolean;
  createdAt: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface AuthResponse {
  user: User;
  token: string;
}

export interface DashboardStats {
  totalEmployees: number;
  presentToday: number;
  absentToday: number;
  attendancePercentage: number;
}

export interface MonthlySummary {
  totalDays: number;
  presentDays: number;
  absentDays: number;
  halfDays: number;
  totalWorkHours: number;
  totalBreakHours: number;
  averageWorkHours: number;
}

export interface EmployeeWithStatus {
  _id: string;
  name: string;
  email: string;
  department: string;
  todayAttendance: Attendance | null;
}
