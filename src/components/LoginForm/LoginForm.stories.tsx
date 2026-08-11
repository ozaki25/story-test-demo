import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn } from 'storybook/test';

import { LoginForm } from './LoginForm';

/**
 * ============================================================
 * このファイルが示す手法
 *   手法① play 関数（Story にテストを同居させる）
 *   手法② 全 Story のスモークテスト
 *   手法③ a11y（axe）
 * ============================================================
 *
 * 3 つの手法が 1 ファイルに同居する。これが Storybook 流の書き方で、
 * 最初は分かりにくいところなので整理しておく。
 *
 *   ・play 関数を書いた Story          → その操作と検証が実行される（手法①）
 *   ・play 関数を書いていない Story    → 描画が通るかだけ検証される（手法②）
 *   ・すべての Story                   → axe が実行される（手法③）
 *
 * つまり Story を書く行為そのものがテストを増やす。play 関数を足すと、
 * 同じ Story が「表示の確認」から「振る舞いの検証」に格上げされる、という関係。
 *
 * ここで書くシナリオ S1〜S3 は、以下の 2 ファイルでも同じ内容を実装している。
 * 読み比べると、手法ごとの記述量と読み口の違いが分かる。
 *   ・LoginForm.portable.test.tsx （手法④ Portable Stories / jsdom）
 *   ・LoginForm.plain.test.tsx    （対照群 素の Testing Library / jsdom）
 */
const meta = {
  title: 'components/LoginForm',
  component: LoginForm,
  args: {
    // fn() は storybook/test のスパイ。
    // Storybook の UI 上では Actions パネルに呼び出しが表示され、
    // テストとして実行されるときは呼び出し引数を検証できる。1 つの定義が両方で機能する。
    onSubmit: fn(),
  },
} satisfies Meta<typeof LoginForm>;

export default meta;

type Story = StoryObj<typeof meta>;

/**
 * play 関数なし。手法②（描画が通るか）と手法③（axe）だけが働く Story。
 * Storybook のサイドバーから見たときの「初期表示はこれ」というカタログも兼ねる。
 */
export const Default: Story = {
  name: '初期表示',
};

/**
 * シナリオ S1: 空のまま submit するとエラーメッセージが出る。
 */
export const EmptySubmitShowsErrors: Story = {
  name: 'S1 空のまま送信するとエラーが出る',
  play: async ({ canvas, userEvent, args, step }) => {
    await step('空のままログインボタンを押す', async () => {
      await userEvent.click(canvas.getByRole('button', { name: 'ログイン' }));
    });

    await step('両方の項目にエラーが表示される', async () => {
      await expect(await canvas.findByText('メールアドレスを入力してください')).toBeInTheDocument();
      await expect(canvas.getByText('パスワードを入力してください')).toBeInTheDocument();
    });

    await step('送信は行われない', async () => {
      await expect(args.onSubmit).not.toHaveBeenCalled();
    });
  },
};

/**
 * シナリオ S2: 正しく入力して submit すると onSubmit が正しい値で呼ばれる。
 */
export const ValidSubmitCallsOnSubmit: Story = {
  name: 'S2 正しく入力して送信すると onSubmit が呼ばれる',
  play: async ({ canvas, userEvent, args, step }) => {
    await step('フォームを入力する', async () => {
      await userEvent.type(canvas.getByLabelText('メールアドレス'), 'user@example.com');
      await userEvent.type(canvas.getByLabelText('パスワード'), 'password123');
    });

    await step('ログインボタンを押す', async () => {
      await userEvent.click(canvas.getByRole('button', { name: 'ログイン' }));
    });

    await step('入力値がそのまま onSubmit に渡る', async () => {
      await expect(args.onSubmit).toHaveBeenCalledWith({
        email: 'user@example.com',
        password: 'password123',
      });
    });
  },
};

/**
 * シナリオ S3: 送信中は入力とボタンが操作できない。
 *
 * onSubmit が解決しない Promise を返すことで、送信中の状態に留める。
 * 「非同期処理の途中の状態」を Story として固定できるのは、
 * args でコンポーネントの外側を差し替えられる Storybook の書き方の利点。
 */
export const SubmittingDisablesForm: Story = {
  name: 'S3 送信中はフォームが操作できない',
  args: {
    onSubmit: fn(() => new Promise<void>(() => {})),
  },
  play: async ({ canvas, userEvent, step }) => {
    await step('正しい値を入力して送信する', async () => {
      await userEvent.type(canvas.getByLabelText('メールアドレス'), 'user@example.com');
      await userEvent.type(canvas.getByLabelText('パスワード'), 'password123');
      await userEvent.click(canvas.getByRole('button', { name: 'ログイン' }));
    });

    await step('ボタンが送信中の表示になり、入力欄も無効になる', async () => {
      await expect(await canvas.findByRole('button', { name: '送信中…' })).toBeDisabled();
      await expect(canvas.getByLabelText('メールアドレス')).toBeDisabled();
      await expect(canvas.getByLabelText('パスワード')).toBeDisabled();
    });
  },
};

/**
 * メールアドレスの形式エラー。S1〜S3 とは別に、
 * 「バリデーション規則ごとに Story を足していける」ことを示す例。
 *
 * 規則が増えるたびに Story が 1 つ増え、テストも 1 つ増える。
 * 同時に Storybook 上ではその状態の見た目がカタログとして残る。
 * この二重取りが、Story を経由してテストを書く一番の動機になる。
 */
export const InvalidEmailFormat: Story = {
  name: 'メールアドレスの形式が不正',
  play: async ({ canvas, userEvent }) => {
    await userEvent.type(canvas.getByLabelText('メールアドレス'), 'not-an-email');
    await userEvent.type(canvas.getByLabelText('パスワード'), 'password123');
    await userEvent.click(canvas.getByRole('button', { name: 'ログイン' }));

    await expect(
      await canvas.findByText('メールアドレスの形式が正しくありません'),
    ).toBeInTheDocument();
  },
};
