import { useMemo, useCallback } from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceDot,
} from 'recharts';
import type { PayrollMonthlyTrend } from '../types';

/* ═══════════════════════════════════════════════════
   PAYROLL TREND CHART — modern gradient area style
   ═══════════════════════════════════════════════════ */

interface Props {
  data: PayrollMonthlyTrend[];
  isDark: boolean;
}

/* ── PKR formatter ── */
function fmtPKR(n: number): string {
  if (n >= 1_000_000) return `PKR ${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `PKR ${(n / 1_000).toFixed(1)}K`;
  return `PKR ${Math.round(n)}`;
}

/* ── Compact PKR for labels ── */
function fmtPKRShort(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return `${Math.round(n)}`;
}

/* ── Chart data point ── */
interface ChartPoint {
  monthLabel: string;
  monthKey: string;
  netPayout: number;
  baseSalary: number;
  bonus: number;
  docks: number;
  headcount: number;
  monthlyChange: number | null;
  netPayoutMA: number | null;
}

/* ── Build chart data from backend trend ── */
function buildChartData(trend: PayrollMonthlyTrend[]): ChartPoint[] {
  return trend.map((t, i) => {
    let monthlyChange: number | null = null;
    if (i > 0) {
      const prev = trend[i - 1].totalPayout;
      if (prev > 0) {
        monthlyChange = Math.round(((t.totalPayout - prev) / prev) * 1000) / 10;
      }
    }

    let netPayoutMA: number | null = null;
    if (i >= 2) {
      const sum = trend[i].totalPayout + trend[i - 1].totalPayout + trend[i - 2].totalPayout;
      netPayoutMA = Math.round((sum / 3) * 100) / 100;
    }

    return {
      monthLabel: t.label,
      monthKey: `${t.year}-${String(t.month).padStart(2, '0')}`,
      netPayout: t.totalPayout,
      baseSalary: t.totalBase,
      bonus: t.totalBonus,
      docks: t.totalDock,
      headcount: t.headcount,
      monthlyChange,
      netPayoutMA,
    };
  });
}

/* ── Compute tight Y domain ── */
function computeYDomain(points: ChartPoint[]): [number, number] {
  if (points.length === 0) return [0, 100];
  const allValues = points.flatMap((p) => [p.netPayout, p.baseSalary].filter((v) => v > 0));
  if (allValues.length === 0) return [0, 100];
  const min = Math.min(...allValues);
  const max = Math.max(...allValues);
  const range = max - min;
  const padding = Math.max(range * 0.25, 5000);
  const lo = Math.max(0, min - padding);          // clamp at 0
  const hi = max + padding;
  // Round to nicer tick boundaries
  const step = Math.pow(10, Math.floor(Math.log10(hi - lo)) - 1) * 5;
  return [Math.floor(lo / step) * step, Math.ceil(hi / step) * step];
}

/* ── Compute % axis domain ── */
function computeChangeDomain(points: ChartPoint[]): [number, number] {
  const vals = points.map((p) => p.monthlyChange).filter((v): v is number => v !== null);
  if (vals.length === 0) return [-10, 10];
  const min = Math.min(...vals);
  const max = Math.max(...vals);
  const pad = Math.max(Math.abs(max - min) * 0.3, 3);
  return [Math.floor(min - pad), Math.ceil(max + pad)];
}

/* ── Find min/max indices for netPayout with overlap prevention ── */
function findExtremes(points: ChartPoint[]): { minIdx: number; maxIdx: number } | null {
  if (points.length < 3) return null; // Need at least 3 points for meaningful extremes
  let minIdx = 0, maxIdx = 0;
  for (let i = 1; i < points.length; i++) {
    if (points[i].netPayout < points[minIdx].netPayout) minIdx = i;
    if (points[i].netPayout > points[maxIdx].netPayout) maxIdx = i;
  }
  // Skip if they're the same or too close together (prevents overlap)
  if (minIdx === maxIdx) return null;
  
  // Calculate if labels would visually overlap (within 1 index = adjacent months)
  const indexDiff = Math.abs(maxIdx - minIdx);
  const valueDiff = Math.abs(points[maxIdx].netPayout - points[minIdx].netPayout);
  const avgValue = (points[maxIdx].netPayout + points[minIdx].netPayout) / 2;
  const percentDiff = (valueDiff / avgValue) * 100;
  
  // Only show extremes if they're sufficiently separated (at least 2 months apart AND 5% value diff)
  if (indexDiff < 2 || percentDiff < 5) return null;
  
  return { minIdx, maxIdx };
}

/* ── Custom cursor - clean vertical line ── */
function CustomCursor({ points, isDark }: any) {
  if (!points || points.length === 0) return null;
  const { x } = points[0];
  return (
    <line
      x1={x}
      y1={0}
      x2={x}
      y2={300}
      stroke={isDark ? '#6366f1' : '#818cf8'}
      strokeWidth={1}
      strokeOpacity={0.4}
      strokeDasharray="4 4"
    />
  );
}

/* ── Custom active dot with refined glow ── */
function GlowDot(props: any) {
  const { cx, cy, stroke } = props;
  if (cx == null || cy == null) return null;
  return (
    <g>
      {/* Subtle outer glow */}
      <circle cx={cx} cy={cy} r={10} fill={stroke} opacity={0.12} />
      <circle cx={cx} cy={cy} r={6} fill={stroke} opacity={0.18} />
      {/* Inner dot with white border */}
      <circle cx={cx} cy={cy} r={4} fill={stroke} stroke="#fff" strokeWidth={2} />
    </g>
  );
}

/* ── Extreme-point label (High / Low) - minimal professional style ── */
function ExtremeLabel({ viewBox, label, value, color, isDark, above }: any) {
  const { x, y } = viewBox || {};
  if (x == null || y == null) return null;
  const yOff = above ? -28 : 28;
  const bgColor = isDark ? 'rgba(15,23,42,0.95)' : 'rgba(255,255,255,0.98)';
  const labelWidth = 58;
  
  return (
    <g className="extreme-label" style={{ pointerEvents: 'none' }}>
      {/* Subtle dot marker */}
      <circle cx={x} cy={y} r={6} fill={color} opacity={0.2} />
      <circle cx={x} cy={y} r={3.5} fill={color} stroke="#fff" strokeWidth={1.5} />
      
      {/* Clean label badge */}
      <rect
        x={x - labelWidth / 2}
        y={y + yOff - 9}
        width={labelWidth}
        height={18}
        rx={9}
        fill={bgColor}
        stroke={color}
        strokeWidth={1}
        strokeOpacity={0.4}
      />
      <text
        x={x}
        y={y + yOff + 4}
        textAnchor="middle"
        fill={color}
        fontSize={9}
        fontWeight={600}
        fontFamily="Inter, system-ui, sans-serif"
        style={{ pointerEvents: 'none' }}
      >
        {label} {fmtPKRShort(value)}
      </text>
    </g>
  );
}

/* ── Custom tooltip ── */
function TrendTooltip({ active, payload, isDark }: any) {
  if (!active || !payload?.length) return null;
  const d: ChartPoint = payload[0]?.payload;
  if (!d) return null;

  const changeColor =
    d.monthlyChange === null
      ? isDark ? '#94a3b8' : '#9ca3af'
      : d.monthlyChange > 0
        ? '#10b981'
        : d.monthlyChange < 0
          ? '#ef4444'
          : isDark ? '#94a3b8' : '#9ca3af';

  const changeIcon =
    d.monthlyChange === null
      ? '--'
      : d.monthlyChange > 0
        ? `↑ +${d.monthlyChange}%`
        : d.monthlyChange < 0
          ? `↓ ${d.monthlyChange}%`
          : '→ 0%';

  return (
    <div
      className="pointer-events-none select-none"
      style={{
        background: isDark ? 'rgba(15,23,42,0.94)' : 'rgba(15,23,42,0.90)',
        borderRadius: 12,
        padding: '12px 16px',
        boxShadow: '0 8px 32px rgba(0,0,0,0.28), 0 0 0 1px rgba(99,102,241,0.12)',
        minWidth: 190,
        backdropFilter: 'blur(8px)',
      }}
    >
      <p style={{ color: '#f1f5f9', fontWeight: 600, fontSize: 13, marginBottom: 8, letterSpacing: '0.01em' }}>
        {d.monthLabel}
      </p>

      {/* Net Payout */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}>
        <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#6366f1', flexShrink: 0 }} />
        <span style={{ color: '#cbd5e1', fontSize: 11.5, flex: 1 }}>Net Payout</span>
        <span style={{ color: '#f1f5f9', fontSize: 12, fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
          {fmtPKR(d.netPayout)}
        </span>
      </div>

      {/* Base Salary */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}>
        <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#a855f7', flexShrink: 0 }} />
        <span style={{ color: '#cbd5e1', fontSize: 11.5, flex: 1 }}>Base Salary</span>
        <span style={{ color: '#f1f5f9', fontSize: 12, fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
          {fmtPKR(d.baseSalary)}
        </span>
      </div>

      <div style={{ height: 1, background: 'rgba(148,163,184,0.12)', margin: '7px 0' }} />

      {/* Bonus */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
        <span style={{ color: '#94a3b8', fontSize: 11 }}>Bonus</span>
        <span style={{ color: '#cbd5e1', fontSize: 11, fontWeight: 500, fontVariantNumeric: 'tabular-nums' }}>
          {fmtPKR(d.bonus)}
        </span>
      </div>

      {/* Docks */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
        <span style={{ color: '#94a3b8', fontSize: 11 }}>Docks</span>
        <span style={{ color: '#cbd5e1', fontSize: 11, fontWeight: 500, fontVariantNumeric: 'tabular-nums' }}>
          {fmtPKR(d.docks)}
        </span>
      </div>

      {/* Headcount */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
        <span style={{ color: '#94a3b8', fontSize: 11 }}>Headcount</span>
        <span style={{ color: '#cbd5e1', fontSize: 11, fontWeight: 500, fontVariantNumeric: 'tabular-nums' }}>
          {d.headcount}
        </span>
      </div>

      {/* Monthly Change */}
      <div style={{ height: 1, background: 'rgba(148,163,184,0.12)', margin: '7px 0' }} />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ color: '#94a3b8', fontSize: 11 }}>Monthly Change</span>
        <span style={{ color: changeColor, fontSize: 11.5, fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
          {changeIcon}
        </span>
      </div>
    </div>
  );
}

/* ── Custom legend - clean minimal style ── */
function TrendLegend({ isDark }: { isDark: boolean }) {
  const items = [
    { label: 'Net Payout', color: '#6366f1', type: 'solid' as const },
    { label: 'Base Salary', color: '#a855f7', type: 'solid' as const },
    { label: '3M Average', color: isDark ? '#94a3b8' : '#9ca3af', type: 'dashed' as const },
    { label: 'Change %', color: '#10b981', type: 'dotted' as const },
  ];
  return (
    <div className="flex items-center justify-center gap-5 mt-3 select-none flex-wrap">
      {items.map((it) => (
        <div key={it.label} className="flex items-center gap-1.5">
          {it.type === 'dashed' ? (
            <svg width="18" height="8" viewBox="0 0 18 8">
              <line x1="0" y1="4" x2="18" y2="4" stroke={it.color} strokeWidth="1.5" strokeDasharray="4 3" strokeLinecap="round" />
            </svg>
          ) : it.type === 'dotted' ? (
            <svg width="18" height="8" viewBox="0 0 18 8">
              <line x1="0" y1="4" x2="18" y2="4" stroke={it.color} strokeWidth="1.5" strokeLinecap="round" />
              <circle cx="9" cy="4" r="2.5" fill={it.color} stroke="#fff" strokeWidth="0.5" />
            </svg>
          ) : (
            <svg width="18" height="8" viewBox="0 0 18 8">
              <line x1="0" y1="4" x2="18" y2="4" stroke={it.color} strokeWidth="2.5" strokeLinecap="round" />
            </svg>
          )}
          <span
            className="text-[11px] font-medium"
            style={{ color: isDark ? '#94a3b8' : '#6b7280' }}
          >
            {it.label}
          </span>
        </div>
      ))}
    </div>
  );
}

/* ═══════════════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════════════ */
export default function PayrollTrendChart({ data, isDark }: Props) {
  const chartData = useMemo(() => buildChartData(data), [data]);

  /* ── Derived computations (memoized) ── */
  const yDomain = useMemo(() => computeYDomain(chartData), [chartData]);
  const changeDomain = useMemo(() => computeChangeDomain(chartData), [chartData]);
  const extremes = useMemo(() => findExtremes(chartData), [chartData]);

  const tickColor = isDark ? '#64748b' : '#9ca3af';
  const gradIdNet = 'payGradNet';

  /* ── Stable formatter refs ── */
  const fmtYTick = useCallback((v: number) => fmtPKR(v), []);
  const fmtChangeTick = useCallback((v: number) => `${v}%`, []);

  /* ── Change-line dot - minimal styling ── */
  const changeDot = useCallback((props: any) => {
    const { cx, cy, payload } = props;
    if (cx == null || cy == null || payload?.monthlyChange == null) return null;
    const val = payload.monthlyChange;
    const color = val > 0 ? '#10b981' : val < 0 ? '#ef4444' : (isDark ? '#64748b' : '#9ca3af');
    return (
      <circle cx={cx} cy={cy} r={3} fill={color} stroke="#fff" strokeWidth={1} />
    );
  }, [isDark]);

  /* ── Empty state ── */
  if (chartData.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-2 py-12">
        <svg className="h-10 w-10 text-gray-300 dark:text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
        <p className="text-sm font-medium text-gray-400 dark:text-gray-500">No payroll runs yet</p>
        <p className="text-xs text-gray-300 dark:text-gray-600">Generate a payroll run to see trends</p>
      </div>
    );
  }

  return (
    <div className="w-full" style={{ height: 300 }}>
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart
          data={chartData}
          margin={{ top: 20, right: 45, left: 8, bottom: 8 }}
        >
          {/* ── SVG gradient definitions ── */}
          <defs>
            {/* Net Payout gradient - clean fade */}
            <linearGradient id={gradIdNet} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#6366f1" stopOpacity={isDark ? 0.35 : 0.25} />
              <stop offset="50%" stopColor="#818cf8" stopOpacity={isDark ? 0.15 : 0.12} />
              <stop offset="100%" stopColor="#a5b4fc" stopOpacity={0.0} />
            </linearGradient>
          </defs>

          {/* ── Grid - subtle horizontal lines ── */}
          <CartesianGrid
            strokeDasharray="3 6"
            vertical={false}
            strokeOpacity={isDark ? 0.06 : 0.12}
            stroke={isDark ? '#475569' : '#e2e8f0'}
          />

          {/* ── X Axis - clean styling ── */}
          <XAxis
            dataKey="monthLabel"
            axisLine={false}
            tickLine={false}
            tick={{ 
              fill: tickColor, 
              fontSize: 10, 
              fontFamily: 'Inter, system-ui, sans-serif',
              fontWeight: 500,
            }}
            dy={6}
            tickMargin={2}
          />

          {/* ── Left Y Axis (PKR) ── */}
          <YAxis
            yAxisId="left"
            axisLine={false}
            tickLine={false}
            tick={{ 
              fill: tickColor, 
              fontSize: 10, 
              fontFamily: 'Inter, system-ui, sans-serif',
              fontWeight: 500,
            }}
            tickFormatter={fmtYTick}
            domain={yDomain}
            allowDataOverflow={false}
            width={68}
            dx={-4}
            tickCount={5}
          />

          {/* ── Right Y Axis (Change %) ── */}
          <YAxis
            yAxisId="right"
            orientation="right"
            axisLine={false}
            tickLine={false}
            tick={{ 
              fill: isDark ? '#475569' : '#94a3b8', 
              fontSize: 9, 
              fontFamily: 'Inter, system-ui, sans-serif',
              fontWeight: 400,
            }}
            tickFormatter={fmtChangeTick}
            domain={changeDomain}
            allowDataOverflow={false}
            width={36}
            tickCount={5}
          />

          {/* ── Tooltip with clean vertical line cursor ── */}
          <Tooltip
            content={<TrendTooltip isDark={isDark} />}
            cursor={<CustomCursor isDark={isDark} />}
            isAnimationActive={false}
          />

          {/* ── Primary area: Net Payout ── */}
          <Area
            yAxisId="left"
            type="monotone"
            dataKey="netPayout"
            stroke={isDark ? '#818cf8' : '#6366f1'}
            strokeWidth={2.5}
            strokeLinecap="round"
            strokeLinejoin="round"
            fill={`url(#${gradIdNet})`}
            dot={false}
            activeDot={<GlowDot />}
            animationDuration={800}
            animationEasing="ease-out"
          />

          {/* ── Secondary line: Base Salary ── */}
          <Line
            yAxisId="left"
            type="monotone"
            dataKey="baseSalary"
            stroke={isDark ? '#c084fc' : '#a855f7'}
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            dot={false}
            activeDot={false}
            opacity={0.55}
            animationDuration={800}
            animationEasing="ease-out"
          />

          {/* ── 3-month moving average dashed line ── */}
          <Line
            yAxisId="left"
            type="monotone"
            dataKey="netPayoutMA"
            stroke={isDark ? '#94a3b8' : '#9ca3af'}
            strokeWidth={1.5}
            strokeDasharray="6 4"
            strokeLinecap="round"
            dot={false}
            activeDot={false}
            opacity={0.6}
            connectNulls={false}
            animationDuration={800}
            animationEasing="ease-out"
          />

          {/* ── Monthly change % line on right axis ── */}
          <Line
            yAxisId="right"
            type="monotone"
            dataKey="monthlyChange"
            stroke="#10b981"
            strokeWidth={1.5}
            strokeLinecap="round"
            strokeLinejoin="round"
            dot={changeDot}
            activeDot={false}
            opacity={0.6}
            connectNulls={false}
            animationDuration={800}
            animationEasing="ease-out"
          />

          {/* ── Extreme-point highlights ── */}
          {extremes && (
            <>
              <ReferenceDot
                yAxisId="left"
                x={chartData[extremes.maxIdx].monthLabel}
                y={chartData[extremes.maxIdx].netPayout}
                r={0}
                label={
                  <ExtremeLabel
                    label="High"
                    value={chartData[extremes.maxIdx].netPayout}
                    color="#10b981"
                    isDark={isDark}
                    above={true}
                  />
                }
              />
              <ReferenceDot
                yAxisId="left"
                x={chartData[extremes.minIdx].monthLabel}
                y={chartData[extremes.minIdx].netPayout}
                r={0}
                label={
                  <ExtremeLabel
                    label="Low"
                    value={chartData[extremes.minIdx].netPayout}
                    color="#ef4444"
                    isDark={isDark}
                    above={false}
                  />
                }
              />
            </>
          )}
        </ComposedChart>
      </ResponsiveContainer>

      {/* ── Custom legend ── */}
      <TrendLegend isDark={isDark} />
    </div>
  );
}
