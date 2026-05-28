import type { AstroIntegration } from 'astro';
import { writeFileSync, mkdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import type { DataFetcher, DataSet } from './fetchers/types';

export interface DatasetConfig<P = Record<string, string>> {
  id: string;
  fetcher: DataFetcher<P>;
  params: P;
}

export interface OpenDataIntegrationOptions {
  datasets: DatasetConfig<Record<string, string>>[];
  /** JSON の出力先（デフォルト: `src/data/opendata-astro`） */
  outDir?: string;
}

async function fetchAndSave(
  datasets: OpenDataIntegrationOptions['datasets'],
  outDir: string,
  log: (msg: string) => void,
): Promise<void> {
  mkdirSync(outDir, { recursive: true });
  for (const ds of datasets) {
    log(`Fetching: ${ds.id}`);
    const data: DataSet = await ds.fetcher.fetch(ds.params);
    const outPath = join(outDir, `${ds.id}.json`);
    writeFileSync(outPath, JSON.stringify(data, null, 2));
    log(`Saved: ${outPath}`);
  }
}

export function openDataIntegration(options: OpenDataIntegrationOptions): AstroIntegration {
  const outDir = () => resolve(process.cwd(), options.outDir ?? 'src/data/opendata-astro');

  return {
    name: 'opendata-astro',
    hooks: {
      'astro:build:start': async ({ logger }) => {
        await fetchAndSave(options.datasets, outDir(), (msg) => logger.info(msg));
      },
      'astro:server:start': async ({ logger }) => {
        await fetchAndSave(options.datasets, outDir(), (msg) => logger.info(msg));
      },
    },
  };
}
