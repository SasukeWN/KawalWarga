import React from "react";
import clsx from "clsx";

export type CardVariant = "default" | "mint" | "ai" | "warning" | "danger";
export type CardPadding = "none" | "sm" | "md" | "lg";

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: CardVariant;
  padding?: CardPadding;
  as?: "div" | "section" | "article" | "aside";
}

const variantClasses: Record<CardVariant, string> = {
  default: "bg-white border border-stone-200 text-stone-900 shadow-xs",
  mint: "bg-emerald-50 border border-emerald-200 text-stone-900",
  ai: "bg-teal-50 border border-teal-200 text-stone-900",
  warning: "bg-amber-50 border border-amber-200 text-amber-900",
  danger: "bg-rose-50 border border-rose-300 text-rose-900",
};

const paddingClasses: Record<CardPadding, string> = {
  none: "",
  sm: "p-4",
  md: "p-5 md:p-6",
  lg: "p-6 md:p-8",
};

export function Card({
  variant = "default",
  padding = "md",
  as: Component = "div",
  className,
  children,
  ...props
}: CardProps) {
  return (
    <Component
      className={clsx(
        "rounded-2xl",
        variantClasses[variant],
        paddingClasses[padding],
        className
      )}
      {...props}
    >
      {children}
    </Component>
  );
}
