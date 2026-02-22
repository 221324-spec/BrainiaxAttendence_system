import { Chart as ChartJS, LineElement, PointElement, LinearScale, CategoryScale, Tooltip } from 'chart.js';
import { Line } from 'react-chartjs-2';

ChartJS.register(LineElement, PointElement, LinearScale, CategoryScale, Tooltip);

export default function Sparkline({ data = [], color = '#60a5fa' }: { data?: number[]; color?: string }) {
  const labels = data.map((_, i) => i.toString());
  const cfg = {
    labels,
    datasets: [
      {
        data,
        borderColor: color,
        backgroundColor: 'rgba(0,0,0,0)',
        tension: 0.3,
        pointRadius: 0,
        borderWidth: 2,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    scales: { x: { display: false }, y: { display: false } },
    elements: { line: { capBezierPoints: true } },
    plugins: { legend: { display: false }, tooltip: { enabled: false } },
  };

  return (
    <div style={{ width: 120, height: 36 }} className="sparkline-canvas">
      <Line data={cfg} options={options} />
    </div>
  );
}
