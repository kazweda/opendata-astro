import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { describe, expect, it } from 'vitest';
import { buildChartSpec } from '../src/chart';

import OpenDataChart from '../src/OpenDataChart.astro';

const dataSet = { labels: ['<a>', 'b'], series: [{ name: '"S"', values: [1, 2] }] };

async function renderToString(props: Record<string, unknown>) {
  const container = await AstroContainer.create();
  return container.renderToString(OpenDataChart, { props });
}

function readSpec(html: string) {
  const match = html.match(/data-opendata-chart="([^"]*)"/);
  const unescaped = match![1]!.replaceAll('&quot;', '"').replaceAll('&#39;', "'").replaceAll('&lt;', '<').replaceAll('&gt;', '>').replaceAll('&amp;', '&');
  return JSON.parse(unescaped);
}

describe('OpenDataChart.astro', () => {
  it('writes the chart spec to a data attribute and renders a canvas', async () => {
    const html = await renderToString({ dataSet, chartType: 'line', title: '推移', max: 10 });

    expect(readSpec(html)).toEqual(buildChartSpec({ dataSet, chartType: 'line', title: '推移', max: 10 }));
    expect(html).toContain('<canvas role="img" aria-label="推移"></canvas>');
  });

  it('uses the default height and accepts a custom one', async () => {
    expect(await renderToString({ dataSet })).toContain('style="position: relative; height: 400px; width: 100%"');
    expect(await renderToString({ dataSet, height: '1600px' })).toContain('height: 1600px');
  });

  it('escapes quotes so data cannot break out of the attribute', async () => {
    const html = await renderToString({ dataSet });

    expect(html).not.toContain('"S"');
    expect(readSpec(html).data.labels).toEqual(['<a>', 'b']);
  });
});
