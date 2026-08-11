import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { storybookTest } from '@storybook/addon-vitest/vitest-plugin';
import react from '@vitejs/plugin-react';
import { playwright } from '@vitest/browser-playwright';
import { defineConfig } from 'vitest/config';

const dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * 通常は `npx playwright install chromium` で入れたブラウザが使われる。
 *
 * CDN への到達が塞がれている環境（社内プロキシなど）では、
 * 環境側で用意した Chromium を CHROMIUM_EXECUTABLE_PATH で指定して回避できる。
 * 指定がなければ Playwright の既定動作のまま。
 */
const chromiumExecutablePath = process.env.CHROMIUM_EXECUTABLE_PATH;
const launchOptions = chromiumExecutablePath
  ? { executablePath: chromiumExecutablePath }
  : undefined;

/**
 * テストを「実行環境」で 2 つの project に分ける。
 *
 *   storybook … 実ブラウザ（Chromium / Playwright）。Story をそのまま実行する。
 *               手法① play 関数、手法② 全 Story スモークテスト、手法③ a11y がここで動く。
 *   unit      … jsdom。ブラウザを起動しないぶん速い。
 *               手法④ Portable Stories と、対照群の素の Testing Library がここで動く。
 *
 * 分けておくと `--project=storybook` のように片方だけ実行でき、
 * コンポーネントが増えたときに CI での並列化・部分実行がしやすい。
 */
export default defineConfig({
  test: {
    projects: [
      {
        extends: true,
        plugins: [
          // .storybook/main.ts の stories glob に一致する Story を検出し、
          // 1 Story = 1 テストケースとして Vitest に登録する。
          // play 関数があればそれを実行し、なければ描画が通るかだけを見る（＝スモークテスト）。
          storybookTest({ configDir: path.join(dirname, '.storybook') }),
        ],
        test: {
          name: 'storybook',
          browser: {
            enabled: true,
            headless: true,
            provider: playwright({ launchOptions }),
            instances: [{ browser: 'chromium' }],
          },
        },
      },
      {
        extends: true,
        plugins: [react()],
        test: {
          name: 'unit',
          environment: 'jsdom',
          include: ['src/**/*.{portable,plain}.test.{ts,tsx}'],
          setupFiles: ['src/test/setup.unit.ts'],
        },
      },
    ],
  },
});
