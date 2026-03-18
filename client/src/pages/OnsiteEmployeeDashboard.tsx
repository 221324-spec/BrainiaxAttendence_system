import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Layout from '../components/Layout';
import { useAuth } from '../context/AuthContext';
import api from '../api/client';
import type { Attendance, MonthlySummary } from '../types';
import {
  HiOutlineClock,
  HiOutlineCalendar,
  HiOutlineFingerPrint,
  HiOutlineChartBar,
} from 'react-icons/hi';

export default function OnsiteEmployeeDashboard() {
  const { user } = useAuth();
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  const { data: todayAttendance } = useQuery({
    queryKey: ['attendance', 'today', user?._id],
    queryFn: async () => {
      const res = await api.get('/attendance/today');
      return res.data.attendance;
    },
    refetchInterval: 30000, // Refresh every 30 seconds for real-time updates
  });

  const { data: monthlyHistory } = useQuery({
    queryKey: ['attendance', 'history', user?._id, selectedYear, selectedMonth],
    queryFn: async (): Promise<{ records: Attendance[] }> => {
      const res = await api.get('/attendance/history', {
        params: { year: selectedYear, month: selectedMonth },
      });
      return res.data;
    },
  });

  const { data: monthlySummary } = useQuery({
    queryKey: ['attendance', 'summary', user?._id, selectedYear, selectedMonth],
    queryFn: async (): Promise<{ summary: MonthlySummary }> => {
      const res = await api.get('/attendance/summary', {
        params: { year: selectedYear, month: selectedMonth },
      });
      return res.data;
    },
  });

  const formatTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  return (
    <Layout>
      {/* ── Header ── */}
      <div className="mb-8 animate-fade-in">
        <h1 className="text-2xl font-extrabold tracking-tight page-heading">Onsite Employee Portal</h1>
        <p className="text-sm text-gray-400 mt-0.5">Your biometric attendance dashboard</p>
      </div>

      {/* ── Today's Attendance ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="card p-6">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl bg-green-50 text-green-600">
              <HiOutlineClock className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Check In</p>
              <p className="text-lg font-bold text-gray-900">{todayAttendance?.punchIn || '--:--'}</p>
            </div>
          </div>
        </div>

        <div className="card p-6">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl bg-red-50 text-red-600">
              <HiOutlineClock className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Check Out</p>
              <p className="text-lg font-bold text-gray-900">{todayAttendance?.punchOut || '--:--'}</p>
            </div>
          </div>
        </div>

        <div className="card p-6">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
              <HiOutlineFingerPrint className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Source</p>
              <p className="text-lg font-bold text-gray-900">Biometric</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Monthly Summary ── */}
      <div className="flex items-center gap-3 mb-3 animate-fade-in">
        <span className="text-[11px] font-bold uppercase tracking-[0.15em] text-gray-400 whitespace-nowrap">Monthly Summary</span>
        <div className="flex-1 h-px section-divider" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="card p-6 text-center">
          <HiOutlineCalendar className="h-8 w-8 text-indigo-600 mx-auto mb-2" />
          <p className="text-2xl font-bold text-gray-900">{monthlySummary?.summary.totalDays || 0}</p>
          <p className="text-sm text-gray-500">Total Days</p>
        </div>
        <div className="card p-6 text-center">
          <HiOutlineChartBar className="h-8 w-8 text-green-600 mx-auto mb-2" />
          <p className="text-2xl font-bold text-gray-900">{monthlySummary?.summary.presentDays || 0}</p>
          <p className="text-sm text-gray-500">Present Days</p>
        </div>
        <div className="card p-6 text-center">
          <HiOutlineChartBar className="h-8 w-8 text-red-600 mx-auto mb-2" />
          <p className="text-2xl font-bold text-gray-900">{monthlySummary?.summary.absentDays || 0}</p>
          <p className="text-sm text-gray-500">Absent Days</p>
        </div>
        <div className="card p-6 text-center">
          <HiOutlineClock className="h-8 w-8 text-blue-600 mx-auto mb-2" />
          <p className="text-2xl font-bold text-gray-900">{monthlySummary?.summary.totalWorkHours || 0}h</p>
          <p className="text-sm text-gray-500">Total Hours</p>
        </div>
      </div>

      {/* ── Month Selector ── */}
      <div className="flex items-center gap-4 mb-6">
        <div>
          <label className="label">Month</label>
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(Number(e.target.value))}
            className="input"
          >
            {Array.from({ length: 12 }, (_, i) => (
              <option key={i + 1} value={i + 1}>
                {new Date(0, i).toLocaleString('default', { month: 'long' })}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Year</label>
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            className="input"
          >
            {Array.from({ length: 5 }, (_, i) => (
              <option key={new Date().getFullYear() - i} value={new Date().getFullYear() - i}>
                {new Date().getFullYear() - i}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* ── Attendance History ── */}
      <div className="flex items-center gap-3 mb-3 animate-fade-in">
        <span className="text-[11px] font-bold uppercase tracking-[0.15em] text-gray-400 whitespace-nowrap">Attendance History</span>
        <div className="flex-1 h-px section-divider" />
      </div>
      <div className="card">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left py-3 px-4 text-xs font-bold uppercase tracking-wider text-gray-500">Date</th>
                <th className="text-left py-3 px-4 text-xs font-bold uppercase tracking-wider text-gray-500">Check In</th>
                <th className="text-left py-3 px-4 text-xs font-bold uppercase tracking-wider text-gray-500">Check Out</th>
                <th className="text-left py-3 px-4 text-xs font-bold uppercase tracking-wider text-gray-500">Work Hours</th>
                <th className="text-left py-3 px-4 text-xs font-bold uppercase tracking-wider text-gray-500">Status</th>
              </tr>
            </thead>
            <tbody>
              {monthlyHistory?.records?.map((record) => (
                <tr key={record._id || record.date} className="border-b border-gray-50 hover:bg-gray-50/50">
                  <td className="py-3 px-4 text-sm font-medium text-gray-900">{record.date}</td>
                  <td className="py-3 px-4 text-sm text-gray-600">{record.punchIn || '-'}</td>
                  <td className="py-3 px-4 text-sm text-gray-600">{record.punchOut || '-'}</td>
                  <td className="py-3 px-4 text-sm text-gray-600">
                    {record.totalWorkMinutes ? formatTime(record.totalWorkMinutes) : '-'}
                  </td>
                  <td className="py-3 px-4">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      record.status === 'present'
                        ? 'bg-green-100 text-green-800'
                        : record.status === 'absent'
                        ? 'bg-red-100 text-red-800'
                        : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {record.status}
                    </span>
                  </td>
                </tr>
              ))}
              {(!monthlyHistory?.records || monthlyHistory.records.length === 0) && (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-gray-500">
                    No attendance records found for this month.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </Layout>
  );
}