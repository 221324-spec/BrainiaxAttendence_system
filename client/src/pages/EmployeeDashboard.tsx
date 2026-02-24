import { useState } from 'react';
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
  HiOutlineDownload,
  HiOutlineChevronLeft,
  HiOutlineChevronRight,
  HiOutlineMail,
  HiOutlineOfficeBuilding,
  HiOutlineIdentification,
} from 'react-icons/hi';
import { HiOutlinePause, HiOutlinePlay } from 'react-icons/hi2';

/* ─── Mini Calendar ─── */
function AttendanceCalendar({
  year,
  month,
  records,
}: {
  year: number;
  month: number;
  records: { date: string; status: string }[];
}) {
  const firstDay = new Date(year, month - 1, 1);
  const daysInMonth = new Date(year, month, 0).getDate();
  const startWeekday = firstDay.getDay(); // 0=Sun
  const today = new Date().toISOString().slice(0, 10);

  const recordMap = new Map(records.map((r) => [r.date, r.status]));

  const weekDays = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

  const cells: (number | null)[] = [];
  for (let i = 0; i < startWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const getColor = (day: number) => {
    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    if (dateStr > today) return 'bg-transparent text-gray-300';
    const status = recordMap.get(dateStr);
    if (status === 'present') return 'bg-emerald-500 text-white';
    if (status === 'half-day') return 'bg-amber-400 text-white';
    // If the date is past/today and no record → absent (only count weekdays if desired, but keep simple)
    const dow = new Date(dateStr + 'T00:00:00').getDay();
    if (dow === 0 || dow === 6) return 'bg-transparent text-gray-300'; // weekend
    if (dateStr === today && !status) return 'ring-2 ring-indigo-400 text-gray-500 bg-transparent'; // today no record yet
    return 'bg-rose-400 text-white'; // absent weekday
  };

  return (
    <div>
      <div className="grid grid-cols-7 gap-1 mb-2">
        {weekDays.map((d) => (
          <div key={d} className="text-center text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--muted)' }}>
            {d}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {cells.map((day, i) => (
          <div key={i} className="flex items-center justify-center">
            {day ? (
              <div
                className={`h-8 w-8 flex items-center justify-center rounded-lg text-xs font-bold transition-all ${getColor(day)}`}
                title={`${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`}
              >
                {day}
              </div>
            ) : (
              <div className="h-8 w-8" />
            )}
          </div>
        ))}
      </div>
      {/* Legend */}
      <div className="mt-3 flex flex-wrap items-center justify-center gap-3 text-[10px] font-semibold" style={{ color: 'var(--muted)' }}>
        <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-sm bg-emerald-500" /> Present</span>
        <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-sm bg-amber-400" /> Half Day</span>
        <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-sm bg-rose-400" /> Absent</span>
        <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-sm bg-gray-200" /> Weekend</span>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   EMPLOYEE DASHBOARD
   ═══════════════════════════════════════════ */
export default function EmployeeDashboard() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const now = new Date();

  /* ── Month/Year selector state ── */
  const [selYear, setSelYear] = useState(now.getFullYear());
  const [selMonth, setSelMonth] = useState(now.getMonth() + 1);

  const goToPrevMonth = () => {
    if (selMonth === 1) { setSelMonth(12); setSelYear(selYear - 1); }
    else setSelMonth(selMonth - 1);
  };
  const goToNextMonth = () => {
    const isCurrentMonth = selYear === now.getFullYear() && selMonth === now.getMonth() + 1;
    if (isCurrentMonth) return; // don't go into the future
    if (selMonth === 12) { setSelMonth(1); setSelYear(selYear + 1); }
    else setSelMonth(selMonth + 1);
  };
  const isCurrentMonth = selYear === now.getFullYear() && selMonth === now.getMonth() + 1;
  const monthLabel = new Date(selYear, selMonth - 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  /* ── CSV export state ── */
  const todayStr = now.toISOString().slice(0, 10);
  const firstOfMonth = `${selYear}-${String(selMonth).padStart(2, '0')}-01`;
  const [csvStart, setCsvStart] = useState(firstOfMonth);
  const [csvEnd, setCsvEnd] = useState(todayStr);
  const [exporting, setExporting] = useState(false);

  /* ── Queries ── */
  const { data: todayData, isLoading: loadingToday } = useQuery({
    queryKey: ['attendance', 'today'],
    queryFn: () => attendanceApi.getToday(),
    refetchInterval: 30000,
  });

  const { data: historyData, isLoading: loadingHistory } = useQuery({
    queryKey: ['attendance', 'history', selYear, selMonth],
    queryFn: () => attendanceApi.getHistory(selYear, selMonth),
  });

  const { data: summaryData } = useQuery({
    queryKey: ['attendance', 'summary', selYear, selMonth],
    queryFn: () => attendanceApi.getSummary(selYear, selMonth),
  });

  /* ── Mutations ── */
  const punchInMutation = useMutation({
    mutationFn: () => attendanceApi.punchIn(),
    onSuccess: (data) => { toast.success(data.message); queryClient.invalidateQueries({ queryKey: ['attendance'] }); },
    onError: (err: any) => { toast.error(err.response?.data?.message || 'Punch in failed'); },
  });
  const punchOutMutation = useMutation({
    mutationFn: () => attendanceApi.punchOut(),
    onSuccess: (data) => { toast.success(data.message); queryClient.invalidateQueries({ queryKey: ['attendance'] }); },
    onError: (err: any) => { toast.error(err.response?.data?.message || 'Punch out failed'); },
  });
  const startBreakMutation = useMutation({
    mutationFn: () => attendanceApi.startBreak(),
    onSuccess: (data) => { toast.success(data.message); queryClient.invalidateQueries({ queryKey: ['attendance'] }); },
    onError: (err: any) => { toast.error(err.response?.data?.message || 'Start break failed'); },
  });
  const endBreakMutation = useMutation({
    mutationFn: () => attendanceApi.endBreak(),
    onSuccess: (data) => { toast.success(data.message); queryClient.invalidateQueries({ queryKey: ['attendance'] }); },
    onError: (err: any) => { toast.error(err.response?.data?.message || 'End break failed'); },
  });

  /* ── Derived ── */
  const attendance = todayData?.attendance;
  const hasPunchedIn = !!attendance?.punchIn;
  const hasPunchedOut = !!attendance?.punchOut;
  const isOnBreak = !!attendance?.isOnBreak;
  const summary = summaryData?.summary;

  const formatTime = (dateStr: string | null) => {
    if (!dateStr) return '--:--';
    return new Date(dateStr).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
  };
  const formatMinutes = (mins: number) => {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return `${h}h ${m}m`;
  };
  const greeting = now.getHours() < 12 ? 'morning' : now.getHours() < 17 ? 'afternoon' : 'evening';

  const initials = user?.name?.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2) ?? '?';

  const statCards = summary
    ? [
        { icon: HiOutlineCalendar, value: summary.presentDays, label: 'Present', color: 'indigo', bg: 'from-indigo-50 to-blue-50', ring: 'ring-indigo-100' },
        { icon: HiOutlineXCircle, value: summary.absentDays, label: 'Absent', color: 'red', bg: 'from-red-50 to-rose-50', ring: 'ring-red-100' },
        { icon: HiOutlineClock, value: summary.halfDays, label: 'Half Days', color: 'amber', bg: 'from-amber-50 to-yellow-50', ring: 'ring-amber-100' },
        { icon: HiOutlinePause, value: `${summary.totalBreakHours}h`, label: 'Break Time', color: 'orange', bg: 'from-orange-50 to-amber-50', ring: 'ring-orange-100' },
        { icon: HiOutlineChartBar, value: `${summary.averageWorkHours}h`, label: 'Avg Hours', color: 'emerald', bg: 'from-emerald-50 to-green-50', ring: 'ring-emerald-100' },
      ]
    : [];

  /* ── CSV Export Handler ── */
  const handleExportCsv = async () => {
    if (!csvStart || !csvEnd) { toast.error('Select a date range'); return; }
    if (csvStart > csvEnd) { toast.error('Start must be before end'); return; }
    setExporting(true);
    try {
      const blob = await attendanceApi.exportCsv(csvStart, csvEnd);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `my_attendance_${csvStart}_${csvEnd}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      toast.success('CSV downloaded');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Export failed');
    } finally {
      setExporting(false);
    }
  };

  /* ═══════════════════════════════════════════
     JSX
     ═══════════════════════════════════════════ */
  return (
    <Layout>
      {/* ── Header ── */}
      <div className="mb-8 animate-fade-in">
        <h1 className="text-2xl font-extrabold tracking-tight">
          Good {greeting},{' '}
          <span className="bg-gradient-to-r from-indigo-600 to-indigo-500 bg-clip-text text-transparent">
            {user?.name?.split(' ')[0]}
          </span>
          !
        </h1>
        <p className="mt-1 text-sm" style={{ color: 'var(--muted)' }}>
          {now.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </p>
      </div>

      {/* ── Profile Card + Time Clock ── */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-8 animate-slide-up">
        {/* Profile Card */}
        <div className="card p-6 flex flex-col items-center text-center relative overflow-hidden">
          <div className="absolute -top-8 -right-8 h-24 w-24 rounded-full bg-gradient-to-br from-indigo-100/60 to-transparent blur-2xl" />
          <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-indigo-600 text-white text-xl font-bold shadow-lg shadow-indigo-200/50 mb-4">
            {initials}
          </div>
          <h3 className="text-base font-bold truncate w-full">{user?.name}</h3>
          <span className="inline-block mt-1 text-xs font-semibold rounded-lg px-2.5 py-0.5 bg-indigo-50 text-indigo-600">
            {user?.role === 'admin' ? 'Admin' : 'Employee'}
          </span>
          <div className="mt-4 w-full space-y-2.5 text-left">
            <div className="flex items-center gap-2.5 text-xs" style={{ color: 'var(--muted)' }}>
              <HiOutlineMail className="h-4 w-4 flex-shrink-0" />
              <span className="truncate">{user?.email}</span>
            </div>
            <div className="flex items-center gap-2.5 text-xs" style={{ color: 'var(--muted)' }}>
              <HiOutlineOfficeBuilding className="h-4 w-4 flex-shrink-0" />
              <span>{user?.department || 'No department'}</span>
            </div>
            <div className="flex items-center gap-2.5 text-xs" style={{ color: 'var(--muted)' }}>
              <HiOutlineIdentification className="h-4 w-4 flex-shrink-0" />
              <span className="font-mono text-[11px]">{user?._id?.slice(-8).toUpperCase()}</span>
            </div>
          </div>
        </div>

        {/* Time Clock */}
        <div className="lg:col-span-3 card p-6 relative overflow-hidden">
          <div className="absolute -top-24 -right-24 h-48 w-48 rounded-full bg-gradient-to-br from-indigo-100/40 to-transparent blur-2xl" />
          <div className="relative flex flex-col sm:flex-row items-center justify-between gap-6">
            <div className="text-center sm:text-left">
              <div className="flex items-center gap-2">
                <div className={`h-2.5 w-2.5 rounded-full ${
                  !hasPunchedIn ? 'bg-gray-300' : hasPunchedOut ? 'bg-emerald-500' : isOnBreak ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500 animate-pulse'
                }`} />
                <h2 className="text-lg font-bold">Time Clock</h2>
              </div>
              <p className="text-sm mt-0.5" style={{ color: 'var(--muted)' }}>
                {!hasPunchedIn ? 'Ready to start your day?' : hasPunchedOut ? 'Great job today!' : isOnBreak ? 'Enjoy your break!' : 'Working hard!'}
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
                    <span className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-50 px-3 py-1.5 font-semibold text-indigo-700">
                      <HiOutlineClock className="h-3.5 w-3.5" />
                      {formatMinutes(attendance?.totalWorkMinutes ?? 0)}
                    </span>
                  )}
                </div>
              )}
              {attendance?.breaks && attendance.breaks.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {attendance.breaks.map((b, i) => (
                    <span key={i} className="inline-flex items-center gap-1.5 rounded-full border border-amber-200/60 bg-gradient-to-r from-amber-50 to-orange-50 px-3 py-1 text-xs font-medium text-amber-700 shadow-sm">
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
              {!hasPunchedIn && (
                <button onClick={() => punchInMutation.mutate()} disabled={punchInMutation.isPending || loadingToday}
                  className="group flex items-center gap-3 rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-600 px-10 py-5 text-lg font-bold text-white shadow-lg shadow-emerald-200/50 transition-all hover:shadow-xl hover:shadow-emerald-300/50 hover:-translate-y-0.5 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0">
                  <HiOutlineClock className="h-7 w-7 transition-transform group-hover:rotate-12" />
                  {punchInMutation.isPending ? 'Punching...' : 'Punch In'}
                </button>
              )}
              {hasPunchedIn && !hasPunchedOut && !isOnBreak && (
                <>
                  <button onClick={() => startBreakMutation.mutate()} disabled={startBreakMutation.isPending}
                    className="group flex items-center gap-3 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-500 px-8 py-5 text-lg font-bold text-white shadow-lg shadow-amber-200/50 transition-all hover:shadow-xl hover:shadow-amber-300/50 hover:-translate-y-0.5 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed">
                    <HiOutlinePause className="h-7 w-7 transition-transform group-hover:scale-110" />
                    {startBreakMutation.isPending ? 'Starting...' : 'Start Break'}
                  </button>
                  <button onClick={() => punchOutMutation.mutate()} disabled={punchOutMutation.isPending}
                    className="group flex items-center gap-3 rounded-2xl bg-gradient-to-br from-red-500 to-red-600 px-8 py-5 text-lg font-bold text-white shadow-lg shadow-red-200/50 transition-all hover:shadow-xl hover:shadow-red-300/50 hover:-translate-y-0.5 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed">
                    <HiOutlineClock className="h-7 w-7 transition-transform group-hover:rotate-12" />
                    {punchOutMutation.isPending ? 'Punching...' : 'Punch Out'}
                  </button>
                </>
              )}
              {hasPunchedIn && !hasPunchedOut && isOnBreak && (
                <button onClick={() => endBreakMutation.mutate()} disabled={endBreakMutation.isPending}
                  className="group flex items-center gap-3 rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-600 px-10 py-5 text-lg font-bold text-white shadow-lg shadow-emerald-200/50 transition-all hover:shadow-xl hover:shadow-emerald-300/50 hover:-translate-y-0.5 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed animate-pulse">
                  <HiOutlinePlay className="h-7 w-7 transition-transform group-hover:scale-110" />
                  {endBreakMutation.isPending ? 'Ending...' : 'End Break'}
                </button>
              )}
              {hasPunchedOut && (
                <div className="flex items-center gap-3 rounded-2xl border-2 border-emerald-200 bg-gradient-to-r from-emerald-50 to-green-50 px-10 py-5 text-lg font-bold text-emerald-700">
                  <HiOutlineCheckCircle className="h-7 w-7" />
                  Day Complete
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Month Selector + Summary Cards ── */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 animate-fade-in">
        <div className="flex items-center gap-3">
          <button onClick={goToPrevMonth} className="p-2 rounded-lg border transition-colors hover:bg-gray-50" style={{ borderColor: 'var(--border)' }}>
            <HiOutlineChevronLeft className="h-4 w-4" />
          </button>
          <h2 className="text-base font-bold min-w-[160px] text-center">{monthLabel}</h2>
          <button onClick={goToNextMonth} disabled={isCurrentMonth}
            className="p-2 rounded-lg border transition-colors hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed"
            style={{ borderColor: 'var(--border)' }}>
            <HiOutlineChevronRight className="h-4 w-4" />
          </button>
          {!isCurrentMonth && (
            <button onClick={() => { setSelYear(now.getFullYear()); setSelMonth(now.getMonth() + 1); }}
              className="text-xs font-semibold text-indigo-600 hover:underline ml-1">
              Today
            </button>
          )}
        </div>
      </div>

      {summary && (
        <div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-5 animate-fade-in">
          {statCards.map((card, i) => (
            <div key={card.label} className={`stagger-${i + 1} card bg-gradient-to-br ${card.bg} ring-1 ${card.ring} flex flex-col items-center gap-2 py-5 hover:shadow-md transition-shadow`}>
              <card.icon className={`h-8 w-8 text-${card.color}-500`} />
              <p className="text-2xl font-extrabold">{card.value}</p>
              <p className="text-[11px] font-semibold uppercase tracking-widest" style={{ color: 'var(--muted)' }}>{card.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* ── Calendar + CSV Export ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Mini Calendar */}
        <div className="card p-6 animate-slide-up">
          <h3 className="text-base font-bold mb-4 flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
              <HiOutlineCalendar className="h-4 w-4" />
            </div>
            Attendance Calendar
          </h3>
          {loadingHistory ? (
            <div className="flex justify-center py-8">
              <div className="h-8 w-8 animate-spin rounded-full border-[3px] border-indigo-100 border-t-indigo-600" />
            </div>
          ) : (
            <AttendanceCalendar
              year={selYear}
              month={selMonth}
              records={(historyData?.records ?? []).map((r) => ({ date: r.date, status: r.status }))}
            />
          )}
        </div>

        {/* CSV Export */}
        <div className="lg:col-span-2 card p-6 animate-slide-up relative overflow-hidden">
          <div className="absolute -top-20 -right-20 h-40 w-40 rounded-full bg-gradient-to-br from-indigo-50 to-transparent blur-2xl" />
          <div className="relative">
            <h3 className="text-base font-bold mb-5 flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                <HiOutlineDownload className="h-4 w-4" />
              </div>
              Export My Attendance
            </h3>
            <p className="text-sm mb-4" style={{ color: 'var(--muted)' }}>
              Download your attendance records as a CSV file for any date range.
            </p>
            <div className="flex flex-col sm:flex-row items-end gap-4">
              <div className="w-full sm:flex-1">
                <label className="label">From</label>
                <input type="date" value={csvStart} onChange={(e) => setCsvStart(e.target.value)} className="input" max={csvEnd || undefined} />
              </div>
              <div className="w-full sm:flex-1">
                <label className="label">To</label>
                <input type="date" value={csvEnd} onChange={(e) => setCsvEnd(e.target.value)} className="input" min={csvStart || undefined} />
              </div>
              <button onClick={handleExportCsv} disabled={exporting || !csvStart || !csvEnd}
                className="btn-primary flex items-center gap-2 whitespace-nowrap">
                <HiOutlineDownload className="h-4 w-4" />
                {exporting ? 'Exporting...' : 'Download CSV'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── Attendance History Table ── */}
      <div className="card animate-slide-up">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-bold flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
              <HiOutlineClock className="h-4 w-4" />
            </div>
            Attendance History
          </h2>
          <span className="text-[11px] font-semibold uppercase tracking-widest" style={{ color: 'var(--muted)' }}>
            {monthLabel}
          </span>
        </div>
        {loadingHistory ? (
          <div className="flex justify-center py-12">
            <div className="h-10 w-10 animate-spin rounded-full border-[3px] border-indigo-100 border-t-indigo-600" />
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
                      <div className="flex flex-col items-center gap-2" style={{ color: 'var(--muted)' }}>
                        <HiOutlineCalendar className="h-10 w-10 opacity-40" />
                        <p className="font-medium">No attendance records for {monthLabel}</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  historyData?.records.map((record) => (
                    <tr key={record._id} className="border-b border-gray-50 transition-colors hover:bg-gray-50/50 group">
                      <td className="table-cell font-semibold">
                        {new Date(record.date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                      </td>
                      <td className="table-cell font-medium" style={{ color: 'var(--muted)' }}>{formatTime(record.punchIn)}</td>
                      <td className="table-cell font-medium" style={{ color: 'var(--muted)' }}>{formatTime(record.punchOut)}</td>
                      <td className="table-cell font-medium text-amber-600">
                        {(record.totalBreakMinutes ?? 0) > 0 ? formatMinutes(record.totalBreakMinutes) : <span style={{ color: 'var(--muted)', opacity: 0.4 }}>—</span>}
                      </td>
                      <td className="table-cell font-medium" style={{ color: 'var(--muted)' }}>
                        {record.totalWorkMinutes > 0 ? formatMinutes(record.totalWorkMinutes) : <span style={{ opacity: 0.4 }}>—</span>}
                      </td>
                      <td className="table-cell">
                        <span className={`badge-${record.status === 'present' ? 'success' : record.status === 'half-day' ? 'warning' : 'danger'}`}>
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
