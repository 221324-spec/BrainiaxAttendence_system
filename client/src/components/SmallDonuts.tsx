import { Chart as ChartJS, ArcElement, Tooltip } from 'chart.js';
import { Doughnut } from 'react-chartjs-2';

ChartJS.register(ArcElement, Tooltip);

export default function SmallDonuts({ items = [] }: { items?: { label: string; value: number; color?: string }[] }) {
  return (
    <div className="flex flex-wrap gap-4">
      {items.map((it, idx) => {
        const data = { labels: [it.label, ''], datasets: [{ data: [it.value, Math.max(0, 100 - it.value)], backgroundColor: [it.color || '#06b6d4', '#e6eef2'] }] };
        return (
          <div key={idx} className="flex items-center gap-2 min-w-[120px]">
            <div style={{ width: 60, height: 60 }}>
              <Doughnut data={data} options={{ cutout: '70%', plugins: { legend: { display: false } } }} />
            </div>
            <div className="ml-1">
              <div className="text-xs text-gray-500">{it.label}</div>
              <div className="text-lg font-semibold">{it.value}%</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
