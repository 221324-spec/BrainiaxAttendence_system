import { useId, useMemo } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
} from 'recharts';
import type { PayrollMonthlyTrend } from '../types';

export type PayrollTrendRange = '6m' | '12m' | '24m' | 'yearly';

interface Props {
  data: PayrollMonthlyTrend[];
  selectedRange: PayrollTrendRange;
  onSelectedRangeChange: (range: PayrollTrendRange) => void;
}

interface ChartPoint {
  label: string;
  displayLabel: string;
  tooltipLabel: string;
  netPayout: number;
  baseSalary: number;
  bonus: number;
  docks: number;
  headcount: number;
}

const RANGE_OPTIONS: Array<{ value: PayrollTrendRange; label: string }> = [
  { value: '6m', label: '6 Months' },
  { value: '12m', label: '12 Months' },
  { value: '24m', label: '24 Months' },
  { value: 'yearly', label: 'Yearly' },
];

function formatCompactAmount(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(value >= 10_000_000 ? 0 : 1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(value >= 100_000 ? 0 : 1)}K`;
  return `${Math.round(value)}`;
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'PKR',
    maximumFractionDigits: 0,
  }).format(value);
}

function buildMonthlyData(trend: PayrollMonthlyTrend[], range: Exclude<PayrollTrendRange, 'yearly'>): ChartPoint[] {
  const months = Number.parseInt(range, 10);
  const recentTrend = trend.slice(-months);

  return recentTrend.map((item) => ({
    label: item.label,
    displayLabel: item.label.slice(0, 3),
    tooltipLabel: `${item.label} ${item.year}`,
    netPayout: item.totalPayout,
    baseSalary: item.totalBase,
    bonus: item.totalBonus,
    docks: item.totalDock,
    headcount: item.headcount,
  }));
}

function buildYearlyData(trend: PayrollMonthlyTrend[]): ChartPoint[] {
  const yearlyTotals = new Map<number, Omit<ChartPoint, 'label' | 'displayLabel' | 'tooltipLabel'>>();

  trend.forEach((item) => {
    const current = yearlyTotals.get(item.year);
    if (current) {
      current.netPayout += item.totalPayout;
      current.baseSalary += item.totalBase;
      current.bonus += item.totalBonus;
      current.docks += item.totalDock;
      current.headcount = Math.max(current.headcount, item.headcount);
      return;
    }

    yearlyTotals.set(item.year, {
      netPayout: item.totalPayout,
      baseSalary: item.totalBase,
      bonus: item.totalBonus,
      docks: item.totalDock,
      headcount: item.headcount,
    });
  });

  return Array.from(yearlyTotals.entries())
    .sort(([left], [right]) => left - right)
    .map(([year, totals]) => ({
      label: String(year),
      displayLabel: String(year),
      tooltipLabel: `Year ${year}`,
      ...totals,
    }));
}

function getChartData(trend: PayrollMonthlyTrend[], range: PayrollTrendRange): ChartPoint[] {
  if (trend.length === 0) return [];
  if (range === 'yearly') return buildYearlyData(trend);
  return buildMonthlyData(trend, range);
}

function getAxisConfig(points: ChartPoint[]) {
  const maxValue = Math.max(...points.map((point) => point.netPayout), 1);
  const roughStep = maxValue / 5;
  const magnitude = Math.pow(10, Math.floor(Math.log10(roughStep)));
  const normalizedStep = roughStep / magnitude;

  let step = magnitude;
  if (normalizedStep > 5) step = 10 * magnitude;
  else if (normalizedStep > 2) step = 5 * magnitude;
  else if (normalizedStep > 1) step = 2 * magnitude;

  const max = Math.ceil(maxValue / step) * step;
  const ticks = Array.from({ length: Math.floor(max / step) + 1 }, (_, index) => index * step);

  return { max, ticks };
}

function PayrollTrendTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;

  const point = payload[0]?.payload as ChartPoint | undefined;
  if (!point) return null;

  const rows = [
    { label: 'Base Salary', value: point.baseSalary, color: '#2563eb' },
    { label: 'Bonuses', value: point.bonus, color: '#f59e0b' },
    { label: 'Deductions', value: point.docks, color: '#ef4444' },
  ];

  return (
    <div
      className="pointer-events-none select-none"
      style={{
        minWidth: 210,
        borderRadius: 14,
        background: '#ffffff',
        border: '1px solid rgba(148, 163, 184, 0.18)',
        boxShadow: '0 18px 38px rgba(15, 23, 42, 0.12), 0 4px 12px rgba(15, 23, 42, 0.08)',
        padding: '14px 16px',
      }}
    >
      <div style={{ color: '#475569', fontSize: 12, fontWeight: 700, marginBottom: 10 }}>
        {point.tooltipLabel}
      </div>

      {rows.map((row) => (
        <div
          key={row.label}
          style={{
            display: 'grid',
            gridTemplateColumns: '10px 1fr auto',
            gap: 8,
            alignItems: 'center',
            fontSize: 12,
            marginBottom: 7,
          }}
        >
          <span style={{ width: 10, height: 10, borderRadius: 2, background: row.color }} />
          <span style={{ color: '#64748b', fontWeight: 600 }}>{row.label}</span>
          <span style={{ color: row.color, fontWeight: 700 }}>{formatCurrency(row.value)}</span>
        </div>
      ))}

      <div
        style={{
          marginTop: 10,
          paddingTop: 10,
          borderTop: '1px solid rgba(226, 232, 240, 0.9)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <span style={{ color: '#94a3b8', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          Total Payroll
        </span>
        <span style={{ color: '#0f172a', fontSize: 14, fontWeight: 800 }}>{formatCurrency(point.netPayout)}</span>
      </div>
    </div>
  );
}

function GlossyBar({ x, y, width, height, index, chartId }: any) {
  if (height <= 0 || x == null || y == null || width == null) return null;

  const radius = Math.min(10, width / 2);
  const clipId = `${chartId}-clip-${index}`;
  const splitHeight = Math.max(16, height * 0.32);
  const lowerHeight = Math.max(0, height - splitHeight);
  const splitY = y + splitHeight;

  return (
    <g>
      <defs>
        <clipPath id={clipId}>
          <rect x={x} y={y} width={width} height={height} rx={radius} ry={radius} />
        </clipPath>
      </defs>

      <rect x={x + 3} y={y + 5} width={width} height={height} rx={radius} fill="rgba(37, 99, 235, 0.10)" />

      <g clipPath={`url(#${clipId})`}>
        <rect x={x} y={y} width={width} height={splitHeight} fill="#7dc8ff" />
        <rect x={x} y={splitY} width={width} height={lowerHeight} fill="#1d4ed8" />
        <rect x={x} y={y} width={width} height={height} fill={`url(#${chartId}-overlay)`} />
        <rect x={x} y={y} width={width} height={height} fill={`url(#${chartId}-texture)`} opacity={0.36} />
        <rect x={x + 4} y={y + 4} width={Math.max(0, width - 8)} height={4} rx={2} fill="rgba(255,255,255,0.28)" />
        <rect x={x + 2} y={Math.max(y + 8, splitY - 2)} width={Math.max(0, width - 4)} height={3} rx={1.5} fill="rgba(255,255,255,0.58)" />
      </g>
    </g>
  );
}

export default function PayrollTrendChart({ data, selectedRange, onSelectedRangeChange }: Props) {
  const chartId = useId().replace(/:/g, '');

  const chartData = useMemo(() => getChartData(data, selectedRange), [data, selectedRange]);
  const axisConfig = useMemo(() => getAxisConfig(chartData), [chartData]);
  const latestPoint = chartData[chartData.length - 1] ?? null;

  if (chartData.length === 0) {
    return (
      <div className="flex min-h-[360px] flex-col items-center justify-center px-6 py-10 text-center">
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl" style={{ background: 'linear-gradient(180deg, #dbeafe 0%, #bfdbfe 100%)' }}>
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 19h16" />
            <path d="M7 15V9" />
            <path d="M12 15V5" />
            <path d="M17 15v-3" />
          </svg>
        </div>
        <p className="text-sm font-semibold text-slate-500">No payroll data available</p>
        <p className="mt-1 text-xs text-slate-400">Run payroll for a few periods to unlock the trend chart.</p>
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="mb-5 flex items-center justify-between gap-4 border-b border-slate-100 pb-4">
        <div className="flex items-center gap-3">
          <div
            className="flex h-9 w-9 items-center justify-center rounded-xl"
            style={{
              background: 'linear-gradient(180deg, #eff6ff 0%, #dbeafe 100%)',
              boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.95)',
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 19h16" />
              <path d="M7 15V9" />
              <path d="M12 15V5" />
              <path d="M17 15v-3" />
            </svg>
          </div>

          <div>
            <div className="flex items-center gap-2">
              <div className="text-sm font-bold text-slate-800">Payroll Overview</div>
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em] text-emerald-600">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                Live
              </span>
            </div>
            <div className="text-xs font-medium text-slate-400">
              {latestPoint ? `Latest payout ${formatCompactAmount(latestPoint.netPayout)}` : 'Trend timeline'}
            </div>
          </div>
        </div>

        <div className="relative">
          <select
            value={selectedRange}
            onChange={(event) => onSelectedRangeChange(event.target.value as PayrollTrendRange)}
            className="appearance-none rounded-xl border border-slate-200 bg-white px-4 py-2 pr-9 text-xs font-semibold text-slate-600 shadow-sm outline-none transition-all"
            style={{ boxShadow: '0 8px 18px rgba(148, 163, 184, 0.12)' }}
          >
            {RANGE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <svg
            className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
            viewBox="0 0 20 20"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
          >
            <path d="M5 7.5 10 12.5 15 7.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      </div>

      <div className="h-[330px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 14, right: 8, left: 0, bottom: 4 }} barCategoryGap="22%">
            <defs>
              <linearGradient id={`${chartId}-overlay`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="rgba(255,255,255,0.20)" />
                <stop offset="48%" stopColor="rgba(255,255,255,0.05)" />
                <stop offset="100%" stopColor="rgba(0,0,0,0.02)" />
              </linearGradient>
              <pattern id={`${chartId}-texture`} width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(25)">
                <path d="M0 8L8 0" stroke="rgba(255,255,255,0.24)" strokeWidth="1" />
              </pattern>
            </defs>

            <CartesianGrid vertical={false} stroke="rgba(148, 163, 184, 0.28)" strokeDasharray="3 5" />

            <XAxis
              dataKey="displayLabel"
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#64748b', fontSize: 11, fontWeight: 600 }}
              dy={10}
            />

            <YAxis
              axisLine={false}
              tickLine={false}
              width={46}
              domain={[0, axisConfig.max]}
              ticks={axisConfig.ticks}
              tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 600 }}
              tickFormatter={formatCompactAmount}
            />

            <Tooltip cursor={false} content={<PayrollTrendTooltip />} isAnimationActive={false} />

            <Bar
              dataKey="netPayout"
              shape={(props: any) => <GlossyBar {...props} chartId={chartId} />}
              maxBarSize={52}
              radius={[10, 10, 10, 10]}
              animationDuration={550}
              animationEasing="ease-out"
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
