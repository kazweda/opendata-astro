import {
  Chart,
  BarController,
  LineController,
  PieController,
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
import { buildOptions, toChartJsType, type ChartSpec } from './chart';

Chart.register(
  BarController,
  LineController,
  PieController,
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

const SELECTOR = '[data-opendata-chart]:not([data-opendata-chart-rendered])';

const charts = new Map<Chart, ChartSpec>();
let themeObserver: MutationObserver | undefined;

function isDark(): boolean {
  return document.documentElement.dataset['theme'] === 'dark';
}

function applyTheme() {
  const dark = isDark();
  for (const [chart, spec] of charts) {
    chart.options = buildOptions(spec, dark);
    chart.update('none');
  }
}

function observeTheme() {
  if (themeObserver) return;
  themeObserver = new MutationObserver(applyTheme);
  themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
}

export function renderCharts(root: ParentNode = document) {
  const containers = Array.from(root.querySelectorAll<HTMLElement>(SELECTOR));
  const dark = isDark();

  for (const container of containers) {
    container.setAttribute('data-opendata-chart-rendered', '');
    const canvas = container.querySelector('canvas');
    if (!canvas) continue;
    try {
      const spec: ChartSpec = JSON.parse(container.dataset['opendataChart'] ?? '');
      const chart = new Chart(canvas, {
        type: toChartJsType(spec.chartType),
        data: spec.data,
        options: buildOptions(spec, dark),
      });
      charts.set(chart, spec);
    } catch (error) {
      console.error('opendata-astro: failed to render chart:', error);
    }
  }

  if (charts.size > 0) observeTheme();
}

/** ページから外れた canvas の Chart を破棄する。1つも残らなければテーマの監視もやめる */
export function destroyDetachedCharts() {
  for (const chart of charts.keys()) {
    if (!chart.canvas?.isConnected) {
      chart.destroy();
      charts.delete(chart);
    }
  }
  if (charts.size === 0) {
    themeObserver?.disconnect();
    themeObserver = undefined;
  }
}
