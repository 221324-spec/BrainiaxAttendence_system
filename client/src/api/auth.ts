import api from './client';
import type { AuthResponse, LoginRequest, EmployeeProfile } from '../types';

export const authApi = {
  login: async (data: LoginRequest): Promise<AuthResponse> => {
    const res = await api.post<AuthResponse>('/auth/login', data);
    return res.data;
  },

  me: async () => {
    const res = await api.get('/auth/me');
    return res.data;
  },

  getMyProfile: async (): Promise<{ profile: EmployeeProfile }> => {
    const res = await api.get('/auth/profile');
    return res.data;
  },

  updateMyProfile: async (updates: {
    name?: string;
    profilePicture?: string;
    email?: string;
  }): Promise<{ message: string }> => {
    const res = await api.patch('/auth/profile', updates);
    return res.data;
  },

  changePassword: async (newPassword: string): Promise<{ message: string }> => {
    const res = await api.post('/auth/change-password', { newPassword });
    return res.data;
  },
};
