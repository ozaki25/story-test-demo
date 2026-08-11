import { setProjectAnnotations } from "@storybook/react";
import { cleanup } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { afterEach, beforeAll } from "vitest";

import * as previewAnnotations from "../../.storybook/preview";

import { cleanupStories } from "./portable";

/**
 * unit project（jsdom）のセットアップ。
 *
 * storybook project（実ブラウザ）側は @storybook/addon-vitest が同等のセットアップを
 * 自動注入するため、この設定は jsdom 側にだけ必要になる。
 */

/**
 * 1. jsdom に navigator.clipboard を補う。
 *
 * Storybook は play 関数の引数に userEvent を注入するとき、
 * globalThis.window.navigator.clipboard の存在を条件にしている
 * （storybook/dist/csf の enhanceContext）。
 * jsdom 30 には clipboard が無いため、補わないと context.userEvent が undefined になり、
 * Portable Stories で play 関数を再実行したときだけ
 * 「userEvent.click is not a function」で落ちる。
 *
 * Story 側で storybook/test の userEvent を import して回避することもできるが、
 * その方針だと import を書き忘れた Story が
 * 「実ブラウザでは通るが jsdom だけ落ちる」状態になり、Story が増えるほど事故が増える。
 * 環境差はここ 1 箇所で吸収し、Story は標準の書き方（play の引数から受け取る）に統一する。
 */
if (!globalThis.navigator.clipboard) {
  Object.defineProperty(globalThis.navigator, "clipboard", {
    value: {
      read: async () => [],
      readText: async () => "",
      write: async () => {},
      writeText: async () => {},
    },
    configurable: true,
  });
}

/**
 * 2. .storybook/preview.tsx のアノテーションを jsdom 側にも適用する。
 *
 * ここが Portable Stories の要。
 * preview.tsx に書いた decorators / parameters / globals を composeStories に伝えている。
 * 繋いでいないと decorator が適用されず、
 * 「Storybook 上では動くのにテストだけ落ちる」という状態になる。
 * コンポーネントが増えるほど効いてくるので、最初に必ず入れておく。
 */
const annotations = setProjectAnnotations([previewAnnotations]);

beforeAll(annotations.beforeAll);

/**
 * 3. テストごとに描画結果を破棄する。
 *
 * Testing Library は globals: true のときだけ afterEach を自動登録するため、
 * この設定では明示的に呼ぶ必要がある。忘れると前のテストの DOM が残り、
 * 「Found multiple elements」で落ちる。
 *
 * cleanup       … render() が作ったコンテナを片付ける
 * cleanupStories … runStory() が作ったコンテナを片付ける
 */
afterEach(() => {
  cleanup();
  cleanupStories();
});
