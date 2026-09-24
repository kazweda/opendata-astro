# opendata-astro

オープンデータをビルド時に取得してチャート表示する Astro コンポーネントライブラリ。

グラフは [Chart.js](https://www.chartjs.org/) で描画します。`OpenDataChart` は `.astro` コンポーネントなので、React や `@astrojs/react` は不要です。

## 背景・目的

[kazweda/astro-starlight](https://github.com/kazweda/astro-starlight) で進めていた
issue [#59](https://github.com/kazweda/astro-starlight/issues/59)・[#201](https://github.com/kazweda/astro-starlight/issues/201)（e-Stat / 環境省オープンデータのチャート表示）を
Webサイト管理と切り離すために独立させたリポジトリ。

npm に `@kazweda/opendata-astro` として公開し、astro-starlight から利用する。

```sh
npm install @kazweda/opendata-astro
```

## 設計方針

### データ取得タイミング: ビルド時

- **クライアントサイドでは API を叩かない** — APIキーの露出・CORSを避けるため
- Astro のビルド時（`astro build`）にデータを取得して静的 JSON に焼き込む
- コンポーネントはビルド済み JSON を受け取って描画するだけ
- `outDir`（デフォルト `src/data/opendata-astro`）に `${id}.json` が既に存在する場合は
  APIフェッチをスキップしてキャッシュ済み JSON をそのまま使う
  - これにより CI 環境では `ESTAT_API_KEY` なしでビルドでき、外部APIの障害・レート制限の影響を受けない
  - 最新データに更新したい場合は、該当 JSON を削除してから `npm run dev` / `npm run build` を実行すると再フェッチされる
  - もしくは `openDataIntegration({ force: true, ... })` を指定する、または環境変数
    `OPENDATA_ASTRO_FORCE=true` を設定して `npm run build` を実行すると、JSON を削除せずに
    全データセットを強制的に再フェッチして上書きできる（`force` オプション未指定時のみ環境変数を参照）

### 設定（astro.config.mjs）

`openDataIntegration` に取得するデータセットを渡します。`astro.config.mjs`（とそこから読み込むファイル）では、`EStatFetcher` も含めて `@kazweda/opendata-astro/integration` から import してください。パッケージのルート（`@kazweda/opendata-astro`）は `.astro` コンポーネントを再 export しているため、設定ファイルからは読み込めません。

```js
// astro.config.mjs
import { defineConfig } from 'astro/config';
import { openDataIntegration, EStatFetcher } from '@kazweda/opendata-astro/integration';

export default defineConfig({
  integrations: [
    openDataIntegration({
      datasets: [
        {
          id: 'population',
          fetcher: new EStatFetcher(),
          params: { statsDataId: '0003448237', classFilters: { cdArea: '00000' } },
        },
      ],
    }),
  ],
});
```

### 使い方（MDX / Astroページ内）

ビルド時に保存された JSON を import して `dataSet` に渡します。`client:*` ディレクティブは不要です。

```mdx
import population from '../../data/opendata-astro/population.json';
import { OpenDataChart } from '@kazweda/opendata-astro';

<OpenDataChart
  dataSet={population}
  chartType="line"
  title="全国総人口の推移（千人）"
/>
```

#### Props

| Prop | 型 | 既定値 | 説明 |
| --- | --- | --- | --- |
| `dataSet` | `DataSet` | （必須） | `labels` と `series`（`name`, `values`, 任意で値ごとの `colors`）を持つデータ |
| `chartType` | `'bar' \| 'bar-horizontal' \| 'line' \| 'pie'` | `'bar'` | グラフの種類 |
| `title` | `string` | なし | グラフのタイトル（canvas の `aria-label` にも使う） |
| `height` | `string` | `'400px'` | グラフの高さ（CSS の値） |
| `showLegend` | `boolean` | `true` | 凡例を表示するか |
| `stacked` | `boolean` | `false` | 積み上げにするか |
| `max` | `number` | なし | 軸の最大値 |

#### 仕組み

- サーバー側でグラフの設定を `data-opendata-chart` 属性に書き出し、ブラウザで Chart.js を読み込んで描画する
- `<html data-theme="dark">` を監視し、ライト / ダークの切り替えに文字色・罫線色を追従させる（Starlight のテーマ切り替えに対応）
- 1ページに複数置ける。View Transitions（`<ClientRouter />`）でのページ遷移にも対応し、前のページのグラフは破棄する

## 0.1.x からの移行

0.2.0 で React コンポーネントから Astro コンポーネントに変わりました。

1. `<OpenDataChart>` から `client:only="react"` を外す（残すと Astro が警告を出す）
2. `astro.config.mjs` の `vite.optimizeDeps.include` から `react-chartjs-2` とこのパッケージを、`vite.ssr.noExternal` からこのパッケージを外す（どちらも不要になる）
3. サイトのほかの場所で React を使っていなければ、`@astrojs/react`・`react`・`react-dom` を削除できる

`dataSet` などの props、`openDataIntegration` の設定、保存される JSON の形式は変わりません。

## ディレクトリ構成

```
src/
├── index.ts                  # エクスポート
├── OpenDataChart.astro       # チャートコンポーネント
├── chart.ts                  # props から Chart.js の data / options を作る
├── render.ts                 # ブラウザで Chart.js を描画し、テーマ切り替えに追従する
├── integration.ts            # ビルド時のデータ取得（Astro インテグレーション）
└── fetchers/
      └── estat.ts            # e-Stat API クライアント
```

## 対象データソース

### フェーズ1: e-Stat API（#59）

- URL: https://api.e-stat.go.jp/rest/3.0/app/json/getStatsData
- 政府統計コード例: `00650101`（一般廃棄物処理実態調査）
- APIキーは環境変数 `ESTAT_API_KEY` で渡す

### フェーズ2: 環境省（#201）

- 全国各地のごみ分別状況・1人1日あたりごみ排出量
- 最新: 令和5年度（2023年度）実績、全国平均 851g/人日

## astro-starlight との連携

- このパッケージを `npm install @kazweda/opendata-astro` でインストール
- `.env` に `ESTAT_API_KEY` を設定
- MDX or Astroページで `import { OpenDataChart } from '@kazweda/opendata-astro'` して使う

## 開発の進め方

1. `package.json` 作成（scratchblocks-astro を参考に）
2. e-Stat API クライアント（`src/fetchers/estat.ts`）
3. チャートコンポーネント（`src/OpenDataChart.astro`）
4. ビルド時データ取得の仕組み
5. astro-starlight 側でインストール・動作確認
