import type { StorybookConfig } from "@storybook/react-vite";
import remarkGfm from "remark-gfm";

const config: StorybookConfig = {
  // ドキュメント（MDX）と Story を両方読み込む。
  // ディレクトリを限定せず src 配下すべてを対象にする。
  // components/ に限定すると、別の場所に置いた Story が警告もなく無視される。
  // サイドバーの並びは preview.tsx の storySort で明示している。
  stories: ["../src/**/*.mdx", "../src/**/*.stories.@(ts|tsx)"],

  addons: [
    {
      // MDX ドキュメントと autodocs を有効にする
      name: "@storybook/addon-docs",
      options: {
        mdxPluginOptions: {
          mdxCompileOptions: {
            // MDX は既定では GFM を解釈しない。
            // これを入れないと、表・打ち消し線・タスクリストが
            // パイプ記号を含む生のテキストとして表示される。
            remarkPlugins: [remarkGfm],
          },
        },
      },
    },
    // 手法③ a11y: Story ごとに axe を実行する
    "@storybook/addon-a11y",
    // 手法①②: play 関数と全 Story スモークテストを Vitest で実行する
    "@storybook/addon-vitest",
  ],

  framework: {
    name: "@storybook/react-vite",
    options: {},
  },
};

export default config;
