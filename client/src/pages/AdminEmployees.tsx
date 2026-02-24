import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { adminApi, deleteEmployee } from '../api';
import Layout from '../components/Layout';
import { useNavigate } from 'react-router-dom';
import { HiOutlineUsers, HiOutlineMail, HiOutlinePlus, HiOutlineTrash, HiOutlineKey, HiOutlineX } from 'react-icons/hi';
import toast from 'react-hot-toast';

const DEPT_COLORS: Record<string, { bg: string; border: string; badge: string; avatar: string }> = {
  Engineering: { bg: 'bg-indigo-50', border: 'border-indigo-200/60', badge: 'bg-indigo-100 text-indigo-700', avatar: 'from-indigo-500 to-indigo-600' },
  Marketing: { bg: 'bg-emerald-50', border: 'border-emerald-200/60', badge: 'bg-emerald-100 text-emerald-700', avatar: 'from-emerald-500 to-emerald-600' },
  HR: { bg: 'bg-rose-50', border: 'border-rose-200/60', badge: 'bg-rose-100 text-rose-700', avatar: 'from-rose-500 to-rose-600' },
  Finance: { bg: 'bg-amber-50', border: 'border-amber-200/60', badge: 'bg-amber-100 text-amber-700', avatar: 'from-amber-500 to-amber-600' },
  Operations: { bg: 'bg-cyan-50', border: 'border-cyan-200/60', badge: 'bg-cyan-100 text-cyan-700', avatar: 'from-cyan-500 to-cyan-600' },
  Sales: { bg: 'bg-violet-50', border: 'border-violet-200/60', badge: 'bg-violet-100 text-violet-700', avatar: 'from-violet-500 to-violet-600' },
  Design: { bg: 'bg-pink-50', border: 'border-pink-200/60', badge: 'bg-pink-100 text-pink-700', avatar: 'from-pink-500 to-pink-600' },
  Management: { bg: 'bg-blue-50', border: 'border-blue-200/60', badge: 'bg-blue-100 text-blue-700', avatar: 'from-blue-500 to-blue-600' },
};

const DEFAULT_COLORS = { bg: 'bg-gray-50', border: 'border-gray-200/60', badge: 'bg-gray-100 text-gray-700', avatar: 'from-gray-500 to-gray-600' };

function getDeptColor(dept: string) {
  return DEPT_COLORS[dept] || DEFAULT_COLORS;
}

export default function AdminEmployees() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'employees', 'list'],
    queryFn: () => adminApi.getEmployees(),
  });

  // Reset password modal state
  const [resetTarget, setResetTarget] = useState<{ id: string; name: string } | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [resetting, setResetting] = useState(false);

  const handleResetPassword = async () => {
    if (!resetTarget) return;
    if (newPassword.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }
    setResetting(true);
    try {
      const res = await adminApi.resetPassword(resetTarget.id, newPassword);
      toast.success(res.message);
      setResetTarget(null);
      setNewPassword('');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Reset failed');
    } finally {
      setResetting(false);
    }
  };

  // Group employees by department (only departments that have employees)
  const employees = data?.employees ?? [];
  const grouped: Record<string, typeof employees> = {};
  employees.forEach((emp) => {
    const dept = emp.department || 'Unknown';
    if (!grouped[dept]) grouped[dept] = [];
    grouped[dept].push(emp);
  });
  const departments = Object.keys(grouped).sort();

  return (
    <Layout>
      <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 animate-fade-in">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">Employees</h1>
          <p className="mt-1 text-sm" style={{ color: 'var(--muted)' }}>
            {data ? `${data.employees.length} registered across ${departments.length} departments` : 'Loading employees...'}
          </p>
        </div>
        <button
          onClick={() => navigate('/admin/add-employee')}
          className="btn-primary flex items-center gap-2"
        >
          <HiOutlinePlus className="h-4 w-4" />
          Add Employee
        </button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16">
          <div className="h-10 w-10 animate-spin rounded-full border-[3px] border-indigo-100 border-t-indigo-600" />
        </div>
      ) : departments.length === 0 ? (
        <div className="flex flex-col items-center py-16" style={{ color: 'var(--muted)' }}>
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl mb-4" style={{ backgroundColor: 'var(--input-bg)' }}>
            <HiOutlineUsers className="h-8 w-8" style={{ opacity: 0.5 }} />
          </div>
          <p className="font-medium">No employees found</p>
          <p className="mt-1 text-sm">Add your first employee to get started</p>
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2 xl:grid-cols-3 animate-fade-in">
          {departments.map((dept) => {
            const colors = getDeptColor(dept);
            const employees = grouped[dept];
            return (
              <div key={dept} className="card p-0 overflow-hidden">
                {/* Column header */}
                <div className="px-5 py-3.5 flex items-center justify-between" style={{ borderBottom: '1px solid var(--border)' }}>
                  <div className="flex items-center gap-2.5">
                    <span className={`inline-flex items-center rounded-lg px-2.5 py-1 text-xs font-bold ${colors.badge}`}>
                      {dept}
                    </span>
                  </div>
                  <span className="text-xs font-semibold tabular-nums" style={{ color: 'var(--muted)' }}>
                    {employees.length} {employees.length === 1 ? 'member' : 'members'}
                  </span>
                </div>

                {/* Employee list */}
                <div className="divide-y" style={{ borderColor: 'var(--border)' }}>
                  {employees.map((emp) => {
                    const initials = emp.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase();
                    return (
                      <div key={emp._id} className="px-5 py-3 flex items-center gap-3 group transition-colors hover:bg-gray-50/50">
                        <div className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${colors.avatar} text-white text-xs font-bold`}>
                          {initials}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold truncate">{emp.name}</p>
                          <p className="flex items-center gap-1.5 text-xs truncate" style={{ color: 'var(--muted)' }}>
                            <HiOutlineMail className="h-3 w-3 flex-shrink-0" />
                            {emp.email}
                          </p>
                        </div>
                        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-all">
                          <button
                            title={`Reset password for ${emp.name}`}
                            className="p-1.5 rounded-lg text-amber-400 hover:text-amber-600 hover:bg-amber-50 transition-all"
                            onClick={() => { setResetTarget({ id: emp._id, name: emp.name }); setNewPassword(''); }}
                          >
                            <HiOutlineKey className="h-4 w-4" />
                          </button>
                          <button
                            title={`Remove ${emp.name}`}
                            className="p-1.5 rounded-lg text-red-400 hover:text-red-600 hover:bg-red-50 transition-all"
                          onClick={async () => {
                            const ok = window.confirm(`Remove ${emp.name}? This will deactivate the employee.`);
                            if (!ok) return;
                            try {
                              await deleteEmployee(emp._id);
                              await queryClient.invalidateQueries({ queryKey: ['admin', 'employees', 'list'] });
                              toast.success('Employee removed');
                            } catch (err: any) {
                              toast.error(err?.message || 'Failed to remove employee');
                            }
                          }}
                        >
                          <HiOutlineTrash className="h-4 w-4" />
                        </button>                        </div>                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Reset Password Modal */}
      {resetTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => { setResetTarget(null); setNewPassword(''); }} />
          {/* Dialog */}
          <div className="relative w-full max-w-md rounded-2xl p-6 shadow-xl animate-fade-in" style={{ backgroundColor: 'var(--card-bg)', border: '1px solid var(--border)' }}>
            <button
              onClick={() => { setResetTarget(null); setNewPassword(''); }}
              className="absolute top-4 right-4 p-1 rounded-lg transition-colors hover:bg-gray-100"
              style={{ color: 'var(--muted)' }}
            >
              <HiOutlineX className="h-5 w-5" />
            </button>
            <div className="flex items-center gap-3 mb-5">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
                <HiOutlineKey className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold">Reset Password</h3>
                <p className="text-xs" style={{ color: 'var(--muted)' }}>
                  Set a new password for <strong>{resetTarget.name}</strong>
                </p>
              </div>
            </div>
            <div className="mb-5">
              <label className="label">New Password</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="input"
                placeholder="Minimum 6 characters"
                autoFocus
                onKeyDown={(e) => e.key === 'Enter' && handleResetPassword()}
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleResetPassword}
                disabled={resetting || newPassword.length < 6}
                className="btn-primary flex-1"
              >
                {resetting ? 'Resetting...' : 'Reset Password'}
              </button>
              <button
                onClick={() => { setResetTarget(null); setNewPassword(''); }}
                className="rounded-xl border px-5 py-2.5 text-sm font-semibold transition-colors hover:bg-gray-50"
                style={{ borderColor: 'var(--border)', color: 'var(--text)' }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
