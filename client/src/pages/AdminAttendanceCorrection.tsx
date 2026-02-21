import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '../api';
import Layout from '../components/Layout';
import toast from 'react-hot-toast';

export default function AdminAttendanceCorrection() {
  const queryClient = useQueryClient();
  const { data: employeesData } = useQuery({
    queryKey: ['admin', 'employees', 'list'],
    queryFn: () => adminApi.getEmployees(),
  });

  const [userId, setUserId] = useState('');
  const [date, setDate] = useState('');
  const [form, setForm] = useState({
    punchIn: '',
    punchOut: '',
    totalBreakMinutes: '',
    totalWorkMinutes: '',
    status: 'present',
  });

  const mutation = useMutation({
    mutationFn: async (payload: any) => adminApi.correctAttendance(payload),
    onSuccess: () => {
      toast.success('Attendance record updated');
      queryClient.invalidateQueries();
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to update record');
    },
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId || !date) {
      toast.error('Select employee and date');
      return;
    }
    mutation.mutate({
      userId,
      date,
      punchIn: form.punchIn ? new Date(`${date}T${form.punchIn}`) : null,
      punchOut: form.punchOut ? new Date(`${date}T${form.punchOut}`) : null,
      totalBreakMinutes: form.totalBreakMinutes ? Number(form.totalBreakMinutes) : 0,
      totalWorkMinutes: form.totalWorkMinutes ? Number(form.totalWorkMinutes) : 0,
      status: form.status,
    });
  };

  return (
    <Layout>
      <div className="mb-8 animate-fade-in">
        <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Manual Attendance Correction</h1>
        <p className="mt-1.5 text-sm text-gray-500">Admins can correct or add attendance records for any employee and date.</p>
      </div>
      <div className="mx-auto max-w-4xl animate-slide-up">
        <div className="card">
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="label">Employee</label>
              <select className="input" value={userId} onChange={e => setUserId(e.target.value)}>
                <option value="">Select employee...</option>
                {employeesData?.employees.map((emp: any) => (
                  <option key={emp._id} value={emp._id}>{emp.name} — {emp.department}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="label">Date</label>
              <input type="date" className="input" value={date} onChange={e => setDate(e.target.value)} />
            </div>

            <div>
              <label className="label">Punch In (HH:MM)</label>
              <input type="time" name="punchIn" className="input" value={form.punchIn} onChange={handleChange} />
            </div>

            <div>
              <label className="label">Punch Out (HH:MM)</label>
              <input type="time" name="punchOut" className="input" value={form.punchOut} onChange={handleChange} />
            </div>

            <div>
              <label className="label">Total Break Minutes</label>
              <input type="number" name="totalBreakMinutes" className="input" value={form.totalBreakMinutes} onChange={handleChange} min={0} />
            </div>

            <div>
              <label className="label">Total Work Minutes</label>
              <input type="number" name="totalWorkMinutes" className="input" value={form.totalWorkMinutes} onChange={handleChange} min={0} />
            </div>

            <div>
              <label className="label">Status</label>
              <select name="status" className="input" value={form.status} onChange={handleChange}>
                <option value="present">Present</option>
                <option value="half-day">Half Day</option>
                <option value="absent">Absent</option>
              </select>
            </div>

            <div className="md:col-span-2">
              <button type="submit" className="btn-primary w-full" disabled={mutation.isPending}>
                {mutation.isPending ? 'Saving...' : 'Save Correction'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </Layout>
  );
}
