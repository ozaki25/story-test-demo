# story-test-demo

React コンポーネントに Story を書き、その Story を土台にした複数のテスト手法を
**同じ題材で書き比べる**ためのリポジトリです。技術選定の材料にすることを目的にしています。

## 解説はこちら

**https://ozaki25.github.io/story-test-demo/**

手法ごとの書き方、比較と使い分け、実測値、踏んだ落とし穴、構成の設計判断は、
すべて Storybook のサイドバー「解説」にあります。
実際の Story とテスト結果を見ながら読めるので、まずそちらを開いてください。

この README には、リポジトリを動かすために必要なことだけを書いています。

| 読みたいもの                     | 場所                     |
| -------------------------------- | ------------------------ |
| 各手法の書き方と向き不向き       | 解説 / 1〜4              |
| 実装中に踏んだ落とし穴と再現条件 | 解説 / 5. 落とし穴       |
| 手法の比較、使い分け、実測値     | 解説 / 6. 比較と使い分け |
| ディレクトリ構成と設計判断       | 解説 / 7. 構成と設計判断 |
| ケースの導出と手法への割り当て   | 解説 / 8. テスト設計     |

## 収録している手法

2026 年 8 月時点で、本番で採用しうるものだけに絞っています。

| #      | 手法                      | 実行環境   | テストを書く場所                 |
| ------ | ------------------------- | ---------- | -------------------------------- |
| ①      | `play` 関数               | 実ブラウザ | `*.stories.tsx`                  |
| ②      | 全 Story のスモークテスト | 実ブラウザ | 書かない（Story を書けば増える） |
| ③      | a11y（axe）               | 実ブラウザ | `parameters.a11y`                |
| ④      | Portable Stories          | jsdom      | `*.portable.test.tsx`            |
| 対照群 | 素の Testing Library      | jsdom      | `*.plain.test.tsx`               |

Storybook 8 で削除された storyshots、2025 年 1 月で更新の止まっている vitest-axe、
Vite 構成では出番のない test-runner は入れていません。

## セットアップ

```bash
npm ci
npx playwright install chromium   # 実ブラウザ側のテストに必要
```

Playwright の CDN に到達できない環境では、用意済みの Chromium を指定できます。

```bash
CHROMIUM_EXECUTABLE_PATH=/path/to/chrome npm run test:stories
```

## コマンド

```bash
npm run storybook          # Storybook を起動（http://localhost:6006）
npm run build-storybook    # 静的ビルド（storybook-static/）

npm test                   # 全部
npm run test:stories       # 実ブラウザ（①②③）
npm run test:unit          # jsdom（④と対照群）
npm run test:portable      # 手法④だけ
npm run test:plain         # 対照群だけ
npm run test:coverage      # カバレッジ付き（全部）
npm run coverage:browser   # 方式ごとのカバレッジ（実ブラウザ）
npm run coverage:portable  # 方式ごとのカバレッジ（jsdom / Portable Stories）
npm run coverage:plain     # 方式ごとのカバレッジ（対照群）
npm run coverage:pure      # 方式ごとのカバレッジ（純粋関数のみ）

npm run lint               # oxlint
npm run format             # oxfmt（書き換え）
npm run format:check       # oxfmt（検査のみ、CI 用）
npm run typecheck
```

## GitHub Pages への公開

`.github/workflows/storybook.yml` が `master` への push で公開します。

**初回のみ手動の設定が必要です。**
リポジトリの **Settings > Pages > Source** を **GitHub Actions** に変更してください。
未設定のままだと deploy ジョブが `Get Pages site failed ... Not Found` で失敗します。

`configure-pages` の `enablement: true` による自動有効化も試しましたが、
Pages サイトの新規作成にはリポジトリ管理者権限が必要で、
ワークフローの `GITHUB_TOKEN` では
`Create Pages site failed. Error: Resource not accessible by integration` になります。
`permissions` に `pages: write` を与えても足りないため、この手順は省略できません。

## 公式手順との差分

`npm create vite` + `npx storybook init` で生成される内容と突き合わせた結果です。

| 項目                | 公式 init                   | このリポジトリ | 理由                                                                   |
| ------------------- | --------------------------- | -------------- | ---------------------------------------------------------------------- |
| Story の書き方      | CSF3                        | CSF3           | 一致。CSF4（`definePreview`）も v10 で使えるが CLI の既定は CSF3       |
| Vitest 設定の置き場 | `vite.config.ts`            | 同左           | 一致                                                                   |
| `a11y.test`         | `'todo'`                    | `'error'`      | a11y を検証対象として見せるため。未対応の Story だけ `'todo'` に落とす |
| Chromatic           | 既定で入る                  | 入れない       | トークンが必要で CI で動かせないため                                   |
| リンタ              | oxlint（Vite テンプレート） | oxlint + oxfmt | 一致。フォーマッタを追加                                               |
| TypeScript          | `~6.0.2`                    | `~6.0.2`       | 一致                                                                   |

TypeScript は当初 `latest`（7 系）を入れていましたが、`typescript-eslint` が
`>=4.8.4 <6.1.0` を要求して解決できませんでした。
エコシステムの追随を待つ必要があるため、公式テンプレートと同じ 6 系に揃えています。

## 動作確認したバージョン

|                                                       |         |
| ----------------------------------------------------- | ------- |
| storybook / addon-vitest / addon-a11y / addon-docs    | 10.5.7  |
| vitest / @vitest/browser / @vitest/browser-playwright | 4.1.10  |
| playwright                                            | 1.62.1  |
| react                                                 | 19.2.8  |
| tailwindcss / @tailwindcss/vite                       | 4.3.3   |
| oxlint                                                | 1.78.0  |
| oxfmt                                                 | 0.63.0  |
| @testing-library/react                                | 16.3.2  |
| @testing-library/user-event                           | 14.6.3  |
| jsdom                                                 | 30.0.1  |
| typescript                                            | 6.0.2   |
| vite                                                  | 8.2.1   |
| Node.js                                               | 22.22.2 |
