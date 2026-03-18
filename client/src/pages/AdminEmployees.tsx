import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi, deleteEmployee } from '../api';
import Layout from '../components/Layout';
import EmployeeProfileModal from '../components/EmployeeProfileModal';
import { useNavigate } from 'react-router-dom';
import { HiOutlineUsers, HiOutlineMail, HiOutlinePlus, HiOutlineTrash, HiOutlinePencil, HiOutlineFingerPrint, HiOutlineCloudDownload } from 'react-icons/hi';
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
  const [activeTab, setActiveTab] = useState<'employees' | 'device'>('employees');
  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'employees', 'list'],
    queryFn: () => adminApi.getEmployees(),
  });

  // Device users query
  const { data: deviceData, isLoading: deviceLoading } = useQuery({
    queryKey: ['admin', 'biometric', 'users'],
    queryFn: () => adminApi.getBiometricDeviceUsers(),
    enabled: activeTab === 'device',
  });

  // Profile modal state
  const [profileEmployeeId, setProfileEmployeeId] = useState<string | null>(null);

  // Import device users mutation
  const importMutation = useMutation({
    mutationFn: adminApi.importBiometricUsers,
    onSuccess: (result) => {
      toast.success(`Successfully imported ${result.imported} users from device`);
      queryClient.invalidateQueries({ queryKey: ['admin', 'employees'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'biometric'] });
      if (result.errors.length > 0) {
        toast.error(`Import completed with ${result.errors.length} errors`);
      }
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to import users from device');
    },
  });

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
          <h1 className="text-2xl font-extrabold tracking-tight page-heading">Employees</h1>
          <p className="mt-1 text-sm" style={{ color: 'var(--muted)' }}>
            {activeTab === 'employees' 
              ? (data ? `${data.employees.length} registered across ${departments.length} departments` : 'Loading employees...')
              : (deviceData ? `${deviceData.users.length} users enrolled on device` : 'Loading device users...')
            }
          </p>
        </div>
        <div className="flex items-center gap-2">
          {activeTab === 'device' && (
            <button
              onClick={() => importMutation.mutate()}
              disabled={importMutation.isPending}
              className="btn-secondary flex items-center gap-2"
            >
              <HiOutlineCloudDownload className="h-4 w-4" />
              {importMutation.isPending ? 'Importing...' : 'Import All Users'}
            </button>
          )}
          {activeTab === 'employees' && (
            <button
              onClick={() => navigate('/admin/add-employee')}
              className="btn-primary flex items-center gap-2"
            >
              <HiOutlinePlus className="h-4 w-4" />
              Add Employee
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="mb-6">
        <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg w-fit">
          <button
            onClick={() => setActiveTab('employees')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'employees'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <HiOutlineUsers className="inline h-4 w-4 mr-2" />
            System Employees
          </button>
          <button
            onClick={() => setActiveTab('device')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'device'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <HiOutlineFingerPrint className="inline h-4 w-4 mr-2" />
            Device Users
          </button>
        </div>
      </div>

      {activeTab === 'employees' ? (
        // Existing employees content
        isLoading ? (
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
                        <button
                          onClick={() => setProfileEmployeeId(emp._id)}
                          className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${colors.avatar} text-white text-xs font-bold overflow-hidden hover:ring-2 hover:ring-indigo-300 transition-all`}
                        >
                          {emp.profilePicture ? (
                            <img src={emp.profilePicture} alt={emp.name} className="h-full w-full object-cover" />
                          ) : (
                            initials
                          )}
                        </button>
                        <button
                          onClick={() => setProfileEmployeeId(emp._id)}
                          className="flex-1 min-w-0 text-left hover:opacity-80 transition-opacity"
                        >
                          <p className="text-sm font-semibold truncate">{emp.name}</p>
                          <p className="flex items-center gap-1.5 text-xs truncate" style={{ color: 'var(--muted)' }}>
                            <HiOutlineMail className="h-3 w-3 flex-shrink-0" />
                            {emp.email}
                          </p>
                        </button>
                        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-all">
                          <button
                            title={`Edit profile for ${emp.name}`}
                            className="p-1.5 rounded-lg text-indigo-400 hover:text-indigo-600 hover:bg-indigo-50 transition-all"
                            onClick={() => setProfileEmployeeId(emp._id)}
                          >
                            <HiOutlinePencil className="h-4 w-4" />
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
      )
      ) : (
        // Device users content
        deviceLoading ? (
          <div className="flex justify-center py-16">
            <div className="h-10 w-10 animate-spin rounded-full border-[3px] border-indigo-100 border-t-indigo-600" />
          </div>
        ) : !deviceData?.users?.length ? (
          <div className="flex flex-col items-center py-16" style={{ color: 'var(--muted)' }}>
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl mb-4" style={{ backgroundColor: 'var(--input-bg)' }}>
              <HiOutlineFingerPrint className="h-8 w-8" style={{ opacity: 0.5 }} />
            </div>
            <p className="font-medium">No users found on device</p>
            <p className="mt-1 text-sm">Make sure the biometric device is connected and has enrolled users</p>
          </div>
        ) : (
          <div className="card">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Device Enrolled Users</h3>
                <span className="text-sm text-gray-500">{deviceData.users.length} users</span>
              </div>
              <div className="space-y-3">
                {deviceData.users.map((user: any) => (
                  <div key={user.uid} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 text-blue-600 font-semibold">
                        {user.name ? user.name.charAt(0).toUpperCase() : user.uid}
                      </div>
                      <div>
                        <p className="font-medium">{user.name || `User ${user.uid}`}</p>
                        <p className="text-sm text-gray-500">ID: {user.uid}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded-full">
                        Enrolled
                      </span>
                      <button
                        onClick={() => {
                          // Import individual user
                          // For now, just import all, but could add individual import
                          importMutation.mutate();
                        }}
                        className="px-3 py-1 text-sm bg-indigo-600 text-white rounded hover:bg-indigo-700"
                      >
                        Import
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )
      )}

      {/* Employee Profile Modal */}
      {profileEmployeeId && (
        <EmployeeProfileModal
          employeeId={profileEmployeeId}
          onClose={() => setProfileEmployeeId(null)}
          onDelete={async (id: string) => {
            try {
              await deleteEmployee(id);
              await queryClient.invalidateQueries({ queryKey: ['admin', 'employees', 'list'] });
              toast.success('Employee removed');
            } catch (err: any) {
              toast.error(err?.message || 'Failed to remove employee');
            }
          }}
        />
      )}
    </Layout>
  );
}
