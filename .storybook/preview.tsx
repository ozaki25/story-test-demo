import type { Preview } from '@storybook/react-vite';

import '../src/styles/global.css';

/**
 * プロジェクト全体に効く Story のアノテーション（parameters / decorators / globals）。
 *
 * ここに書いたものは Storybook 上の全 Story に適用される。
 * 重要なのは、Portable Stories（jsdom 側のテスト）もこのファイルを読み込むこと。
 * src/test/setup.unit.ts の setProjectAnnotations がその橋渡しをしている。
 * 繋いでいないと「Storybook では動くが jsdom テストでは decorator が効かず落ちる」が起きる。
 */
const preview: Preview = {
  parameters: {
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
     * ここで全体の既定値を決め、Story 単位で上書きする。
     */
    a11y: {
      test: 'error',
    },
  },

  // 全 Story を共通の枠で囲む decorator。
  // Portable Stories 側でもこの枠が付くことを LoginForm.portable.test.tsx で確認している。
  decorators: [
    (Story) => (
      <div className="sb-preview-frame" data-testid="preview-frame">
        <Story />
      </div>
    ),
  ],
};

export default preview;
