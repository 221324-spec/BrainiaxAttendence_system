export interface User {
  _id: string;
  name: string;
  email: string;
  role: 'admin' | 'employee';
  department: string;
  isActive: boolean;
  profilePicture?: string;
  employeeType?: 'remote' | 'onsite';
  biometricUserId?: number;
  createdAt: string;
}

export interface EmployeeProfile {
  _id: string;
  name: string;
  email: string;
  department: string;
  role?: string;
  profilePicture?: string;
  baseMonthlySalary: number;
  currency: string;
  salaryEffectiveFrom?: string;
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
  source?: 'remote' | 'biometric';
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

/* ─────────── Payroll Types ─────────── */

export interface CompanyPolicy {
  _id: string;
  weeklyOffDay: number;
  timezone: string;
  minHoursForPresent: number;
}

export interface PayrollRun {
  _id: string;
  month: number;
  year: number;
  status: 'OPEN';
  workingDaysInMonth: number;
  generatedAt: string;
  generatedBy: { _id: string; name: string; email: string } | string;
  lastRecalculatedAt?: string;
  lastRecalculatedBy?: { _id: string; name: string; email: string } | string;
}

export interface PayrollAdjustment {
  type: 'BONUS' | 'DOCK' | 'OTHER';
  amount: number;
  reason: string;
  createdBy: string;
  createdAt: string;
}

export interface PayrollEmployeeLine {
  _id: string;
  payrollRunId: string;
  userId: { _id: string; name: string; email: string; department: string } | string;
  status: 'DRAFT' | 'FINAL';
  baseMonthlySalarySnapshot: number;
  workingDays: number;
  presentDays: number;
  suggestedAbsentDays: number;
  totalNetMinutes: number;
  totalBreakMinutes: number;
  calculatedPaySuggestion: number;
  unpaidDaysManual: number;
  dockManualTotal: number;
  bonusManualTotal: number;
  manualNotes: string;
  adjustments: PayrollAdjustment[];
  finalPay: number;
}

export interface EmployeeSalary {
  _id: string;
  name: string;
  email: string;
  department: string;
  baseMonthlySalary: number;
  currency: string;
  salaryEffectiveFrom?: string;
}

/* ─────────── Payroll Overview (Dashboard) ─────────── */

export interface PayrollMonthlyTrend {
  month: number;
  year: number;
  label: string;
  totalPayout: number;
  totalBase: number;
  totalBonus: number;
  totalDock: number;
  headcount: number;
  avgSalary: number;
}

export interface PayrollDeptBreakdown {
  name: string;
  total: number;
}

export interface LatestRunBudget {
  base: number;
  paid: number;
  bonus: number;
  dock: number;
  label: string;
  lineCount: number;
}

export interface PayrollOverview {
  totalRuns: number;
  latestRun: PayrollMonthlyTrend | null;
  grandTotalPayout: number;
  grandTotalBonus: number;
  grandTotalDock: number;
  grandTotalBase: number;
  grandEmployeeCount: number;
  highestPay: number;
  lowestPay: number;
  monthlyTrend: PayrollMonthlyTrend[];
  departmentBreakdown: PayrollDeptBreakdown[];
  latestRunBudget: LatestRunBudget;
}
