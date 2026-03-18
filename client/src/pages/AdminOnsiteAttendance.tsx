import { useState, useCallback, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Layout from '../components/Layout';
import { adminApi } from '../api/admin';
import toast from 'react-hot-toast';
import {
  HiOutlineRefresh,
  HiOutlineFingerPrint,
  HiOutlineCloudUpload,
  HiOutlineDocumentDownload,
} from 'react-icons/hi';

export default function AdminOnsiteAttendance() {
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().slice(0, 10));
  const [selectedEmployee, setSelectedEmployee] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  // Get onsite employees for filter dropdown
  const { data: onsiteEmployees } = useQuery({
    queryKey: ['admin', 'onsite-employees'],
    queryFn: adminApi.getOnsiteEmployees,
  });

  // Get onsite attendance records
  const { data: attendanceData, isLoading, refetch } = useQuery({
    queryKey: ['admin', 'onsite-attendance', selectedDate, selectedEmployee, selectedDepartment],
    queryFn: () => adminApi.getOnsiteAttendance({
      date: selectedDate,
      employeeId: selectedEmployee || undefined,
      department: selectedDepartment || undefined,
    }),
    refetchInterval: autoRefresh ? 30000 : false, // Refresh every 30 seconds if auto-refresh is enabled
  });

  // CSV import mutation
  const importCsvMutation = useMutation({
    mutationFn: adminApi.importOnsiteAttendanceCsv,
    onSuccess: (result) => {
      toast.success(`Successfully imported ${result.imported} records`);
      if (result.errors.length > 0) {
        toast.error(`Import completed with ${result.errors.length} errors. Check console for details.`);
        console.log('Import errors:', result.errors);
      }
      queryClient.invalidateQueries({ queryKey: ['admin', 'onsite-attendance'] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to import CSV');
    },
  });

  // Biometric sync mutation
  const syncBiometricMutation = useMutation({
    mutationFn: adminApi.syncBiometricAttendance,
    onSuccess: () => {
      toast.success('Biometric attendance synced successfully');
      queryClient.invalidateQueries({ queryKey: ['admin', 'onsite-attendance'] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to sync biometric attendance');
    },
  });

  const records = attendanceData?.records || [];
  const departments = [...new Set(records.map(r => r.userId?.department).filter(Boolean))];

  const handleManualRefresh = useCallback(async () => {
    await refetch();
    toast.success('Attendance refreshed');
  }, [refetch]);

  const handleCsvImport = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.csv')) {
      toast.error('Please select a CSV file');
      return;
    }

    importCsvMutation.mutate(file);
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [importCsvMutation]);

  const handleDownloadTemplate = useCallback(() => {
    const csvContent = 'employee_id,name,date,check_in,check_out,department\nEMP001,John Doe,2024-01-15,09:00,17:30,Engineering\nEMP002,Jane Smith,2024-01-15,08:45,16:45,HR\n';
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'onsite_attendance_template.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  }, []);

  return (
    <Layout>
      {/* ── Header ── */}
      <div className="mb-8 animate-fade-in">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight page-heading">Onsite Employees Attendance</h1>
            <p className="text-sm text-gray-400 mt-0.5">Biometric attendance records for onsite employees</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleDownloadTemplate}
              className="group flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-2 text-xs font-semibold shadow-sm transition-all hover:bg-gray-50"
            >
              <HiOutlineDocumentDownload className="h-3.5 w-3.5 transition-transform group-hover:scale-110 duration-500" />
              Template
            </button>
            <label className="group flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-2 text-xs font-semibold shadow-sm transition-all hover:bg-gray-50 cursor-pointer">
              <HiOutlineCloudUpload className="h-3.5 w-3.5 transition-transform group-hover:scale-110 duration-500" />
              Import CSV
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={handleCsvImport}
                className="hidden"
                disabled={importCsvMutation.isPending}
              />
            </label>
            <button
              onClick={() => syncBiometricMutation.mutate()}
              disabled={syncBiometricMutation.isPending || isLoading}
              className="group flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-2 text-xs font-semibold shadow-sm transition-all hover:bg-gray-50 disabled:opacity-50"
            >
              <HiOutlineFingerPrint className={`h-3.5 w-3.5 transition-transform duration-500 ${syncBiometricMutation.isPending ? 'animate-pulse' : 'group-hover:scale-110'}`} />
              {syncBiometricMutation.isPending ? 'Syncing...' : 'Sync Device'}
            </button>
            <button
              onClick={handleManualRefresh}
              disabled={isLoading || syncBiometricMutation.isPending}
              className="group flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-2 text-xs font-semibold shadow-sm transition-all hover:bg-gray-50 disabled:opacity-50"
            >
              <HiOutlineRefresh className={`h-3.5 w-3.5 transition-transform duration-500 ${isLoading ? 'animate-spin' : 'group-hover:rotate-180'}`} />
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

      {/* ── Filters ── */}
      <div className="flex items-center gap-3 mb-3 animate-fade-in">
        <span className="text-[11px] font-bold uppercase tracking-[0.15em] text-gray-400 whitespace-nowrap">Filters</span>
        <div className="flex-1 h-px section-divider" />
      </div>
      <div className="card mb-8 animate-slide-up">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <label className="label">Date</label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="input"
            />
          </div>
          <div className="flex-1">
            <label className="label">Employee</label>
            <select
              value={selectedEmployee}
              onChange={(e) => setSelectedEmployee(e.target.value)}
              className="input"
            >
              <option value="">All Employees</option>
              {onsiteEmployees?.employees?.map((emp: any) => (
                <option key={emp._id} value={emp._id}>
                  {emp.name} — {emp.department}
                </option>
              ))}
            </select>
          </div>
          <div className="flex-1">
            <label className="label">Department</label>
            <select
              value={selectedDepartment}
              onChange={(e) => setSelectedDepartment(e.target.value)}
              className="input"
            >
              <option value="">All Departments</option>
              {departments.map(dept => (
                <option key={dept} value={dept}>{dept}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* ── Attendance Table ── */}
      <div className="flex items-center gap-3 mb-3 animate-fade-in">
        <span className="text-[11px] font-bold uppercase tracking-[0.15em] text-gray-400 whitespace-nowrap">Records</span>
        <div className="flex-1 h-px section-divider" />
      </div>
      <div className="card animate-slide-up">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left py-3 px-4 text-xs font-bold uppercase tracking-wider text-gray-500">Employee Name</th>
                <th className="text-left py-3 px-4 text-xs font-bold uppercase tracking-wider text-gray-500">Employee ID</th>
                <th className="text-left py-3 px-4 text-xs font-bold uppercase tracking-wider text-gray-500">Check In</th>
                <th className="text-left py-3 px-4 text-xs font-bold uppercase tracking-wider text-gray-500">Check Out</th>
                <th className="text-left py-3 px-4 text-xs font-bold uppercase tracking-wider text-gray-500">Source</th>
                <th className="text-left py-3 px-4 text-xs font-bold uppercase tracking-wider text-gray-500">Date</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-gray-500">
                    <div className="flex items-center justify-center gap-2">
                      <HiOutlineRefresh className="h-4 w-4 animate-spin" />
                      Loading attendance records...
                    </div>
                  </td>
                </tr>
              ) : records.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-gray-500">
                    No attendance records found for the selected filters.
                  </td>
                </tr>
              ) : (
                records.map((record, index) => (
                  <tr key={record._id || `record-${index}`} className="border-b border-gray-50 hover:bg-gray-50/50">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-indigo-100 flex items-center justify-center">
                          <span className="text-xs font-bold text-indigo-600">
                            {record.userId?.name?.split(' ').map((n: string) => n[0]).join('').toUpperCase() || '?'}
                          </span>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">{record.userId?.name || 'Unknown'}</p>
                          <p className="text-xs text-gray-500">{record.userId?.department || 'N/A'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-600">{record.userId?._id || 'N/A'}</td>
                    <td className="py-3 px-4 text-sm text-gray-600">
                      {record.punchIn ? new Date(record.punchIn).toLocaleTimeString('en-US', {
                        hour: '2-digit',
                        minute: '2-digit',
                        hour12: false
                      }) : '-'}
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-600">
                      {record.punchOut ? new Date(record.punchOut).toLocaleTimeString('en-US', {
                        hour: '2-digit',
                        minute: '2-digit',
                        hour12: false
                      }) : '-'}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <HiOutlineFingerPrint className="h-4 w-4 text-indigo-600" />
                        <span className="text-sm font-medium text-indigo-600">Biometric</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-600">{record.date}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </Layout>
  );
}