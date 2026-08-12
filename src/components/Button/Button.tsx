import type { ReactNode, Ref } from "react";
import { Button as RacButton } from "react-aria-components";
import { tv, type VariantProps } from "tailwind-variants";

/**
 * React Aria Components をラップし、variant を tailwind-variants で管理する形の実装。
 *
 * デザインシステムの基本コンポーネントでよく採られる方針を一通り含めてある。
 *
 * - variant / size は tailwind-variants（tv）で管理し、型は VariantProps で抽出する
 * - 状態依存のスタイルは RAC の render props を tv の variants に流し込む
 * - props は透過 spread せず、必要な分だけ明示定義する
 * - RAC 固有名は汎用名に変換して公開する（onPress → onClick、isDisabled → disabled）
 * - className は受け取らない。上書きを許可する項目だけを overrides として明示定義する
 * - ref は React 19 の prop 方式（forwardRef 不使用）
 * - 要素差し替えは RAC のコンポジションで行う（asChild は使わない）
 */
const button = tv({
  // leading-* はここに書かないこと。size の text-* が line-height も設定するため、
  // tailwind-merge に競合と判断されて黙って除去される。
  base: "inline-flex items-center justify-center rounded-md border border-transparent font-semibold outline-none",
  variants: {
    variant: {
      primary: "bg-blue-700 text-white",
      secondary: "border-slate-300 bg-white text-slate-800",
      danger: "bg-red-700 text-white",
    },
    size: {
      sm: "px-2.5 py-1 text-xs",
      md: "px-4 py-2 text-sm",
      lg: "px-5 py-3 text-base",
    },
    // ここから下は RAC の render props をそのまま variants として受ける。
    // data-[hovered]: のようなモディファイアでも書けるが、
    // 状態依存のスタイルを tv 側に一元化したいのでこちらに寄せている。
    isHovered: { true: "" },
    isPressed: { true: "" },
    isFocusVisible: { true: "ring-2 ring-blue-500 ring-offset-2" },
    isDisabled: { true: "cursor-not-allowed opacity-60" },
    isPending: { true: "cursor-progress" },
  },
  compoundVariants: [
    { variant: "primary", isHovered: true, isDisabled: false, class: "bg-blue-800" },
    { variant: "primary", isPressed: true, class: "bg-blue-900" },
    { variant: "secondary", isHovered: true, isDisabled: false, class: "bg-slate-100" },
    { variant: "secondary", isPressed: true, class: "bg-slate-200" },
    { variant: "danger", isHovered: true, isDisabled: false, class: "bg-red-800" },
    { variant: "danger", isPressed: true, class: "bg-red-900" },
  ],
  defaultVariants: {
    variant: "primary",
    size: "md",
  },
});

type ButtonVariants = VariantProps<typeof button>;

export type ButtonVariant = NonNullable<ButtonVariants["variant"]>;
export type ButtonSize = NonNullable<ButtonVariants["size"]>;

/**
 * className の上書きを許可する項目。
 *
 * className を無制限に受け取ると、コンポーネントの見た目が呼び出し側から
 * いくらでも壊せてしまう。ここでは「上書き可」と明示した項目に限って許可している。
 * ここに定義していない項目は上書きできない。
 */
export interface ButtonOverrides {
  /** 余白だけは呼び出し側で調整できるようにしている */
  padding?: string;
}

export interface ButtonProps {
  /** 見た目のバリエーション */
  variant?: ButtonVariant;
  /** サイズ */
  size?: ButtonSize;
  /**
   * 無効化。RAC の isDisabled を汎用名で公開している。
   * DOM には `disabled` 属性が付き、フォーカスできなくなる。
   */
  disabled?: boolean;
  /**
   * 処理中。
   *
   * disabled とは挙動が違うので注意すること。
   * DOM に付くのは `aria-disabled="true"` と `data-pending="true"` で、
   * `disabled` 属性は付かない。tabindex は 0 のままでフォーカスできる。
   *
   * 押下は RAC がブロックするので操作はできない。
   * `disabled` 属性を付けてしまうとフォーカスが外れ、
   * スクリーンリーダー利用者は押した直後にボタンを見失う。
   * 処理中を表すならこちらを使う。
   *
   * テストで無効を確認するときは toBeDisabled() ではなく
   * aria-disabled 属性を見ること。
   */
  loading?: boolean;
  /** ボタンの type。既定は 'button'（フォーム内での誤送信を防ぐため） */
  type?: "button" | "submit" | "reset";
  /** 押下時のコールバック。RAC の onPress を汎用名で公開している */
  onClick?: () => void;
  /** 上書きを許可した項目のみ受け取る */
  overrides?: ButtonOverrides;
  /** React 19 の prop 方式。forwardRef は使わない */
  ref?: Ref<HTMLButtonElement>;
  children: ReactNode;
}

export function Button({
  variant,
  size,
  disabled,
  loading = false,
  type = "button",
  onClick,
  overrides,
  ref,
  children,
}: ButtonProps) {
  return (
    <RacButton
      ref={ref}
      type={type}
      isDisabled={disabled}
      isPending={loading}
      onPress={onClick}
      // className に関数を渡すと RAC の状態が render props として届く。
      // それを tv にそのまま流し込むことで、状態依存のスタイルを一元管理できる。
      className={(renderProps) =>
        button({
          variant,
          size,
          isHovered: renderProps.isHovered,
          isPressed: renderProps.isPressed,
          isFocusVisible: renderProps.isFocusVisible,
          isDisabled: renderProps.isDisabled,
          isPending: renderProps.isPending,
          // tv は tailwind-merge を通すので、後勝ちで安全に上書きできる
          class: overrides?.padding,
        })
      }
    >
      {loading ? "送信中…" : children}
    </RacButton>
  );
}
