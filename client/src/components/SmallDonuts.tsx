import { Chart as ChartJS, ArcElement, Tooltip } from 'chart.js';
import { Doughnut } from 'react-chartjs-2';

ChartJS.register(ArcElement, Tooltip);

export default function SmallDonuts({ items = [] }: { items?: { label: string; value: number; color?: string }[] }) {
  return (
    <div className="grid grid-cols-2 gap-4">
      {items.map((it, idx) => {
        const data = { labels: [it.label, ''], datasets: [{ data: [it.value, Math.max(0, 100 - it.value)], backgroundColor: [it.color || '#06b6d4', '#e6eef2'] }] };
        return (
          <div key={idx} className="flex items-center gap-3">
            <div style={{ width: 80, height: 80 }}>
              <Doughnut data={data} options={{ cutout: '70%', plugins: { legend: { display: false } } }} />
            </div>
            <div>
              <div className="text-sm text-gray-400">{it.label}</div>
              <div className="text-xl font-bold">{it.value}%</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
