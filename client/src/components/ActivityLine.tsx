import { Chart as ChartJS, LineElement, PointElement, LinearScale, CategoryScale, Tooltip, Legend } from 'chart.js';
import { Line } from 'react-chartjs-2';

ChartJS.register(LineElement, PointElement, LinearScale, CategoryScale, Tooltip, Legend);

export default function ActivityLine({ labels = [], values = [] }: { labels?: string[]; values?: number[] }) {
  const data = {
    labels: labels.length ? labels : ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    datasets: [
      {
        label: 'Check-ins',
        data: values.length ? values : [120, 200, 150, 220, 300, 270, 320],
        // Use a professional primary color and subtle fill
        borderColor: '#1d4ed8',
        backgroundColor: 'rgba(29,78,216,0.06)',
        tension: 0.35,
        pointRadius: 4,
        pointBackgroundColor: '#1d4ed8',
        pointBorderColor: '#ffffff',
        borderWidth: 2.5,
        fill: false,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: {
      x: { grid: { display: false }, ticks: { color: 'var(--muted)' } },
      y: { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: 'var(--muted)' } },
    },
  };

  return (
    <div style={{ height: 220 }} className="chart-canvas">
      <Line data={data} options={options} />
    </div>
  );
}
