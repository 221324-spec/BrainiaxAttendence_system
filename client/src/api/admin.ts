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
  }): Promise<{ message: string; user: any }> => {
    const res = await api.post('/admin/employees', data);
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
};
