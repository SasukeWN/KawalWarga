import React from "react";
import clsx from "clsx";
import { Check } from "lucide-react";
import type { ReportStatus } from "@/lib/labels";

const STEPS: { key: Exclude<ReportStatus, "ditolak">; label: string }[] = [
  { key: "menunggu_verifikasi", label: "Menunggu Verifikasi" },
  { key: "menunggu_penanganan", label: "Menunggu Penanganan" },
  { key: "diproses", label: "Diproses" },
  { key: "selesai", label: "Selesai" },
];

export interface StepperProps {
  status: ReportStatus;
  className?: string;
}

export function Stepper({ status, className }: StepperProps) {
  if (status === "ditolak") {
    return null;
  }

  const activeIndex = STEPS.findIndex((step) => step.key === status);

  return (
    <ol
      aria-label="Tahapan penanganan laporan"
      className={clsx(
        "grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-4 md:gap-4",
        className
      )}
    >
      {STEPS.map((step, index) => {
        const isCompleted = status === "selesai" || index < activeIndex;
        const isActive = status !== "selesai" && index === activeIndex;

        return (
          <li key={step.key} className="flex items-center gap-3">
            <span
              className={clsx(
                "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold transition-colors",
                isCompleted || isActive
                  ? "bg-emerald-700 text-white"
                  : "bg-stone-200 text-stone-600"
              )}
              aria-current={isActive ? "step" : undefined}
            >
              {isCompleted ? (
                <Check className="h-4 w-4 stroke-[2.5]" aria-hidden="true" />
              ) : (
                index + 1
              )}
            </span>
            <span
              className={clsx(
                "text-xs md:text-sm",
                isCompleted || isActive
                  ? "font-bold text-emerald-900"
                  : "font-medium text-stone-500"
              )}
            >
              {step.label}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
