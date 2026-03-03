import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { payrollApi } from '../api/payroll';
import Layout from '../components/Layout';
import toast from 'react-hot-toast';
import type { PayrollEmployeeLine } from '../types';
import {
  HiOutlineArrowLeft,
  HiOutlineRefresh,
  HiOutlineCheckCircle,
  HiOutlinePencilAlt,
  HiOutlineDownload,
  HiOutlineCalendar,
} from 'react-icons/hi';

const MONTH_NAMES = [
  '', 'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function fmt(n: number) {
  return 'PKR ' + new Intl.NumberFormat('en-PK', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);
}

/* ─────── Edit Modal ─────── */
function EditModal({
  line,
  runId,
  onClose,
  onSaved,
}: {
  line: PayrollEmployeeLine;
  runId: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const emp = typeof line.userId === 'object' ? line.userId : null;
  const [unpaid, setUnpaid] = useState(line.unpaidDaysManual);
  const [dock, setDock] = useState(line.dockManualTotal);
  const [bonus, setBonus] = useState(line.bonusManualTotal);
  const [notes, setNotes] = useState(line.manualNotes);
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!reason.trim()) {
      toast.error('Reason is required');
      return;
    }
    setSaving(true);
    try {
      const uid = emp?._id || (line.userId as string);
      await payrollApi.updateManualFields(runId, uid, {
        unpaidDaysManual: unpaid,
        dockManualTotal: dock,
        bonusManualTotal: bonus,
        manualNotes: notes,
        reason,
      });
      toast.success('Payroll line updated');
      onSaved();
      onClose();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Update failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="card w-full max-w-lg p-6 m-4 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-lg font-bold mb-4">
          Edit Payroll — {emp?.name || 'Employee'}
        </h3>
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label className="label">Unpaid Days</label>
            <input
              type="number"
              min={0}
              step={1}
              value={unpaid}
              onChange={(e) => setUnpaid(Number(e.target.value))}
              className="input"
            />
          </div>
          <div>
            <label className="label">Dock Amount</label>
            <input
              type="number"
              min={0}
              step={0.01}
              value={dock}
              onChange={(e) => setDock(Number(e.target.value))}
              className="input"
            />
          </div>
          <div>
            <label className="label">Bonus Amount</label>
            <input
              type="number"
              min={0}
              step={0.01}
              value={bonus}
              onChange={(e) => setBonus(Number(e.target.value))}
              className="input"
            />
          </div>
          <div>
            <label className="label">Suggested Absent</label>
            <input
              type="number"
              value={line.suggestedAbsentDays}
              disabled
              className="input bg-gray-50 text-gray-400"
            />
          </div>
        </div>
        <div className="mb-4">
          <label className="label">Notes</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="input"
            rows={2}
          />
        </div>
        <div className="mb-4">
          <label className="label">Reason for change *</label>
          <input
            type="text"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="input"
            placeholder="Why are you making this change?"
          />
        </div>
        <div className="flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800">
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="btn-primary"
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─────── Finalize/Revert Reason Modal ─────── */
function ReasonModal({
  title,
  actionLabel,
  onConfirm,
  onClose,
}: {
  title: string;
  actionLabel: string;
  onConfirm: (reason: string) => Promise<void>;
  onClose: () => void;
}) {
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);

  const handleConfirm = async () => {
    if (!reason.trim()) {
      toast.error('Reason is required');
      return;
    }
    setLoading(true);
    try {
      await onConfirm(reason);
      onClose();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Action failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="card w-full max-w-md p-6 m-4 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-lg font-bold mb-4">{title}</h3>
        <div className="mb-4">
          <label className="label">Reason *</label>
          <input
            type="text"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="input"
            placeholder="Required reason for this action"
          />
        </div>
        <div className="flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800">
            Cancel
          </button>
          <button onClick={handleConfirm} disabled={loading} className="btn-primary">
            {loading ? 'Processing...' : actionLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   PAYROLL DETAIL PAGE
   ═══════════════════════════════════════════ */
export default function AdminPayrollDetail() {
  const { runId } = useParams<{ runId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [statusFilter, setStatusFilter] = useState<string>('');
  const [editingLine, setEditingLine] = useState<PayrollEmployeeLine | null>(null);
  const [actionModal, setActionModal] = useState<{
    type: 'finalize' | 'revert';
    userId: string;
    name: string;
  } | null>(null);
  const [editingWorkingDays, setEditingWorkingDays] = useState<number | null>(null);

  /* ── Queries ── */
  const { data: runData, isLoading: loadingRun } = useQuery({
    queryKey: ['payroll', 'run', runId],
    queryFn: () => payrollApi.getRun(runId!),
    enabled: !!runId,
  });

  const { data: linesData, isLoading: loadingLines, refetch: refetchLines } = useQuery({
    queryKey: ['payroll', 'lines', runId, statusFilter],
    queryFn: () => payrollApi.getRunLines(runId!, statusFilter || undefined),
    enabled: !!runId,
  });

  /* ── Recalculate ── */
  const recalcMut = useMutation({
    mutationFn: () => payrollApi.recalculate(runId!),
    onSuccess: (res) => {
      toast.success(res.message || 'Recalculated');
      queryClient.invalidateQueries({ queryKey: ['payroll'] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Recalculation failed');
    },
  });

  /* ── Update Working Days ── */
  const workingDaysMut = useMutation({
    mutationFn: (days: number) => payrollApi.updateWorkingDays(runId!, days),
    onSuccess: (res) => {
      toast.success(res.message || 'Working days updated');
      setEditingWorkingDays(null);
      queryClient.invalidateQueries({ queryKey: ['payroll'] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Update failed');
    },
  });

  const run = runData?.run;
  const summary = runData?.summary;
  const lines = linesData?.lines || [];

  const handleFinalize = async (userId: string, reason: string) => {
    await payrollApi.finalize(runId!, userId, reason);
    toast.success('Line finalized');
    queryClient.invalidateQueries({ queryKey: ['payroll'] });
  };

  const handleRevert = async (userId: string, reason: string) => {
    await payrollApi.revert(runId!, userId, reason);
    toast.success('Reverted to DRAFT');
    queryClient.invalidateQueries({ queryKey: ['payroll'] });
  };

  return (
    <Layout>
      {/* Header */}
      <div className="mb-6 animate-fade-in">
        <button
          onClick={() => navigate('/admin/payroll')}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-indigo-600 mb-3 transition-colors"
        >
          <HiOutlineArrowLeft className="h-4 w-4" /> Back to Payroll
        </button>

        {loadingRun ? (
          <div className="h-8 w-48 bg-gray-100 rounded animate-pulse" />
        ) : run ? (
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-extrabold tracking-tight page-heading">
                {MONTH_NAMES[run.month]} {run.year} Payroll
              </h1>
              <p className="text-sm text-gray-400 mt-0.5">
                {summary?.totalLines} employees · {summary?.draftLines} draft · {summary?.finalLines} final
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => recalcMut.mutate()}
                disabled={recalcMut.isPending}
                className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-2 text-xs font-semibold shadow-sm hover:bg-gray-50 transition-all"
              >
                <HiOutlineRefresh className="h-3.5 w-3.5" />
                {recalcMut.isPending ? 'Recalculating...' : 'Recalculate'}
              </button>
              <button
                onClick={async () => {
                  try {
                    const blob = await payrollApi.exportCsv(runId!);
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
                className="flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700 shadow-sm hover:bg-emerald-100 transition-all"
              >
                <HiOutlineDownload className="h-3.5 w-3.5" /> Export CSV
              </button>
            </div>
          </div>
        ) : (
          <p className="text-gray-400">Run not found</p>
        )}
      </div>

      {/* ── Working Days Configuration ── */}
      {run && (
        <div className="mb-6 animate-fade-in">
          <div className="flex items-center gap-3 mb-3">
            <span className="text-[11px] font-bold uppercase tracking-[0.15em] text-gray-400 whitespace-nowrap">Configuration</span>
            <div className="flex-1 h-px section-divider" />
          </div>
          <div className="card p-4 sm:p-5 max-w-md">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                  <HiOutlineCalendar className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-bold">Working Days</p>
                  <p className="text-xs text-gray-400">Days used to calculate daily rate</p>
                </div>
              </div>
              {editingWorkingDays !== null ? (
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={1}
                    max={31}
                    value={editingWorkingDays}
                    onChange={(e) => setEditingWorkingDays(Math.max(1, Math.min(31, Number(e.target.value))))}
                    className="input w-20 text-center text-sm py-1.5"
                  />
                  <button
                    onClick={() => workingDaysMut.mutate(editingWorkingDays)}
                    disabled={workingDaysMut.isPending}
                    className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition-all disabled:opacity-50"
                  >
                    {workingDaysMut.isPending ? '...' : 'Save'}
                  </button>
                  <button
                    onClick={() => setEditingWorkingDays(null)}
                    className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-all"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <span className="text-lg font-bold text-indigo-600">{run.workingDaysInMonth}</span>
                  <span className="text-sm text-gray-400">days</span>
                  <button
                    onClick={() => setEditingWorkingDays(run.workingDaysInMonth)}
                    className="ml-2 p-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 hover:text-indigo-600 transition-all"
                    title="Edit working days"
                  >
                    <HiOutlinePencilAlt className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Employee Lines Section ── */}
      <div className="flex items-center gap-3 mb-3 animate-fade-in">
        <span className="text-[11px] font-bold uppercase tracking-[0.15em] text-gray-400 whitespace-nowrap">Employee Lines</span>
        <div className="flex-1 h-px section-divider" />
      </div>

      {/* Filter */}
      <div className="flex items-center gap-3 mb-4">
        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Filter:</label>
        {['', 'DRAFT', 'FINAL'].map((f) => (
          <button
            key={f}
            onClick={() => setStatusFilter(f)}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all ${
              statusFilter === f
                ? 'bg-indigo-600 text-white border-indigo-600'
                : 'border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
          >
            {f || 'All'}
          </button>
        ))}
      </div>

      {/* Lines Table */}
      <div className="card animate-slide-up">
        {loadingLines ? (
          <div className="flex justify-center py-12">
            <div className="h-10 w-10 animate-spin rounded-full border-[3px] border-indigo-100 border-t-indigo-600" />
          </div>
        ) : lines.length === 0 ? (
          <div className="text-center py-12 text-gray-400">No payroll lines found</div>
        ) : (
          <div className="overflow-x-auto -mx-6 px-6">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="table-header">Employee</th>
                  <th className="table-header text-right">Base Salary</th>
                  <th className="table-header text-center">Working</th>
                  <th className="table-header text-center">Present</th>
                  <th className="table-header text-center">Absent (sys)</th>
                  <th className="table-header text-center">Unpaid (manual)</th>
                  <th className="table-header text-right">Suggested Salary</th>
                  <th className="table-header text-right">Dock</th>
                  <th className="table-header text-right">Bonus</th>
                  <th className="table-header text-right">Final Pay</th>
                  <th className="table-header text-center">Status</th>
                  <th className="table-header">Actions</th>
                </tr>
              </thead>
              <tbody>
                {lines.map((line) => {
                  const emp = typeof line.userId === 'object' ? line.userId : null;
                  const uid = emp?._id || (line.userId as string);
                  const initials = emp?.name
                    ?.split(' ')
                    .map((n: string) => n[0])
                    .join('')
                    .slice(0, 2)
                    .toUpperCase() || '??';

                  return (
                    <tr key={line._id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                      <td className="table-cell">
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-indigo-600 text-[10px] font-bold text-white shadow-sm">
                            {initials}
                          </div>
                          <div>
                            <p className="font-semibold text-sm">{emp?.name || uid}</p>
                            <p className="text-[11px] text-gray-400">{emp?.department}</p>
                          </div>
                        </div>
                      </td>
                      <td className="table-cell text-right font-medium tabular-nums">
                        {fmt(line.baseMonthlySalarySnapshot)}
                      </td>
                      <td className="table-cell text-center tabular-nums">{line.workingDays}</td>
                      <td className="table-cell text-center tabular-nums">{line.presentDays}</td>
                      <td className="table-cell text-center tabular-nums text-amber-600">
                        {line.suggestedAbsentDays}
                      </td>
                      <td className="table-cell text-center tabular-nums text-red-600 font-medium">
                        {line.unpaidDaysManual}
                      </td>
                      <td className="table-cell text-right tabular-nums text-indigo-600 font-medium">
                        {fmt(line.calculatedPaySuggestion)}
                      </td>
                      <td className="table-cell text-right tabular-nums text-red-500">
                        {line.dockManualTotal > 0 ? `-${fmt(line.dockManualTotal)}` : '—'}
                      </td>
                      <td className="table-cell text-right tabular-nums text-emerald-600">
                        {line.bonusManualTotal > 0 ? `+${fmt(line.bonusManualTotal)}` : '—'}
                      </td>
                      <td className="table-cell text-right font-bold tabular-nums text-lg">
                        {fmt(line.finalPay)}
                      </td>
                      <td className="table-cell text-center">
                        <span
                          className={
                            line.status === 'FINAL'
                              ? 'badge-success'
                              : 'badge-warning'
                          }
                        >
                          {line.status}
                        </span>
                      </td>
                      <td className="table-cell">
                        <div className="flex items-center gap-1.5">
                          {line.status === 'DRAFT' ? (
                            <>
                              <button
                                onClick={() => setEditingLine(line)}
                                className="p-1.5 rounded-lg text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                                title="Edit"
                              >
                                <HiOutlinePencilAlt className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() =>
                                  setActionModal({
                                    type: 'finalize',
                                    userId: uid,
                                    name: emp?.name || uid,
                                  })
                                }
                                className="p-1.5 rounded-lg text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors"
                                title="Finalize"
                              >
                                <HiOutlineCheckCircle className="h-4 w-4" />
                              </button>
                            </>
                          ) : (
                            <button
                              onClick={() =>
                                setActionModal({
                                  type: 'revert',
                                  userId: uid,
                                  name: emp?.name || uid,
                                })
                              }
                              className="text-[11px] font-semibold text-amber-600 hover:text-amber-800 transition-colors"
                            >
                              Revert to Draft
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Edit Modal ── */}
      {editingLine && (
        <EditModal
          line={editingLine}
          runId={runId!}
          onClose={() => setEditingLine(null)}
          onSaved={() => {
            refetchLines();
            queryClient.invalidateQueries({ queryKey: ['payroll', 'run', runId] });
          }}
        />
      )}

      {/* ── Finalize/Revert Modal ── */}
      {actionModal && (
        <ReasonModal
          title={
            actionModal.type === 'finalize'
              ? `Finalize payroll for ${actionModal.name}?`
              : `Revert ${actionModal.name} to DRAFT?`
          }
          actionLabel={actionModal.type === 'finalize' ? 'Finalize' : 'Revert to Draft'}
          onConfirm={async (reason) => {
            if (actionModal.type === 'finalize') {
              await handleFinalize(actionModal.userId, reason);
            } else {
              await handleRevert(actionModal.userId, reason);
            }
          }}
          onClose={() => setActionModal(null)}
        />
      )}
    </Layout>
  );
}
