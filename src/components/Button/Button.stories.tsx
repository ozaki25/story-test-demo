import type { Meta, StoryObj } from '@storybook/react-vite';

import { Button } from './Button';

/**
 * ============================================================
 * このファイルが示す手法
 *   手法② 全 Story のスモークテスト
 *   手法③ a11y（axe）
 * ============================================================
 *
 * play 関数を 1 つも書いていないことに注目。
 * それでも `npm run test:stories` を実行すると、この Story の数だけテストが増える。
 *
 * @storybook/addon-vitest は Story を 1 件 1 テストとして登録し、
 * play 関数がない Story については「描画が例外を投げずに完了するか」を検証する。
 * さらに addon-a11y が有効なので、各 Story に対して axe も実行される。
 *
 * Button のように「見た目のバリエーションは多いが振る舞いは薄い」コンポーネントでは、
 * 操作を書き下す play 関数よりも、状態を Story として並べるほうが費用対効果が高い。
 * Story を 1 つ足すだけでテストが 1 つ増える、という関係になる。
 */
const meta = {
  title: 'components/Button',
  component: Button,
  args: {
    children: 'ボタン',
  },
  argTypes: {
    variant: { control: 'inline-radio', options: ['primary', 'secondary', 'danger'] },
    size: { control: 'inline-radio', options: ['sm', 'md', 'lg'] },
  },
} satisfies Meta<typeof Button>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Primary: Story = {
  name: 'プライマリ',
};

export const Secondary: Story = {
  name: 'セカンダリ',
  args: { variant: 'secondary' },
};

export const Danger: Story = {
  name: '危険な操作',
  args: { variant: 'danger' },
};

export const Small: Story = {
  name: 'サイズ小',
  args: { size: 'sm' },
};

export const Large: Story = {
  name: 'サイズ大',
  args: { size: 'lg' },
};

export const Disabled: Story = {
  name: '無効',
  args: { disabled: true },
};

export const Loading: Story = {
  name: '処理中',
  args: { loading: true },
};

/**
 * 手法③ a11y の段階導入の例。
 *
 * この Story のボタンは中身が aria-hidden なので、支援技術から見ると名前がない。
 * axe の button-name ルールに違反する。
 *
 * .storybook/preview.tsx では a11y.test を 'error'（違反があればテスト失敗）にしているが、
 * ここでは Story 単位で 'todo' に落としている。'todo' は違反を報告しつつテストは失敗させない。
 *
 * 既存プロジェクトに a11y チェックを入れると大量に違反が出るのが普通なので、
 * 「全体は error、直せていない箇所だけ todo」と印を付けて減らしていく運用ができる。
 * 逃げ道ではなく、返済対象を可視化するための仕組みとして使う。
 */
export const IconOnlyWithoutLabel: Story = {
  name: 'アイコンのみ（a11y違反を todo として許容）',
  args: {
    children: <span aria-hidden="true">✕</span>,
  },
  parameters: {
    a11y: { test: 'todo' },
  },
};
