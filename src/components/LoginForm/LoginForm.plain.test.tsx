import { fireEvent, render, screen } from "@testing-library/react";
// このファイルは Portable Stories を一切使わないので、素の user-event がそのまま動く。
// 同じファイルに Portable Stories を持ち込むと、Storybook による
// HTMLElement.prototype.focus のパッチと衝突して壊れる。詳細は「解説/5. 落とし穴」を参照。
import userEvent from "@testing-library/user-event";
import { describe, expect, test, vi } from "vitest";

import { LoginForm, type LoginFormValues } from "./LoginForm";

/**
 * ============================================================
 * 対照群: Story を使わずに全ケースを実装した場合
 * ============================================================
 *
 * これは「①play 関数に書く」の**競合案**であって、補完ではない。
 * どちらか一方を採用したら、もう一方はまるごと消える。
 *
 * だから、①が持っているケースをすべてここにも実装している。
 * 一部だけを分担すると、単独で採用できるかどうかが判断できなくなる。
 *
 *   T1〜T6 … 状態遷移
 *   D1〜D4 … デシジョンテーブル
 *   K1     … キーボードのみの操作経路
 *
 * 導出の根拠は「解説/8. テスト設計」を参照。
 * 描画を伴わない V1〜V8 は方式の選択と独立なので validateLoginForm.test.ts にある。
 *
 * 読み比べたときの違い:
 *   ・準備を毎回テスト側に書く。onSubmit のスパイも自分で用意する
 *   ・検証した状態は Storybook に残らない
 *   ・jsdom なので実ブラウザ固有の挙動は保証できない（とくに K1）
 */

type SubmitFn = (values: LoginFormValues) => void | Promise<void>;

const VALID = { email: "user@example.com", password: "password123" };

/** 解決しない Promise。送信中の状態に留めたいときに使う。 */
const never = () => new Promise<void>(() => {});

/** 準備をここに集約する。①では Story の args がこの役割を担っている。 */
function setup(onSubmit: SubmitFn = vi.fn<SubmitFn>()) {
  const spy = vi.fn<SubmitFn>(onSubmit);
  render(<LoginForm onSubmit={spy} />);
  return { onSubmit: spy };
}

async function fillValidValues() {
  await userEvent.type(screen.getByLabelText("メールアドレス"), VALID.email);
  await userEvent.type(screen.getByLabelText("パスワード"), VALID.password);
}

describe("状態遷移（T1〜T6）", () => {
  test("T1 空のまま送信すると両方にエラーが出る", async () => {
    const { onSubmit } = setup();

    await userEvent.click(screen.getByRole("button", { name: "ログイン" }));

    expect(screen.getByText("メールアドレスを入力してください")).toBeInTheDocument();
    expect(screen.getByText("パスワードを入力してください")).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  test("T2 エラー表示後に修正して送信できる", async () => {
    const { onSubmit } = setup();

    await userEvent.click(screen.getByRole("button", { name: "ログイン" }));
    expect(screen.getByText("メールアドレスを入力してください")).toBeInTheDocument();

    await fillValidValues();
    await userEvent.click(screen.getByRole("button", { name: "ログイン" }));

    expect(onSubmit).toHaveBeenCalledWith(VALID);
    expect(screen.queryByText("メールアドレスを入力してください")).not.toBeInTheDocument();
  });

  test("T3 送信中はフォームが操作できない", async () => {
    setup(never);

    await fillValidValues();
    await userEvent.click(screen.getByRole("button", { name: "ログイン" }));

    // 送信中のボタンは disabled ではなく aria-disabled。詳細は Button.tsx を参照。
    expect(await screen.findByRole("button", { name: "送信中…" })).toHaveAttribute(
      "aria-disabled",
      "true",
    );
    expect(screen.getByLabelText("メールアドレス")).toBeDisabled();
    expect(screen.getByLabelText("パスワード")).toBeDisabled();
  });

  test("T4 送信に成功すると操作できる状態に戻る", async () => {
    setup(async () => {});

    await fillValidValues();
    await userEvent.click(screen.getByRole("button", { name: "ログイン" }));

    expect(await screen.findByRole("button", { name: "ログイン" })).toBeInTheDocument();
    expect(screen.getByLabelText("メールアドレス")).toBeEnabled();
  });

  test("T5 送信に失敗するとエラーが出て操作できる状態に戻る", async () => {
    setup(async () => {
      throw new Error("network error");
    });

    await fillValidValues();
    await userEvent.click(screen.getByRole("button", { name: "ログイン" }));

    expect(
      await screen.findByText("送信に失敗しました。時間をおいて再度お試しください。"),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "ログイン" })).toBeInTheDocument();
  });

  /**
   * ガードは UI からは到達できない（送信中は入力欄が無効で Enter が届かない）。
   * 最初は「送信中に Enter を押す」と書いていたが、ガードを消しても通ってしまい、
   * カバレッジで未到達と分かった。submit イベントを直接発火させて検証する。
   */
  test("T6 送信中に submit が再度発火しても二重送信されない", async () => {
    const { onSubmit } = setup(never);

    await fillValidValues();
    await userEvent.click(screen.getByRole("button", { name: "ログイン" }));
    expect(await screen.findByRole("button", { name: "送信中…" })).toBeInTheDocument();

    fireEvent.submit(screen.getByRole("form", { name: "ログイン" }));

    expect(onSubmit).toHaveBeenCalledTimes(1);
  });
});

describe("デシジョンテーブル（D1〜D4）", () => {
  test("D1 両方妥当なら送信される", async () => {
    const { onSubmit } = setup();

    await fillValidValues();
    await userEvent.click(screen.getByRole("button", { name: "ログイン" }));

    expect(onSubmit).toHaveBeenCalledWith(VALID);
  });

  test("D2 パスワードだけ不正ならそちらにだけエラーが出る", async () => {
    const { onSubmit } = setup();

    await userEvent.type(screen.getByLabelText("メールアドレス"), VALID.email);
    await userEvent.type(screen.getByLabelText("パスワード"), "short");
    await userEvent.click(screen.getByRole("button", { name: "ログイン" }));

    expect(screen.getByText("パスワードは8文字以上で入力してください")).toBeInTheDocument();
    expect(screen.queryByText("メールアドレスを入力してください")).not.toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  test("D3 メールアドレスだけ不正ならそちらにだけエラーが出る", async () => {
    const { onSubmit } = setup();

    await userEvent.type(screen.getByLabelText("メールアドレス"), "not-an-email");
    await userEvent.type(screen.getByLabelText("パスワード"), VALID.password);
    await userEvent.click(screen.getByRole("button", { name: "ログイン" }));

    expect(screen.getByText("メールアドレスの形式が正しくありません")).toBeInTheDocument();
    expect(screen.queryByText("パスワードを入力してください")).not.toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  test("D4 両方不正なら両方にエラーが出る", async () => {
    const { onSubmit } = setup();

    await userEvent.click(screen.getByRole("button", { name: "ログイン" }));

    expect(screen.getByText("メールアドレスを入力してください")).toBeInTheDocument();
    expect(screen.getByText("パスワードを入力してください")).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });
});

describe("操作経路（K1）", () => {
  /**
   * ①では実ブラウザで実行される同じケース。
   *
   * jsdom でも書けるが、Tab 順とフォーカスの挙動は user-event が
   * 実装した近似であって、ブラウザの実際の挙動ではない。
   * ここが通ることは、実ブラウザで通ることの保証にならない。
   * この差そのものが方式選択の判断材料になる。
   */
  test("K1 キーボードだけで入力して送信できる", async () => {
    const { onSubmit } = setup();

    await userEvent.tab();
    expect(screen.getByLabelText("メールアドレス")).toHaveFocus();
    await userEvent.keyboard(VALID.email);

    await userEvent.tab();
    expect(screen.getByLabelText("パスワード")).toHaveFocus();
    await userEvent.keyboard(VALID.password);

    await userEvent.tab();
    expect(screen.getByRole("button", { name: "ログイン" })).toHaveFocus();
    await userEvent.keyboard("{Enter}");

    expect(onSubmit).toHaveBeenCalledWith(VALID);
  });
});
