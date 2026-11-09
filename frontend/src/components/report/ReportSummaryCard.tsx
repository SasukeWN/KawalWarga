import React from "react";
import { Card, StatusChip, Stepper } from "@/components/ui";
import { formatDateTime, formatTicket } from "@/lib/format";
import type { TrackedReport } from "@/lib/types";

export interface ReportSummaryCardProps {
  report: TrackedReport;
}

export function ReportSummaryCard({ report }: ReportSummaryCardProps) {
  const categoryText = report.category_label
    ? `Kategori ${report.category_label}`
    : "Kategori menunggu verifikasi";

  return (
    <Card className="space-y-4 p-5 sm:p-6">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xs text-stone-500">
            Laporan {formatTicket(report.ticket_id)}
          </p>
          <h2 className="mt-0.5 text-xl font-extrabold tracking-tight text-stone-900 sm:text-2xl">
            {report.title}
          </h2>
          <div className="mt-2 sm:hidden">
            <StatusChip status={report.status} size="sm" />
          </div>
        </div>

        <div className="hidden shrink-0 sm:block">
          <StatusChip status={report.status} size="sm" />
        </div>
      </div>

      <p className="text-xs text-stone-600">
        Diterima {formatDateTime(report.received_at)} · {categoryText}
      </p>

      {report.status !== "ditolak" && (
        <Stepper status={report.status} className="pt-1" />
      )}
    </Card>
  );
}
