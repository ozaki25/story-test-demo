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

| ID | シナリオ |
|---|---|
| S1 | 空のまま送信するとエラーメッセージが出る |
| S2 | 正しく入力して送信すると `onSubmit` が正しい値で呼ばれる |
| S3 | 送信中はフォームが操作できない |

## 収録している手法

2026 年 8 月時点で、本番で採用しうるものだけに絞っています。

| # | 手法 | 実行環境 | テストを書く場所 |
|---|---|---|---|
| ① | `play` 関数 | 実ブラウザ | `*.stories.tsx` |
| ② | 全 Story のスモークテスト | 実ブラウザ | 書かない（Story を書けば増える） |
| ③ | a11y（axe） | 実ブラウザ | `parameters.a11y` |
| ④ | Portable Stories | jsdom | `*.portable.test.tsx` |
| 対照群 | 素の Testing Library | jsdom | `*.plain.test.tsx` |

Storybook 8 で削除された storyshots、2025 年 1 月で更新の止まっている vitest-axe、
Vite 構成では出番のない test-runner は入れていません。

## 実測値

| project | 件数 | 時間 | 内訳 |
|---|---|---|---|
| storybook（実ブラウザ / Chromium） | 13 | 13.1 秒 | うちセットアップ 7.8 秒 |
| unit（jsdom） | 14 | 2.8 秒 | うちセットアップ 0.9 秒 |

実ブラウザ側は起動コストが支配的です。件数に対しては緩やかに伸びます。

## ディレクトリ構成

コンポーネント単位でディレクトリを切り、手法はファイル名のサフィックスで表しています。

```
.storybook/
  main.ts                          Story と MDX の読み込み、アドオンの登録
  preview.tsx                      全 Story 共通の parameters / decorators
src/
  components/
    Button/
      Button.tsx
      Button.stories.tsx           ② スモークテスト / ③ a11y
      index.ts
    LoginForm/
      LoginForm.tsx
      LoginForm.stories.tsx        ① play 関数 / ② スモーク / ③ a11y
      LoginForm.portable.test.tsx  ④ Portable Stories
      LoginForm.plain.test.tsx     対照群
      index.ts
  docs/                            手法の解説（Storybook のサイドバーに出る）
  test/
    setup.unit.ts                  jsdom 側のセットアップ（下記の配線を含む）
    portable.ts                    Portable Stories 用のヘルパー
vitest.config.ts                   project を実行環境で 2 つに分ける
```

手法別にディレクトリを切る構成（`tests/play/`, `tests/portable/`）は採っていません。
コンポーネントが増えたときに、1 つのコンポーネントの情報が複数の場所に散るためです。
サフィックスを全コンポーネントで統一しているので、
`src/**/*.portable.test.tsx` のような glob で手法単位の横断実行もできます。

## 大規模化を見据えた設計判断

**1. 実行環境で Vitest の project を分ける**

`storybook`（実ブラウザ）と `unit`（jsdom）の 2 つに分けています。
片方だけを回せるので、CI での並列化や部分実行がしやすくなります。

**2. Story のアノテーションを一箇所に集約する**

`.storybook/preview.tsx` の decorators / parameters を、
jsdom 側は `setProjectAnnotations`（`src/test/setup.unit.ts`）で読み込んでいます。
繋いでいないと「Storybook では動くのにテストだけ落ちる」が多発します。
規模が大きくなるほど効く配線なので、その配線自体を検証するテストも 1 本置いています。

**3. 環境差は setup ファイル 1 箇所で吸収する**

jsdom には `navigator.clipboard` がなく、そのままでは play 関数の引数から
`userEvent` を受け取れません。Story 側で回避することもできますが、
それだと書き忘れた Story が「実ブラウザでは通るが jsdom だけ落ちる」状態になります。
Story は標準の書き方に統一し、差分は setup で埋めています。

## 踏んだ落とし穴

いずれも実際に遭遇したものです。詳細は Storybook の「解説 / 5. 落とし穴」にあります。

| 症状 | 原因 |
|---|---|
| `userEvent.click is not a function` | jsdom に `navigator.clipboard` がなく、play への `userEvent` 注入がスキップされる |
| `'get ownerDocument' called on an object that is not a valid instance of Node.` | Storybook の `HTMLElement.prototype.focus` パッチと user-event の `patchFocus` が衝突する |
| `Found multiple elements` | `run()` と `render()` の併用による二重マウント／`afterEach(cleanup)` の未登録 |
| jsdom では通るが実ブラウザで落ちる | `<form>` の `noValidate` 漏れ。ブラウザ標準のバリデーションが submit を止める |

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
npm run typecheck
```

Playwright の CDN に到達できない環境では、用意済みの Chromium を指定できます。

```bash
CHROMIUM_EXECUTABLE_PATH=/path/to/chrome npm run test:stories
```

## GitHub Pages への公開

`.github/workflows/storybook.yml` が `master` への push で公開します。
初回のみ、リポジトリの **Settings > Pages > Source** を **GitHub Actions** に
変更しておく必要があります。

`storybook build` の出力はアセットを相対パスで参照するため、
サブパス配信（`https://<user>.github.io/<repo>/`）でも `base` の設定は不要です。

## 動作確認したバージョン

| | |
|---|---|
| storybook / addon-vitest / addon-a11y / addon-docs | 10.5.7 |
| vitest / @vitest/browser / @vitest/browser-playwright | 4.1.10 |
| playwright | 1.62.1 |
| react | 19.2.8 |
| @testing-library/react | 16.3.2 |
| @testing-library/user-event | 14.6.3 |
| jsdom | 30.0.1 |
| typescript | 7.0.2 |
| vite | 8.2.1 |
| Node.js | 22.22.2 |
