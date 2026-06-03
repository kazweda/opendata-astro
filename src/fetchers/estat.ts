import type { DataFetcher, DataSet } from './types';

export interface EStatParams {
  statsDataId: string;
  /** 絞り込む分類コード（例: { cat01: '001' }） */
  classFilters?: Record<string, string>;
  /** 系列軸として使う CLASS_OBJ の @id（例: 'area'）。省略時は時間以外の最初の軸を使用 */
  seriesKey?: string;
  /** true のとき系列コードを都道府県レベル（\d{2}000、ただし 00000 を除く）に絞り込む */
  prefectureOnly?: boolean;
}

// e-Stat API v3 レスポンスの必要部分だけ型定義
interface EStatResponse {
  GET_STATS_DATA: {
    STATISTICAL_DATA: {
      CLASS_INF: {
        CLASS_OBJ: EStatClassObj | EStatClassObj[];
      };
      DATA_INF: {
        VALUE: EStatValue | EStatValue[];
      };
    };
  };
}

interface EStatClassObj {
  '@id': string;
  '@name': string;
  CLASS: EStatClass | EStatClass[];
}

interface EStatClass {
  '@code': string;
  '@name': string;
  '@level': string;
}

interface EStatValue {
  '@tab': string;
  '@cat01'?: string;
  '@cat02'?: string;
  '@cat03'?: string;
  '@area': string;
  '@time': string;
  '$': string;
}

function toArray<T>(v: T | T[]): T[] {
  return Array.isArray(v) ? v : [v];
}

export class EStatFetcher implements DataFetcher<EStatParams> {
  async fetch(params: EStatParams): Promise<DataSet> {
    const apiKey = process.env['ESTAT_API_KEY'];
    if (!apiKey) {
      throw new Error('ESTAT_API_KEY is not set');
    }

    const url = new URL('https://api.e-stat.go.jp/rest/3.0/app/json/getStatsData');
    url.searchParams.set('appId', apiKey);
    url.searchParams.set('statsDataId', params.statsDataId);
    if (params.classFilters) {
      for (const [key, value] of Object.entries(params.classFilters)) {
        url.searchParams.set(key, value);
      }
    }

    const res = await fetch(url.toString());
    if (!res.ok) {
      throw new Error(`e-Stat API error: ${res.status} ${res.statusText}`);
    }

    const json = (await res.json()) as EStatResponse;
    return this.transform(json, params.seriesKey, params.prefectureOnly);
  }

  private transform(json: EStatResponse, seriesKey?: string, prefectureOnly?: boolean): DataSet {
    const statData = json.GET_STATS_DATA.STATISTICAL_DATA;
    const classObjs = toArray(statData.CLASS_INF.CLASS_OBJ);
    const values = toArray(statData.DATA_INF.VALUE);

    // 時間軸（@time）を labels に使用
    const timeObj = classObjs.find((o) => o['@id'] === 'time');
    const timeClasses = timeObj ? toArray(timeObj.CLASS) : [];
    const labels = timeClasses.map((c) => c['@name']);
    const timeCodes = timeClasses.map((c) => c['@code']);

    // seriesKey 指定があればその軸、なければ時間以外の最初の分類軸を系列に使用
    const seriesObj = seriesKey
      ? classObjs.find((o) => o['@id'] === seriesKey)
      : classObjs.find((o) => o['@id'] !== 'time');
    let seriesClasses = seriesObj ? toArray(seriesObj.CLASS) : [{ '@code': '', '@name': '値', '@level': '1' }];
    if (prefectureOnly) {
      seriesClasses = seriesClasses.filter((c) => /^\d{2}000$/.test(c['@code']) && c['@code'] !== '00000');
    }
    const catKey = seriesObj ? (`@${seriesObj['@id']}` as keyof EStatValue) : null;

    const series = seriesClasses.map((sc) => {
      const seriesValues = timeCodes.map((tc) => {
        const v = values.find(
          (val) =>
            val['@time'] === tc &&
            (catKey === null || val[catKey] === sc['@code'])
        );
        const raw = v?.['$'] ?? '';
        return raw === '-' || raw === '' ? 0 : Number(raw);
      });
      return { name: sc['@name'], values: seriesValues };
    });

    return { labels, series };
  }
}
