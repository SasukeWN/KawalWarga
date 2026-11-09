"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { normalizeTicketInput } from "@/lib/format";

export interface TicketSearchBoxProps {
  initialValue?: string;
  placeholder?: string;
  buttonLabel?: string;
  variant?: "stacked" | "inline";
  onSearch?: (normalizedTicketId: string) => void;
}

export function TicketSearchBox({
  initialValue = "",
  placeholder = "Contoh: #ADU-891",
  buttonLabel = "Lacak Laporan",
  variant = "stacked",
  onSearch,
}: TicketSearchBoxProps) {
  const router = useRouter();
  const [ticketInput, setTicketInput] = useState(initialValue);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

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
    return (
      <form onSubmit={handleSubmit} className="space-y-1.5">
        <div className="flex flex-col gap-2.5 sm:flex-row">
          <div className="relative flex-1">
            <Search
              className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400"
              aria-hidden="true"
            />
            <input
              type="text"
              value={ticketInput}
              onChange={(e) => {
                setTicketInput(e.target.value);
                if (errorMsg) setErrorMsg(null);
              }}
              placeholder={placeholder}
              aria-label="ID tiket laporan"
              className="h-11 w-full rounded-xl border border-stone-200 bg-white pl-10 pr-4 text-sm text-stone-900 placeholder:text-stone-400 focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-600/20"
            />
          </div>
          <button
            type="submit"
            className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-emerald-700 px-5 text-sm font-semibold text-white transition-colors hover:bg-emerald-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600"
          >
            <Search className="h-4 w-4" aria-hidden="true" />
            <span>{buttonLabel}</span>
          </button>
        </div>
        {errorMsg && (
          <p className="text-xs font-medium text-rose-600" role="alert">
            {errorMsg}
          </p>
        )}
      </form>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="space-y-1.5">
        <label
          htmlFor="kw-ticket-search-input"
          className="block text-xs font-bold text-stone-900"
        >
          ID tiket
        </label>
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
        <span>{buttonLabel}</span>
      </button>
    </form>
  );
}
