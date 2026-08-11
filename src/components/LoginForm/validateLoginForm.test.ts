import { describe, expect, test } from "vitest";

import { validateLoginForm } from "./LoginForm";

/**
 * ============================================================
 * V1〜V8: 同値分割と境界値分析
 * ============================================================
 *
 * このファイルは、どの方式を採用しても残る。
 *
 * ①（Story に書く）と対照群（素の Testing Library に書く）は競合していて、
 * どちらかを採用すればもう一方は消える。
 * だがこのファイルは描画を伴わない純粋関数のテストなので、その選択と独立している。
 *
 * だから *.plain.test.tsx の中には置かない。
 * 置いてしまうと、①を採用して対照群を消したときに巻き添えで消える。
 *
 * パスワードは 8 文字が境界なので、7 と 8 を必ず含める。
 * 「短い例」と「十分長い例」を 1 つずつ置くだけでは、
 * `<` と `<=` の取り違えを検出できない。
 */
describe("validateLoginForm", () => {
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
