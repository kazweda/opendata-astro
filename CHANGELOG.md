# Changelog

このプロジェクトの主な変更を記録します。
形式は [Keep a Changelog](https://keepachangelog.com/ja/1.1.0/) に、バージョンは [Semantic Versioning](https://semver.org/lang/ja/) に従います。

## [Unreleased]

## [0.2.0] - 2026-09-24

### Changed

- **破壊的変更:** `OpenDataChart` を React コンポーネントから Astro コンポーネントに書き直しました。React、`react-dom`、`@astrojs/react`、`react-chartjs-2` は不要です。グラフのあるページに React の実行環境（約 66KB gzip）が配信されなくなります。([#43](https://github.com/kazweda/opendata-astro/issues/43))
- `peerDependencies` は `astro` のみになりました（`react` / `react-dom` を削除）。
- props、`openDataIntegration` の設定、保存される JSON の形式は変わりません。

### Added

- View Transitions（`<ClientRouter />`）でのページ遷移に対応しました。遷移先のグラフを描画し、前のページのグラフは破棄します。
- canvas に `role="img"` と、`title` を使った `aria-label` を付けました。

### Fixed

- `chartType="pie"` で x / y 軸が描かれていた問題を修正しました。

### 0.1.x からの移行

1. `<OpenDataChart>` から `client:only="react"` を外す（残すと Astro が警告を出す）。
2. `astro.config.mjs` の `vite.optimizeDeps.include` から `react-chartjs-2` とこのパッケージを、`vite.ssr.noExternal` からこのパッケージを外す。
3. サイトのほかの場所で React を使っていなければ、`@astrojs/react`・`react`・`react-dom` を削除する。

0.1.14 以前の変更は [GitHub のコミット履歴](https://github.com/kazweda/opendata-astro/commits/v0.1.14) を参照してください。

[Unreleased]: https://github.com/kazweda/opendata-astro/compare/v0.2.0...HEAD
[0.2.0]: https://github.com/kazweda/opendata-astro/compare/v0.1.14...v0.2.0
