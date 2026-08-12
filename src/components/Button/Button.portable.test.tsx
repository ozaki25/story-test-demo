import { composeStories } from "@storybook/react";
import { render, screen } from "@testing-library/react";
import { fn, userEvent } from "storybook/test";
import { describe, expect, test } from "vitest";

import { runStory } from "@/test/portable";

import * as stories from "./Button.stories";

/**
 * ============================================================
 * このファイルが示す手法
 *   手法④ Portable Stories（jsdom）
 * ============================================================
 *
 * Button の Story には play 関数が 1 つもない。
 * それでも Portable Stories として jsdom から再利用できる。
 *
 * この場合の runStory は「描画が通るか」の検証になる。
 * 実ブラウザ側（手法②のスモークテスト）と同じ内容を、
 * ブラウザを起動せずに回していることになる。
 *
 * 速度が要るなら jsdom 側だけを回し、確からしさが要るなら実ブラウザ側も回す、
 * という使い分けが Story 1 つで両立する。
 */
const { Primary, Secondary, Danger, Small, Large, Disabled, Loading } = composeStories(stories);

describe("使い方A: Story をそのまま jsdom で描画する", () => {
  test.each([
    ["Primary", Primary],
    ["Secondary", Secondary],
    ["Danger", Danger],
    ["Small", Small],
    ["Large", Large],
    ["Disabled", Disabled],
    ["Loading", Loading],
  ])("%s が描画できる", async (_name, Story) => {
    const canvas = await runStory(Story);
    expect(canvas.querySelector("button")).toBeInTheDocument();
  });
});

describe("使い方B: Story を入力の定義として再利用し、検証はテスト側に書く", () => {
  test("処理中の Story はラベルが差し替わり、押下できなくなる", async () => {
    await runStory(Loading);

    const button = screen.getByRole("button", { name: "送信中…" });
    expect(button).toHaveAttribute("aria-disabled", "true");
    expect(button).toHaveAttribute("data-pending", "true");
    // disabled 属性は付かない。詳細は Button.tsx の loading prop のコメントを参照。
    expect(button).not.toBeDisabled();
  });

  test("Story の args を上書きして onClick を検証する", async () => {
    const onClick = fn();
    render(<Primary onClick={onClick} />);

    await userEvent.click(screen.getByRole("button", { name: "ボタン" }));

    expect(onClick).toHaveBeenCalledTimes(1);
  });

  test("無効の Story ではクリックしても onClick が呼ばれない", async () => {
    const onClick = fn();
    render(<Disabled onClick={onClick} />);

    await userEvent.click(screen.getByRole("button", { name: "ボタン" }));

    expect(onClick).not.toHaveBeenCalled();
  });
});
