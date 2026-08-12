import type { Meta, StoryObj } from "@storybook/react-vite";

import { Button } from "./Button";

// ============================================================
// このファイルが示す手法（コード読者向けの注記）
//   手法② 全 Story のスモークテスト
//   手法③ a11y（axe）
// ============================================================
//
// play 関数を 1 つも書いていないことに注目。
// それでも npm run test:stories を実行すると、この Story の数だけテストが増える。
// addon-vitest は Story を 1 件 1 テストとして登録し、play 関数がない Story は
// 「描画が例外を投げずに完了するか」を検証する。addon-a11y により axe も実行される。
//
// LoginForm と違い、インタラクション専用の Story（tags: ["!dev"]）は 1 つもない。
// ここにあるのはすべて「その状態を見る」ための Story なので、分ける必要がない。
//
// 命名は variant の値に揃えている。
// 「プライマリ」「セカンダリ」と並べたところに「危険な操作」のような
// 用途の説明を混ぜると、何を基準に並んでいるのかが読み取れなくなる。
//
// この注記を JSDoc（/** */）で書かない理由は LoginForm.stories.tsx を参照。

/** autodocs のコンポーネント説明。Markdown として描画されるので記法に沿って書く。 */
const DESCRIPTION = [
  "React Aria Components をラップしたボタン。",
  "variant と size は tailwind-variants で管理している。",
  "",
  "見た目のバリエーションは多いが振る舞いは薄いので、",
  "操作を書き下す play 関数よりも、状態を Story として並べるほうが費用対効果が高い。",
  "Story を 1 つ足すだけでテストが 1 つ増える。",
  "",
  "`loading` は `disabled` とは別物で、押下は止まるがフォーカスは保つ。",
  "詳細は Button.tsx のコメントを参照。",
].join("\n");

const meta = {
  title: "components/Button",
  component: Button,
  parameters: {
    docs: { description: { component: DESCRIPTION } },
  },
  args: {
    children: "ボタン",
    variant: "primary",
    size: "medium",
    disabled: false,
    loading: false,
  },
  argTypes: {
    variant: {
      control: "select",
      options: ["primary", "secondary", "danger"],
      description: "見た目のバリエーション",
    },
    size: {
      // Union 型の control は select で統一する。
      // 値は略称を使わず small / medium / large と書く。
      control: "select",
      options: ["small", "medium", "large"],
      description: "サイズ",
    },
    disabled: {
      control: "boolean",
      description: "無効化。フォーカスもできなくなる",
    },
    loading: {
      control: "boolean",
      description: "処理中。押下は止まるがフォーカスは保つ",
    },
  },
} satisfies Meta<typeof Button>;

export default meta;

type Story = StoryObj<typeof meta>;

/** Controls からすべての props を操作できる。動作を試すための入口。 */
export const Playground: Story = {};

/** variant を並べて見比べる。 */
export const AllVariants: Story = {
  render: (args) => (
    <div className="flex items-center gap-2">
      <Button {...args} variant="primary">
        primary
      </Button>
      <Button {...args} variant="secondary">
        secondary
      </Button>
      <Button {...args} variant="danger">
        danger
      </Button>
    </div>
  ),
  parameters: {
    controls: { exclude: ["variant", "children"] },
  },
};

/** size を並べて見比べる。 */
export const AllSizes: Story = {
  render: (args) => (
    <div className="flex items-center gap-2">
      <Button {...args} size="small">
        small
      </Button>
      <Button {...args} size="medium">
        medium
      </Button>
      <Button {...args} size="large">
        large
      </Button>
    </div>
  ),
  parameters: {
    controls: { exclude: ["size", "children"] },
  },
};

/** 無効化した状態。フォーカスもできない。 */
export const Disabled: Story = {
  args: { disabled: true },
};

/**
 * 処理中の状態。
 *
 * `disabled` とは異なり、押下は止まるがフォーカスは保たれる。
 * DOM には `aria-disabled` と `data-pending` が付き、`disabled` 属性は付かない。
 */
export const Loading: Story = {
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
  args: {
    children: <span aria-hidden="true">✕</span>,
  },
  parameters: {
    a11y: { test: "todo" },
  },
};
