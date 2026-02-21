import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { attendanceApi } from '../api';
import { useAuth } from '../context/AuthContext';
import Layout from '../components/Layout';
import toast from 'react-hot-toast';
import {
  HiOutlineClock,
  HiOutlineCalendar,
  HiOutlineChartBar,
  HiOutlineCheckCircle,
  HiOutlineXCircle,
} from 'react-icons/hi';
import { HiOutlinePause, HiOutlinePlay } from 'react-icons/hi2';

export default function EmployeeDashboard() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;

  // Today's status
  const { data: todayData, isLoading: loadingToday } = useQuery({
    queryKey: ['attendance', 'today'],
    queryFn: () => attendanceApi.getToday(),
    refetchInterval: 30000,
  });

  // Monthly history
  const { data: historyData, isLoading: loadingHistory } = useQuery({
    queryKey: ['attendance', 'history', year, month],
    queryFn: () => attendanceApi.getHistory(year, month),
  });

  // Monthly summary
  const { data: summaryData } = useQuery({
    queryKey: ['attendance', 'summary', year, month],
    queryFn: () => attendanceApi.getSummary(year, month),
  });

  // Punch In mutation
  const punchInMutation = useMutation({
    mutationFn: () => attendanceApi.punchIn(),
    onSuccess: (data) => {
      toast.success(data.message);
      queryClient.invalidateQueries({ queryKey: ['attendance'] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Punch in failed');
    },
  });

  // Punch Out mutation
  const punchOutMutation = useMutation({
    mutationFn: () => attendanceApi.punchOut(),
    onSuccess: (data) => {
      toast.success(data.message);
      queryClient.invalidateQueries({ queryKey: ['attendance'] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Punch out failed');
    },
  });

  // Start Break mutation
  const startBreakMutation = useMutation({
    mutationFn: () => attendanceApi.startBreak(),
    onSuccess: (data) => {
      toast.success(data.message);
      queryClient.invalidateQueries({ queryKey: ['attendance'] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Start break failed');
    },
  });

  // End Break mutation
  const endBreakMutation = useMutation({
    mutationFn: () => attendanceApi.endBreak(),
    onSuccess: (data) => {
      toast.success(data.message);
      queryClient.invalidateQueries({ queryKey: ['attendance'] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'End break failed');
    },
  });

  const attendance = todayData?.attendance;
  const hasPunchedIn = !!attendance?.punchIn;
  const hasPunchedOut = !!attendance?.punchOut;
  const isOnBreak = !!attendance?.isOnBreak;
  const summary = summaryData?.summary;

  const formatTime = (dateStr: string | null) => {
    if (!dateStr) return '--:--';
    return new Date(dateStr).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  };

  const formatMinutes = (mins: number) => {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return `${h}h ${m}m`;
  };

  const greeting = now.getHours() < 12 ? 'morning' : now.getHours() < 17 ? 'afternoon' : 'evening';

  const statCards = summary
    ? [
        { icon: HiOutlineCalendar, value: summary.presentDays, label: 'Present', color: 'primary', bg: 'from-primary-50 to-blue-50', ring: 'ring-primary-100' },
        { icon: HiOutlineXCircle, value: summary.absentDays, label: 'Absent', color: 'red', bg: 'from-red-50 to-rose-50', ring: 'ring-red-100' },
        { icon: HiOutlineClock, value: summary.halfDays, label: 'Half Days', color: 'amber', bg: 'from-amber-50 to-yellow-50', ring: 'ring-amber-100' },
        { icon: HiOutlinePause, value: `${summary.totalBreakHours}h`, label: 'Break Time', color: 'orange', bg: 'from-orange-50 to-amber-50', ring: 'ring-orange-100' },
        { icon: HiOutlineChartBar, value: `${summary.averageWorkHours}h`, label: 'Avg Hours', color: 'emerald', bg: 'from-emerald-50 to-green-50', ring: 'ring-emerald-100' },
      ]
    : [];

  return (
    <Layout>
      {/* Header */}
      <div className="mb-8 animate-fade-in">
        <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">
          Good {greeting},{' '}
          <span className="bg-gradient-to-r from-primary-600 to-primary-500 bg-clip-text text-transparent">
            {user?.name?.split(' ')[0]}
          </span>
          !
        </h1>
        <p className="mt-1.5 text-sm text-gray-500">
          {now.toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          })}
        </p>
      </div>

      {/* Punch & Break Section */}
      <div className="card mb-8 animate-slide-up relative overflow-hidden">
        {/* Subtle background decoration */}
        <div className="absolute -top-24 -right-24 h-48 w-48 rounded-full bg-gradient-to-br from-primary-100/40 to-transparent blur-2xl" />
        <div className="relative flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="text-center sm:text-left">
            <div className="flex items-center gap-2">
              <div className={`h-2.5 w-2.5 rounded-full ${
                !hasPunchedIn ? 'bg-gray-300' : hasPunchedOut ? 'bg-emerald-500' : isOnBreak ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500 animate-pulse'
              }`} />
              <h2 className="text-lg font-bold text-gray-900">Time Clock</h2>
            </div>
            <p className="text-sm text-gray-500 mt-0.5">
              {!hasPunchedIn
                ? 'Ready to start your day?'
                : hasPunchedOut
                ? 'Great job today!'
                : isOnBreak
                ? 'Enjoy your break!'
                : 'Working hard!'}
            </p>
            {hasPunchedIn && (
              <div className="mt-3 flex flex-wrap items-center gap-3 text-sm">
                <span className="inline-flex items-center gap-1.5 rounded-lg bg-gray-100 px-3 py-1.5 font-medium text-gray-700">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  In: {formatTime(attendance?.punchIn ?? null)}
                </span>
                {hasPunchedOut && (
                  <span className="inline-flex items-center gap-1.5 rounded-lg bg-gray-100 px-3 py-1.5 font-medium text-gray-700">
                    <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
                    Out: {formatTime(attendance?.punchOut ?? null)}
                  </span>
                )}
                {(attendance?.totalBreakMinutes ?? 0) > 0 && (
                  <span className="inline-flex items-center gap-1.5 rounded-lg bg-amber-50 px-3 py-1.5 font-semibold text-amber-700">
                    <HiOutlinePause className="h-3.5 w-3.5" />
                    {formatMinutes(attendance?.totalBreakMinutes ?? 0)}
                  </span>
                )}
                {hasPunchedOut && (
                  <span className="inline-flex items-center gap-1.5 rounded-lg bg-primary-50 px-3 py-1.5 font-semibold text-primary-700">
                    <HiOutlineClock className="h-3.5 w-3.5" />
                    {formatMinutes(attendance?.totalWorkMinutes ?? 0)}
                  </span>
                )}
              </div>
            )}
            {/* Break log for today */}
            {attendance?.breaks && attendance.breaks.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {attendance.breaks.map((b, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center gap-1.5 rounded-full border border-amber-200/60 bg-gradient-to-r from-amber-50 to-orange-50 px-3 py-1 text-xs font-medium text-amber-700 shadow-sm"
                  >
                    <HiOutlinePause className="h-3 w-3" />
                    {formatTime(b.start)}
                    <span className="text-amber-400">→</span>
                    {b.end ? formatTime(b.end) : <span className="animate-pulse">ongoing</span>}
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="flex flex-wrap gap-3">
            {/* Punch In */}
            {!hasPunchedIn && (
              <button
                onClick={() => punchInMutation.mutate()}
                disabled={punchInMutation.isPending || loadingToday}
                className="group flex items-center gap-3 rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-600 px-10 py-5 text-lg font-bold text-white shadow-lg shadow-emerald-200/50 transition-all hover:shadow-xl hover:shadow-emerald-300/50 hover:-translate-y-0.5 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0"
              >
                <HiOutlineClock className="h-7 w-7 transition-transform group-hover:rotate-12" />
                {punchInMutation.isPending ? 'Punching...' : 'Punch In'}
              </button>
            )}

            {/* Working state: show Break + Punch Out */}
            {hasPunchedIn && !hasPunchedOut && !isOnBreak && (
              <>
                <button
                  onClick={() => startBreakMutation.mutate()}
                  disabled={startBreakMutation.isPending}
                  className="group flex items-center gap-3 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-500 px-8 py-5 text-lg font-bold text-white shadow-lg shadow-amber-200/50 transition-all hover:shadow-xl hover:shadow-amber-300/50 hover:-translate-y-0.5 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <HiOutlinePause className="h-7 w-7 transition-transform group-hover:scale-110" />
                  {startBreakMutation.isPending ? 'Starting...' : 'Start Break'}
                </button>
                <button
                  onClick={() => punchOutMutation.mutate()}
                  disabled={punchOutMutation.isPending}
                  className="group flex items-center gap-3 rounded-2xl bg-gradient-to-br from-red-500 to-red-600 px-8 py-5 text-lg font-bold text-white shadow-lg shadow-red-200/50 transition-all hover:shadow-xl hover:shadow-red-300/50 hover:-translate-y-0.5 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <HiOutlineClock className="h-7 w-7 transition-transform group-hover:rotate-12" />
                  {punchOutMutation.isPending ? 'Punching...' : 'Punch Out'}
                </button>
              </>
            )}

            {/* On break: show End Break */}
            {hasPunchedIn && !hasPunchedOut && isOnBreak && (
              <button
                onClick={() => endBreakMutation.mutate()}
                disabled={endBreakMutation.isPending}
                className="group flex items-center gap-3 rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-600 px-10 py-5 text-lg font-bold text-white shadow-lg shadow-emerald-200/50 transition-all hover:shadow-xl hover:shadow-emerald-300/50 hover:-translate-y-0.5 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed animate-pulse"
              >
                <HiOutlinePlay className="h-7 w-7 transition-transform group-hover:scale-110" />
                {endBreakMutation.isPending ? 'Ending...' : 'End Break'}
              </button>
            )}

            {/* Day done */}
            {hasPunchedOut && (
              <div className="flex items-center gap-3 rounded-2xl border-2 border-emerald-200 bg-gradient-to-r from-emerald-50 to-green-50 px-10 py-5 text-lg font-bold text-emerald-700">
                <HiOutlineCheckCircle className="h-7 w-7" />
                Day Complete
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Monthly Summary Cards */}
      {summary && (
        <div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-5">
          {statCards.map((card, i) => (
            <div key={card.label} className={`stagger-${i + 1} card bg-gradient-to-br ${card.bg} ring-1 ${card.ring} flex flex-col items-center gap-2 py-5 hover:shadow-md transition-shadow`}>
              <card.icon className={`h-8 w-8 text-${card.color}-500`} />
              <p className="text-2xl font-extrabold text-gray-900">{card.value}</p>
              <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-widest">{card.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Attendance History Table */}
      <div className="card animate-slide-up">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-gray-900">
            Attendance History
          </h2>
          <span className="text-xs font-semibold text-gray-400 uppercase tracking-widest">
            {now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
          </span>
        </div>
        {loadingHistory ? (
          <div className="flex justify-center py-12">
            <div className="h-10 w-10 animate-spin rounded-full border-[3px] border-primary-100 border-t-primary-600" />
          </div>
        ) : (
          <div className="overflow-x-auto -mx-6 px-6">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="table-header">Date</th>
                  <th className="table-header">Punch In</th>
                  <th className="table-header">Punch Out</th>
                  <th className="table-header">Break Time</th>
                  <th className="table-header">Worked</th>
                  <th className="table-header">Status</th>
                </tr>
              </thead>
              <tbody>
                {historyData?.records.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center">
                      <div className="flex flex-col items-center gap-2 text-gray-400">
                        <HiOutlineCalendar className="h-10 w-10 text-gray-300" />
                        <p className="font-medium">No attendance records this month</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  historyData?.records.map((record) => (
                    <tr
                      key={record._id}
                      className="border-b border-gray-50 transition-colors hover:bg-gray-50/50 group"
                    >
                      <td className="table-cell font-semibold text-gray-900">
                        {new Date(record.date + 'T00:00:00').toLocaleDateString('en-US', {
                          weekday: 'short',
                          month: 'short',
                          day: 'numeric',
                        })}
                      </td>
                      <td className="table-cell text-gray-600 font-medium">
                        {formatTime(record.punchIn)}
                      </td>
                      <td className="table-cell text-gray-600 font-medium">
                        {formatTime(record.punchOut)}
                      </td>
                      <td className="table-cell font-medium text-amber-600">
                        {(record.totalBreakMinutes ?? 0) > 0
                          ? formatMinutes(record.totalBreakMinutes)
                          : <span className="text-gray-300">—</span>}
                      </td>
                      <td className="table-cell font-medium text-gray-600">
                        {record.totalWorkMinutes > 0
                          ? formatMinutes(record.totalWorkMinutes)
                          : <span className="text-gray-300">—</span>}
                      </td>
                      <td className="table-cell">
                        <span
                          className={`badge-${
                            record.status === 'present'
                              ? 'success'
                              : record.status === 'half-day'
                              ? 'warning'
                              : 'danger'
                          }`}
                        >
                          {record.status.charAt(0).toUpperCase() + record.status.slice(1)}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </Layout>
  );
}
