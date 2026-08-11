import { useId, useState, type FormEvent } from "react";

import { Button } from "../Button";

export interface LoginFormValues {
  email: string;
  password: string;
}

export interface LoginFormProps {
  /**
   * 送信時に呼ばれる。Promise を返すと、解決するまで送信中の状態になる。
   * このデモではネットワーク通信を持たせていないので、API 呼び出しは呼び出し元の責務。
   */
  onSubmit: (values: LoginFormValues) => void | Promise<void>;
}

export type LoginFormErrors = Partial<Record<keyof LoginFormValues, string>>;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PASSWORD_MIN_LENGTH = 8;

/**
 * バリデーション規則を関数として切り出しておく。
 * コンポーネントの内部状態に依存しないので、規則そのものを直接テストできる。
 */
export function validateLoginForm(values: LoginFormValues): LoginFormErrors {
  const errors: LoginFormErrors = {};

  if (values.email.trim() === "") {
    errors.email = "メールアドレスを入力してください";
  } else if (!EMAIL_PATTERN.test(values.email)) {
    errors.email = "メールアドレスの形式が正しくありません";
  }

  if (values.password === "") {
    errors.password = "パスワードを入力してください";
  } else if (values.password.length < PASSWORD_MIN_LENGTH) {
    errors.password = `パスワードは${PASSWORD_MIN_LENGTH}文字以上で入力してください`;
  }

  return errors;
}

/**
 * 入力・バリデーション・非同期の送信中状態を持つコンポーネント。
 *
 * 「ユーザーが操作した結果どうなるか」を検証する対象なので、
 * 4 つの手法すべてで同じシナリオ（S1〜S3）を書き比べる題材にしている。
 */
export function LoginForm({ onSubmit }: LoginFormProps) {
  const id = useId();
  const emailId = `${id}-email`;
  const passwordId = `${id}-password`;

  const [values, setValues] = useState<LoginFormValues>({ email: "", password: "" });
  const [errors, setErrors] = useState<LoginFormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const nextErrors = validateLoginForm(values);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit(values);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    // noValidate が重要。
    // これを付けないと、実ブラウザで動かすテスト（storybook project）では
    // ブラウザ標準のバリデーションが submit を止めてしまい、
    // 自前のエラー表示まで到達しない。jsdom では標準バリデーションが動かないため、
    // 付け忘れると「jsdom では通るのにブラウザでは落ちる」という差になって現れる。
    <form
      className="flex max-w-xs flex-col gap-4"
      onSubmit={handleSubmit}
      noValidate
      aria-label="ログイン"
    >
      <div className="flex flex-col gap-1">
        <label className="text-xs font-semibold" htmlFor={emailId}>
          メールアドレス
        </label>
        <input
          className="rounded-md border border-slate-300 px-2.5 py-2 text-sm aria-invalid:border-red-700"
          id={emailId}
          name="email"
          type="email"
          autoComplete="username"
          value={values.email}
          onChange={(event) => setValues((prev) => ({ ...prev, email: event.target.value }))}
          aria-invalid={errors.email !== undefined}
          aria-describedby={errors.email !== undefined ? `${emailId}-error` : undefined}
          disabled={isSubmitting}
        />
        {errors.email !== undefined && (
          <p className="text-xs text-red-700" id={`${emailId}-error`} role="alert">
            {errors.email}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-xs font-semibold" htmlFor={passwordId}>
          パスワード
        </label>
        <input
          className="rounded-md border border-slate-300 px-2.5 py-2 text-sm aria-invalid:border-red-700"
          id={passwordId}
          name="password"
          type="password"
          autoComplete="current-password"
          value={values.password}
          onChange={(event) => setValues((prev) => ({ ...prev, password: event.target.value }))}
          aria-invalid={errors.password !== undefined}
          aria-describedby={errors.password !== undefined ? `${passwordId}-error` : undefined}
          disabled={isSubmitting}
        />
        {errors.password !== undefined && (
          <p className="text-xs text-red-700" id={`${passwordId}-error`} role="alert">
            {errors.password}
          </p>
        )}
      </div>

      <Button type="submit" loading={isSubmitting}>
        ログイン
      </Button>
    </form>
  );
}
