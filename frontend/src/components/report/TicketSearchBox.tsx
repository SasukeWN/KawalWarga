"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { normalizeTicketInput } from "@/lib/format";

export interface TicketSearchBoxProps {
  initialValue?: string;
  placeholder?: string;
  buttonLabel?: string;
  label?: string | null;
  showForgotHelp?: boolean;
  variant?: "stacked" | "inline";
  onSearch?: (normalizedTicketId: string) => void;
}

export function TicketSearchBox({
  initialValue = "",
  placeholder = "Contoh: #ADU-891",
  buttonLabel,
  label,
  showForgotHelp,
  variant = "stacked",
  onSearch,
}: TicketSearchBoxProps) {
  const router = useRouter();
  const [ticketInput, setTicketInput] = useState(initialValue);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTicketInput(initialValue);
  }, [initialValue]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const normalized = normalizeTicketInput(ticketInput);
    if (!normalized) {
      setErrorMsg("Masukkan ID tiket laporan Anda terlebih dahulu.");
      return;
    }
    setErrorMsg(null);
    if (onSearch) {
      onSearch(normalized);
    } else {
      router.push(`/lacak/?id=${encodeURIComponent(normalized)}`);
    }
  }

  if (variant === "inline") {
    const resolvedLabel =
      label === undefined ? "Masukkan ID tiket Anda" : label;
    const resolvedButtonLabel = buttonLabel || "Lacak";
    const shouldShowHelp = showForgotHelp ?? true;

    return (
      <form onSubmit={handleSubmit} className="space-y-2.5">
        {resolvedLabel && (
          <label
            htmlFor="kw-ticket-inline-input"
            className="block text-xs sm:text-sm font-bold text-stone-900"
          >
            {resolvedLabel}
          </label>
        )}

        <div className="flex items-center gap-2.5">
          <div className="relative flex-1">
            <Search
              className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-500"
              aria-hidden="true"
            />
            <input
              id="kw-ticket-inline-input"
              type="text"
              value={ticketInput}
              onChange={(e) => {
                setTicketInput(e.target.value);
                if (errorMsg) setErrorMsg(null);
              }}
              placeholder={placeholder}
              aria-label="ID tiket laporan"
              className="h-11 w-full rounded-xl border border-stone-200 bg-white pl-10 pr-4 text-sm font-semibold text-stone-900 placeholder:font-normal placeholder:text-stone-400 focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-600/20"
            />
          </div>
          <button
            type="submit"
            className="inline-flex h-11 shrink-0 items-center justify-center rounded-xl bg-emerald-700 px-5 text-sm font-semibold text-white transition-colors hover:bg-emerald-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600"
          >
            <span>{resolvedButtonLabel}</span>
          </button>
        </div>

        {errorMsg && (
          <p className="text-xs font-medium text-rose-600" role="alert">
            {errorMsg}
          </p>
        )}

        {shouldShowHelp && (
          <p className="text-xs text-stone-500">
            Lupa ID tiket? Gunakan bantuan{" "}
            <Link
              href="/tanya-ai"
              className="font-medium text-stone-600 underline decoration-stone-300 transition-colors hover:text-emerald-800"
            >
              Tanya AI.
            </Link>
          </p>
        )}
      </form>
    );
  }

  const resolvedStackedLabel = label === undefined ? "ID tiket" : label;
  const resolvedStackedButton = buttonLabel || "Lacak Laporan";

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="space-y-1.5">
        {resolvedStackedLabel && (
          <label
            htmlFor="kw-ticket-search-input"
            className="block text-xs font-bold text-stone-900"
          >
            {resolvedStackedLabel}
          </label>
        )}
        <input
          id="kw-ticket-search-input"
          type="text"
          value={ticketInput}
          onChange={(e) => {
            setTicketInput(e.target.value);
            if (errorMsg) setErrorMsg(null);
          }}
          placeholder={placeholder}
          className="h-11 w-full rounded-xl border border-stone-200 bg-white px-3.5 text-sm text-stone-900 placeholder:text-stone-400 focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-600/20"
        />
        {errorMsg && (
          <p className="text-xs font-medium text-rose-600" role="alert">
            {errorMsg}
          </p>
        )}
      </div>

      <button
        type="submit"
        className="relative flex h-11 w-full items-center justify-center rounded-xl border border-stone-200 bg-white px-4 text-xs sm:text-sm font-semibold text-stone-900 transition-colors hover:bg-stone-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600"
      >
        <span className="absolute left-4 flex items-center text-emerald-700">
          <Search className="h-4 w-4" aria-hidden="true" />
        </span>
        <span>{resolvedStackedButton}</span>
      </button>
    </form>
  );
}
