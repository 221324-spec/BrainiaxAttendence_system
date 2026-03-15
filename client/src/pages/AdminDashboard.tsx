import { useState, useCallback } from 'react';
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
} from 'chart.js';
import { Doughnut, Bar } from 'react-chartjs-2';
import PayrollTrendChart, { type PayrollTrendRange } from '../components/PayrollTrendChart';
import { useQuery } from '@tanstack/react-query';
import { adminApi } from '../api';
import { payrollApi } from '../api/payroll';
import Layout from '../components/Layout';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import {
  HiOutlineUsers,
  HiOutlineRefresh,
  HiOutlineCheckCircle,
  HiOutlineXCircle,
  HiOutlineTrendingUp,
} from 'react-icons/hi';
 import UserProfileModal from '../components/UserProfileModal';

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement);

/* ─────────────── Stat Card ─────────────── */
function StatCard({
  icon: Icon,
  label,
  value,
  iconBg,
  iconColor,
}: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  iconBg: string;
  iconColor: string;
}) {
  return (
    <div className="card stat-card-enhanced flex items-center gap-3 p-4 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200">
      <div className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-2xl ${iconBg} shadow-sm`}>
        <Icon className={`h-5 w-5 ${iconColor}`} />
      </div>
      <div>
        <p className="text-[1.4rem] font-extrabold leading-none tracking-tight">{value}</p>
        <p className="text-[10px] font-semibold text-gray-400 mt-1 uppercase tracking-wider">{label}</p>
      </div>
    </div>
  );
}

/* ─────────────── Department Colors ─────────────── */
const DEPT_HEX = ['#6366f1', '#10b981', '#f59e0b', '#f43f5e', '#8b5cf6', '#06b6d4', '#3b82f6', '#14b8a6'];
const DEPT_DOTS = ['bg-indigo-500', 'bg-emerald-500', 'bg-amber-500', 'bg-rose-500', 'bg-violet-500', 'bg-cyan-500', 'bg-blue-500', 'bg-teal-500'];

/* ─────────────── Department Row ─────────────── */
function DeptRow({ name, count, total, idx }: { name: string; count: number; total: number; idx: number }) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <div className="flex items-center gap-3 py-2.5 border-b border-gray-50/80 last:border-0">
      <span className={`h-2.5 w-2.5 rounded-sm flex-shrink-0 ${DEPT_DOTS[idx % DEPT_DOTS.length]}`} />
      <span className="text-sm font-medium flex-1 truncate">{name}</span>
      <span className="text-sm font-bold tabular-nums w-8 text-right">{count}</span>
      <span className="text-xs font-semibold text-gray-400 tabular-nums w-10 text-right">{pct}%</span>
    </div>
  );
}

/* ═══════════════════════════════════════════════════
   ADMIN DASHBOARD
   ═══════════════════════════════════════════════════ */
export default function AdminDashboard() {
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [trendRange, setTrendRange] = useState<PayrollTrendRange>('6m');
  const { theme } = useTheme();
  const { user } = useAuth();
  const isDark = theme === 'dark';
  const trendMonths = trendRange === 'yearly' ? 24 : Number.parseInt(trendRange, 10);

  const initials = user?.name
    ?.split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || '??';

  /* ── Queries ── */
  const {
    data: stats,
    isLoading,
    refetch,
    dataUpdatedAt,
  } = useQuery({
    queryKey: ['admin', 'dashboard'],
    queryFn: () => adminApi.getDashboard(),
    refetchInterval: autoRefresh ? 60000 : false,
  });

  const { data: employeesData } = useQuery({
    queryKey: ['admin', 'employees', 'status'],
    queryFn: () => adminApi.getEmployeesWithStatus(),
    refetchInterval: autoRefresh ? 60000 : false,
  });

  const { data: allEmployeesData } = useQuery({
    queryKey: ['admin', 'employees', 'list'],
    queryFn: () => adminApi.getEmployees(),
  });

  const { data: payrollOverview } = useQuery({
    queryKey: ['payroll', 'overview', trendMonths],
    queryFn: () => payrollApi.getOverview(trendMonths),
    refetchInterval: autoRefresh ? 15000 : false,
    refetchIntervalInBackground: true,
    refetchOnWindowFocus: true,
  });

  const handleManualRefresh = useCallback(async () => {
    await refetch();
    toast.success('Dashboard refreshed');
  }, [refetch]);

  /* ── Derived data ── */
  const present = stats?.presentToday ?? 0;
  const total = stats?.totalEmployees ?? 0;
  const absent = stats?.absentToday ?? Math.max(0, total - present);
  const pct = stats?.attendancePercentage ?? 0;

  const lastUpdated = dataUpdatedAt
    ? new Date(dataUpdatedAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    : '--';

  // Department counts
  const deptCounts: Record<string, number> = {};
  allEmployeesData?.employees?.forEach((e: any) => {
    const d = e.department || 'Unknown';
    deptCounts[d] = (deptCounts[d] || 0) + 1;
  });
  const deptEntries = Object.entries(deptCounts).sort((a, b) => b[1] - a[1]);
  const deptTotal = deptEntries.reduce((s, [, c]) => s + c, 0);

  /* ── Chart Configurations ── */

  // Chart theme colors
  const gridColor = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)';
  const tickColor = isDark ? '#8b8fa3' : '#9ca3af';
  const labelColor = isDark ? '#d1d5db' : '#374151';

  // 2. Workforce status donut
  const statusBreakdown = { working: 0, onBreak: 0, halfDay: 0, notCheckedIn: 0 };
  employeesData?.employees?.forEach((emp: any) => {
    const att = emp.todayAttendance;
    if (att?.isOnBreak) statusBreakdown.onBreak++;
    else if (att?.status === 'present') statusBreakdown.working++;
    else if (att?.status === 'half-day') statusBreakdown.halfDay++;
    else statusBreakdown.notCheckedIn++;
  });

  const statusData = {
    labels: ['Working', 'On Break', 'Half Day', 'Not Checked In'],
    datasets: [{
      data: [statusBreakdown.working, statusBreakdown.onBreak, statusBreakdown.halfDay, statusBreakdown.notCheckedIn],
      backgroundColor: ['#6366f1', '#f59e0b', '#f97316', isDark ? '#f43f5e' : '#fb7185'],
      hoverBackgroundColor: ['#4f46e5', '#d97706', '#ea580c', isDark ? '#e11d48' : '#f43f5e'],
      hoverOffset: 8,
      borderWidth: 2,
      borderColor: '#ffffff',
    }],
  };
  const statusOpts: any = {
    cutout: '62%',
    plugins: {
      legend: {
        position: 'bottom',
        labels: { usePointStyle: true, pointStyle: 'circle', padding: 14, font: { size: 11 }, color: tickColor },
      },
    },
  };

  // 4. Department horizontal bar chart
  const deptBarData = {
    labels: deptEntries.map(([name]) => name),
    datasets: [{
      data: deptEntries.map(([, count]) => count),
      backgroundColor: deptEntries.map((_, i) => DEPT_HEX[i % DEPT_HEX.length]),
      hoverBackgroundColor: deptEntries.map((_, i) => {
        const darker = ['#4f46e5', '#059669', '#d97706', '#e11d48', '#7c3aed', '#0891b2', '#2563eb', '#0d9488'];
        return darker[i % darker.length];
      }),
      borderRadius: 6,
      barThickness: 24,
    }],
  };
  const deptBarOpts: any = {
    indexAxis: 'y' as const,
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: {
      x: { grid: { color: gridColor, drawBorder: false }, ticks: { color: tickColor } },
      y: { grid: { display: false }, ticks: { color: labelColor, font: { size: 12, weight: '500' as const } } },
    },
  };

  /* ── Currency formatter ── */
  const fmtMoney = (n: number) => {
    if (n >= 1_000_000) return `PKR ${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000) return `PKR ${(n / 1_000).toFixed(1)}K`;
    return `PKR ${n.toFixed(0)}`;
  };

  /* ── Payroll chart data ── */
  const payTrend = payrollOverview?.monthlyTrend || [];

  // Payout by Department donut
  const payDepts = payrollOverview?.departmentBreakdown || [];
  const payDeptDonutData = {
    labels: payDepts.map((d: any) => d.name),
    datasets: [{
      data: payDepts.map((d: any) => d.total),
      backgroundColor: payDepts.map((_: any, i: number) => DEPT_HEX[i % DEPT_HEX.length]),
      borderWidth: 2,
      borderColor: '#ffffff',
      hoverOffset: 8,
    }],
  };
  const payDeptDonutOpts: any = {
    cutout: '60%',
    plugins: {
      legend: {
        position: 'bottom',
        labels: { usePointStyle: true, pointStyle: 'circle', padding: 14, font: { size: 11 }, color: tickColor },
      },
      tooltip: { callbacks: { label: (ctx: any) => `${ctx.label}: ${fmtMoney(ctx.raw ?? 0)}` } },
    },
  };

  // ── Payroll Spend vs Budget donut ──
  const lrb = payrollOverview?.latestRunBudget;
  const spendBase = lrb?.base ?? 0;
  const spendPaid = lrb?.paid ?? 0;
  const spendBonus = lrb?.bonus ?? 0;
  const spendDock = lrb?.dock ?? 0;
  const spendLabel = lrb?.label ?? '';
  const hasRuns = (payrollOverview?.totalRuns ?? 0) > 0;
  const isOverBudget = spendPaid > spendBase && spendBase > 0;
  const spendPct = spendBase > 0 ? Math.min(Math.round((spendPaid / spendBase) * 100), 100) : 0;

  // Determine chart state
  type SpendState = 'no-payroll' | 'budget-not-set' | 'over-budget' | 'normal';
  const spendState: SpendState = !hasRuns
    ? 'no-payroll'
    : spendBase === 0
      ? 'budget-not-set'
      : isOverBudget
        ? 'over-budget'
        : 'normal';

  const spendChartData = (() => {
    switch (spendState) {
      case 'no-payroll':
        return {
          labels: ['No Data'],
          datasets: [{ data: [100], backgroundColor: [isDark ? '#4b5563' : '#d1d5db'], borderWidth: 0, hoverOffset: 0 }],
        };
      case 'budget-not-set':
        return {
          labels: ['Not Configured'],
          datasets: [{ data: [100], backgroundColor: [isDark ? '#4b5563' : '#d1d5db'], borderWidth: 0, hoverOffset: 0 }],
        };
      case 'over-budget':
        return {
          labels: ['Paid'],
          datasets: [{ data: [100], backgroundColor: ['#6366f1'], hoverBackgroundColor: ['#4f46e5'], borderWidth: 2, borderColor: '#ffffff', hoverOffset: 6 }],
        };
      default: // normal
        return {
          labels: ['Paid', 'Remaining'],
          datasets: [{
            data: [spendPct, Math.max(0, 100 - spendPct)],
            backgroundColor: ['#6366f1', isDark ? '#f59e0b' : '#fbbf24'],
            hoverBackgroundColor: ['#4f46e5', isDark ? '#d97706' : '#f59e0b'],
            borderWidth: 2,
            borderColor: '#ffffff',
            hoverOffset: 6,
          }],
        };
    }
  })();

  const spendChartOpts: any = {
    cutout: '72%',
    plugins: {
      legend: { display: false },
      tooltip: {
        enabled: spendState === 'normal' || spendState === 'over-budget',
        callbacks: {
          label: () => {
            const lines = [
              `Base Total: ${fmtMoney(spendBase)}`,
              `Bonus Total: ${fmtMoney(spendBonus)}`,
              `Dock Total: ${fmtMoney(spendDock)}`,
              `Final Paid: ${fmtMoney(spendPaid)}`,
            ];
            return lines;
          },
        },
      },
    },
  };

  const spendCenterPlugin = {
    id: 'spendCenter',
    afterDraw(chart: any) {
      const { ctx, width, height } = chart;
      ctx.save();
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      if (spendState === 'no-payroll') {
        ctx.font = 'bold 12px Inter, system-ui, sans-serif';
        ctx.fillStyle = isDark ? '#9ca3af' : '#6b7280';
        ctx.fillText('No Payroll', width / 2, height / 2 - 8);
        ctx.font = '500 10px Inter, system-ui, sans-serif';
        ctx.fillStyle = isDark ? '#6b7280' : '#9ca3af';
        ctx.fillText('Generated', width / 2, height / 2 + 8);
      } else if (spendState === 'budget-not-set') {
        ctx.font = 'bold 11px Inter, system-ui, sans-serif';
        ctx.fillStyle = isDark ? '#9ca3af' : '#6b7280';
        ctx.fillText('Budget Not', width / 2, height / 2 - 8);
        ctx.font = '500 11px Inter, system-ui, sans-serif';
        ctx.fillText('Configured', width / 2, height / 2 + 8);
      } else if (spendState === 'over-budget') {
        ctx.font = 'bold 18px Inter, system-ui, sans-serif';
        ctx.fillStyle = isDark ? '#f1f1f4' : '#111827';
        ctx.fillText(fmtMoney(spendPaid), width / 2, height / 2 - 14);
        ctx.font = '500 10px Inter, system-ui, sans-serif';
        ctx.fillStyle = '#ef4444';
        ctx.fillText(`Over by ${fmtMoney(spendPaid - spendBase)}`, width / 2, height / 2 + 6);
        ctx.font = '500 10px Inter, system-ui, sans-serif';
        ctx.fillStyle = isDark ? '#8b8fa3' : '#9ca3af';
        ctx.fillText(spendLabel, width / 2, height / 2 + 20);
      } else {
        ctx.font = 'bold 18px Inter, system-ui, sans-serif';
        ctx.fillStyle = isDark ? '#f1f1f4' : '#111827';
        ctx.fillText(fmtMoney(spendPaid), width / 2, height / 2 - 18);
        ctx.font = '500 10px Inter, system-ui, sans-serif';
        ctx.fillStyle = isDark ? '#8b8fa3' : '#9ca3af';
        ctx.fillText(`of ${fmtMoney(spendBase)}`, width / 2, height / 2);
        ctx.font = 'bold 13px Inter, system-ui, sans-serif';
        ctx.fillStyle = '#6366f1';
        ctx.fillText(`${spendPct}%`, width / 2, height / 2 + 16);
      }

      ctx.restore();
    },
  };



  /* ═══════════════════════════════════════════
     JSX
     ═══════════════════════════════════════════ */
  return (
    <Layout>
      {/* ── Header ── */}
      <div className="mb-6 animate-fade-in">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-xl font-extrabold tracking-tight page-heading">Admin Dashboard</h1>
            <p className="text-sm text-gray-400 mt-0.5">Overview of Insight&apos;s across the organization</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-medium text-gray-400 uppercase tracking-wider mr-1">
              Updated {lastUpdated}
            </span>
            <button
              onClick={handleManualRefresh}
              className="group flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-2 text-xs font-semibold shadow-sm transition-all hover:bg-gray-50"
            >
              <HiOutlineRefresh className="h-3.5 w-3.5 transition-transform group-hover:rotate-180 duration-500" />
              Refresh
            </button>
            <label className="flex items-center gap-1.5 cursor-pointer rounded-lg border border-gray-200 px-3 py-2 shadow-sm hover:bg-gray-50">
              <input
                type="checkbox"
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
                className="rounded h-3 w-3 accent-indigo-600"
              />
              <span className="text-xs font-medium text-gray-500">Auto</span>
            </label>
            {/* Profile Icon */}
            <button
              onClick={() => setShowProfileModal(true)}
              className="group relative h-10 w-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 p-0.5 shadow-lg shadow-indigo-200/50 dark:shadow-indigo-900/30 ring-2 ring-white/50 dark:ring-white/20 hover:ring-indigo-300 hover:scale-105 transition-all ml-1"
              title="View profile"
            >
              <div className="h-full w-full rounded-full overflow-hidden bg-white dark:bg-gray-900 flex items-center justify-center">
                {user?.profilePicture ? (
                  <img src={user.profilePicture} alt={user?.name} className="h-full w-full object-cover" />
                ) : (
                  <span className="text-sm font-bold bg-gradient-to-br from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                    {initials}
                  </span>
                )}
              </div>
            </button>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20">
          <div className="h-10 w-10 animate-spin rounded-full border-[3px] border-indigo-100 border-t-indigo-600" />
        </div>
      ) : (
        <>
          {/* ── Overview Section ── */}
          <div className="flex items-center gap-3 mb-2 animate-fade-in">
            <span className="text-[11px] font-bold uppercase tracking-[0.15em] text-gray-400 whitespace-nowrap">Overview</span>
            <div className="flex-1 h-px section-divider" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-6 animate-fade-in">
            <StatCard icon={HiOutlineUsers} label="Total Employees" value={total} iconBg="bg-indigo-50" iconColor="text-indigo-600" />
            <StatCard icon={HiOutlineCheckCircle} label="Present Today" value={present} iconBg="bg-emerald-50" iconColor="text-emerald-600" />
            <StatCard icon={HiOutlineXCircle} label="Absent Today" value={absent} iconBg="bg-rose-50" iconColor="text-rose-600" />
            <StatCard icon={HiOutlineTrendingUp} label="Attendance Rate" value={`${pct}%`} iconBg="bg-cyan-50" iconColor="text-cyan-600" />
          </div>

          {/* ── Analytics Section ── */}
          <div className="flex items-center gap-3 mb-2 animate-fade-in">
            <span className="text-[11px] font-bold uppercase tracking-[0.15em] text-gray-400 whitespace-nowrap">Analytics</span>
            <div className="flex-1 h-px section-divider" />
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
            <div className="lg:col-span-2 card p-4">
              <PayrollTrendChart
                data={payTrend}
                selectedRange={trendRange}
                onSelectedRangeChange={setTrendRange}
              />
            </div>
            <div className="card p-4 flex flex-col">
              <h3 className="text-sm font-bold mb-3">Workforce Status</h3>
              <div className="flex-1 flex items-center justify-center" style={{ minHeight: 180 }}>
                <Doughnut data={statusData} options={statusOpts} />
              </div>
            </div>
          </div>

          {/* Payout by Dept + Revenue + Department Breakdown */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 mb-6">
            <div className="card p-4 flex flex-col">
              <h3 className="text-sm font-bold mb-3">Payout by Department</h3>
              {payDepts.length > 0 ? (
                <div className="flex-1 flex items-center justify-center" style={{ minHeight: 180 }}>
                  <Doughnut data={payDeptDonutData} options={payDeptDonutOpts} />
                </div>
              ) : (
                <p className="text-sm text-gray-400 py-8 text-center">No payroll data</p>
              )}
            </div>

            <div className="card p-4 flex flex-col items-center justify-center">
              <div className="flex items-center justify-between w-full mb-3">
                <h3 className="text-sm font-bold">Payroll Spend vs Budget</h3>
                {spendState === 'over-budget' && (
                  <span className="text-[10px] font-bold uppercase tracking-wider bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400 px-2 py-0.5 rounded-full">
                    Over Budget
                  </span>
                )}
              </div>
              <div style={{ width: 180, height: 180 }}>
                <Doughnut data={spendChartData} options={spendChartOpts} plugins={[spendCenterPlugin]} />
              </div>
              {spendState === 'no-payroll' && (
                <p className="mt-3 text-xs text-gray-400 text-center">Run payroll to populate data</p>
              )}
              {spendState === 'normal' && (
                <div className="mt-4 flex items-center gap-4 text-xs font-medium text-gray-500">
                  <span className="flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-full bg-indigo-500 inline-block" />
                    Paid
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-full bg-amber-400 inline-block" />
                    Remaining
                  </span>
                </div>
              )}
              {spendState === 'over-budget' && (
                <div className="mt-4 flex items-center gap-4 text-xs font-medium text-gray-500">
                  <span className="flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-full bg-indigo-500 inline-block" />
                    Paid
                  </span>
                </div>
              )}
              {spendLabel && spendState !== 'no-payroll' && (
                <p className="mt-1 text-[10px] text-gray-400 text-center">{spendLabel}</p>
              )}
            </div>

            <div className="lg:col-span-2 card p-6">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-base font-bold">Department Breakdown</h3>
                <span className="text-[11px] font-medium text-gray-400">Total: {deptTotal}</span>
              </div>
              {deptEntries.length > 0 ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-8">
                  <div>
                    {deptEntries.map(([name, count], i) => (
                      <DeptRow key={name} name={name} count={count} total={deptTotal} idx={i} />
                    ))}
                  </div>
                  <div className="hidden lg:flex items-center justify-center" style={{ minHeight: 180 }}>
                    <Bar data={deptBarData} options={deptBarOpts} />
                  </div>
                </div>
              ) : (
                <p className="text-sm text-gray-400 py-4">No department data available</p>
              )}
            </div>
          </div>


        </>
      )}

      {/* Profile Modal */}
      {showProfileModal && (
        <UserProfileModal onClose={() => setShowProfileModal(false)} />
      )}
    </Layout>
  );
}
