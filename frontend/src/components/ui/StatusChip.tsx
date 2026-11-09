import React from "react";
import clsx from "clsx";
import { STATUS_CONFIG, type ReportStatus } from "@/lib/labels";

export interface StatusChipProps {
  status: ReportStatus;
  label?: string;
  size?: "sm" | "md";
  className?: string;
}

export function StatusChip({
  status,
  label,
  size = "md",
  className,
}: StatusChipProps) {
  const config = STATUS_CONFIG[status] ?? STATUS_CONFIG.menunggu_verifikasi;
  const displayLabel = label ?? config.label;

  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1.5 rounded-full border font-semibold whitespace-nowrap",
        size === "sm" ? "px-2.5 py-0.5 text-[11px]" : "px-3 py-1 text-xs",
        config.bgClass,
        config.textClass,
        config.borderClass,
        className
      )}
    >
      <span
        className={clsx("h-1.5 w-1.5 rounded-full shrink-0", config.dotClass)}
        aria-hidden="true"
      />
      <span>{displayLabel}</span>
    </span>
  );
}
