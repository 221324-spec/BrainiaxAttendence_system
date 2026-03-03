import { useState, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { adminApi } from '../api';
import Layout from '../components/Layout';
import toast from 'react-hot-toast';
import {
  HiOutlineUsers,
  HiOutlineRefresh,
  HiOutlineDownload,
  HiOutlineClock,
} from 'react-icons/hi';

export default function AdminTodayAttendance() {
  const [autoRefresh, setAutoRefresh] = useState(true);

  /* ── Queries ── */
  const {
    data: employeesData,
    isLoading: loadingEmployees,
    refetch,
    dataUpdatedAt,
  } = useQuery({
    queryKey: ['admin', 'employees', 'status'],
    queryFn: () => adminApi.getEmployeesWithStatus(),
    refetchInterval: autoRefresh ? 60000 : false,
  });

  const { data: allEmployeesData } = useQuery({
    queryKey: ['admin', 'employees', 'list'],
    queryFn: () => adminApi.getEmployees(),
  });

  /* ── Export state ── */
  const [selectedEmployee, setSelectedEmployee] = useState('');
  const todayStr = new Date().toISOString().slice(0, 10);
  const firstOfMonth = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}-01`;
  const [startDate, setStartDate] = useState(firstOfMonth);
  const [endDate, setEndDate] = useState(todayStr);
  const [exporting, setExporting] = useState(false);

  const lastUpdated = dataUpdatedAt
    ? new Date(dataUpdatedAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    : '--';

  const handleManualRefresh = useCallback(async () => {
    await refetch();
    toast.success('Attendance refreshed');
  }, [refetch]);

  const handleExport = async () => {
    if (!selectedEmployee) { toast.error('Please select an employee'); return; }
    if (!startDate || !endDate) { toast.error('Please select a date range'); return; }
    if (startDate > endDate) { toast.error('Start date must be before end date'); return; }
    setExporting(true);
    try {
      const blob = await adminApi.exportCsv(selectedEmployee, startDate, endDate);
      const emp = allEmployeesData?.employees.find((e) => e._id === selectedEmployee);
      const safeName = emp?.name.replace(/[^a-zA-Z0-9]/g, '_') || 'employee';
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${safeName}_${startDate}_${endDate}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      toast.success('CSV exported');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Export failed');
    } finally {
      setExporting(false);
    }
  };

  return (
    <Layout>
      {/* ── Header ── */}
      <div className="mb-8 animate-fade-in">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight page-heading">Today&apos;s Attendance</h1>
            <p className="text-sm text-gray-400 mt-0.5">Live employee attendance status and CSV export</p>
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
          </div>
        </div>
      </div>

      {/* ── Export Section ── */}
      <div className="flex items-center gap-3 mb-3 animate-fade-in">
        <span className="text-[11px] font-bold uppercase tracking-[0.15em] text-gray-400 whitespace-nowrap">Export</span>
        <div className="flex-1 h-px section-divider" />
      </div>
      <div className="card mb-8 animate-slide-up relative overflow-hidden">
        <div className="absolute -top-20 -right-20 h-40 w-40 rounded-full bg-gradient-to-br from-indigo-50 to-transparent blur-2xl" />
        <div className="relative">
          <h2 className="mb-5 flex items-center gap-2.5 text-base font-bold">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
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
                <label className="label">From</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="input"
                  max={endDate || undefined}
                />
              </div>
              <div className="w-full sm:flex-1">
                <label className="label">To</label>
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

      {/* ── Live Status Section ── */}
      <div className="flex items-center gap-3 mb-3 animate-fade-in">
        <span className="text-[11px] font-bold uppercase tracking-[0.15em] text-gray-400 whitespace-nowrap">Live Status</span>
        <div className="flex-1 h-px section-divider" />
      </div>
      <div className="card animate-slide-up">
        <div className="flex items-center justify-between mb-5">
          <h2 className="flex items-center gap-2.5 text-base font-bold">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
              <HiOutlineClock className="h-5 w-5" />
            </div>
            Today&apos;s Attendance
          </h2>
          {employeesData && (
            <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest">
              {employeesData.employees.length} employees
            </span>
          )}
        </div>
        {loadingEmployees ? (
          <div className="flex justify-center py-12">
            <div className="h-10 w-10 animate-spin rounded-full border-[3px] border-indigo-100 border-t-indigo-600" />
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
                  <th className="table-header">Worked</th>
                  <th className="table-header">Status</th>
                </tr>
              </thead>
              <tbody>
                {employeesData?.employees.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center">
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
                    const initials = emp.name
                      .split(' ')
                      .map((n: string) => n[0])
                      .join('')
                      .slice(0, 2)
                      .toUpperCase();
                    return (
                      <tr
                        key={emp._id}
                        className="border-b border-gray-50 transition-colors hover:bg-gray-50/50"
                      >
                        <td className="table-cell">
                          <div className="flex items-center gap-3">
                            <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-600 text-xs font-bold text-white shadow-sm">
                              {initials}
                            </div>
                            <div>
                              <p className="font-semibold">{emp.name}</p>
                              <p className="text-xs text-gray-400">{emp.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="table-cell">
                          <span className="badge-neutral">{emp.department}</span>
                        </td>
                        <td className="table-cell font-medium">
                          {att?.punchIn
                            ? new Date(att.punchIn).toLocaleTimeString('en-US', {
                                hour: '2-digit',
                                minute: '2-digit',
                              })
                            : <span className="text-gray-300">--:--</span>}
                        </td>
                        <td className="table-cell font-medium">
                          {att?.punchOut
                            ? new Date(att.punchOut).toLocaleTimeString('en-US', {
                                hour: '2-digit',
                                minute: '2-digit',
                              })
                            : <span className="text-gray-300">--:--</span>}
                        </td>
                        <td className="table-cell font-medium text-amber-600">
                          {att?.breaks && att.breaks.length > 0 ? (
                            <div className="flex flex-col gap-0.5">
                              {att.breaks.map((brk: { start: string; end: string | null }, idx: number) => (
                                <span key={idx} className="text-xs">
                                  {new Date(brk.start).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                                  {' — '}
                                  {brk.end
                                    ? new Date(brk.end).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
                                    : <span className="text-amber-500 animate-pulse">ongoing</span>}
                                </span>
                              ))}
                            </div>
                          ) : att?.isOnBreak ? (
                            <span className="badge-warning animate-pulse">On break</span>
                          ) : (
                            <span className="text-gray-300">—</span>
                          )}
                        </td>
                        <td className="table-cell font-medium text-indigo-600">
                          {att?.totalWorkMinutes && att.totalWorkMinutes > 0 ? (
                            <span>
                              {Math.floor(att.totalWorkMinutes / 60)}h {att.totalWorkMinutes % 60}m
                            </span>
                          ) : att?.punchIn && !att?.punchOut ? (
                            <span className="text-emerald-500 animate-pulse text-xs">Working...</span>
                          ) : (
                            <span className="text-gray-300">—</span>
                          )}
                        </td>
                        <td className="table-cell">
                          <span
                            className={
                              status === 'present'
                                ? 'badge-success'
                                : status === 'half-day'
                                ? 'badge-warning'
                                : status === 'absent'
                                ? 'badge-danger'
                                : 'badge-neutral'
                            }
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
