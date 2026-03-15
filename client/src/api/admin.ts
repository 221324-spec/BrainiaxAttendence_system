import api from './client';
import type { DashboardStats, EmployeeWithStatus, User } from '../types';

export const adminApi = {
  getDashboard: async (): Promise<DashboardStats> => {
    const res = await api.get<DashboardStats>('/admin/dashboard');
    return res.data;
  },

  getEmployees: async (): Promise<{ employees: User[] }> => {
    const res = await api.get('/admin/employees');
    return res.data;
  },

  getEmployeesWithStatus: async (): Promise<{
    employees: EmployeeWithStatus[];
  }> => {
    const res = await api.get('/admin/employees/status');
    return res.data;
  },

  createEmployee: async (data: {
    name: string;
    email: string;
    password: string;
    department: string;
    employeeType?: 'remote' | 'onsite';
    biometricUserId?: number;
    baseMonthlySalary?: number;
    currency?: string;
  }): Promise<{ message: string; user: any }> => {
    // Use different endpoints based on employee type
    const endpoint = data.employeeType === 'onsite' ? '/admin/onsite-employee' : '/admin/employees';
    const res = await api.post(endpoint, data);
    return res.data;
  },

  deleteEmployee: async (employeeId: string): Promise<{ message: string }> => {
    const res = await api.delete(`/admin/employees/${employeeId}`);
    return res.data;
  },

  exportCsv: async (
    employeeId: string,
    startDate: string,
    endDate: string
  ): Promise<Blob> => {
    const res = await api.get(`/admin/export/${employeeId}`, {
      params: { startDate, endDate },
      responseType: 'blob',
    });
    return res.data;
  },

  correctAttendance: async (payload: any): Promise<any> => {
    const res = await api.post('/admin/attendance/correct', payload);
    return res.data;
  },

  resetPassword: async (employeeId: string, newPassword: string): Promise<{ message: string }> => {
    const res = await api.patch(`/admin/employees/${employeeId}/reset-password`, { newPassword });
    return res.data;
  },

  getEmployeeSalary: async (employeeId: string): Promise<{
    salary: {
      baseMonthlySalary: number;
      currency: string;
      salaryEffectiveFrom: string | null;
    };
  }> => {
    const res = await api.get(`/admin/employees/${employeeId}/salary`);
    return res.data;
  },

  updateEmployeeSalary: async (
    employeeId: string,
    baseMonthlySalary: number,
    currency: string = 'PKR'
  ): Promise<{ message: string }> => {
    const res = await api.patch(`/admin/employees/${employeeId}/salary`, {
      baseMonthlySalary,
      currency,
    });
    return res.data;
  },

  getEmployeeProfile: async (employeeId: string): Promise<{
    profile: {
      _id: string;
      name: string;
      email: string;
      department: string;
      profilePicture?: string;
      baseMonthlySalary: number;
      currency: string;
      salaryEffectiveFrom?: string;
      plaintextPassword?: string;
      createdAt: string;
    };
  }> => {
    const res = await api.get(`/admin/employees/${employeeId}/profile`);
    return res.data;
  },

  updateEmployeeProfile: async (
    employeeId: string,
    updates: {
      name?: string;
      email?: string;
      department?: string;
      baseMonthlySalary?: number;
      currency?: string;
      profilePicture?: string;
      password?: string;
    }
  ): Promise<{ message: string }> => {
    const res = await api.patch(`/admin/employees/${employeeId}/profile`, updates);
    return res.data;
  },

  // Onsite employee management
  getOnsiteEmployees: async (): Promise<{ employees: User[] }> => {
    const res = await api.get('/admin/onsite-employees');
    return res.data;
  },

  createOnsiteEmployee: async (data: {
    name: string;
    email: string;
    password: string;
    department: string;
    biometricUserId?: number;
    baseMonthlySalary?: number;
    currency?: string;
  }): Promise<{ message: string; user: any }> => {
    const res = await api.post('/admin/onsite-employee', data);
    return res.data;
  },

  updateOnsiteEmployee: async (
    employeeId: string,
    updates: {
      name?: string;
      email?: string;
      department?: string;
      biometricUserId?: number;
      baseMonthlySalary?: number;
      currency?: string;
      profilePicture?: string;
      password?: string;
    }
  ): Promise<{ message: string }> => {
    const res = await api.put(`/admin/onsite-employee/${employeeId}`, updates);
    return res.data;
  },

  deleteOnsiteEmployee: async (employeeId: string): Promise<{ message: string }> => {
    const res = await api.delete(`/admin/onsite-employee/${employeeId}`);
    return res.data;
  },

  // Onsite attendance management
  getOnsiteAttendance: async (params?: {
    date?: string;
    employeeId?: string;
    department?: string;
  }): Promise<{ records: any[] }> => {
    const res = await api.get('/admin/onsite-attendance', { params });
    return res.data;
  },

  importOnsiteAttendanceCsv: async (file: File): Promise<{ imported: number; errors: string[] }> => {
    const formData = new FormData();
    formData.append('csvFile', file);

    const res = await api.post('/admin/onsite-attendance/import-csv', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return res.data;
  },
};

// also provide a named export for callers that prefer direct import
export async function deleteEmployee(employeeId: string): Promise<{ message: string }> {
  const res = await api.delete(`/admin/employees/${employeeId}`);
  return res.data;
}
