import { composeStories } from "@storybook/react";
import { render, screen } from "@testing-library/react";
// userEvent と fn（スパイ）は @testing-library/user-event や vitest ではなく
// storybook/test から取る。理由はファイル末尾の「テストユーティリティの import 元について」を参照。
import { fn, userEvent } from "storybook/test";
import { describe, expect, test } from "vitest";

import { runStory } from "@/test/portable";

import * as stories from "./LoginForm.stories";

/**
 * ============================================================
 * このファイルが示す手法
 *   手法④ Portable Stories（jsdom）
 * ============================================================
 *
 * composeStories は Story ファイルの各 export を、そのまま描画できる React コンポーネントに変換する。
 * このとき args・decorators・parameters（.storybook/preview.tsx の分を含む）が適用される。
 * preview.tsx を読み込む配線は src/test/setup.unit.ts の setProjectAnnotations が担っている。
 *
 * ブラウザを起動しないので実行が速い。一方でレイアウトや実ブラウザ固有の挙動は検証できない。
 *
 * このファイルでは 2 つの使い方を書き分けている。用途が違うので混同しないこと。
 *
 *   使い方 A: Story の play 関数を jsdom でそのまま再実行する
 *   使い方 B: Story を「入力の定義」として再利用し、検証はテスト側に書く
 */
const {
  Default,
  EmptySubmitShowsErrors,
  ValidSubmitCallsOnSubmit,
  InvalidEmailOnly,
  InvalidPasswordOnly,
  RecoverFromError,
  Submitting,
  SubmitSucceeds,
  SubmitFails,
  NoDoubleSubmit,
} = composeStories(stories);

/**
 * 使い方 A。
 *
 * どの Story を jsdom 側でも回すかは選んでいる。全部を機械的に回すと、
 * 実ブラウザ側のスモークテストと内容が完全に重複するだけになる。
 *
 * ここでは状態遷移（T1〜T6）とデシジョンテーブル（D1〜D4）を対象にした。
 * 開発中に何度も回したいのはこの層で、jsdom の速さが効くため。
 *
 * K1（キーボード操作）は入れていない。Tab 順やフォーカスの挙動は
 * 実ブラウザで確かめる意味が大きく、jsdom で通っても保証にならないため。
 */
describe("使い方A: Story の play 関数を jsdom で再実行する", () => {
  test.each([
    ["T1・D4 空送信で両方エラー", EmptySubmitShowsErrors],
    ["T2 エラー後に修正して送信", RecoverFromError],
    ["T3・D1 正常送信", ValidSubmitCallsOnSubmit],
    ["T3 送信中", Submitting],
    ["T4 送信成功", SubmitSucceeds],
    ["T5 送信失敗", SubmitFails],
    ["T6 二重送信の防止", NoDoubleSubmit],
    ["D2 パスワードだけ不正", InvalidPasswordOnly],
    ["D3 メールだけ不正", InvalidEmailOnly],
  ])("%s", async (_name, Story) => {
    await runStory(Story);
  });
});

describe("使い方B: Story を入力の定義として再利用し、検証はテスト側に書く", () => {
  /**
   * Story の args を土台にしつつ、props を上書きして検証を差し替える。
   * 「この検証は Storybook のカタログに載せるほどではない」ものを書く場所になる。
   */
  test("送信後もフォームの値は保持される", async () => {
    const onSubmit = fn();
    render(<Default onSubmit={onSubmit} />);

    await userEvent.type(screen.getByLabelText("メールアドレス"), "user@example.com");
    await userEvent.type(screen.getByLabelText("パスワード"), "password123");
    await userEvent.click(screen.getByRole("button", { name: "ログイン" }));

    expect(onSubmit).toHaveBeenCalledWith({
      email: "user@example.com",
      password: "password123",
    });
    expect(screen.getByLabelText("メールアドレス")).toHaveValue("user@example.com");
  });

  /**
   * .storybook/preview.tsx の decorator が jsdom 側にも適用されていることの確認。
   *
   * このテストが落ちるときは setProjectAnnotations の配線が切れている。
   * コンポーネントが増えてから気付くと原因の特定が面倒なので、
   * 配線そのものを検証するテストを 1 本置いている。
   */
  test("preview.tsx の decorator が適用されている", () => {
    render(<Default />);
    expect(screen.getByTestId("preview-frame")).toBeInTheDocument();
  });
});

/**
 * ============================================================
 * テストユーティリティの import 元について（重要）
 * ============================================================
 *
 * ■ userEvent
 *
 * このファイルの userEvent は storybook/test から import している。
 * @testing-library/user-event を直接使うと、次の経路で落ちる。
 *
 *   HTMLElement.get [as focus]  storybook/dist/csf/index.js
 *   patchFocus                  @testing-library/user-event/.../patchFocus.js
 *   setupDirect                 @testing-library/user-event/.../setup.js
 *   TypeError: 'get ownerDocument' called on an object that is not a valid instance of Node.
 *
 * Storybook は HTMLElement.prototype.focus をゲッターに差し替えている。
 * そのゲッターは this.ownerDocument を参照するため、
 * user-event の patchFocus がプロトタイプ上のディスクリプタを読んだ瞬間に
 * 「Node ではないオブジェクトで ownerDocument が呼ばれた」となる。
 *
 * つまり Portable Stories を実行したファイルの中で
 * 素の @testing-library/user-event を使うと壊れる。
 * Vitest はファイル単位で環境を分離するので、Story を使わないファイル
 * （LoginForm.plain.test.tsx）では素の user-event がそのまま動く。
 * 「動くファイルと動かないファイルがある」状態になるのが厄介なところ。
 *
 * ■ fn（スパイ）
 *
 * onSubmit のスパイも vi.fn() ではなく storybook/test の fn() を使っている。
 * composeStories が返す Story の props 型は、Story 側の args（storybook/test の fn()）に
 * 由来する Mock 型になる。vi.fn() を渡すと、別コピーの @vitest/spy を指すため
 * 型エラーになる（実行はできるが tsc が通らない）。
 *
 *   Type 'Mock<Procedure>' is not assignable to type 'Mock<Procedure> | undefined'.
 *
 * Story の args を上書きするときは、Story 側と同じ fn() を使う。
 */
