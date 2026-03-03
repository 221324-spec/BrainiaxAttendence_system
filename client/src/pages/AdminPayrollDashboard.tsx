import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { payrollApi } from '../api/payroll';
import Layout from '../components/Layout';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import {
  HiOutlineCurrencyDollar,
  HiOutlineCalendar,
  HiOutlineRefresh,
  HiOutlinePlusCircle,
  HiOutlineDownload,
  HiOutlineCash,
  HiOutlineTrendingUp,
  HiOutlineTrendingDown,
  HiOutlineUsers,
} from 'react-icons/hi';

const MONTH_NAMES = [
  '', 'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export default function AdminPayrollDashboard() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const now = new Date();
  const [genMonth, setGenMonth] = useState(now.getMonth() + 1);
  const [genYear, setGenYear] = useState(now.getFullYear());

  /* ── Queries ── */
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['payroll', 'runs'],
    queryFn: () => payrollApi.listRuns(),
  });

  const { data: overview } = useQuery({
    queryKey: ['payroll', 'overview'],
    queryFn: () => payrollApi.getOverview(),
  });

  /* ── Generate ── */
  const generateMut = useMutation({
    mutationFn: () => payrollApi.generateRun(genMonth, genYear),
    onSuccess: (res) => {
      toast.success(res.message || 'Payroll generated');
      queryClient.invalidateQueries({ queryKey: ['payroll', 'runs'] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Generation failed');
    },
  });

  const runs = data?.runs || [];

  /* ── Chart helpers ── */
  const fmtMoney = (n: number) => {
    if (n >= 1_000_000) return `PKR ${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000) return `PKR ${(n / 1_000).toFixed(1)}K`;
    return `PKR ${n.toFixed(0)}`;
  };

  return (
    <Layout>
      <div className="mb-8 animate-fade-in">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight page-heading">Payroll Management</h1>
            <p className="text-sm text-gray-400 mt-0.5">
              Generate, review, and finalize monthly payroll for employees
            </p>
          </div>
          <button
            onClick={() => refetch()}
            className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-2 text-xs font-semibold shadow-sm hover:bg-gray-50 transition-all"
          >
            <HiOutlineRefresh className="h-3.5 w-3.5" /> Refresh
          </button>
        </div>
      </div>

      {/* ── Financial Overview Section ── */}
      {overview && overview.totalRuns > 0 && (
        <>
          <div className="flex items-center gap-3 mb-3 animate-fade-in">
            <span className="text-[11px] font-bold uppercase tracking-[0.15em] text-gray-400 whitespace-nowrap">Financial Overview</span>
            <div className="flex-1 h-px section-divider" />
          </div>

          {/* Stat cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6 animate-fade-in stagger">
            <div className="card stat-card-enhanced flex items-center gap-4 p-5 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200">
              <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl bg-indigo-50 shadow-sm">
                <HiOutlineCurrencyDollar className="h-6 w-6 text-indigo-600" />
              </div>
              <div>
                <p className="text-[1.45rem] font-extrabold leading-none tracking-tight">{fmtMoney(overview.latestRun?.totalPayout ?? 0)}</p>
                <p className="text-[11px] font-semibold text-gray-400 mt-1.5 uppercase tracking-wider">Latest Payout</p>
              </div>
            </div>
            <div className="card stat-card-enhanced flex items-center gap-4 p-5 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200">
              <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl bg-emerald-50 shadow-sm">
                <HiOutlineCash className="h-6 w-6 text-emerald-600" />
              </div>
              <div>
                <p className="text-[1.45rem] font-extrabold leading-none tracking-tight">{fmtMoney(overview.grandTotalPayout)}</p>
                <p className="text-[11px] font-semibold text-gray-400 mt-1.5 uppercase tracking-wider">All-Time Payouts</p>
              </div>
            </div>
            <div className="card stat-card-enhanced flex items-center gap-4 p-5 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200">
              <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl bg-amber-50 shadow-sm">
                <HiOutlineTrendingUp className="h-6 w-6 text-amber-600" />
              </div>
              <div>
                <p className="text-[1.45rem] font-extrabold leading-none tracking-tight">{fmtMoney(overview.grandTotalBonus)}</p>
                <p className="text-[11px] font-semibold text-gray-400 mt-1.5 uppercase tracking-wider">Total Bonuses</p>
              </div>
            </div>
            <div className="card stat-card-enhanced flex items-center gap-4 p-5 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200">
              <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl bg-rose-50 shadow-sm">
                <HiOutlineTrendingDown className="h-6 w-6 text-rose-600" />
              </div>
              <div>
                <p className="text-[1.45rem] font-extrabold leading-none tracking-tight">{fmtMoney(overview.grandTotalDock)}</p>
                <p className="text-[11px] font-semibold text-gray-400 mt-1.5 uppercase tracking-wider">Total Deductions</p>
              </div>
            </div>
          </div>

          {/* Quick info bar */}
          <div className="card p-4 mb-8 animate-fade-in">
            <div className="flex flex-wrap items-center gap-6 text-sm">
              <div className="flex items-center gap-2">
                <HiOutlineUsers className="h-4 w-4 text-gray-400" />
                <span className="text-gray-400 text-xs font-semibold uppercase tracking-wider">Employees Paid:</span>
                <span className="font-bold">{overview.latestRun?.headcount ?? 0}</span>
              </div>
              <div className="h-5 w-px" style={{ backgroundColor: 'var(--border)' }} />
              <div className="flex items-center gap-2">
                <span className="text-gray-400 text-xs font-semibold uppercase tracking-wider">Avg Salary:</span>
                <span className="font-bold">{fmtMoney(overview.latestRun?.avgSalary ?? 0)}</span>
              </div>
              <div className="h-5 w-px" style={{ backgroundColor: 'var(--border)' }} />
              <div className="flex items-center gap-2">
                <span className="text-gray-400 text-xs font-semibold uppercase tracking-wider">Highest:</span>
                <span className="font-bold text-emerald-600">{fmtMoney(overview.highestPay)}</span>
              </div>
              <div className="h-5 w-px" style={{ backgroundColor: 'var(--border)' }} />
              <div className="flex items-center gap-2">
                <span className="text-gray-400 text-xs font-semibold uppercase tracking-wider">Lowest:</span>
                <span className="font-bold text-rose-500">{fmtMoney(overview.lowestPay)}</span>
              </div>
            </div>
          </div>
        </>
      )}

      {/* ── Generate Section ── */}
      <div className="flex items-center gap-3 mb-3 animate-fade-in">
        <span className="text-[11px] font-bold uppercase tracking-[0.15em] text-gray-400 whitespace-nowrap">Generate</span>
        <div className="flex-1 h-px section-divider" />
      </div>
      <div className="card mb-8 p-6 animate-slide-up">
        <h2 className="flex items-center gap-2.5 text-base font-bold mb-4">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
            <HiOutlinePlusCircle className="h-5 w-5" />
          </div>
          Generate Payroll Run
        </h2>
        <div className="flex flex-col sm:flex-row items-end gap-4">
          <div className="w-full sm:w-40">
            <label className="label">Month</label>
            <select
              value={genMonth}
              onChange={(e) => setGenMonth(Number(e.target.value))}
              className="input"
            >
              {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                <option key={m} value={m}>
                  {MONTH_NAMES[m]}
                </option>
              ))}
            </select>
          </div>
          <div className="w-full sm:w-32">
            <label className="label">Year</label>
            <input
              type="number"
              min={2020}
              max={2100}
              value={genYear}
              onChange={(e) => setGenYear(Number(e.target.value))}
              className="input"
            />
          </div>
          <button
            onClick={() => generateMut.mutate()}
            disabled={generateMut.isPending}
            className="btn-primary whitespace-nowrap"
          >
            {generateMut.isPending ? 'Generating...' : 'Generate'}
          </button>
        </div>
      </div>

      {/* ── History Section ── */}
      <div className="flex items-center gap-3 mb-3 animate-fade-in">
        <span className="text-[11px] font-bold uppercase tracking-[0.15em] text-gray-400 whitespace-nowrap">History</span>
        <div className="flex-1 h-px section-divider" />
      </div>
      <div className="card animate-slide-up">
        <div className="flex items-center justify-between mb-5">
          <h2 className="flex items-center gap-2.5 text-base font-bold">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
              <HiOutlineCalendar className="h-5 w-5" />
            </div>
            Payroll Runs
          </h2>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="h-10 w-10 animate-spin rounded-full border-[3px] border-indigo-100 border-t-indigo-600" />
          </div>
        ) : runs.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-12 text-gray-400">
            <HiOutlineCurrencyDollar className="h-10 w-10 text-gray-300" />
            <p className="font-medium">No payroll runs yet</p>
            <p className="text-sm">Generate your first payroll run above</p>
          </div>
        ) : (
          <div className="overflow-x-auto -mx-6 px-6">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="table-header">Month</th>
                  <th className="table-header">Year</th>
                  <th className="table-header">Status</th>
                  <th className="table-header">Generated</th>
                  <th className="table-header">Last Recalculated</th>
                  <th className="table-header">Action</th>
                  <th className="table-header">Export</th>
                </tr>
              </thead>
              <tbody>
                {runs.map((run) => {
                  const generatedBy =
                    typeof run.generatedBy === 'object' ? run.generatedBy.name : '';
                  return (
                    <tr key={run._id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                      <td className="table-cell font-semibold">{MONTH_NAMES[run.month]}</td>
                      <td className="table-cell">{run.year}</td>
                      <td className="table-cell">
                        <span className="badge-success">{run.status}</span>
                      </td>
                      <td className="table-cell">
                        <div className="text-xs">
                          {new Date(run.generatedAt).toLocaleDateString()}
                        </div>
                        {generatedBy && (
                          <div className="text-xs text-gray-400">by {generatedBy}</div>
                        )}
                      </td>
                      <td className="table-cell text-xs text-gray-400">
                        {run.lastRecalculatedAt
                          ? new Date(run.lastRecalculatedAt).toLocaleDateString()
                          : '—'}
                      </td>
                      <td className="table-cell">
                        <button
                          onClick={() => navigate(`/admin/payroll/${run._id}`)}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-indigo-700 transition-colors"
                        >
                          View / Edit
                        </button>
                      </td>
                      <td className="table-cell">
                        <button
                          onClick={async () => {
                            try {
                              const blob = await payrollApi.exportCsv(run._id);
                              const url = window.URL.createObjectURL(blob);
                              const a = document.createElement('a');
                              a.href = url;
                              a.download = `Payroll_${run.month}_${run.year}.csv`;
                              document.body.appendChild(a);
                              a.click();
                              document.body.removeChild(a);
                              window.URL.revokeObjectURL(url);
                              toast.success('CSV exported');
                            } catch {
                              toast.error('Export failed');
                            }
                          }}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3.5 py-1.5 text-xs font-semibold text-emerald-700 shadow-sm hover:bg-emerald-100 transition-colors"
                        >
                          <HiOutlineDownload className="h-3.5 w-3.5" />
                          CSV
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </Layout>
  );
}
