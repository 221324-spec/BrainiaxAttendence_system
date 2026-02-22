import { useState, useCallback } from 'react';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement } from 'chart.js';
import { Doughnut, Bar } from 'react-chartjs-2';
import { useQuery } from '@tanstack/react-query';
import { adminApi } from '../api';
import Layout from '../components/Layout';
import toast from 'react-hot-toast';
import ActivityLine from '../components/ActivityLine';
import SmallDonuts from '../components/SmallDonuts';
import CalendarWidget from '../components/CalendarWidget';
import {
  HiOutlineUsers,
  HiOutlineRefresh,
  HiOutlineDownload,
  HiOutlineClock,
} from 'react-icons/hi';

export default function AdminDashboard() {
  const [autoRefresh, setAutoRefresh] = useState(true);

  // Dashboard stats
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

  // Employees with status
  const { data: employeesData, isLoading: loadingEmployees } = useQuery({
    queryKey: ['admin', 'employees', 'status'],
    queryFn: () => adminApi.getEmployeesWithStatus(),
    refetchInterval: autoRefresh ? 60000 : false,
  });

  // Employee list for export
  const { data: allEmployeesData } = useQuery({
    queryKey: ['admin', 'employees', 'list'],
    queryFn: () => adminApi.getEmployees(),
  });

  const [selectedEmployee, setSelectedEmployee] = useState('');
  // Default: 1st of current month to today
  const todayStr = new Date().toISOString().slice(0, 10);
  const firstOfMonth = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}-01`;
  const [startDate, setStartDate] = useState(firstOfMonth);
  const [endDate, setEndDate] = useState(todayStr);
  const [exporting, setExporting] = useState(false);

  const handleManualRefresh = useCallback(async () => {
    await refetch();
    toast.success('Dashboard refreshed');
  }, [refetch]);

  const handleExport = async () => {
    if (!selectedEmployee) {
      toast.error('Please select an employee');
      return;
    }
    if (!startDate || !endDate) {
      toast.error('Please select a date range');
      return;
    }
    if (startDate > endDate) {
      toast.error('Start date must be before end date');
      return;
    }
    setExporting(true);
    try {
      const blob = await adminApi.exportCsv(selectedEmployee, startDate, endDate);
      const emp = allEmployeesData?.employees.find((e) => e._id === selectedEmployee);
      const safeName = emp?.name.replace(/[^a-zA-Z0-9]/g, '_') || 'employee';
      const safeStart = startDate.replace(/-/g, '');
      const safeEnd = endDate.replace(/-/g, '');
      const filename = `${safeName}_${safeStart}_to_${safeEnd}.csv`;

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      toast.success('CSV exported successfully');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Export failed');
    } finally {
      setExporting(false);
    }
  };

  const lastUpdated = dataUpdatedAt
    ? new Date(dataUpdatedAt).toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      })
    : '--';

  // (stat card data removed — using richer widgets below)

  // Chart.js registration (include BarElement for department bar)
  ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement);

  // Doughnut: Present vs Absent
  const present = stats?.presentToday ?? 0;
  const total = stats?.totalEmployees ?? 0;
  const absent = stats?.absentToday ?? Math.max(0, total - present);
  const doughnutData = {
    labels: ['Present', 'Absent'],
    datasets: [
      {
        data: [present, absent],
        backgroundColor: ['#10B981', '#ef4444cc'],
        hoverOffset: 8,
      },
    ],
  };

  // Department counts (used to build department bar chart)
  const deptCounts: Record<string, number> = {};
  allEmployeesData?.employees?.forEach((e: any) => {
    const d = e.department || 'Unknown';
    deptCounts[d] = (deptCounts[d] || 0) + 1;
  });

  // Bar: Department distribution (restored)
  const barData = {
    labels: Object.keys(deptCounts),
    datasets: [
      {
        label: 'Employees',
        data: Object.values(deptCounts),
        backgroundColor: Object.keys(deptCounts).map((_, i) => `rgba(99,102,241,${0.95 - i * 0.06})`),
      },
    ],
  };

  const barOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false }, tooltip: { mode: 'index' } },
    scales: {
      x: { grid: { display: false }, ticks: { color: 'var(--muted)' } },
      y: { grid: { color: 'rgba(255,255,255,0.03)' }, ticks: { color: 'var(--muted)' } },
    },
    elements: { bar: { borderRadius: 12, borderSkipped: false } },
  };

  const doughnutOptions = { cutout: '60%', plugins: { legend: { position: 'top', labels: { color: 'var(--muted)' } } } };

  return (
    <Layout>
      {/* Header with background */}
      <div className="mb-8 animate-fade-in">
        <div className="card flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-6">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight">Admin Dashboard</h1>
            <p className="mt-1.5 text-sm">Overview of today's attendance across the organization</p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-[11px] font-medium uppercase tracking-wider">Updated {lastUpdated}</span>
            <button
              onClick={handleManualRefresh}
              className="group flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold shadow-sm transition-all"
            >
              <HiOutlineRefresh className="h-4 w-4 transition-transform group-hover:rotate-180 duration-500" />
              Refresh
            </button>
            <label className="flex items-center gap-2 cursor-pointer rounded-xl border px-3 py-2.5 shadow-sm">
              <input
                type="checkbox"
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
                className="rounded h-3.5 w-3.5"
              />
              <span className="text-xs font-medium">Auto</span>
            </label>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      {isLoading ? (
        <div className="flex justify-center py-16">
          <div className="h-10 w-10 animate-spin rounded-full border-[3px] border-primary-100 border-t-primary-600" />
        </div>
      ) : (
        <>
        <div className="mb-8 grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-8 card p-6">
            <h3 className="text-lg font-bold mb-4">Attendance Overview</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-4 bg-white rounded-lg shadow-sm">
                <p className="text-sm text-gray-500">Present</p>
                <p className="text-2xl font-bold">{present}</p>
              </div>
              <div className="p-4 bg-white rounded-lg shadow-sm">
                <p className="text-sm text-gray-500">Absent</p>
                <p className="text-2xl font-bold">{absent}</p>
              </div>
              <div className="p-4 bg-white rounded-lg shadow-sm">
                <p className="text-sm text-gray-500">Total Employees</p>
                <p className="text-2xl font-bold">{total}</p>
              </div>
            </div>
          </div>

          {/* Right column: calendar + small event cards (col-span 4) */}
          <div className="lg:col-span-4 card p-4">
            <CalendarWidget />
          </div>
        </div>

        {/* Second row: weekly trend + quick metrics + donut beside it */}
        <div className="mb-8 grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-8 card p-6">
            <h3 className="text-lg font-bold mb-4">Weekly Trend</h3>
            <ActivityLine />
          </div>
          <div className="lg:col-span-4 card p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
              <div>
                <h4 className="text-sm font-semibold mb-2">Quick Metrics</h4>
                <SmallDonuts items={[{ label: 'On-Time', value: 91, color: '#10B981' }, { label: 'Late', value: 9, color: '#ef4444' }, { label: 'Avg Work', value: 78, color: '#f59e0b' }, { label: 'Breaks', value: 12, color: '#06b6d4' }]} />
              </div>
              <div className="flex items-center justify-center">
                <div style={{ width: 140, height: 140 }}>
                  <Doughnut data={doughnutData} options={doughnutOptions as any} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </>
      )}
      {/* Charts Overview */}
      <div className="mb-8 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="col-span-1 lg:col-span-2 chart-card">
          <h3 className="text-lg font-bold mb-4">Attendance by Department</h3>
          {Object.keys(deptCounts).length === 0 ? (
            <p className="text-sm text-gray-400">No department data available</p>
          ) : (
            <div className="chart-canvas" style={{ height: 300 }}>
              <Bar data={barData} options={barOptions as any} />
            </div>
          )}
        </div>

        <div className="col-span-1 chart-card">
          <h3 className="text-lg font-bold mb-4">Today: Present vs Absent</h3>
            <div className="chart-canvas flex items-center justify-center" style={{ height: 260 }}>
            <Doughnut data={doughnutData} options={doughnutOptions as any} />
          </div>
          <div className="mt-4 flex items-center justify-between text-sm text-gray-400">
            <div className="flex items-center gap-2"><span className="h-3 w-3 rounded-full bg-green-500 inline-block" /> Present: <span className="ml-2 font-semibold">{present}</span></div>
            <div className="flex items-center gap-2"><span className="h-3 w-3 rounded-full bg-red-500 inline-block" /> Absent: <span className="ml-2 font-semibold">{absent}</span></div>
          </div>
        </div>
      </div>

      {/* CSV Export Card */}
      <div className="card mb-8 animate-slide-up relative overflow-hidden">
        <div className="absolute -top-20 -right-20 h-40 w-40 rounded-full bg-gradient-to-br from-primary-50 to-transparent blur-2xl" />
        <div className="relative">
          <h2 className="mb-5 flex items-center gap-2.5 text-lg font-bold text-gray-900">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary-50 text-primary-600">
              <HiOutlineDownload className="h-5 w-5" />
            </div>
            Export Attendance CSV
          </h2>
          <div className="flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row items-end gap-4">
              <div className="flex-1 w-full">
                <label className="label">Employee</label>
                <select
                  value={selectedEmployee}
                  onChange={(e) => setSelectedEmployee(e.target.value)}
                  className="input"
                >
                  <option value="">Select employee...</option>
                  {allEmployeesData?.employees.map((emp) => (
                    <option key={emp._id} value={emp._id}>
                      {emp.name} — {emp.department}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row items-end gap-4">
              <div className="w-full sm:flex-1">
                <label className="label">From Date</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="input"
                  max={endDate || undefined}
                />
              </div>
              <div className="w-full sm:flex-1">
                <label className="label">To Date</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="input"
                  min={startDate || undefined}
                />
              </div>
              <button
                onClick={handleExport}
                disabled={exporting || !selectedEmployee || !startDate || !endDate}
                className="btn-primary flex items-center gap-2 whitespace-nowrap"
              >
                <HiOutlineDownload className="h-4 w-4" />
                {exporting ? 'Exporting...' : 'Export CSV'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Employees Table */}
      <div className="card animate-slide-up">
        <div className="flex items-center justify-between mb-5">
          <h2 className="flex items-center gap-2.5 text-lg font-bold text-gray-900">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
              <HiOutlineClock className="h-5 w-5" />
            </div>
            Today's Attendance
          </h2>
          {employeesData && (
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-widest">
              {employeesData.employees.length} employees
            </span>
          )}
        </div>
        {loadingEmployees ? (
          <div className="flex justify-center py-12">
            <div className="h-10 w-10 animate-spin rounded-full border-[3px] border-primary-100 border-t-primary-600" />
          </div>
        ) : (
          <div className="overflow-x-auto -mx-6 px-6">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="table-header">Employee</th>
                  <th className="table-header">Department</th>
                  <th className="table-header">Punch In</th>
                  <th className="table-header">Punch Out</th>
                  <th className="table-header">Break</th>
                  <th className="table-header">Status</th>
                </tr>
              </thead>
              <tbody>
                {employeesData?.employees.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center">
                      <div className="flex flex-col items-center gap-2 text-gray-400">
                        <HiOutlineUsers className="h-10 w-10 text-gray-300" />
                        <p className="font-medium">No employees found</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  employeesData?.employees.map((emp) => {
                    const att = emp.todayAttendance;
                    const status = att?.status || 'not-checked-in';
                    const initials = emp.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase();
                    return (
                      <tr
                        key={emp._id}
                        className="border-b border-gray-50 transition-colors hover:bg-gray-50/50 group"
                      >
                        <td className="table-cell">
                          <div className="flex items-center gap-3">
                            <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary-500 to-primary-600 text-xs font-bold text-white shadow-sm">
                              {initials}
                            </div>
                            <div>
                              <p className="font-semibold text-gray-900">{emp.name}</p>
                              <p className="text-xs text-gray-400">{emp.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="table-cell">
                          <span className="badge-neutral">{emp.department}</span>
                        </td>
                        <td className="table-cell font-medium text-gray-600">
                          {att?.punchIn
                            ? new Date(att.punchIn).toLocaleTimeString('en-US', {
                                hour: '2-digit',
                                minute: '2-digit',
                              })
                            : <span className="text-gray-300">--:--</span>}
                        </td>
                        <td className="table-cell font-medium text-gray-600">
                          {att?.punchOut
                            ? new Date(att.punchOut).toLocaleTimeString('en-US', {
                                hour: '2-digit',
                                minute: '2-digit',
                              })
                            : <span className="text-gray-300">--:--</span>}
                        </td>
                        <td className="table-cell font-medium text-amber-600">
                          {(att?.totalBreakMinutes ?? 0) > 0
                            ? `${Math.floor(att!.totalBreakMinutes / 60)}h ${att!.totalBreakMinutes % 60}m`
                            : att?.isOnBreak
                            ? <span className="badge-warning animate-pulse">On break</span>
                            : <span className="text-gray-300">—</span>}
                        </td>
                        <td className="table-cell">
                          <span
                            className={`${
                              status === 'present'
                                ? 'badge-success'
                                : status === 'half-day'
                                ? 'badge-warning'
                                : status === 'absent'
                                ? 'badge-danger'
                                : 'badge-neutral'
                            }`}
                          >
                            {status === 'not-checked-in'
                              ? 'Not Checked In'
                              : status.charAt(0).toUpperCase() + status.slice(1)}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </Layout>
  );
}
