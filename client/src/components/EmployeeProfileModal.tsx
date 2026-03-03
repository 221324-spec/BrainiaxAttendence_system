import { useState, useRef, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { adminApi } from '../api/admin';
import toast from 'react-hot-toast';
import {
  HiOutlineX,
  HiOutlineMail,
  HiOutlineOfficeBuilding,
  HiOutlineCurrencyDollar,
  HiOutlineCalendar,
  HiOutlineCamera,
  HiOutlinePencil,
  HiOutlineKey,
  HiOutlineTrash,
  HiOutlineEye,
  HiOutlineEyeOff,
} from 'react-icons/hi';

interface EmployeeProfileModalProps {
  employeeId: string;
  onClose: () => void;
  onDelete?: (id: string) => void;
}

const departments = ['Engineering', 'Marketing', 'HR', 'Finance', 'Operations', 'Sales', 'Design', 'Management'];

export default function EmployeeProfileModal({
  employeeId,
  onClose,
  onDelete,
}: EmployeeProfileModalProps) {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const [profile, setProfile] = useState<{
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
  } | null>(null);

  const [form, setForm] = useState({
    name: '',
    email: '',
    department: '',
    baseMonthlySalary: '',
    currency: 'PKR',
    newPassword: '',
  });

  // Load profile on mount
  useEffect(() => {
    const loadProfile = async () => {
      try {
        const res = await adminApi.getEmployeeProfile(employeeId);
        setProfile(res.profile);
        setForm({
          name: res.profile.name,
          email: res.profile.email,
          department: res.profile.department,
          baseMonthlySalary: res.profile.baseMonthlySalary?.toString() || '',
          currency: res.profile.currency || 'PKR',
          newPassword: '',
        });
      } catch (err: any) {
        toast.error(err.response?.data?.message || 'Failed to load profile');
        onClose();
      } finally {
        setLoading(false);
      }
    };
    loadProfile();
  }, [employeeId, onClose]);

  const handleSave = async () => {
    if (!form.name.trim()) {
      toast.error('Name is required');
      return;
    }
    if (!form.email.trim()) {
      toast.error('Email is required');
      return;
    }
    if (form.newPassword && form.newPassword.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }
    setSaving(true);
    try {
      const updates: any = {
        name: form.name,
        email: form.email,
        department: form.department,
        baseMonthlySalary: form.baseMonthlySalary ? Number(form.baseMonthlySalary) : undefined,
        currency: form.currency,
      };
      if (form.newPassword) {
        updates.password = form.newPassword;
      }
      await adminApi.updateEmployeeProfile(employeeId, updates);
      toast.success('Profile updated successfully');
      // Refresh profile
      const res = await adminApi.getEmployeeProfile(employeeId);
      setProfile(res.profile);
      setForm((prev) => ({ ...prev, newPassword: '' }));
      setEditing(false);
      queryClient.invalidateQueries({ queryKey: ['admin', 'employees'] });
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      toast.error('Image must be less than 2MB');
      return;
    }

    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = reader.result as string;
      try {
        await adminApi.updateEmployeeProfile(employeeId, { profilePicture: base64 });
        setProfile((prev) => prev ? { ...prev, profilePicture: base64 } : null);
        toast.success('Profile picture updated');
        queryClient.invalidateQueries({ queryKey: ['admin', 'employees'] });
      } catch (err: any) {
        toast.error(err.response?.data?.message || 'Failed to upload image');
      }
    };
    reader.readAsDataURL(file);
  };

  const initials = profile?.name
    ?.split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase() || '??';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div
        className="relative w-full max-w-lg rounded-2xl shadow-2xl animate-fade-in overflow-hidden max-h-[90vh] overflow-y-auto"
        style={{ backgroundColor: 'var(--card-bg)', border: '1px solid var(--border)' }}
      >
        {/* Header gradient */}
        <div className="h-24 bg-gradient-to-br from-indigo-500 to-purple-600 relative">
          <button
            onClick={onClose}
            className="absolute top-3 right-3 p-1.5 rounded-lg bg-white/20 text-white hover:bg-white/30 transition-colors"
          >
            <HiOutlineX className="h-5 w-5" />
          </button>
        </div>

        {/* Profile picture */}
        <div className="relative -mt-12 px-6">
          <div className="relative inline-block">
            {profile?.profilePicture ? (
              <img
                src={profile.profilePicture}
                alt={profile.name}
                className="h-24 w-24 rounded-2xl object-cover border-4 shadow-lg"
                style={{ borderColor: 'var(--card-bg)' }}
              />
            ) : (
              <div
                className="h-24 w-24 rounded-2xl bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center text-2xl font-bold text-white border-4 shadow-lg"
                style={{ borderColor: 'var(--card-bg)' }}
              >
                {initials}
              </div>
            )}
            <button
              onClick={() => fileInputRef.current?.click()}
              className="absolute -bottom-1 -right-1 h-8 w-8 rounded-full bg-indigo-600 text-white flex items-center justify-center shadow-lg hover:bg-indigo-700 transition-colors"
              title="Change photo"
            >
              <HiOutlineCamera className="h-4 w-4" />
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="hidden"
            />
          </div>
        </div>

        {/* Content */}
        <div className="px-6 pb-6 pt-4">
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="h-10 w-10 animate-spin rounded-full border-[3px] border-indigo-100 border-t-indigo-600" />
            </div>
          ) : profile ? (
            <>
              {/* Name and actions */}
              <div className="flex items-start justify-between mb-4">
                <div>
                  {editing ? (
                    <input
                      type="text"
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      className="text-xl font-bold input py-1"
                      placeholder="Full name"
                    />
                  ) : (
                    <h2 className="text-xl font-bold">{profile.name}</h2>
                  )}
                  <p className="text-sm text-gray-400 mt-0.5">
                    Member since {new Date(profile.createdAt).toLocaleDateString('en-US', {
                      month: 'long',
                      year: 'numeric',
                    })}
                  </p>
                </div>
                <div className="flex gap-1">
                  {!editing && (
                    <>
                      <button
                        onClick={() => setEditing(true)}
                        className="p-2 rounded-lg text-indigo-500 hover:bg-indigo-50 transition-colors"
                        title="Edit profile"
                      >
                        <HiOutlinePencil className="h-4 w-4" />
                      </button>
                      {onDelete && (
                        <button
                          onClick={() => {
                            if (window.confirm(`Remove ${profile.name}? This will deactivate the employee.`)) {
                              onClose();
                              onDelete(profile._id);
                            }
                          }}
                          className="p-2 rounded-lg text-red-500 hover:bg-red-50 transition-colors"
                          title="Remove employee"
                        >
                          <HiOutlineTrash className="h-4 w-4" />
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>

              {/* Details */}
              <div className="space-y-3">
                <div className="flex items-center gap-3 p-3 rounded-xl" style={{ backgroundColor: 'var(--input-bg)' }}>
                  <HiOutlineMail className="h-5 w-5 text-gray-400 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] uppercase tracking-wider text-gray-400 font-medium">Email</p>
                    {editing ? (
                      <input
                        type="email"
                        value={form.email}
                        onChange={(e) => setForm({ ...form, email: e.target.value })}
                        className="w-full bg-transparent text-sm font-medium outline-none"
                        placeholder="Email address"
                      />
                    ) : (
                      <p className="text-sm font-medium truncate">{profile.email}</p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-3 p-3 rounded-xl" style={{ backgroundColor: 'var(--input-bg)' }}>
                  <HiOutlineOfficeBuilding className="h-5 w-5 text-gray-400 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] uppercase tracking-wider text-gray-400 font-medium">Department</p>
                    {editing ? (
                      <select
                        value={form.department}
                        onChange={(e) => setForm({ ...form, department: e.target.value })}
                        className="w-full bg-transparent text-sm font-medium outline-none"
                      >
                        {departments.map((dept) => (
                          <option key={dept} value={dept}>{dept}</option>
                        ))}
                      </select>
                    ) : (
                      <p className="text-sm font-medium">{profile.department}</p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-3 p-3 rounded-xl" style={{ backgroundColor: 'var(--input-bg)' }}>
                  <HiOutlineCurrencyDollar className="h-5 w-5 text-gray-400 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] uppercase tracking-wider text-gray-400 font-medium">Monthly Salary</p>
                    {editing ? (
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          value={form.baseMonthlySalary}
                          onChange={(e) => setForm({ ...form, baseMonthlySalary: e.target.value })}
                          className="flex-1 bg-transparent text-sm font-medium outline-none"
                          placeholder="0"
                          min={0}
                        />
                        <span className="text-xs text-gray-400">{form.currency}</span>
                      </div>
                    ) : (
                      <p className="text-sm font-medium">
                        {profile.baseMonthlySalary > 0
                          ? `${profile.currency} ${new Intl.NumberFormat('en-PK').format(profile.baseMonthlySalary)}`
                          : 'Not set'}
                      </p>
                    )}
                  </div>
                </div>

                {profile.salaryEffectiveFrom && !editing && (
                  <div className="flex items-center gap-3 p-3 rounded-xl" style={{ backgroundColor: 'var(--input-bg)' }}>
                    <HiOutlineCalendar className="h-5 w-5 text-gray-400 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] uppercase tracking-wider text-gray-400 font-medium">Salary Effective From</p>
                      <p className="text-sm font-medium">
                        {new Date(profile.salaryEffectiveFrom).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                )}

                {/* Password section */}
                <div className="flex items-center gap-3 p-3 rounded-xl" style={{ backgroundColor: 'var(--input-bg)' }}>
                  <HiOutlineKey className="h-5 w-5 text-gray-400 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] uppercase tracking-wider text-gray-400 font-medium">
                      {editing ? 'New Password (leave empty to keep current)' : 'Current Password'}
                    </p>
                    {editing ? (
                      <div className="flex items-center gap-2">
                        <input
                          type={showPassword ? 'text' : 'password'}
                          value={form.newPassword}
                          onChange={(e) => setForm({ ...form, newPassword: e.target.value })}
                          className="flex-1 bg-transparent text-sm font-medium outline-none"
                          placeholder="Min 6 characters"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="text-gray-400 hover:text-gray-600 transition-colors"
                        >
                          {showPassword ? <HiOutlineEyeOff className="h-4 w-4" /> : <HiOutlineEye className="h-4 w-4" />}
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium font-mono">
                          {showPassword
                            ? (profile.plaintextPassword || '••••••••')
                            : '••••••••'}
                        </p>
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="text-gray-400 hover:text-gray-600 transition-colors"
                        >
                          {showPassword ? <HiOutlineEyeOff className="h-4 w-4" /> : <HiOutlineEye className="h-4 w-4" />}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Edit actions */}
              {editing && (
                <div className="flex gap-3 mt-6">
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="btn-primary flex-1"
                  >
                    {saving ? 'Saving...' : 'Save Changes'}
                  </button>
                  <button
                    onClick={() => {
                      setEditing(false);
                      setForm({
                        name: profile.name,
                        email: profile.email,
                        department: profile.department,
                        baseMonthlySalary: profile.baseMonthlySalary?.toString() || '',
                        currency: profile.currency || 'PKR',
                        newPassword: '',
                      });
                    }}
                    className="rounded-xl border px-5 py-2.5 text-sm font-semibold transition-colors hover:bg-gray-50"
                    style={{ borderColor: 'var(--border)' }}
                  >
                    Cancel
                  </button>
                </div>
              )}
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}
