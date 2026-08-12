import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fireEvent, fn } from "storybook/test";

import { LoginForm } from "./LoginForm";

// ============================================================
// このファイルが示す手法（コード読者向けの注記）
//   手法① play 関数（Story にテストを同居させる）
//   手法② 全 Story のスモークテスト
//   手法③ a11y（axe）
// ============================================================
//
// 3 つの手法が 1 ファイルに同居する。
//
//   ・play 関数を書いた Story       → その操作と検証が実行される（手法①）
//   ・play 関数を書いていない Story → 描画が通るかだけ検証される（手法②）
//   ・すべての Story                → axe が実行される（手法③）
//
// 描画を伴わない入力値の境界（V1〜V8）はここには置かない。
// Story にすると一覧性を損なうだけなので、validateLoginForm.test.ts で
// 純粋関数として検証している。判断の根拠は「解説/1. 何を検証するか」を参照。
//
// 命名の方針:
//   カタログに出る Story は export 名をそのまま使う（アッパーキャメルケース）。
//   Button 側と揃えるため、日本語の name は付けない。
//   インタラクション専用の Story は非表示なのでカタログに影響せず、
//   テスト結果に出たときに何を検証したか分かるよう、ケース ID を含む名前にしている。
//
// この注記を JSDoc（/** */）で書かないこと。
// meta の直前の JSDoc は autodocs のコンポーネント説明として Markdown 描画され、
// 区切り線が見出し記法と解釈されて崩れる。公開する説明は下の
// parameters.docs.description.component に分けて書く。

/** autodocs のコンポーネント説明。Markdown として描画されるので記法に沿って書く。 */
const DESCRIPTION = [
  "入力・バリデーション・非同期の送信中状態を持つログインフォーム。",
  "",
  "検証ケースは技法から導出している（詳細は「解説/1. 何を検証するか」）。",
  "",
  "- **T1〜T6** … 状態遷移テスト",
  "- **D1〜D4** … デシジョンテーブル（email × password の妥当性の全組み合わせ）",
  "- **K1** … 操作経路。キーボードだけで完了できるか",
  "",
  "状態遷移:",
  "",
  "    idle --[不正な入力で送信]--> error --[修正して送信]--+",
  "      |                                                  |",
  "      +--[妥当な入力で送信]-----------------------------> submitting",
  "                                                             |",
  "                                          [解決] --> idle    |",
  "                                          [棄却] --> error <-+",
].join("\n");

const meta = {
  title: "components/LoginForm",
  component: LoginForm,
  parameters: {
    docs: { description: { component: DESCRIPTION } },
  },
  args: {
    // fn() は storybook/test のスパイ。
    // Storybook の UI 上では Actions パネルに呼び出しが表示され、
    // テストとして実行されるときは呼び出し引数を検証できる。
    onSubmit: fn(),
  },
} satisfies Meta<typeof LoginForm>;

export default meta;

type Story = StoryObj<typeof meta>;

/** 解決しない Promise。送信中の状態に留めたいときに使う。 */
const never = () => new Promise<void>(() => {});

const VALID = { email: "user@example.com", password: "password123" };

// インタラクション専用の Story には tags: ["!dev", "!autodocs"] を付けている。
//
//   !dev      … サイドバーから外す
//   !autodocs … Docs ページの一覧から外す
//   test      … 既定で付いたままなので、テストとしては実行され axe も回る
//
// タグは共有定数からスプレッドしないこと。
// Storybook のインデクサは tags を静的解析するため、変数経由だと読めず、
// 型チェックも実行時エラーも起きないまま黙って無視される。

/**
 * play 関数なし。手法②（描画が通るか）と手法③（axe）だけが働く Story。
 */
export const Default: Story = {};

/**
 * T1 / D4: 空のまま送信する。email と password の両方が不正なケースでもある。
 */
export const ValidationErrors: Story = {
  play: async ({ canvas, userEvent, args, step }) => {
    await step("空のままログインボタンを押す", async () => {
      await userEvent.click(canvas.getByRole("button", { name: "ログイン" }));
    });

    await step("両方の項目にエラーが表示される", async () => {
      await expect(await canvas.findByText("メールアドレスを入力してください")).toBeInTheDocument();
      await expect(canvas.getByText("パスワードを入力してください")).toBeInTheDocument();
    });

    await step("送信は行われない", async () => {
      await expect(args.onSubmit).not.toHaveBeenCalled();
    });
  },
};

/**
 * T3 / D1: 妥当な入力で送信する。
 */
export const ValidSubmitCallsOnSubmit: Story = {
  tags: ["!dev", "!autodocs"],
  name: "T3・D1 正しく入力して送信すると onSubmit が呼ばれる",
  play: async ({ canvas, userEvent, args, step }) => {
    await step("フォームを入力する", async () => {
      await userEvent.type(canvas.getByLabelText("メールアドレス"), VALID.email);
      await userEvent.type(canvas.getByLabelText("パスワード"), VALID.password);
    });

    await step("ログインボタンを押す", async () => {
      await userEvent.click(canvas.getByRole("button", { name: "ログイン" }));
    });

    await step("入力値がそのまま onSubmit に渡る", async () => {
      await expect(args.onSubmit).toHaveBeenCalledWith(VALID);
    });
  },
};

/**
 * D3: email だけが不正。password 側にはエラーを出さない。
 */
export const InvalidEmailOnly: Story = {
  tags: ["!dev", "!autodocs"],
  name: "D3 メールアドレスだけ不正ならそちらにだけエラーが出る",
  play: async ({ canvas, userEvent, args }) => {
    await userEvent.type(canvas.getByLabelText("メールアドレス"), "not-an-email");
    await userEvent.type(canvas.getByLabelText("パスワード"), VALID.password);
    await userEvent.click(canvas.getByRole("button", { name: "ログイン" }));

    await expect(
      await canvas.findByText("メールアドレスの形式が正しくありません"),
    ).toBeInTheDocument();
    await expect(canvas.queryByText("パスワードを入力してください")).not.toBeInTheDocument();
    await expect(args.onSubmit).not.toHaveBeenCalled();
  },
};

/**
 * D2: password だけが不正。
 *
 * 「片側だけ不正」を email 側でしか見ていなかったので、対称なケースが欠けていた。
 * デシジョンテーブルを書いて初めて気付いた抜け。
 */
export const InvalidPasswordOnly: Story = {
  tags: ["!dev", "!autodocs"],
  name: "D2 パスワードだけ不正ならそちらにだけエラーが出る",
  play: async ({ canvas, userEvent, args }) => {
    await userEvent.type(canvas.getByLabelText("メールアドレス"), VALID.email);
    await userEvent.type(canvas.getByLabelText("パスワード"), "short");
    await userEvent.click(canvas.getByRole("button", { name: "ログイン" }));

    await expect(
      await canvas.findByText("パスワードは8文字以上で入力してください"),
    ).toBeInTheDocument();
    await expect(canvas.queryByText("メールアドレスを入力してください")).not.toBeInTheDocument();
    await expect(args.onSubmit).not.toHaveBeenCalled();
  },
};

/**
 * T2: エラーが出た状態から修正して送信し直す。
 * 状態を持つフォームでは、一度エラーになってから復帰する経路が壊れやすい。
 */
export const RecoverFromError: Story = {
  tags: ["!dev", "!autodocs"],
  name: "T2 エラー表示後に修正して送信できる",
  play: async ({ canvas, userEvent, args, step }) => {
    await step("空のまま送信してエラーを出す", async () => {
      await userEvent.click(canvas.getByRole("button", { name: "ログイン" }));
      await expect(await canvas.findByText("メールアドレスを入力してください")).toBeInTheDocument();
    });

    await step("入力し直して送信する", async () => {
      await userEvent.type(canvas.getByLabelText("メールアドレス"), VALID.email);
      await userEvent.type(canvas.getByLabelText("パスワード"), VALID.password);
      await userEvent.click(canvas.getByRole("button", { name: "ログイン" }));
    });

    await step("エラーが消え、送信される", async () => {
      await expect(args.onSubmit).toHaveBeenCalledWith(VALID);
      await expect(canvas.queryByText("メールアドレスを入力してください")).not.toBeInTheDocument();
    });
  },
};

/**
 * T3 の途中経過: 送信中の見た目。
 *
 * onSubmit が解決しない Promise を返すことで状態を固定している。
 * 「非同期処理の途中の状態」を Story として残せるのが、args で外側を差し替えられる利点。
 */
export const Submitting: Story = {
  args: { onSubmit: fn(never) },
  play: async ({ canvas, userEvent, step }) => {
    await step("正しい値を入力して送信する", async () => {
      await userEvent.type(canvas.getByLabelText("メールアドレス"), VALID.email);
      await userEvent.type(canvas.getByLabelText("パスワード"), VALID.password);
      await userEvent.click(canvas.getByRole("button", { name: "ログイン" }));
    });

    await step("ボタンが送信中の表示になり、入力欄も無効になる", async () => {
      // 送信中のボタンは disabled 属性ではなく aria-disabled で表現される。
      // フォーカスを保ったまま押下だけを止めるため。詳細は Button.tsx を参照。
      await expect(await canvas.findByRole("button", { name: "送信中…" })).toHaveAttribute(
        "aria-disabled",
        "true",
      );
      await expect(canvas.getByLabelText("メールアドレス")).toBeDisabled();
      await expect(canvas.getByLabelText("パスワード")).toBeDisabled();
    });
  },
};

/**
 * T4: 送信が成功して元の状態に戻る。
 *
 * 送信中に入るところまでしか検証していないと、戻ってこない不具合を見逃す。
 */
export const SubmitSucceeds: Story = {
  tags: ["!dev", "!autodocs"],
  name: "T4 送信に成功すると操作できる状態に戻る",
  args: { onSubmit: fn(async () => {}) },
  play: async ({ canvas, userEvent, step }) => {
    await step("正しい値を入力して送信する", async () => {
      await userEvent.type(canvas.getByLabelText("メールアドレス"), VALID.email);
      await userEvent.type(canvas.getByLabelText("パスワード"), VALID.password);
      await userEvent.click(canvas.getByRole("button", { name: "ログイン" }));
    });

    await step("ボタンの表示が戻り、入力欄も操作できる", async () => {
      await expect(await canvas.findByRole("button", { name: "ログイン" })).toBeInTheDocument();
      await expect(canvas.getByLabelText("メールアドレス")).toBeEnabled();
      await expect(canvas.getByLabelText("パスワード")).toBeEnabled();
    });
  },
};

/**
 * T5: 送信が失敗する。
 *
 * このケースを設計した時点では、実装に catch がなく未処理の Promise 拒否になっていた。
 * 画面には何も出ず、利用者は送信できたのか分からないまま放置される状態だった。
 * ケースを先に洗い出したことで見つかった不具合。
 */
export const SubmitFailed: Story = {
  args: {
    onSubmit: fn(async () => {
      throw new Error("network error");
    }),
  },
  play: async ({ canvas, userEvent, step }) => {
    await step("正しい値を入力して送信する", async () => {
      await userEvent.type(canvas.getByLabelText("メールアドレス"), VALID.email);
      await userEvent.type(canvas.getByLabelText("パスワード"), VALID.password);
      await userEvent.click(canvas.getByRole("button", { name: "ログイン" }));
    });

    await step("失敗したことが画面に出る", async () => {
      await expect(
        await canvas.findByText("送信に失敗しました。時間をおいて再度お試しください。"),
      ).toBeInTheDocument();
    });

    await step("再操作できる状態に戻る", async () => {
      await expect(canvas.getByRole("button", { name: "ログイン" })).toBeInTheDocument();
      await expect(canvas.getByLabelText("メールアドレス")).toBeEnabled();
    });
  },
};

/**
 * T6: 送信中の多重送信を防ぐ。
 *
 * ここは「ユーザー操作で二重送信を試みる」形では書けない。
 * 送信中は入力欄が disabled になり Enter が届かず、
 * ボタンも押下が止まるので、UI からガードに到達する経路が存在しないためである。
 *
 * 実際、最初は「送信中に Enter を押す」と書いていたが、
 * ガードを削除してもテストが通ってしまった。入力欄が無効なので
 * そもそも submit が発火せず、検証したい分岐を一度も通っていなかった。
 * カバレッジで未到達行として出て初めて気付いた。アサーションでは分からない。
 *
 * ガードは「UI 以外の経路で submit が来ても二重送信しない」ための防御なので、
 * その水準に合わせて submit イベントを直接発火させて検証する。
 */
export const NoDoubleSubmit: Story = {
  tags: ["!dev", "!autodocs"],
  name: "T6 送信中に submit が再度発火しても二重送信されない",
  args: { onSubmit: fn(never) },
  play: async ({ canvas, userEvent, args, step }) => {
    await step("入力して送信し、送信中にする", async () => {
      await userEvent.type(canvas.getByLabelText("メールアドレス"), VALID.email);
      await userEvent.type(canvas.getByLabelText("パスワード"), VALID.password);
      await userEvent.click(canvas.getByRole("button", { name: "ログイン" }));
      await expect(await canvas.findByRole("button", { name: "送信中…" })).toBeInTheDocument();
    });

    await step("送信中にもう一度 submit を発火させる", async () => {
      fireEvent.submit(canvas.getByRole("form", { name: "ログイン" }));
    });

    await step("onSubmit は 1 回しか呼ばれていない", async () => {
      await expect(args.onSubmit).toHaveBeenCalledTimes(1);
    });
  },
};

/**
 * K1: キーボードだけで完了できるか。
 *
 * クリックのテストだけを積んでいると、Tab 順やフォーカス移動が壊れても気付けない。
 * 実ブラウザで動かす価値が最も高い種類のケース。
 */
export const KeyboardOnly: Story = {
  tags: ["!dev", "!autodocs"],
  name: "K1 キーボードだけで入力して送信できる",
  play: async ({ canvas, userEvent, args, step }) => {
    await step("Tab で移動しながら入力する", async () => {
      await userEvent.tab();
      await expect(canvas.getByLabelText("メールアドレス")).toHaveFocus();
      await userEvent.keyboard(VALID.email);

      await userEvent.tab();
      await expect(canvas.getByLabelText("パスワード")).toHaveFocus();
      await userEvent.keyboard(VALID.password);
    });

    await step("Tab でボタンへ移動して Enter で送信する", async () => {
      await userEvent.tab();
      await expect(canvas.getByRole("button", { name: "ログイン" })).toHaveFocus();
      await userEvent.keyboard("{Enter}");
    });

    await step("送信される", async () => {
      await expect(args.onSubmit).toHaveBeenCalledWith(VALID);
    });
  },
};
