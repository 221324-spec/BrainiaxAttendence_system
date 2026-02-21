import { useState, type FormEvent } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { adminApi } from '../api';
import Layout from '../components/Layout';
import toast from 'react-hot-toast';
import {
  HiOutlineUserAdd,
  HiOutlineUser,
  HiOutlineMail,
  HiOutlineLockClosed,
  HiOutlineOfficeBuilding,
  HiOutlineArrowLeft,
} from 'react-icons/hi';

export default function AddEmployee() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    department: '',
  });

  const mutation = useMutation({
    mutationFn: (data: typeof form) => adminApi.createEmployee(data),
    onSuccess: (data) => {
      toast.success(data.message);
      queryClient.invalidateQueries({ queryKey: ['admin', 'employees'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'dashboard'] });
      setForm({ name: '', email: '', password: '', department: '' });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to create employee');
    },
  });

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.password || !form.department) {
      toast.error('Please fill in all fields');
      return;
    }
    if (form.password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }
    mutation.mutate(form);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const departments = ['Engineering', 'Marketing', 'HR', 'Finance', 'Operations', 'Sales', 'Design', 'Management'];

  return (
    <Layout>
      <div className="mb-8 animate-fade-in">
        <button
          onClick={() => navigate('/admin/employees')}
          className="mb-4 flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-primary-600 transition-colors"
        >
          <HiOutlineArrowLeft className="h-4 w-4" />
          Back to Employees
        </button>
        <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Add New Employee</h1>
        <p className="mt-1.5 text-sm text-gray-500">
          Register a new employee to the attendance system
        </p>
      </div>

      <div className="mx-auto max-w-3xl animate-slide-up">
        <div className="card relative overflow-hidden">
          {/* Decorative gradient */}
          <div className="absolute -top-24 -right-24 h-48 w-48 rounded-full bg-gradient-to-br from-primary-50 to-transparent blur-2xl" />

          <div className="relative">
            <div className="mb-6 flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-primary-500 to-primary-600 text-white shadow-lg shadow-primary-200/50">
                <HiOutlineUserAdd className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-900">Employee Details</h2>
                <p className="text-xs text-gray-400">Fill in all fields to create account</p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="label">Full Name</label>
                <div className="relative group">
                  <HiOutlineUser className="absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400 transition-colors group-focus-within:text-primary-500" />
                  <input
                    type="text"
                    name="name"
                    value={form.name}
                    onChange={handleChange}
                    className="input pl-11"
                    placeholder="John Doe"
                  />
                </div>
              </div>

              <div>
                <label className="label">Email Address</label>
                <div className="relative group">
                  <HiOutlineMail className="absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400 transition-colors group-focus-within:text-primary-500" />
                  <input
                    type="email"
                    name="email"
                    value={form.email}
                    onChange={handleChange}
                    className="input pl-11"
                    placeholder="john@company.com"
                  />
                </div>
              </div>

              <div>
                <label className="label">Password</label>
                <div className="relative group">
                  <HiOutlineLockClosed className="absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400 transition-colors group-focus-within:text-primary-500" />
                  <input
                    type="password"
                    name="password"
                    value={form.password}
                    onChange={handleChange}
                    className="input pl-11"
                    placeholder="Minimum 6 characters"
                  />
                </div>
              </div>

              <div>
                <label className="label">Department</label>
                <div className="relative group">
                  <HiOutlineOfficeBuilding className="absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400 transition-colors group-focus-within:text-primary-500" />
                  <select
                    name="department"
                    value={form.department}
                    onChange={handleChange}
                    className="input pl-11 appearance-none"
                  >
                    <option value="">Select department...</option>
                    {departments.map((dept) => (
                      <option key={dept} value={dept}>
                        {dept}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="md:col-span-2 flex gap-3 pt-3">
                <button
                  type="submit"
                  disabled={mutation.isPending}
                  className="btn-primary flex-1 py-3"
                >
                  {mutation.isPending ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Creating...
                    </span>
                  ) : (
                    'Create Employee'
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => navigate('/admin/employees')}
                  className="rounded-xl border border-gray-200 bg-white px-6 py-3 text-sm font-semibold text-gray-700 shadow-sm transition-all hover:border-gray-300 hover:shadow-md active:scale-[0.98]"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </Layout>
  );
}
