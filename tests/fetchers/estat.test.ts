import { describe, it, expect, vi, beforeEach } from 'vitest';
import { EStatFetcher } from '../../src/fetchers/estat';

// 全国・都道府県・市区町村が混在するレスポンスを模擬（prefectureOnly テスト用）
const mockResponseWithAllAreas = {
  GET_STATS_DATA: {
    STATISTICAL_DATA: {
      CLASS_INF: {
        CLASS_OBJ: [
          {
            '@id': 'area',
            '@name': '地域',
            CLASS: [
              { '@code': '00000', '@name': '全国', '@level': '0' },
              { '@code': '01000', '@name': '北海道', '@level': '1' },
              { '@code': '01100', '@name': '札幌市', '@level': '2' },
              { '@code': '13000', '@name': '東京都', '@level': '1' },
            ],
          },
          {
            '@id': 'time',
            '@name': '時間軸',
            CLASS: [
              { '@code': '2020000000', '@name': '2020年', '@level': '1' },
            ],
          },
        ],
      },
      DATA_INF: {
        VALUE: [
          { '@area': '00000', '@time': '2020000000', '$': '126146000' },
          { '@area': '01000', '@time': '2020000000', '$': '5224614' },
          { '@area': '01100', '@time': '2020000000', '$': '1973395' },
          { '@area': '13000', '@time': '2020000000', '$': '13960000' },
        ],
      },
    },
  },
};

// cat01（性別）が area より先に来るレスポンスを模擬
const mockResponse = {
  GET_STATS_DATA: {
    STATISTICAL_DATA: {
      CLASS_INF: {
        CLASS_OBJ: [
          {
            '@id': 'cat01',
            '@name': '性別',
            CLASS: [
              { '@code': '000', '@name': '総数', '@level': '1' },
            ],
          },
          {
            '@id': 'area',
            '@name': '都道府県',
            CLASS: [
              { '@code': '01000', '@name': '北海道', '@level': '1' },
              { '@code': '13000', '@name': '東京都', '@level': '1' },
            ],
          },
          {
            '@id': 'time',
            '@name': '時間軸',
            CLASS: [
              { '@code': '2020000000', '@name': '2020年', '@level': '1' },
              { '@code': '2021000000', '@name': '2021年', '@level': '1' },
            ],
          },
        ],
      },
      DATA_INF: {
        VALUE: [
          { '@cat01': '000', '@area': '01000', '@time': '2020000000', '$': '5224614' },
          { '@cat01': '000', '@area': '01000', '@time': '2021000000', '$': '5183687' },
          { '@cat01': '000', '@area': '13000', '@time': '2020000000', '$': '13960000' },
          { '@cat01': '000', '@area': '13000', '@time': '2021000000', '$': '14050000' },
        ],
      },
    },
  },
};

beforeEach(() => {
  process.env['ESTAT_API_KEY'] = 'test-key';
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
    ok: true,
    json: () => Promise.resolve(mockResponse),
  }));
});

describe('EStatFetcher', () => {
  it('seriesKey 未指定時は最初の非time軸（cat01）を系列にする', async () => {
    const fetcher = new EStatFetcher();
    const result = await fetcher.fetch({ statsDataId: 'DUMMY' });

    expect(result.labels).toEqual(['2020年', '2021年']);
    // seriesKey なし → cat01（総数）が系列になる
    expect(result.series).toHaveLength(1);
    expect(result.series[0].name).toBe('総数');
  });

  it('seriesKey: "area" 指定時は都道府県軸を系列にする', async () => {
    const fetcher = new EStatFetcher();
    const result = await fetcher.fetch({ statsDataId: 'DUMMY', seriesKey: 'area' });

    expect(result.labels).toEqual(['2020年', '2021年']);
    // seriesKey: 'area' → 北海道・東京都が系列になる
    expect(result.series).toHaveLength(2);
    expect(result.series[0].name).toBe('北海道');
    expect(result.series[1].name).toBe('東京都');
  });

  it('seriesKey: "area" 指定時に各系列の値が正しく対応する', async () => {
    const fetcher = new EStatFetcher();
    const result = await fetcher.fetch({ statsDataId: 'DUMMY', seriesKey: 'area' });

    expect(result.series[0].values).toEqual([5224614, 5183687]); // 北海道
    expect(result.series[1].values).toEqual([13960000, 14050000]); // 東京都
  });

  describe('municipalityOnly オプション', () => {
    beforeEach(() => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponseWithAllAreas),
      }));
    });

    it('municipalityOnly: true のとき全国・都道府県を除いた市区町村のみになる', async () => {
      const fetcher = new EStatFetcher();
      const result = await fetcher.fetch({ statsDataId: 'DUMMY', seriesKey: 'area', municipalityOnly: true });

      // 全国（00000）・北海道（01000）・東京都（13000）を除いた 札幌市（01100）のみ
      expect(result.series).toHaveLength(1);
      expect(result.series.map((s) => s.name)).toEqual(['札幌市']);
    });

    it('municipalityOnly: false のときフィルタリングしない', async () => {
      const fetcher = new EStatFetcher();
      const result = await fetcher.fetch({ statsDataId: 'DUMMY', seriesKey: 'area', municipalityOnly: false });

      expect(result.series).toHaveLength(4); // 全国・北海道・札幌市・東京都
    });
  });

  describe('prefectureOnly オプション', () => {
    beforeEach(() => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponseWithAllAreas),
      }));
    });

    it('prefectureOnly: true のとき全国・市区町村を除いた都道府県のみになる', async () => {
      const fetcher = new EStatFetcher();
      const result = await fetcher.fetch({ statsDataId: 'DUMMY', seriesKey: 'area', prefectureOnly: true });

      // 全国（00000）と札幌市（01100）を除いた 北海道・東京都のみ
      expect(result.series).toHaveLength(2);
      expect(result.series.map((s) => s.name)).toEqual(['北海道', '東京都']);
    });

    it('prefectureOnly: false のときフィルタリングしない', async () => {
      const fetcher = new EStatFetcher();
      const result = await fetcher.fetch({ statsDataId: 'DUMMY', seriesKey: 'area', prefectureOnly: false });

      expect(result.series).toHaveLength(4); // 全国・北海道・札幌市・東京都
    });
  });
});
