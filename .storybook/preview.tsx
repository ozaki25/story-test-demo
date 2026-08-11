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
