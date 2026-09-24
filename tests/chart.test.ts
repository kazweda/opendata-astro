import { describe, it, expect } from 'vitest';
import { buildChartData, buildChartSpec, buildOptions, toChartJsType } from '../src/chart';
import type { DataSet } from '../src/fetchers/types';

const dataSet: DataSet = {
  labels: ['2020年', '2021年'],
  series: [
    { name: 'A', values: [1, 2] },
    { name: 'B', values: [3, 4] },
  ],
};

describe('buildChartData', () => {
  it('assigns palette colors per series with opaque borders', () => {
    const data = buildChartData(dataSet);

    expect(data.labels).toEqual(['2020年', '2021年']);
    expect(data.datasets[0]).toEqual({
      label: 'A',
      data: [1, 2],
      backgroundColor: 'rgba(54, 162, 235, 0.8)',
      borderColor: 'rgba(54, 162, 235, 1)',
      borderWidth: 1,
    });
    expect(data.datasets[1]!.backgroundColor).toBe('rgba(255, 99, 132, 0.8)');
  });

  it('uses per-value colors when given', () => {
    const data = buildChartData({
      labels: ['x', 'y'],
      series: [{ name: '増減', values: [1, -1], colors: ['rgba(75, 192, 192, 0.8)', 'rgba(255, 99, 132, 0.8)'] }],
    });

    expect(data.datasets[0]!.backgroundColor).toEqual(['rgba(75, 192, 192, 0.8)', 'rgba(255, 99, 132, 0.8)']);
    expect(data.datasets[0]!.borderColor).toEqual(['rgba(75, 192, 192, 1)', 'rgba(255, 99, 132, 1)']);
  });
});

describe('buildChartSpec', () => {
  it('fills in defaults', () => {
    const spec = buildChartSpec({ dataSet });

    expect(spec).toMatchObject({ chartType: 'bar', showLegend: true, stacked: false });
    expect(spec.title).toBeUndefined();
    expect(spec.max).toBeUndefined();
  });
});

describe('toChartJsType', () => {
  it('maps bar-horizontal to bar', () => {
    expect(toChartJsType('bar-horizontal')).toBe('bar');
    expect(toChartJsType('line')).toBe('line');
    expect(toChartJsType('pie')).toBe('pie');
  });
});

describe('buildOptions', () => {
  it('uses light colors and no title by default', () => {
    const options = buildOptions(buildChartSpec({ dataSet }), false);

    expect(options.indexAxis).toBe('x');
    expect(options.plugins.legend).toEqual({ display: true, position: 'top', labels: { color: '#374151' } });
    expect(options.plugins).not.toHaveProperty('title');
    expect(options.scales!.x).toEqual({ ticks: { color: '#374151' }, grid: { color: 'rgba(0,0,0,0.1)' }, stacked: false });
  });

  it('uses dark colors', () => {
    const options = buildOptions(buildChartSpec({ dataSet, title: 'T' }), true);

    expect(options.plugins.legend.labels.color).toBe('#cbd5e1');
    expect(options.plugins).toHaveProperty('title', { display: true, text: 'T', color: '#cbd5e1' });
    expect(options.scales!.y.grid.color).toBe('rgba(255,255,255,0.1)');
  });

  it('sets indexAxis, stacked and max for a horizontal stacked bar', () => {
    const options = buildOptions(
      buildChartSpec({ dataSet, chartType: 'bar-horizontal', stacked: true, max: 100, showLegend: false }),
      false,
    );

    expect(options.indexAxis).toBe('y');
    expect(options.plugins.legend.display).toBe(false);
    expect(options.scales!.x).toMatchObject({ stacked: true, max: 100 });
    expect(options.scales!.y).toMatchObject({ stacked: true, max: 100 });
  });

  it('does not set axes for a pie chart', () => {
    const options = buildOptions(buildChartSpec({ dataSet, chartType: 'pie' }), false);

    expect(options).not.toHaveProperty('scales');
  });
});
