import Sparkline from './Sparkline';

export default function MiniStat({ title, value, delta, trendData, color }: { title: string; value: string | number; delta?: string; trendData?: number[]; color?: string }) {
  return (
    <div className="metric-card flex items-center justify-between gap-4">
      <div>
        <p className="text-sm text-gray-400">{title}</p>
        <div className="flex items-center gap-3">
          <div className="metric-value">{value}</div>
          {delta && <div className="text-sm text-green-400 font-semibold">{delta}</div>}
        </div>
      </div>
      <div>
        <Sparkline data={trendData || [2, 4, 6, 5, 8, 9, 7]} color={color} />
      </div>
    </div>
  );
}
