import { render, screen } from "@testing-library/react";
// このファイルは Portable Stories を使わないので、素の user-event がそのまま動く。
// 同じファイルに Portable Stories を持ち込むと壊れる。詳細は「解説/5. 落とし穴」を参照。
import userEvent from "@testing-library/user-event";
import { describe, expect, test, vi } from "vitest";

import { Button } from "./Button";

/**
 * ============================================================
 * このファイルの位置づけ: 対照群
 * ============================================================
 *
 * Button.portable.test.tsx と同じ内容を、Story を使わずに書いたもの。
 *
 * 読み比べると差がはっきりする。
 * Story 経由では「処理中」「無効」といった状態が Story として名前を持っていて、
 * テストはそれを指すだけで済む。こちらは状態を毎回 props で組み立て直している。
 *
 * 状態の種類が増えるほど、この組み立てがテスト側に積み上がる。
 * 一方で、Storybook のカタログに載せる価値のない検証はこちらのほうが素直に書ける。
 */
describe("Button（Story を使わない素の Testing Library）", () => {
  test("クリックすると onClick が呼ばれる", async () => {
    const onClick = vi.fn<() => void>();
    render(<Button onClick={onClick}>ボタン</Button>);

    await userEvent.click(screen.getByRole("button", { name: "ボタン" }));

    expect(onClick).toHaveBeenCalledTimes(1);
  });

  test("loading のときは無効になり、ラベルが差し替わる", () => {
    render(
      <Button loading onClick={vi.fn<() => void>()}>
        ボタン
      </Button>,
    );

    const button = screen.getByRole("button", { name: "送信中…" });
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute("aria-busy", "true");
  });

  test("disabled のときはクリックしても onClick が呼ばれない", async () => {
    const onClick = vi.fn<() => void>();
    render(
      <Button disabled onClick={onClick}>
        ボタン
      </Button>,
    );

    await userEvent.click(screen.getByRole("button", { name: "ボタン" }));

    expect(onClick).not.toHaveBeenCalled();
  });

  test("既定の type は button（フォーム内での誤送信を防ぐ）", () => {
    render(<Button>ボタン</Button>);

    expect(screen.getByRole("button")).toHaveAttribute("type", "button");
  });
});
