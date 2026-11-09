import React from "react";
import clsx from "clsx";

export type StatDotColor = "emerald" | "stone" | "orange" | "rose" | "amber";

export interface StatCardProps {
  label: string;
  value: string | number;
  helperText?: string;
  dotColor?: StatDotColor;
  className?: string;
}

const dotColorClasses: Record<StatDotColor, string> = {
  emerald: "bg-emerald-600",
  stone: "bg-stone-500",
  orange: "bg-orange-600",
  rose: "bg-rose-600",
  amber: "bg-amber-500",
};

export function StatCard({
  label,
  value,
  helperText,
  dotColor = "emerald",
  className,
}: StatCardProps) {
  return (
    <div
      className={clsx(
        "flex flex-col justify-between rounded-2xl border border-stone-200 bg-white p-5 shadow-xs",
        className
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs md:text-sm font-medium text-stone-600">{label}</p>
        <span
          className={clsx(
            "mt-1 h-2 w-2 shrink-0 rounded-full",
            dotColorClasses[dotColor]
          )}
          aria-hidden="true"
        />
      </div>
      <p className="my-3 text-3xl md:text-4xl font-extrabold tracking-tight text-stone-900">
        {value}
      </p>
      {helperText && (
        <p className="text-xs text-stone-500 leading-relaxed">{helperText}</p>
      )}
    </div>
  );
}
