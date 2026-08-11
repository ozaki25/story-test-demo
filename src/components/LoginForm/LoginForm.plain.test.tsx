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

    expect(await screen.findByRole("button", { name: "送信中…" })).toBeDisabled();
    expect(screen.getByLabelText("メールアドレス")).toBeDisabled();
    expect(screen.getByLabelText("パスワード")).toBeDisabled();
  });
});

/**
 * バリデーション規則そのもののテスト。
 *
 * これは Story にする意味がない。描画を伴わないし、カタログに載せるべき状態でもない。
 * 規則の組み合わせを網羅したいだけなら、こちらのほうが速く、読みやすく、壊れにくい。
 *
 * 「何でも Story 経由にする」のではなく、こういう層は素直に関数として切り出して
 * 普通の単体テストを書く、という切り分けが実務では効く。
 */
describe("validateLoginForm（描画を伴わない規則の単体テスト）", () => {
  test.each([
    ["", "password123", "メールアドレスを入力してください"],
    ["not-an-email", "password123", "メールアドレスの形式が正しくありません"],
  ])("email=%j のとき %s", (email, password, expected) => {
    expect(validateLoginForm({ email, password }).email).toBe(expected);
  });

  test.each([
    ["user@example.com", "", "パスワードを入力してください"],
    ["user@example.com", "short", "パスワードは8文字以上で入力してください"],
  ])("password=%j のとき %s", (email, password, expected) => {
    expect(validateLoginForm({ email, password }).password).toBe(expected);
  });

  test("正しい値ならエラーなし", () => {
    expect(validateLoginForm({ email: "user@example.com", password: "password123" })).toEqual({});
  });
});
