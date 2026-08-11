# story-test-demo

React コンポーネントに Story を書き、その Story を土台にした複数のテスト手法を
**同じ題材で書き比べる**ためのリポジトリです。技術選定の材料にすることを目的にしています。

解説は Storybook 側に置いてあります。公開先はこちら。

**https://ozaki25.github.io/story-test-demo/**

サイドバーの「解説」に、手法ごとのページと落とし穴のまとめがあります。
実際の Story とテスト結果を見ながら読めます。

## 比較の土台

「書き方が違う」以上のことを言うために、`LoginForm` に対するシナリオを固定し、
どの手法でも同じ内容を実装しています。

| ID  | シナリオ                                                 |
| --- | -------------------------------------------------------- |
| S1  | 空のまま送信するとエラーメッセージが出る                 |
| S2  | 正しく入力して送信すると `onSubmit` が正しい値で呼ばれる |
| S3  | 送信中はフォームが操作できない                           |

`Button` にも同じ 3 つのファイル構成（Story / Portable / 対照群）を用意してあるので、
「振る舞いが薄いコンポーネント」と「操作を伴うコンポーネント」で
手法の向き不向きがどう変わるかも比較できます。

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

## 実測値

| project                            | 件数 | 時間   | 内訳                    |
| ---------------------------------- | ---- | ------ | ----------------------- |
| storybook（実ブラウザ / Chromium） | 13   | 6.0 秒 | うちセットアップ 4.1 秒 |
| unit（jsdom）                      | 28   | 3.1 秒 | うちセットアップ 1.4 秒 |

実ブラウザ側は起動コストが支配的です。件数に対しては緩やかに伸びます。
数値は環境依存なので、絶対値ではなく比率を見てください。

## ディレクトリ構成

コンポーネント単位でディレクトリを切り、手法はファイル名のサフィックスで表しています。

```
.storybook/
  main.ts                          Story と MDX の読み込み、アドオンの登録
  preview.tsx                      全 Story 共通の parameters / decorators / tags
src/
  components/
    Button/                        振る舞いが薄く、状態のバリエーションが多い例
      Button.tsx
      Button.stories.tsx           ② スモークテスト / ③ a11y
      Button.portable.test.tsx     ④ Portable Stories
      Button.plain.test.tsx        対照群
      index.ts
    LoginForm/                     操作・非同期を伴う例
      LoginForm.tsx
      LoginForm.stories.tsx        ① play 関数 / ② スモーク / ③ a11y
      LoginForm.portable.test.tsx  ④ Portable Stories
      LoginForm.plain.test.tsx     対照群
      index.ts
  docs/                            手法の解説（Storybook のサイドバーに出る）
  styles/global.css                Tailwind の読み込みとテーマ定義
  test/
    setup.unit.ts                  jsdom 側のセットアップ
    portable.ts                    Portable Stories 用のヘルパー
vite.config.ts                     Vite と Vitest の設定（1 ファイルに集約）
.oxlintrc.json / .oxfmtrc.json     oxlint / oxfmt の設定
```

手法別にディレクトリを切る構成（`tests/play/`, `tests/portable/`）は採っていません。
コンポーネントが増えたときに、1 つのコンポーネントの情報が複数の場所に散るためです。
手法単位で実行したいときは、実行時にファイル名で絞ります
（`npm run test:portable` / `npm run test:plain`）。

## 大規模化を見据えた設計判断

**1. Vite と Vitest の設定を 1 ファイルにまとめる**

`storybook init` が生成するのもこの形です。`vite.config.ts` と `vitest.config.ts` に分けると、
Storybook は前者、テストは後者を読むため、alias や plugin を片方にだけ足したときに
「Storybook では解決できるがテストでは落ちる」が起きます。

**2. テストの収集条件を手法別サフィックスで絞らない**

`include` を `*.{portable,plain}.test.tsx` のように絞ると、規約から外れた名前のテストが
**警告もなく無視されます**。実際に `Button.test.tsx` に必ず失敗するテストを置いて確認したところ、
全体が緑のままでした。`src/**/*.test.{ts,tsx}` で拾い、絞り込みは実行時に行います。

**3. 実行環境で Vitest の project を分ける**

`storybook`（実ブラウザ）と `unit`（jsdom）の 2 つ。
片方だけ回せるので、CI での並列化や部分実行がしやすくなります。

**4. Story のアノテーションを一箇所に集約する**

`.storybook/preview.tsx` の decorators / parameters を、
jsdom 側は `setProjectAnnotations`（`src/test/setup.unit.ts`）で読み込んでいます。
繋いでいないと「Storybook では動くのにテストだけ落ちる」が多発します。
その配線自体を検証するテストも 1 本置いています。

**5. 環境差は setup ファイル 1 箇所で吸収する**

jsdom には `navigator.clipboard` がなく、そのままでは play 関数の引数から
`userEvent` を受け取れません。Story 側で回避すると、書き忘れた Story が
「実ブラウザでは通るが jsdom だけ落ちる」状態になります。
Story は標準の書き方に統一し、差分は setup で埋めています。

## スタイルとツールチェイン

**Tailwind CSS v4** を使っています。設定は `src/styles/global.css` の `@theme` に書き、
`tailwind.config.js` は使いません。Vite プラグイン（`@tailwindcss/vite`）を
`vite.config.ts` に入れてあるので、Storybook もテストも同じ設定を読みます。

バリアントごとのクラスは `Button.tsx` のようにオブジェクトへ切り出してください。
テンプレートリテラルで組み立てると Tailwind がクラス名を静的に抽出できず、
本番ビルドでスタイルが落ちます。

**リンタ / フォーマッタは oxc**（`oxlint` + `oxfmt`）です。

```bash
npm run lint          # oxlint
npm run format        # oxfmt（書き換え）
npm run format:check  # oxfmt（検査のみ、CI 用）
```

`eslint-plugin-storybook` 相当のルールは oxlint にありません。
Story 固有の間違い（play の await 漏れなど）は検出できないので、
そこを重視するなら ESLint を併用する判断もあります。
代わりに react / jsx-a11y / import / promise / vitest のプラグインを有効にしています。

`vitest/expect-expect` は `*.portable.test.tsx` でのみ `runStory` を
アサーション関数として認識させています。手法④の「テストの中身を書かない」書き方では
検証が Story の play 関数側にあり、リンタから見えないためです。

## 踏んだ落とし穴

いずれも実際に遭遇したものです。詳細は Storybook の「解説 / 5. 落とし穴」にあります。

| 症状                                                                            | 原因                                                                              |
| ------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| 書いたテストが実行されない                                                      | `include` を手法別サフィックスで絞っていた                                        |
| `userEvent.click is not a function`                                             | jsdom に `navigator.clipboard` がなく、play への `userEvent` 注入がスキップされる |
| `'get ownerDocument' called on an object that is not a valid instance of Node.` | Storybook の `focus` パッチと user-event の `patchFocus` が衝突する               |
| `Found multiple elements`                                                       | `run()` と `render()` の併用による二重マウント／`afterEach(cleanup)` の未登録     |
| jsdom では通るが実ブラウザで落ちる                                              | `<form>` の `noValidate` 漏れ                                                     |

型のレベルでも 1 つあります。`composeStories` した Story の props を上書きするとき、
`vi.fn()` を渡すと別コピーの `@vitest/spy` を指して型エラーになります。
Story 側と同じ `storybook/test` の `fn()` を使ってください。

## 使い方

```bash
npm ci
npx playwright install chromium   # 実ブラウザ側のテストに必要

npm run storybook          # Storybook を起動（http://localhost:6006）
npm run build-storybook    # 静的ビルド（storybook-static/）

npm test                   # 全部
npm run test:stories       # 実ブラウザ（①②③）
npm run test:unit          # jsdom（④と対照群）
npm run test:portable      # 手法④だけ
npm run test:plain         # 対照群だけ
npm run test:coverage      # カバレッジ付き

npm run lint
npm run format:check
npm run typecheck
```

Playwright の CDN に到達できない環境では、用意済みの Chromium を指定できます。

```bash
CHROMIUM_EXECUTABLE_PATH=/path/to/chrome npm run test:stories
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

| 項目                | 公式 init                   | このリポジトリ   | 理由                                                             |
| ------------------- | --------------------------- | ---------------- | ---------------------------------------------------------------- |
| Story の書き方      | CSF3                        | CSF3             | 一致。CSF4（`definePreview`）も v10 で使えるが CLI の既定は CSF3 |
| Vitest 設定の置き場 | `vite.config.ts`            | `vite.config.ts` | 一致                                                             |
| `a11y.test`         | `'todo'`                    | `'error'`        | a11y を検証対象として見せるため                                  |
| Chromatic           | 既定で入る                  | 入れない         | トークンが必要で CI で動かせないため                             |
| リンタ              | oxlint（Vite テンプレート） | oxlint + oxfmt   | 一致（フォーマッタを追加）                                       |
| TypeScript          | `~6.0.2`                    | `~6.0.2`         | 一致                                                             |

TypeScript は当初 `latest`（7 系）を入れていましたが、`typescript-eslint` が
`>=4.8.4 <6.1.0` を要求して解決できませんでした。エコシステムの追随を待つ必要があるため、
公式テンプレートと同じ 6 系に揃えています。

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
