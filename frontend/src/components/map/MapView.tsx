"use client";

import React from "react";
import dynamic from "next/dynamic";
import { clsx } from "clsx";
import { Skeleton } from "@/components/ui/Skeleton";
import type { MapViewInnerProps } from "./MapViewInner";

export type MapViewProps = MapViewInnerProps;

const DynamicMapViewInner = dynamic(() => import("./MapViewInner"), {
  ssr: false,
  loading: () => (
    <Skeleton className="h-48 sm:h-52 w-full rounded-2xl border border-stone-200" />
  ),
});

export function MapView(props: MapViewProps) {
  return (
    <div className={clsx("w-full", props.heightClassName)}>
      <DynamicMapViewInner {...props} />
    </div>
  );
}
