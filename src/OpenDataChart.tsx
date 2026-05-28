import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Bar, Line, Pie } from 'react-chartjs-2';
import type { DataSet } from './fetchers/types';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
);

const COLORS = [
  'rgba(54, 162, 235, 0.8)',
  'rgba(255, 99, 132, 0.8)',
  'rgba(75, 192, 192, 0.8)',
  'rgba(255, 205, 86, 0.8)',
  'rgba(153, 102, 255, 0.8)',
  'rgba(255, 159, 64, 0.8)',
];

export type ChartType = 'bar' | 'line' | 'pie';

export interface OpenDataChartProps {
  dataSet: DataSet;
  chartType?: ChartType;
  title?: string;
  height?: string;
}

export function OpenDataChart({ dataSet, chartType = 'bar', title, height = '400px' }: OpenDataChartProps) {
  const chartData = {
    labels: dataSet.labels,
    datasets: dataSet.series.map((s, i) => ({
      label: s.name,
      data: s.values,
      backgroundColor: COLORS[i % COLORS.length],
      borderColor: COLORS[i % COLORS.length]?.replace('0.8', '1'),
      borderWidth: 1,
    })),
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'top' as const },
      ...(title ? { title: { display: true, text: title } } : {}),
    },
  };

  const chart =
    chartType === 'line' ? <Line data={chartData} options={options} /> :
    chartType === 'pie' ? <Pie data={chartData} options={options} /> :
    <Bar data={chartData} options={options} />;

  return (
    <div style={{ position: 'relative', height, width: '100%' }}>
      {chart}
    </div>
  );
}
