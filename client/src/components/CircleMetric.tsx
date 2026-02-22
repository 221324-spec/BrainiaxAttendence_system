import React from 'react';
import { Chart as ChartJS, ArcElement, Tooltip } from 'chart.js';
import { Doughnut } from 'react-chartjs-2';

ChartJS.register(ArcElement, Tooltip);

export default function CircleMetric({ value = 0, label = '', size = 160, color = '#3b82f6' }: { value?: number; label?: string; size?: number; color?: string }) {
  const data = { labels: ['value', 'rest'], datasets: [{ data: [value, Math.max(0, 100 - value)], backgroundColor: [color, 'rgba(0,0,0,0.06)'] }] };
  return (
    <div style={{ width: size, height: size }} className="flex flex-col items-center justify-center">
      <Doughnut data={data} options={{ cutout: '70%', plugins: { legend: { display: false } } }} />
      <div className="-mt-20 text-center">
        <div className="text-2xl font-bold">{value}%</div>
        <div className="text-sm text-gray-400">{label}</div>
      </div>
    </div>
  );
}
