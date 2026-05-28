# opendata-astro

オープンデータをビルド時に取得してチャート表示する Astro 用 React コンポーネントライブラリ。

## 背景・目的

[kazweda/astro-starlight](https://github.com/kazweda/astro-starlight) で進めていた
issue [#59](https://github.com/kazweda/astro-starlight/issues/59)・[#201](https://github.com/kazweda/astro-starlight/issues/201)（e-Stat / 環境省オープンデータのチャート表示）を
Webサイト管理と切り離すために独立させたリポジトリ。

[scratchblocks-astro](https://github.com/kazweda/scratchblocks-astro) と同じパターンで
GitHub パッケージとして astro-starlight から利用する。

```json
"opendata-astro": "github:kazweda/opendata-astro#v0.1.0"
```

## 設計方針

### データ取得タイミング: ビルド時

- **クライアントサイドでは API を叩かない** — APIキーの露出・CORSを避けるため
- Astro のビルド時（`astro build`）にデータを取得して静的 JSON に焼き込む
- コンポーネントはビルド済み JSON を受け取って描画するだけ

### 使い方のイメージ（MDX / Astroページ内）

```mdx
import { OpenDataChart } from 'opendata-astro';

<OpenDataChart
  statsDataId="0003348423"
  chartType="bar"
  title="ごみ排出量の推移"
/>
```

## ディレクトリ構成（予定）

```
src/
├── index.ts                  # エクスポート
├── OpenDataChart.tsx         # メインコンポーネント（Chart.js or Recharts）
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

- このパッケージを `github:kazweda/opendata-astro#vX.Y.Z` でインストール
- `.env` に `ESTAT_API_KEY` を設定
- MDX or Astroページで `import { OpenDataChart } from 'opendata-astro'` して使う

## 開発の進め方

1. `package.json` 作成（scratchblocks-astro を参考に）
2. e-Stat API クライアント（`src/fetchers/estat.ts`）
3. チャートコンポーネント（`src/OpenDataChart.tsx`）
4. ビルド時データ取得の仕組み
5. astro-starlight 側でインストール・動作確認
