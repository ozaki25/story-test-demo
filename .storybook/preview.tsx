import type { Preview } from "@storybook/react-vite";

import "../src/styles/global.css";

/**
 * プロジェクト全体に効く Story のアノテーション（parameters / decorators / globals / tags）。
 *
 * ここに書いたものは Storybook 上の全 Story に適用される。
 * 重要なのは、Portable Stories（jsdom 側のテスト）もこのファイルを読み込むこと。
 * src/test/setup.unit.ts の setProjectAnnotations がその橋渡しをしている。
 * 繋いでいないと「Storybook では動くが jsdom テストでは decorator が効かず落ちる」が起きる。
 */
const preview: Preview = {
  // 全コンポーネントに Docs ページを自動生成する。
  // meta ごとに tags を書く必要がなくなり、コンポーネントが増えても付け忘れない。
  tags: ["autodocs"],

  parameters: {
    // サイドバーの並び順を明示する。
    // 指定しないと読み込み順に依存し、コンポーネントが増えたときに解説が埋もれる。
    options: {
      storySort: {
        order: ["解説", "components"],
      },
    },

    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },

    /**
     * 手法③ a11y。
     *
     * 'error' で axe の違反をテスト失敗として扱う。
     * 'todo'  で違反を警告扱いにする（既存プロジェクトへの段階導入で使う）。
     * 'off'   で無効化。
     *
     * storybook init が生成する既定値は 'todo'。
     * このリポジトリでは a11y を検証対象として見せたいので 'error' にし、
     * 未対応の Story だけを 'todo' に落としている。
     */
    a11y: {
      test: "error",

      /**
       * 検査範囲を絞る。
       *
       * axe は既定でページ全体を見るため、Story が描画したコンポーネントの外にある
       * 要素まで拾ってしまう。react-aria は状態変化を読み上げるためのライブリージョンを
       * ページ側に挿入し、しかもそれは一度作られると残り続ける。
       * その中の要素に違反があると、無関係な Story まで連鎖して落ちる。
       *
       * 検査したいのは自分たちが書いたコンポーネントなので、
       * ライブラリが差し込むライブリージョンは対象から外す。
       */
      context: {
        exclude: '[role="log"][aria-live]',
      },
    },
  },

  // 全 Story を共通の枠で囲む decorator。
  // Portable Stories 側でもこの枠が付くことを *.portable.test.tsx で確認している。
  decorators: [
    (Story) => (
      <div className="p-4" data-testid="preview-frame">
        <Story />
      </div>
    ),
  ],
};

export default preview;
