import React from "react";
import clsx from "clsx";
import { Inbox } from "lucide-react";

export interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={clsx(
        "flex flex-col items-center justify-center rounded-2xl border border-stone-200 bg-white px-6 py-12 text-center shadow-xs",
        className
      )}
    >
      <div
        className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 text-emerald-700"
        aria-hidden="true"
      >
        {icon ?? <Inbox className="h-6 w-6" />}
      </div>
      <h3 className="text-base md:text-lg font-bold text-stone-900">{title}</h3>
      {description && (
        <p className="mt-1.5 max-w-md text-sm text-stone-600">{description}</p>
      )}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
