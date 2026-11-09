import React from "react";
import clsx from "clsx";
import { formatDateTime } from "@/lib/format";
import type { TimelineEventType } from "@/lib/labels";

export interface TimelineEntry {
  event: TimelineEventType | string;
  title: string;
  description: string;
  at: string;
}

export interface TimelineProps {
  items: TimelineEntry[];
  className?: string;
}

export function Timeline({ items, className }: TimelineProps) {
  if (!items || items.length === 0) {
    return (
      <p className="text-sm text-stone-500">Belum ada riwayat perkembangan.</p>
    );
  }

  return (
    <ol className={clsx("space-y-5", className)}>
      {items.map((item, index) => {
        const isLatest = index === 0;
        return (
          <li
            key={`${item.event}-${item.at}-${index}`}
            className="relative flex items-start gap-3"
          >
            <span
              className={clsx(
                "mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full",
                isLatest ? "bg-emerald-700" : "bg-stone-300"
              )}
              aria-hidden="true"
            />
            <div className="min-w-0 flex-1 space-y-0.5">
              <p className="text-sm font-bold text-stone-900">{item.title}</p>
              <p className="text-xs text-stone-500">
                {formatDateTime(item.at)}
              </p>
              <p className="pt-0.5 text-sm text-stone-600">
                {item.description}
              </p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
