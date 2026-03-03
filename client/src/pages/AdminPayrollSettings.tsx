import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { payrollApi } from '../api/payroll';
import Layout from '../components/Layout';
import toast from 'react-hot-toast';
import {
  HiOutlineCog,
} from 'react-icons/hi';

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const OFF_DAY_OPTIONS = [
  { value: -1, label: 'No Off Day' },
  ...DAY_NAMES.map((name, i) => ({ value: i, label: name })),
];

export default function AdminPayrollSettings() {
  const queryClient = useQueryClient();

  /* ── Company Policy ── */
  const { data: policyData, isLoading: loadingPolicy } = useQuery({
    queryKey: ['payroll', 'policy'],
    queryFn: () => payrollApi.getPolicy(),
  });

  const [weeklyOff, setWeeklyOff] = useState<number | undefined>(undefined);
  const [tz, setTz] = useState<string>('');
  const [minHours, setMinHours] = useState<number | undefined>(undefined);

  // Sync policy data into local state once loaded
  const policy = policyData?.policy;
  const effectiveWeeklyOff = weeklyOff ?? policy?.weeklyOffDay ?? 0;
  const effectiveTz = tz || policy?.timezone || 'Asia/Kolkata';
  const effectiveMinHours = minHours ?? policy?.minHoursForPresent ?? 6;

  const policyMut = useMutation({
    mutationFn: () =>
      payrollApi.updatePolicy({
        weeklyOffDay: effectiveWeeklyOff,
        timezone: effectiveTz,
        minHoursForPresent: effectiveMinHours,
      }),
    onSuccess: () => {
      toast.success('Company policy updated');
      queryClient.invalidateQueries({ queryKey: ['payroll', 'policy'] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Update failed');
    },
  });

  return (
    <Layout>
      <div className="mb-8 animate-fade-in">
        <h1 className="text-2xl font-extrabold tracking-tight page-heading">Payroll Settings</h1>
        <p className="text-sm text-gray-400 mt-0.5">
          Configure company attendance and payroll policy
        </p>
      </div>

      <div className="flex items-center gap-3 mb-3 animate-fade-in">
        <span className="text-[11px] font-bold uppercase tracking-[0.15em] text-gray-400 whitespace-nowrap">Configuration</span>
        <div className="flex-1 h-px section-divider" />
      </div>
      <div className="max-w-lg">
        {/* ── Company Policy Card ── */}
        <div className="card p-6 animate-slide-up">
          <h2 className="flex items-center gap-2.5 text-base font-bold mb-5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
              <HiOutlineCog className="h-5 w-5" />
            </div>
            Company Policy
          </h2>

          {loadingPolicy ? (
            <div className="flex justify-center py-8">
              <div className="h-8 w-8 animate-spin rounded-full border-[3px] border-indigo-100 border-t-indigo-600" />
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="label">Weekly Off Day</label>
                <select
                  value={effectiveWeeklyOff}
                  onChange={(e) => setWeeklyOff(Number(e.target.value))}
                  className="input"
                >
                  {OFF_DAY_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-xs text-gray-400">
                  Used as default when generating payroll. You can override working days per month in the payroll detail page.
                </p>
              </div>
              <div>
                <label className="label">Timezone</label>
                <input
                  type="text"
                  value={effectiveTz}
                  onChange={(e) => setTz(e.target.value)}
                  className="input"
                  placeholder="e.g. Asia/Kolkata"
                />
              </div>
              <div>
                <label className="label">Min Hours for Present</label>
                <input
                  type="number"
                  min={0}
                  step={0.5}
                  value={effectiveMinHours}
                  onChange={(e) => setMinHours(Number(e.target.value))}
                  className="input"
                />
              </div>
              <button
                onClick={() => policyMut.mutate()}
                disabled={policyMut.isPending}
                className="btn-primary w-full"
              >
                {policyMut.isPending ? 'Saving...' : 'Save Policy'}
              </button>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
