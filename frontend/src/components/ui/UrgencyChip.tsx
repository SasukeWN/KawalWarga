import React from "react";
import clsx from "clsx";
import { URGENCY_CONFIG, type ReportUrgency } from "@/lib/labels";

export interface UrgencyChipProps {
  urgency: ReportUrgency;
  label?: string;
  size?: "sm" | "md";
  className?: string;
}

export function UrgencyChip({
  urgency,
  label,
  size = "md",
  className,
}: UrgencyChipProps) {
  const config = URGENCY_CONFIG[urgency] ?? URGENCY_CONFIG.sedang;
  const displayLabel = label ?? config.label;

  return (
    <span
      className={clsx(
        "inline-flex items-center justify-center rounded-lg whitespace-nowrap",
        size === "sm" ? "px-2 py-0.5 text-[11px]" : "px-2.5 py-1 text-xs",
        config.bgClass,
        config.textClass,
        config.weightClass,
        className
      )}
    >
      {displayLabel}
    </span>
  );
}
