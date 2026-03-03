import api from './client';
import type {
  CompanyPolicy,
  PayrollRun,
  PayrollEmployeeLine,
  EmployeeSalary,
  PayrollOverview,
} from '../types';

export const payrollApi = {
  /* ─────────── Company Policy ─────────── */
  getOverview: async (months: number = 6): Promise<PayrollOverview> => {
    const res = await api.get<PayrollOverview>('/admin/payroll/overview', { params: { months } });
    return res.data;
  },
  getPolicy: async (): Promise<{ policy: CompanyPolicy }> => {
    const res = await api.get('/admin/payroll/policy');
    return res.data;
  },
  updatePolicy: async (data: Partial<CompanyPolicy>): Promise<{ policy: CompanyPolicy }> => {
    const res = await api.patch('/admin/payroll/policy', data);
    return res.data;
  },

  /* ─────────── Employee Salary ─────────── */
  getEmployeeSalary: async (employeeId: string): Promise<{ salary: EmployeeSalary }> => {
    const res = await api.get(`/admin/payroll/salary/${employeeId}`);
    return res.data;
  },
  updateEmployeeSalary: async (
    employeeId: string,
    data: { baseMonthlySalary: number; currency?: string }
  ): Promise<any> => {
    const res = await api.patch(`/admin/payroll/salary/${employeeId}`, data);
    return res.data;
  },

  /* ─────────── Payroll Runs ─────────── */
  listRuns: async (): Promise<{ runs: PayrollRun[] }> => {
    const res = await api.get('/admin/payroll/runs');
    return res.data;
  },
  generateRun: async (month: number, year: number): Promise<any> => {
    const res = await api.post('/admin/payroll/generate', { month, year });
    return res.data;
  },
  recalculate: async (runId: string): Promise<any> => {
    const res = await api.post(`/admin/payroll/${runId}/recalculate`);
    return res.data;
  },
  updateWorkingDays: async (runId: string, workingDays: number): Promise<any> => {
    const res = await api.patch(`/admin/payroll/${runId}/working-days`, { workingDays });
    return res.data;
  },
  getRun: async (runId: string): Promise<{ run: PayrollRun; summary: { totalLines: number; draftLines: number; finalLines: number } }> => {
    const res = await api.get(`/admin/payroll/${runId}`);
    return res.data;
  },
  getRunLines: async (runId: string, status?: string): Promise<{ lines: PayrollEmployeeLine[] }> => {
    const params: any = {};
    if (status) params.status = status;
    const res = await api.get(`/admin/payroll/${runId}/lines`, { params });
    return res.data;
  },

  /* ─────────── Manual Edits ─────────── */
  updateManualFields: async (
    runId: string,
    userId: string,
    data: {
      unpaidDaysManual?: number;
      dockManualTotal?: number;
      bonusManualTotal?: number;
      manualNotes?: string;
      reason: string;
    }
  ): Promise<any> => {
    const res = await api.patch(`/admin/payroll/${runId}/line/${userId}/manual`, data);
    return res.data;
  },
  addAdjustment: async (
    runId: string,
    userId: string,
    data: { type: 'BONUS' | 'DOCK' | 'OTHER'; amount: number; reason: string }
  ): Promise<any> => {
    const res = await api.post(`/admin/payroll/${runId}/line/${userId}/adjustment`, data);
    return res.data;
  },

  /* ─────────── Finalize / Revert ─────────── */
  finalize: async (runId: string, userId: string, reason: string): Promise<any> => {
    const res = await api.post(`/admin/payroll/${runId}/line/${userId}/finalize`, { reason });
    return res.data;
  },
  revert: async (runId: string, userId: string, reason: string): Promise<any> => {
    const res = await api.post(`/admin/payroll/${runId}/line/${userId}/revert`, { reason });
    return res.data;
  },

  /* ─────────── CSV Export ─────────── */
  exportCsv: async (runId: string): Promise<Blob> => {
    const res = await api.get(`/admin/payroll/${runId}/export/csv`, {
      responseType: 'blob',
    });
    return res.data;
  },
};
