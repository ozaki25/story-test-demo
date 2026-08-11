import { composeStories } from '@storybook/react';
import { render, screen } from '@testing-library/react';
// userEvent と fn（スパイ）は @testing-library/user-event や vitest ではなく
// storybook/test から取る。理由はファイル末尾の「テストユーティリティの import 元について」を参照。
import { fn, userEvent } from 'storybook/test';
import { describe, expect, test } from 'vitest';

import { runStory } from '../../test/portable';

import * as stories from './LoginForm.stories';

/**
 * ============================================================
 * このファイルが示す手法
 *   手法④ Portable Stories（jsdom）
 * ============================================================
 *
 * composeStories は Story ファイルの各 export を、そのまま描画できる React コンポーネントに変換する。
 * このとき args・decorators・parameters（.storybook/preview.tsx の分を含む）が適用される。
 * preview.tsx を読み込む配線は src/test/setup.unit.ts の setProjectAnnotations が担っている。
 *
 * ブラウザを起動しないので実行が速い。一方でレイアウトや実ブラウザ固有の挙動は検証できない。
 *
 * このファイルでは 2 つの使い方を書き分けている。用途が違うので混同しないこと。
 *
 *   使い方 A: Story の play 関数を jsdom でそのまま再実行する
 *             → テストコードを書かずにテストが増える。Story を書けば済む。
 *   使い方 B: Story を「入力の定義」として再利用し、検証はテスト側に書く
 *             → Story に載せたくない細かい検証を、Story の状態を土台にして書ける。
 */
const { Default, EmptySubmitShowsErrors, ValidSubmitCallsOnSubmit, SubmittingDisablesForm } =
  composeStories(stories);

describe('使い方A: Story の play 関数を jsdom で再実行する', () => {
  /**
   * テストの中身をここには書いていない。検証はすべて Story 側の play 関数にある。
   *
   * runStory は Story の run()（描画 + play の実行）をテストごとに独立したコンテナで
   * 呼ぶヘルパー。render() を併用すると二重にマウントされるので、こちらだけを使う。
   *
   * これで同じ検証が実ブラウザ（storybook project）と jsdom（unit project）の
   * 両方で走る。普段は速い jsdom で回し、CI では実ブラウザでも回す、といった
   * 使い分けができる。Story を 1 つ足せば、両方のテストが同時に増える。
   */
  test('S1 空のまま送信するとエラーが出る', async () => {
    await runStory(EmptySubmitShowsErrors);
  });

  test('S2 正しく入力して送信すると onSubmit が呼ばれる', async () => {
    await runStory(ValidSubmitCallsOnSubmit);
  });

  test('S3 送信中はフォームが操作できない', async () => {
    await runStory(SubmittingDisablesForm);
  });
});

describe('使い方B: Story を入力の定義として再利用し、検証はテスト側に書く', () => {
  /**
   * Story の args を土台にしつつ、props を上書きして検証を差し替える。
   * 「この検証は Storybook のカタログに載せるほどではない」ものを書く場所になる。
   */
  test('S2 送信後もフォームの値は保持される', async () => {
    const onSubmit = fn();
    render(<Default onSubmit={onSubmit} />);

    await userEvent.type(screen.getByLabelText('メールアドレス'), 'user@example.com');
    await userEvent.type(screen.getByLabelText('パスワード'), 'password123');
    await userEvent.click(screen.getByRole('button', { name: 'ログイン' }));

    expect(onSubmit).toHaveBeenCalledWith({
      email: 'user@example.com',
      password: 'password123',
    });
    expect(screen.getByLabelText('メールアドレス')).toHaveValue('user@example.com');
  });

  test('エラー表示後に入力を直して再送信できる', async () => {
    const onSubmit = fn();
    render(<Default onSubmit={onSubmit} />);

    await userEvent.click(screen.getByRole('button', { name: 'ログイン' }));
    expect(screen.getByText('メールアドレスを入力してください')).toBeInTheDocument();

    await userEvent.type(screen.getByLabelText('メールアドレス'), 'user@example.com');
    await userEvent.type(screen.getByLabelText('パスワード'), 'password123');
    await userEvent.click(screen.getByRole('button', { name: 'ログイン' }));

    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(screen.queryByText('メールアドレスを入力してください')).not.toBeInTheDocument();
  });

  /**
   * .storybook/preview.tsx の decorator が jsdom 側にも適用されていることの確認。
   *
   * このテストが落ちるときは setProjectAnnotations の配線が切れている。
   * コンポーネントが増えてから気付くと原因の特定が面倒なので、
   * 配線そのものを検証するテストを 1 本置いている。
   */
  test('preview.tsx の decorator が適用されている', () => {
    render(<Default />);
    expect(screen.getByTestId('preview-frame')).toBeInTheDocument();
  });
});

/**
 * ============================================================
 * テストユーティリティの import 元について（重要）
 * ============================================================
 *
 * ■ userEvent
 *
 * このファイルの userEvent は storybook/test から import している。
 * @testing-library/user-event を直接使うと、次の経路で落ちる。
 *
 *   HTMLElement.get [as focus]  storybook/dist/csf/index.js
 *   patchFocus                  @testing-library/user-event/.../patchFocus.js
 *   setupDirect                 @testing-library/user-event/.../setup.js
 *   TypeError: 'get ownerDocument' called on an object that is not a valid instance of Node.
 *
 * Storybook は HTMLElement.prototype.focus をゲッターに差し替えている。
 * そのゲッターは this.ownerDocument を参照するため、
 * user-event の patchFocus がプロトタイプ上のディスクリプタを読んだ瞬間に
 * 「Node ではないオブジェクトで ownerDocument が呼ばれた」となる。
 *
 * つまり Portable Stories を実行したファイルの中で
 * 素の @testing-library/user-event を使うと壊れる。
 * Vitest はファイル単位で環境を分離するので、Story を使わないファイル
 * （LoginForm.plain.test.tsx）では素の user-event がそのまま動く。
 * 「動くファイルと動かないファイルがある」状態になるのが厄介なところ。
 *
 * storybook/test の userEvent は Storybook 側で用意された同じインスタンスなので、
 * 二重パッチが起きず、実ブラウザ側の play 関数とも挙動が揃う。
 * Portable Stories を採用するなら、プロジェクト全体で
 * storybook/test の userEvent に統一しておくのが安全。
 *
 * ■ fn（スパイ）
 *
 * onSubmit のスパイも vi.fn() ではなく storybook/test の fn() を使っている。
 * composeStories が返す Story の props 型は、Story 側の args（storybook/test の fn()）に
 * 由来する Mock 型になる。vi.fn() を渡すと、別コピーの @vitest/spy を指すため
 * 型エラーになる（実行はできるが tsc が通らない）。
 *
 *   Type 'Mock<Procedure>' is not assignable to type 'Mock<Procedure> | undefined'.
 *
 * Story の args を上書きするときは、Story 側と同じ fn() を使う。
 *
 * 確認したバージョン: storybook 10.5.7 / vitest 4.1.10 /
 * @testing-library/user-event 14.6.3 / jsdom 30.0.1
 */
