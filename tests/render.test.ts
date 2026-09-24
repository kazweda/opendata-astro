// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { buildChartSpec } from '../src/chart';

interface MockChart {
  canvas: HTMLCanvasElement;
  config: { type: string; data: unknown; options: { plugins: { legend: { labels: { color: string } } } } };
  options: MockChart['config']['options'];
  update: ReturnType<typeof vi.fn>;
  destroy: ReturnType<typeof vi.fn>;
}

const instances: MockChart[] = [];

vi.mock('chart.js', () => {
  class Chart {
    static register = vi.fn();
    canvas: HTMLCanvasElement;
    config: MockChart['config'];
    options: MockChart['options'];
    update = vi.fn();
    destroy = vi.fn();
    constructor(canvas: HTMLCanvasElement, config: MockChart['config']) {
      this.canvas = canvas;
      this.config = config;
      this.options = config.options;
      instances.push(this as unknown as MockChart);
    }
  }
  return {
    Chart,
    BarController: {},
    LineController: {},
    PieController: {},
    CategoryScale: {},
    LinearScale: {},
    BarElement: {},
    LineElement: {},
    PointElement: {},
    ArcElement: {},
    Title: {},
    Tooltip: {},
    Legend: {},
  };
});

const { renderCharts, destroyDetachedCharts } = await import('../src/render');

const dataSet = { labels: ['a', 'b'], series: [{ name: 'S', values: [1, 2] }] };

function mount(spec: unknown) {
  const div = document.createElement('div');
  div.setAttribute('data-opendata-chart', typeof spec === 'string' ? spec : JSON.stringify(spec));
  div.appendChild(document.createElement('canvas'));
  document.body.appendChild(div);
  return div;
}

const flush = () => new Promise((r) => setTimeout(r, 0));

describe('renderCharts', () => {
  afterEach(() => {
    document.body.innerHTML = '';
    destroyDetachedCharts();
    instances.length = 0;
    delete document.documentElement.dataset['theme'];
    vi.restoreAllMocks();
  });

  it('creates a chart on the canvas from the data attribute', () => {
    const div = mount(buildChartSpec({ dataSet, chartType: 'bar-horizontal' }));
    renderCharts();

    expect(instances).toHaveLength(1);
    expect(instances[0]!.canvas).toBe(div.querySelector('canvas'));
    expect(instances[0]!.config.type).toBe('bar');
    expect(instances[0]!.config.data).toEqual(buildChartSpec({ dataSet }).data);
    expect(div.hasAttribute('data-opendata-chart-rendered')).toBe(true);
  });

  it('renders several charts and does not render the same one twice', () => {
    mount(buildChartSpec({ dataSet, chartType: 'line' }));
    mount(buildChartSpec({ dataSet, chartType: 'pie' }));
    renderCharts();
    renderCharts();

    expect(instances.map((c) => c.config.type)).toEqual(['line', 'pie']);
  });

  it('uses dark colors when the page is already dark', () => {
    document.documentElement.dataset['theme'] = 'dark';
    mount(buildChartSpec({ dataSet }));
    renderCharts();

    expect(instances[0]!.config.options.plugins.legend.labels.color).toBe('#cbd5e1');
  });

  it('follows data-theme changes', async () => {
    mount(buildChartSpec({ dataSet }));
    renderCharts();
    const chart = instances[0]!;

    document.documentElement.dataset['theme'] = 'dark';
    await flush();
    expect(chart.options.plugins.legend.labels.color).toBe('#cbd5e1');
    expect(chart.update).toHaveBeenCalledTimes(1);

    document.documentElement.dataset['theme'] = 'light';
    await flush();
    expect(chart.options.plugins.legend.labels.color).toBe('#374151');
  });

  it('logs and skips a chart with broken data', () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    mount('{not json');
    mount(buildChartSpec({ dataSet }));
    renderCharts();

    expect(error).toHaveBeenCalledOnce();
    expect(instances).toHaveLength(1);
  });
});

describe('destroyDetachedCharts', () => {
  afterEach(() => {
    document.body.innerHTML = '';
    destroyDetachedCharts();
    instances.length = 0;
  });

  it('destroys only charts whose canvas left the page, and stops following the theme', async () => {
    const old = mount(buildChartSpec({ dataSet }));
    const kept = mount(buildChartSpec({ dataSet }));
    renderCharts();
    const [oldChart, keptChart] = instances;

    old.remove();
    destroyDetachedCharts();
    expect(oldChart!.destroy).toHaveBeenCalledOnce();
    expect(keptChart!.destroy).not.toHaveBeenCalled();

    kept.remove();
    destroyDetachedCharts();
    expect(keptChart!.destroy).toHaveBeenCalledOnce();

    document.documentElement.dataset['theme'] = 'dark';
    await flush();
    expect(keptChart!.update).not.toHaveBeenCalled();
    delete document.documentElement.dataset['theme'];
  });
});
