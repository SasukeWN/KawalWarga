"use client";

import React from "react";
import clsx from "clsx";
import { Loader2, Lock } from "lucide-react";

export type ButtonVariant =
  | "primary"
  | "secondary"
  | "danger-outline"
  | "ghost";

export type ButtonSize = "sm" | "md" | "lg";

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  loading?: boolean;
  fullWidth?: boolean;
  showLockWhenDisabled?: boolean;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    "bg-emerald-700 text-white hover:bg-emerald-800 border border-transparent shadow-xs",
  secondary:
    "bg-white text-emerald-800 border border-stone-200 hover:bg-stone-50",
  "danger-outline":
    "bg-white text-rose-700 border border-rose-300 hover:bg-rose-50",
  ghost:
    "bg-transparent text-emerald-800 hover:bg-stone-100 border border-transparent",
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: "h-10 px-3.5 text-xs rounded-xl",
  md: "h-12 px-5 text-sm rounded-xl",
  lg: "h-13 px-6 text-base rounded-xl",
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  function Button(
    {
      variant = "primary",
      size = "md",
      icon,
      rightIcon,
      loading = false,
      disabled = false,
      fullWidth = false,
      showLockWhenDisabled = false,
      className,
      children,
      type = "button",
      ...props
    },
    ref
  ) {
    const isDisabled = disabled || loading;

    const leftElement = loading ? (
      <Loader2 className="h-4 w-4 shrink-0 animate-spin" aria-hidden="true" />
    ) : disabled && showLockWhenDisabled ? (
      <Lock className="h-4 w-4 shrink-0" aria-hidden="true" />
    ) : icon ? (
      <span className="shrink-0 flex items-center" aria-hidden="true">
        {icon}
      </span>
    ) : null;

    return (
      <button
        ref={ref}
        type={type}
        disabled={isDisabled}
        className={clsx(
          "relative inline-flex items-center justify-center gap-2.5 font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-1",
          sizeClasses[size],
          fullWidth && "w-full",
          isDisabled
            ? "bg-stone-200 text-stone-500 border border-stone-200 cursor-not-allowed shadow-none"
            : variantClasses[variant],
          className
        )}
        {...props}
      >
        {leftElement}
        <span>{children}</span>
        {!loading && rightIcon && (
          <span className="shrink-0 flex items-center" aria-hidden="true">
            {rightIcon}
          </span>
        )}
      </button>
    );
  }
);
