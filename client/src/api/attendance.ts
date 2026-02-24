import api from './client';
import type { Attendance, MonthlySummary } from '../types';

export const attendanceApi = {
  punchIn: async (): Promise<{ message: string; attendance: Attendance }> => {
    const res = await api.post('/attendance/punch-in');
    return res.data;
  },

  punchOut: async (): Promise<{ message: string; attendance: Attendance }> => {
    const res = await api.post('/attendance/punch-out');
    return res.data;
  },

  startBreak: async (): Promise<{ message: string; attendance: Attendance }> => {
    const res = await api.post('/attendance/break-start');
    return res.data;
  },

  endBreak: async (): Promise<{ message: string; attendance: Attendance }> => {
    const res = await api.post('/attendance/break-end');
    return res.data;
  },

  getToday: async (): Promise<{ attendance: Attendance | null }> => {
    const res = await api.get('/attendance/today');
    return res.data;
  },

  getHistory: async (
    year: number,
    month: number
  ): Promise<{ records: Attendance[] }> => {
    const res = await api.get('/attendance/history', {
      params: { year, month },
    });
    return res.data;
  },

  getSummary: async (
    year: number,
    month: number
  ): Promise<{ summary: MonthlySummary }> => {
    const res = await api.get('/attendance/summary', {
      params: { year, month },
    });
    return res.data;
  },

  exportCsv: async (startDate: string, endDate: string): Promise<Blob> => {
    const res = await api.get('/attendance/export-csv', {
      params: { startDate, endDate },
      responseType: 'blob',
    });
    return res.data;
  },
};
