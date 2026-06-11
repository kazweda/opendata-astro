import type { AstroIntegration } from 'astro';
import { writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import type { DataFetcher, DataSet } from './fetchers/types';

export interface DatasetConfig<P = Record<string, string>> {
  id: string;
  fetcher: DataFetcher<P>;
  params: P;
}

export interface OpenDataIntegrationOptions {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  datasets: DatasetConfig<any>[];
  /** JSON の出力先（デフォルト: `src/data/opendata-astro`） */
  outDir?: string;
  /**
   * true の場合、`${id}.json` が既に存在してもキャッシュを無視して
   * 常にAPIフェッチを実行し、JSONを上書き保存する。
   * 未指定時は環境変数 `OPENDATA_ASTRO_FORCE=true` の値が使われる。
   */
  force?: boolean;
}

async function fetchAndSave(
  datasets: OpenDataIntegrationOptions['datasets'],
  outDir: string,
  force: boolean,
  log: (msg: string) => void,
): Promise<void> {
  mkdirSync(outDir, { recursive: true });
  for (const ds of datasets) {
    const outPath = join(outDir, `${ds.id}.json`);
    if (!force && existsSync(outPath)) {
      log(`Using cached: ${outPath}`);
      continue;
    }
    log(`Fetching: ${ds.id}`);
    const data: DataSet = await ds.fetcher.fetch(ds.params);
    writeFileSync(outPath, JSON.stringify(data, null, 2));
    log(`Saved: ${outPath}`);
  }
}

export function openDataIntegration(options: OpenDataIntegrationOptions): AstroIntegration {
  const outDir = () => resolve(process.cwd(), options.outDir ?? 'src/data/opendata-astro');
  const force = options.force ?? process.env['OPENDATA_ASTRO_FORCE'] === 'true';

  return {
    name: 'opendata-astro',
    hooks: {
      'astro:build:start': async ({ logger }) => {
        await fetchAndSave(options.datasets, outDir(), force, (msg) => logger.info(msg));
      },
      'astro:server:start': async ({ logger }) => {
        await fetchAndSave(options.datasets, outDir(), force, (msg) => logger.info(msg));
      },
    },
  };
}
