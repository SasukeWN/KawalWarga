"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/layout";
import { Skeleton } from "@/components/ui";
import { useAuth } from "@/lib/auth";

function OfficerGuardSkeleton() {
  return (
    <div className="flex min-h-screen w-full bg-stone-50">
      <div className="hidden w-[260px] shrink-0 border-r border-stone-200 p-4 lg:flex lg:flex-col lg:justify-between">
        <div className="space-y-6">
          <Skeleton className="h-10 w-36 rounded-xl" />
          <div className="space-y-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-10 w-full rounded-xl" />
            <Skeleton className="h-10 w-full rounded-xl" />
          </div>
        </div>
        <Skeleton className="h-24 w-full rounded-2xl" />
      </div>
      <div className="flex flex-1 flex-col">
        <div className="flex h-16 items-center justify-between border-b border-stone-200 bg-white px-4 md:px-8">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-9 w-9 rounded-full" />
        </div>
        <div className="mx-auto w-full max-w-6xl space-y-6 px-4 py-8 md:px-8">
          <Skeleton className="h-4 w-36" />
          <Skeleton className="h-9 w-80" />
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <Skeleton className="h-48 w-full rounded-2xl" />
            <Skeleton className="h-48 w-full rounded-2xl" />
            <Skeleton className="h-48 w-full rounded-2xl" />
          </div>
        </div>
      </div>
    </div>
  );
}

export function PetugasGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { user, isReady } = useAuth();

  useEffect(() => {
    if (!isReady) return;
    if (!user) {
      router.replace("/masuk");
      return;
    }
    if (user.role !== "petugas") {
      router.replace("/admin");
    }
  }, [isReady, user, router]);

  if (!isReady || !user || user.role !== "petugas") {
    return <OfficerGuardSkeleton />;
  }

  return <AppShell role="petugas">{children}</AppShell>;
}
