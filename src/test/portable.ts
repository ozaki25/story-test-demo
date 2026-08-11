import { afterEach } from 'vitest';

/**
 * Portable Stories の run() をテストから使うための小さなヘルパー。
 *
 * composeStories が返す Story の run() は、描画と play 関数の実行をまとめて行う。
 * ただし canvasElement を渡さない場合、Storybook 内部のコンテナが document.body に残る。
 * 同じファイルで Testing Library の render() を併用すると、
 * screen（document.body 全体を対象にする）のクエリが両方を拾って
 * 「Found multiple elements」で落ちる。
 *
 * テストごとに独立したコンテナを渡し、後始末までを引き受けることでこれを防ぐ。
 * Story とテストが増えても互いに干渉しない。
 */
type RunnableStory = {
  run: (context?: { canvasElement?: HTMLElement }) => Promise<void>;
};

const mountedCanvases = new Set<HTMLElement>();

afterEach(() => {
  for (const canvas of mountedCanvases) {
    canvas.remove();
  }
  mountedCanvases.clear();
});

/**
 * Story を独立したコンテナに描画し、その play 関数を実行する。
 *
 * @returns 描画先のコンテナ。追加で検証したいときに within() の対象として使える。
 */
export async function runStory(story: RunnableStory): Promise<HTMLElement> {
  const canvasElement = document.createElement('div');
  document.body.appendChild(canvasElement);
  mountedCanvases.add(canvasElement);

  await story.run({ canvasElement });

  return canvasElement;
}
