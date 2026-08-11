import type { StorybookConfig } from '@storybook/react-vite';

const config: StorybookConfig = {
  // ドキュメント（MDX）と Story を両方読み込む。
  // MDX を先に並べることで、サイドバー上部に解説が来る。
  stories: ['../src/docs/**/*.mdx', '../src/components/**/*.stories.@(ts|tsx)'],

  addons: [
    // MDX ドキュメントと autodocs を有効にする
    '@storybook/addon-docs',
    // 手法③ a11y: Story ごとに axe を実行する
    '@storybook/addon-a11y',
    // 手法①②: play 関数と全 Story スモークテストを Vitest で実行する
    '@storybook/addon-vitest',
  ],

  framework: {
    name: '@storybook/react-vite',
    options: {},
  },
};

export default config;
