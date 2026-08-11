/// <reference types="vitest/config" />
import path from "node:path";
import { fileURLToPath } from "node:url";

import { storybookTest } from "@storybook/addon-vitest/vitest-plugin";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { playwright } from "@vitest/browser-playwright";
import { defineConfig } from "vite";

const dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Vite と Vitest の設定を 1 ファイルにまとめている。
 *
 * storybook init が生成するのもこの形。
 * vite.config.ts と vitest.config.ts に分けると、Storybook は前者、テストは後者を読むため、
 * alias や plugin を片方にだけ足したときに「Storybook では解決できるがテストでは落ちる」が起きる。
 * 設定を 1 か所に集約して、その食い違いを構造的に防いでいる。
 */

/**
 * 通常は `npx playwright install chromium` で入れたブラウザが使われる。
 *
 * CDN への到達が塞がれている環境（社内プロキシなど）では、
 * 環境側で用意した Chromium を CHROMIUM_EXECUTABLE_PATH で指定して回避できる。
 */
const chromiumExecutablePath = process.env.CHROMIUM_EXECUTABLE_PATH;
const launchOptions = chromiumExecutablePath
  ? { executablePath: chromiumExecutablePath }
  : undefined;

export default defineConfig({
  plugins: [react(), tailwindcss()],

  resolve: {
    alias: {
      "@": path.join(dirname, "src"),
    },
  },

  /**
   * テストを「実行環境」で 2 つの project に分ける。
   *
   *   storybook … 実ブラウザ（Chromium / Playwright）。Story をそのまま実行する。
   *               手法① play 関数、手法② 全 Story スモークテスト、手法③ a11y がここで動く。
   *   unit      … jsdom。ブラウザを起動しないぶん速い。
   *               手法④ Portable Stories と、対照群の素の Testing Library がここで動く。
   *
   * `--project=storybook` のように片方だけ実行できるので、
   * コンポーネントが増えたときに CI での並列化・部分実行がしやすい。
   */
  test: {
    projects: [
      {
        extends: true,
        plugins: [
          // .storybook/main.ts の stories glob に一致する Story を検出し、
          // 1 Story = 1 テストケースとして Vitest に登録する。
          // play 関数があればそれを実行し、なければ描画が通るかだけを見る（＝スモークテスト）。
          storybookTest({ configDir: path.join(dirname, ".storybook") }),
        ],
        test: {
          name: "storybook",
          browser: {
            enabled: true,
            headless: true,
            provider: playwright({ launchOptions }),
            instances: [{ browser: "chromium" }],
          },
        },
      },
      {
        extends: true,
        test: {
          name: "unit",
          environment: "jsdom",
          // 手法別のサフィックス（.portable / .plain）で絞り込まないこと。
          // 絞り込むと、規約から外れた名前のテストファイルが警告もなく無視され、
          // 「書いたのに一度も実行されていないテスト」が生まれる。
          // 手法単位で実行したいときは、実行時にファイル名で絞る
          // （npm run test:portable / test:plain を参照）。
          include: ["src/**/*.test.{ts,tsx}"],
          setupFiles: ["src/test/setup.unit.ts"],
        },
      },
    ],

    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      include: ["src/components/**/*.{ts,tsx}"],
      exclude: ["src/**/*.stories.tsx", "src/**/*.test.{ts,tsx}", "src/**/index.ts"],
    },
  },
});
