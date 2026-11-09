import React from "react";
import clsx from "clsx";

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  rounded?: "sm" | "md" | "lg" | "xl" | "2xl" | "full";
}

const roundedClasses: Record<NonNullable<SkeletonProps["rounded"]>, string> = {
  sm: "rounded-sm",
  md: "rounded-md",
  lg: "rounded-lg",
  xl: "rounded-xl",
  "2xl": "rounded-2xl",
  full: "rounded-full",
};

export function Skeleton({
  rounded = "xl",
  className,
  ...props
}: SkeletonProps) {
  return (
    <div
      aria-hidden="true"
      className={clsx(
        "animate-pulse bg-stone-200/80",
        roundedClasses[rounded],
        className
      )}
      {...props}
    />
  );
}

export function CardSkeleton({ className }: { className?: string }) {
  return (
    <div
      aria-busy="true"
      aria-label="Memuat konten..."
      className={clsx(
        "rounded-2xl border border-stone-200 bg-white p-5 md:p-6 shadow-xs space-y-4",
        className
      )}
    >
      <div className="flex items-center justify-between gap-4">
        <Skeleton className="h-5 w-24" rounded="full" />
        <Skeleton className="h-4 w-20" />
      </div>
      <Skeleton className="h-44 w-full" rounded="xl" />
      <div className="space-y-2">
        <Skeleton className="h-5 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
      </div>
      <Skeleton className="h-11 w-full" rounded="xl" />
    </div>
  );
}
