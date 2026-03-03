import { useState, useRef, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { authApi } from '../api/auth';
import toast from 'react-hot-toast';
import {
  HiOutlineX,
  HiOutlineMail,
  HiOutlineOfficeBuilding,
  HiOutlineCurrencyDollar,
  HiOutlineCalendar,
  HiOutlineCamera,
  HiOutlinePencil,
  HiOutlineCheck,
  HiOutlineUser,
  HiOutlineKey,
  HiOutlineEye,
  HiOutlineEyeOff,
} from 'react-icons/hi';
import type { EmployeeProfile } from '../types';

interface UserProfileModalProps {
  onClose: () => void;
}

export default function UserProfileModal({ onClose }: UserProfileModalProps) {
  const { user, refreshUser } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isAdmin = user?.role === 'admin';

  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [profile, setProfile] = useState<EmployeeProfile | null>(null);

  // Editable fields
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');

  // Password change
  const [showPwSection, setShowPwSection] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [showNewPw, setShowNewPw] = useState(false);
  const [changingPw, setChangingPw] = useState(false);

  // Load profile on mount
  useEffect(() => {
    const loadProfile = async () => {
      try {
        const res = await authApi.getMyProfile();
        setProfile(res.profile);
        setEditName(res.profile.name);
        setEditEmail(res.profile.email);
      } catch (err: any) {
        toast.error(err.response?.data?.message || 'Failed to load profile');
      } finally {
        setLoading(false);
      }
    };
    loadProfile();
  }, []);

  const handleSave = async () => {
    if (!editName.trim()) {
      toast.error('Name is required');
      return;
    }
    setSaving(true);
    try {
      const updates: any = { name: editName };
      if (isAdmin && editEmail.trim()) {
        updates.email = editEmail;
      }
      await authApi.updateMyProfile(updates);
      toast.success('Profile updated');
      const res = await authApi.getMyProfile();
      setProfile(res.profile);
      setEditing(false);
      refreshUser?.();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (newPassword.length < 6) {
      toast.error('New password must be at least 6 characters');
      return;
    }
    setChangingPw(true);
    try {
      await authApi.changePassword(newPassword);
      toast.success('Password changed successfully');
      setNewPassword('');
      setShowPwSection(false);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to change password');
    } finally {
      setChangingPw(false);
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

    setUploadingImage(true);
    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = reader.result as string;
      try {
        await authApi.updateMyProfile({ profilePicture: base64 });
        setProfile((prev) => prev ? { ...prev, profilePicture: base64 } : null);
        toast.success('Profile picture updated');
        refreshUser?.();
      } catch (err: any) {
        toast.error(err.response?.data?.message || 'Failed to upload image');
      } finally {
        setUploadingImage(false);
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
          <div className={`relative inline-block ${uploadingImage ? 'animate-pulse' : ''}`}>
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
              disabled={uploadingImage}
              className="absolute -bottom-1 -right-1 h-8 w-8 rounded-full bg-indigo-600 text-white flex items-center justify-center shadow-lg hover:bg-indigo-700 transition-colors disabled:opacity-50"
              title="Change photo"
            >
              {uploadingImage ? (
                <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <HiOutlineCamera className="h-4 w-4" />
              )}
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
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="text-xl font-bold input py-1"
                      placeholder="Your name"
                      autoFocus
                    />
                  ) : (
                    <h2 className="text-xl font-bold">{profile.name}</h2>
                  )}
                  <p className="text-sm text-gray-400 mt-0.5">
                    {profile.role && <span className="capitalize">{profile.role}</span>}
                    {profile.department && <> · {profile.department}</>}
                  </p>
                </div>
                {!editing && (
                  <button
                    onClick={() => setEditing(true)}
                    className="p-2 rounded-lg text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 transition-colors"
                    title="Edit profile"
                  >
                    <HiOutlinePencil className="h-4 w-4" />
                  </button>
                )}
              </div>

              {/* Details */}
              <div className="space-y-3">
                {/* Email */}
                <div className="flex items-center gap-3 p-3 rounded-xl" style={{ backgroundColor: 'var(--input-bg)' }}>
                  <HiOutlineMail className="h-5 w-5 text-gray-400 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] uppercase tracking-wider text-gray-400 font-medium">Email</p>
                    {editing && isAdmin ? (
                      <input
                        type="email"
                        value={editEmail}
                        onChange={(e) => setEditEmail(e.target.value)}
                        className="w-full bg-transparent text-sm font-medium outline-none"
                        placeholder="Email address"
                      />
                    ) : (
                      <p className="text-sm font-medium truncate">{profile.email}</p>
                    )}
                  </div>
                </div>

                {/* Department */}
                <div className="flex items-center gap-3 p-3 rounded-xl" style={{ backgroundColor: 'var(--input-bg)' }}>
                  <HiOutlineOfficeBuilding className="h-5 w-5 text-gray-400 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] uppercase tracking-wider text-gray-400 font-medium">Department</p>
                    <p className="text-sm font-medium">{profile.department}</p>
                  </div>
                </div>

                {/* Role */}
                <div className="flex items-center gap-3 p-3 rounded-xl" style={{ backgroundColor: 'var(--input-bg)' }}>
                  <HiOutlineUser className="h-5 w-5 text-gray-400 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] uppercase tracking-wider text-gray-400 font-medium">Role</p>
                    <p className="text-sm font-medium capitalize">{profile.role}</p>
                  </div>
                </div>

                {/* Salary */}
                {profile.baseMonthlySalary > 0 && (
                  <div className="flex items-center gap-3 p-3 rounded-xl" style={{ backgroundColor: 'var(--input-bg)' }}>
                    <HiOutlineCurrencyDollar className="h-5 w-5 text-gray-400 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] uppercase tracking-wider text-gray-400 font-medium">Monthly Salary</p>
                      <p className="text-sm font-medium">
                        {profile.currency} {new Intl.NumberFormat('en-PK').format(profile.baseMonthlySalary)}
                      </p>
                    </div>
                  </div>
                )}

                {/* Member Since */}
                <div className="flex items-center gap-3 p-3 rounded-xl" style={{ backgroundColor: 'var(--input-bg)' }}>
                  <HiOutlineCalendar className="h-5 w-5 text-gray-400 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] uppercase tracking-wider text-gray-400 font-medium">Member Since</p>
                    <p className="text-sm font-medium">
                      {new Date(profile.createdAt).toLocaleDateString('en-US', {
                        month: 'long',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </p>
                  </div>
                </div>
              </div>

              {/* Edit actions */}
              {editing && (
                <div className="flex gap-3 mt-5">
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="btn-primary flex-1 flex items-center justify-center gap-2"
                  >
                    {saving ? (
                      <>
                        <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <HiOutlineCheck className="h-5 w-5" />
                        Save Changes
                      </>
                    )}
                  </button>
                  <button
                    onClick={() => {
                      setEditing(false);
                      setEditName(profile?.name || '');
                      setEditEmail(profile?.email || '');
                    }}
                    className="rounded-xl border px-5 py-2.5 text-sm font-semibold transition-colors hover:bg-gray-50 dark:hover:bg-gray-800"
                    style={{ borderColor: 'var(--border)' }}
                  >
                    Cancel
                  </button>
                </div>
              )}

              {/* Password Change Section */}
              <div className="mt-5 pt-5" style={{ borderTop: '1px solid var(--border)' }}>
                {!showPwSection ? (
                  <button
                    onClick={() => setShowPwSection(true)}
                    className="flex items-center gap-2 text-sm font-semibold text-indigo-500 hover:text-indigo-600 transition-colors"
                  >
                    <HiOutlineKey className="h-4 w-4" />
                    Change Password
                  </button>
                ) : (
                  <div className="space-y-3">
                    <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">Change Password</p>

                    {/* New Password */}
                    <div className="flex items-center gap-3 p-3 rounded-xl" style={{ backgroundColor: 'var(--input-bg)' }}>
                      <HiOutlineKey className="h-5 w-5 text-gray-400 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-[10px] uppercase tracking-wider text-gray-400 font-medium">New Password</p>
                        <div className="flex items-center gap-2">
                          <input
                            type={showNewPw ? 'text' : 'password'}
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            className="flex-1 bg-transparent text-sm font-medium outline-none"
                            placeholder="Min 6 characters"
                          />
                          <button
                            type="button"
                            onClick={() => setShowNewPw(!showNewPw)}
                            className="text-gray-400 hover:text-gray-600 transition-colors"
                          >
                            {showNewPw ? <HiOutlineEyeOff className="h-4 w-4" /> : <HiOutlineEye className="h-4 w-4" />}
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-3">
                      <button
                        onClick={handleChangePassword}
                        disabled={changingPw || newPassword.length < 6}
                        className="btn-primary flex-1 flex items-center justify-center gap-2"
                      >
                        {changingPw ? (
                          <>
                            <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            Changing...
                          </>
                        ) : (
                          'Update Password'
                        )}
                      </button>
                      <button
                        onClick={() => {
                          setShowPwSection(false);
                          setNewPassword('');
                        }}
                        className="rounded-xl border px-4 py-2 text-sm font-semibold transition-colors hover:bg-gray-50 dark:hover:bg-gray-800"
                        style={{ borderColor: 'var(--border)' }}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Footer hint */}
              <p className="text-center text-[10px] text-gray-400 mt-5">
                Click on your profile picture to update it · Max 2MB
              </p>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}
