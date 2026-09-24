import type { DataSet } from './fetchers/types';

const COLORS = [
  'rgba(54, 162, 235, 0.8)',
  'rgba(255, 99, 132, 0.8)',
  'rgba(75, 192, 192, 0.8)',
  'rgba(255, 205, 86, 0.8)',
  'rgba(153, 102, 255, 0.8)',
  'rgba(255, 159, 64, 0.8)',
];

export type ChartType = 'bar' | 'bar-horizontal' | 'line' | 'pie';

export interface OpenDataChartProps {
  dataSet: DataSet;
  chartType?: ChartType;
  title?: string;
  height?: string;
  showLegend?: boolean;
  stacked?: boolean;
  max?: number;
}

/** サーバー側で data-opendata-chart 属性に書き出し、ブラウザ側で読み戻す値 */
export interface ChartSpec {
  chartType: ChartType;
  title?: string;
  showLegend: boolean;
  stacked: boolean;
  max?: number;
  data: ChartData;
}

export interface ChartData {
  labels: string[];
  datasets: {
    label: string;
    data: number[];
    backgroundColor: string | string[];
    borderColor: string | string[];
    borderWidth: number;
  }[];
}

export function buildChartData(dataSet: DataSet): ChartData {
  return {
    labels: dataSet.labels,
    datasets: dataSet.series.map((s, i) => {
      const bg = s.colors ?? COLORS[i % COLORS.length]!;
      const border = Array.isArray(bg) ? bg.map((c) => c.replace('0.8', '1')) : bg.replace('0.8', '1');
      return { label: s.name, data: s.values, backgroundColor: bg, borderColor: border, borderWidth: 1 };
    }),
  };
}

export function buildChartSpec({
  dataSet,
  chartType = 'bar',
  title,
  showLegend = true,
  stacked = false,
  max,
}: OpenDataChartProps): ChartSpec {
  return { chartType, title, showLegend, stacked, max, data: buildChartData(dataSet) };
}

/** Chart.js に渡す type（'bar-horizontal' は indexAxis で表す） */
export function toChartJsType(chartType: ChartType): 'bar' | 'line' | 'pie' {
  return chartType === 'bar-horizontal' ? 'bar' : chartType;
}

export function buildOptions(spec: ChartSpec, isDark: boolean) {
  const textColor = isDark ? '#cbd5e1' : '#374151';
  const gridColor = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)';
  const { title, showLegend, stacked, max } = spec;
  const axis = () => ({ ticks: { color: textColor }, grid: { color: gridColor }, stacked, ...(max !== undefined ? { max } : {}) });

  return {
    indexAxis: spec.chartType === 'bar-horizontal' ? ('y' as const) : ('x' as const),
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: showLegend, position: 'top' as const, labels: { color: textColor } },
      ...(title ? { title: { display: true, text: title, color: textColor } } : {}),
    },
    // 円グラフに x / y 軸を渡すと Chart.js が軸を描いてしまう
    ...(spec.chartType === 'pie' ? {} : { scales: { x: axis(), y: axis() } }),
  };
}
