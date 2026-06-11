import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync, readFileSync, existsSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { openDataIntegration } from '../src/integration';
import type { DataSet } from '../src/fetchers/types';

const sampleData: DataSet = {
  labels: ['2020年'],
  series: [{ name: '総数', values: [1] }],
};

const logger = { info: vi.fn() } as unknown as Parameters<
  NonNullable<ReturnType<typeof openDataIntegration>['hooks']['astro:build:start']>
>[0]['logger'];

describe('openDataIntegration', () => {
  let outDir: string;
  let cwd: string;

  beforeEach(() => {
    cwd = process.cwd();
    outDir = mkdtempSync(join(tmpdir(), 'opendata-astro-'));
    vi.clearAllMocks();
  });

  afterEach(() => {
    process.chdir(cwd);
    rmSync(outDir, { recursive: true, force: true });
  });

  it('outDir に未取得の場合は fetcher.fetch を呼んで JSON を保存する', async () => {
    const fetch = vi.fn().mockResolvedValue(sampleData);
    const integration = openDataIntegration({
      datasets: [{ id: 'test', fetcher: { fetch }, params: {} }],
      outDir,
    });

    await integration.hooks['astro:build:start']!({ logger } as never);

    expect(fetch).toHaveBeenCalledTimes(1);
    const outPath = join(outDir, 'test.json');
    expect(existsSync(outPath)).toBe(true);
    expect(JSON.parse(readFileSync(outPath, 'utf-8'))).toEqual(sampleData);
  });

  it('outDir に ${id}.json が既に存在する場合は fetcher.fetch をスキップする', async () => {
    const outPath = join(outDir, 'test.json');
    const cached: DataSet = { labels: ['cached'], series: [] };
    writeFileSync(outPath, JSON.stringify(cached));

    const fetch = vi.fn().mockResolvedValue(sampleData);
    const integration = openDataIntegration({
      datasets: [{ id: 'test', fetcher: { fetch }, params: {} }],
      outDir,
    });

    await integration.hooks['astro:build:start']!({ logger } as never);

    expect(fetch).not.toHaveBeenCalled();
    expect(JSON.parse(readFileSync(outPath, 'utf-8'))).toEqual(cached);
    expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('Using cached'));
  });
});
