import React from "react";
import clsx from "clsx";

export interface EyebrowProps extends React.HTMLAttributes<HTMLParagraphElement> {
  children: React.ReactNode;
}

export function Eyebrow({ className, children, ...props }: EyebrowProps) {
  return (
    <p
      className={clsx(
        "text-xs font-bold uppercase tracking-wider text-emerald-700",
        className
      )}
      {...props}
    >
      {children}
    </p>
  );
}

export interface PageHeadingProps {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  className?: string;
}

export function PageHeading({
  eyebrow,
  title,
  subtitle,
  actions,
  className,
}: PageHeadingProps) {
  return (
    <div
      className={clsx(
        "flex flex-col gap-3 md:flex-row md:items-end md:justify-between",
        className
      )}
    >
      <div className="space-y-1.5">
        {eyebrow && <Eyebrow>{eyebrow}</Eyebrow>}
        <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-stone-900">
          {title}
        </h1>
        {subtitle && (
          <p className="text-sm md:text-base text-stone-600 max-w-2xl">
            {subtitle}
          </p>
        )}
      </div>
      {actions && <div className="shrink-0">{actions}</div>}
    </div>
  );
}
