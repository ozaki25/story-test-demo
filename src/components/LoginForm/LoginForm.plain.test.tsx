import { render, screen } from "@testing-library/react";
// このファイルは Portable Stories を一切使わないので、素の user-event がそのまま動く。
// 同じファイルに Portable Stories を持ち込むと、Storybook による
// HTMLElement.prototype.focus のパッチと衝突して壊れる。
// 詳細は LoginForm.portable.test.tsx 末尾のコメント、および「解説/5. 落とし穴」を参照。
import userEvent from "@testing-library/user-event";
import { describe, expect, test, vi } from "vitest";

import { LoginForm, validateLoginForm, type LoginFormValues } from "./LoginForm";

/**
 * ============================================================
 * このファイルの位置づけ: 対照群
 * ============================================================
 *
 * Story を一切使わず、コンポーネントを直接 import して書く普通のテスト。
 * 手法①〜④と同じシナリオ S1〜S3 を書いているので、比較の基準線になる。
 *
 * 読み比べたときの違い:
 *
 *   ・準備を毎回テスト側に書く。onSubmit のスパイも自分で用意する。
 *     Story 側に args を書いておく手法①④では、この準備が共有されている。
 *   ・このテストが通っても、Storybook 上にその状態は残らない。
 *     手法①④では検証した状態がそのままカタログとして見られる。
 *   ・逆に、Story に載せる意味のない検証はこちらのほうが素直に書ける。
 *     バリデーション関数の単体テストがその典型（このファイルの末尾）。
 *
 * つまり「Story を使う手法が常に優れている」わけではなく、
 * カタログとして残す価値があるかどうかで置き場所を選ぶ、という判断になる。
 */
describe("LoginForm（Story を使わない素の Testing Library）", () => {
  test("S1 空のまま送信するとエラーが出る", async () => {
    const onSubmit = vi.fn<(values: LoginFormValues) => void>();
    render(<LoginForm onSubmit={onSubmit} />);

    await userEvent.click(screen.getByRole("button", { name: "ログイン" }));

    expect(screen.getByText("メールアドレスを入力してください")).toBeInTheDocument();
    expect(screen.getByText("パスワードを入力してください")).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  test("S2 正しく入力して送信すると onSubmit が呼ばれる", async () => {
    const onSubmit = vi.fn<(values: LoginFormValues) => void>();
    render(<LoginForm onSubmit={onSubmit} />);

    await userEvent.type(screen.getByLabelText("メールアドレス"), "user@example.com");
    await userEvent.type(screen.getByLabelText("パスワード"), "password123");
    await userEvent.click(screen.getByRole("button", { name: "ログイン" }));

    expect(onSubmit).toHaveBeenCalledWith({
      email: "user@example.com",
      password: "password123",
    });
  });

  test("S3 送信中はフォームが操作できない", async () => {
    // 解決しない Promise を返して送信中の状態に留める。
    // 手法①では同じことを Story の args として宣言していた（SubmittingDisablesForm）。
    const onSubmit = vi.fn<(values: LoginFormValues) => Promise<void>>(
      () => new Promise<void>(() => {}),
    );
    render(<LoginForm onSubmit={onSubmit} />);

    await userEvent.type(screen.getByLabelText("メールアドレス"), "user@example.com");
    await userEvent.type(screen.getByLabelText("パスワード"), "password123");
    await userEvent.click(screen.getByRole("button", { name: "ログイン" }));

    // 送信中のボタンは disabled ではなく aria-disabled。詳細は Button.tsx を参照。
    expect(await screen.findByRole("button", { name: "送信中…" })).toHaveAttribute(
      "aria-disabled",
      "true",
    );
    expect(screen.getByLabelText("メールアドレス")).toBeDisabled();
    expect(screen.getByLabelText("パスワード")).toBeDisabled();
  });
});

/**
 * ============================================================
 * V1〜V8: 同値分割と境界値分析
 * ============================================================
 *
 * ここは描画を伴わない。Story にしても見て確認する価値がないので、
 * 関数として切り出して普通の単体テストで網羅する。
 *
 * パスワードは 8 文字が境界なので、7 と 8 を必ず含める。
 * 「短い例」と「十分長い例」の 2 つだけでは、境界の判定ミスを検出できない。
 */
describe("validateLoginForm（描画を伴わない規則の単体テスト）", () => {
  const VALID_EMAIL = "user@example.com";
  const VALID_PASSWORD = "password123";

  describe("パスワードの文字数（境界は 8）", () => {
    test.each([
      ["V1", "", "パスワードを入力してください"],
      ["V2", "a".repeat(7), "パスワードは8文字以上で入力してください"],
      ["V3", "a".repeat(8), undefined],
      ["--", "a".repeat(9), undefined],
    ])("%s: %j 文字のとき", (_id, password, expected) => {
      expect(validateLoginForm({ email: VALID_EMAIL, password }).password).toBe(expected);
    });
  });

  describe("メールアドレスの形式", () => {
    test.each([
      ["V4", "", "メールアドレスを入力してください"],
      ["V5", "   ", "メールアドレスを入力してください"],
      ["V6", "not-an-email", "メールアドレスの形式が正しくありません"],
      ["V7", "user@example", "メールアドレスの形式が正しくありません"],
      ["V8", "@example.com", "メールアドレスの形式が正しくありません"],
      ["--", "user@", "メールアドレスの形式が正しくありません"],
      ["--", VALID_EMAIL, undefined],
    ])("%s: %j のとき", (_id, email, expected) => {
      expect(validateLoginForm({ email, password: VALID_PASSWORD }).email).toBe(expected);
    });
  });

  test("両方妥当ならエラーなし", () => {
    expect(validateLoginForm({ email: VALID_EMAIL, password: VALID_PASSWORD })).toEqual({});
  });
});
