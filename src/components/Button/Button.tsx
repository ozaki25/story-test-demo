import type { ButtonHTMLAttributes, ReactNode } from 'react';

export type ButtonVariant = 'primary' | 'secondary' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'type'> {
  /** 見た目のバリエーション */
  variant?: ButtonVariant;
  /** サイズ */
  size?: ButtonSize;
  /** 処理中。true の間は押せなくなり、スクリーンリーダーには aria-busy で伝わる */
  loading?: boolean;
  /** ボタンの type。既定は 'button'（フォーム内での誤送信を防ぐため） */
  type?: 'button' | 'submit' | 'reset';
  children: ReactNode;
}

/**
 * props と状態の組み合わせだけで見た目が決まる、副作用のないコンポーネント。
 *
 * この手の「見た目のバリエーションが多いが振る舞いは薄い」コンポーネントは、
 * play 関数を書くよりも Story を並べて全 Story スモークテスト（手法②）に
 * 任せるほうが費用対効果が高い。その例として使っている。
 */
export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  type = 'button',
  disabled,
  children,
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      className={`btn btn--${variant} btn--${size}`}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...rest}
    >
      {loading ? '送信中…' : children}
    </button>
  );
}
