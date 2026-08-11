import type { ButtonHTMLAttributes, ReactNode } from "react";

export type ButtonVariant = "primary" | "secondary" | "danger";
export type ButtonSize = "sm" | "md" | "lg";

export interface ButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "type"> {
  /** 見た目のバリエーション */
  variant?: ButtonVariant;
  /** サイズ */
  size?: ButtonSize;
  /** 処理中。true の間は押せなくなり、スクリーンリーダーには aria-busy で伝わる */
  loading?: boolean;
  /** ボタンの type。既定は 'button'（フォーム内での誤送信を防ぐため） */
  type?: "button" | "submit" | "reset";
  children: ReactNode;
}

/**
 * Tailwind のクラスは、バリアントごとにオブジェクトへ切り出す。
 *
 * テンプレートリテラルで組み立てると、Tailwind がクラス名を静的に抽出できず、
 * 本番ビルドでスタイルが落ちる。完全なクラス名を値として持たせるのが必須。
 */
const BASE_CLASS =
  "inline-flex items-center justify-center rounded-md border border-transparent font-semibold leading-tight cursor-pointer disabled:cursor-not-allowed disabled:opacity-60";

const VARIANT_CLASS: Record<ButtonVariant, string> = {
  primary: "bg-blue-700 text-white enabled:hover:bg-blue-800",
  secondary: "bg-white text-slate-800 border-slate-300 enabled:hover:bg-slate-100",
  danger: "bg-red-700 text-white enabled:hover:bg-red-800",
};

const SIZE_CLASS: Record<ButtonSize, string> = {
  sm: "px-2.5 py-1 text-xs",
  md: "px-4 py-2 text-sm",
  lg: "px-5 py-3 text-base",
};

/**
 * props と状態の組み合わせだけで見た目が決まる、副作用のないコンポーネント。
 *
 * この手の「見た目のバリエーションが多いが振る舞いは薄い」コンポーネントは、
 * play 関数を書くよりも Story を並べて全 Story スモークテスト（手法②）に
 * 任せるほうが費用対効果が高い。その例として使っている。
 */
export function Button({
  variant = "primary",
  size = "md",
  loading = false,
  type = "button",
  disabled,
  children,
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      className={`${BASE_CLASS} ${VARIANT_CLASS[variant]} ${SIZE_CLASS[size]}`}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...rest}
    >
      {loading ? "送信中…" : children}
    </button>
  );
}
