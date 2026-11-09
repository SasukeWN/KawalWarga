"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";
import clsx from "clsx";
import { Check, TriangleAlert, Info, X } from "lucide-react";

export type ToastVariant = "success" | "error" | "info";

export interface ToastItem {
  id: string;
  message: string;
  description?: string;
  variant: ToastVariant;
}

export interface ShowToastOptions {
  message: string;
  description?: string;
  variant?: ToastVariant;
  durationMs?: number;
}

export interface ToastContextValue {
  showToast: (options: ShowToastOptions | string) => void;
  success: (message: string, description?: string) => void;
  error: (message: string, description?: string) => void;
  info: (message: string, description?: string) => void;
  dismissToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const showToast = useCallback(
    (options: ShowToastOptions | string) => {
      const normalized: ShowToastOptions =
        typeof options === "string" ? { message: options } : options;
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      const item: ToastItem = {
        id,
        message: normalized.message,
        description: normalized.description,
        variant: normalized.variant ?? "success",
      };

      setToasts((prev) => [...prev, item]);

      const duration = normalized.durationMs ?? 3500;
      if (duration > 0) {
        window.setTimeout(() => {
          dismissToast(id);
        }, duration);
      }
    },
    [dismissToast]
  );

  const value = useMemo<ToastContextValue>(
    () => ({
      showToast,
      success: (message, description) =>
        showToast({ message, description, variant: "success" }),
      error: (message, description) =>
        showToast({ message, description, variant: "error" }),
      info: (message, description) =>
        showToast({ message, description, variant: "info" }),
      dismissToast,
    }),
    [showToast, dismissToast]
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        aria-live="polite"
        aria-atomic="true"
        className="pointer-events-none fixed bottom-4 right-4 z-50 flex w-full max-w-sm flex-col gap-2 px-4 sm:px-0"
      >
        {toasts.map((item) => {
          const isError = item.variant === "error";
          const isInfo = item.variant === "info";
          return (
            <div
              key={item.id}
              role="status"
              className={clsx(
                "pointer-events-auto flex items-start gap-3 rounded-2xl border p-4 shadow-lg transition-all",
                isError
                  ? "border-rose-300 bg-rose-50 text-rose-900"
                  : isInfo
                  ? "border-stone-200 bg-white text-stone-900"
                  : "border-emerald-200 bg-emerald-50 text-stone-900"
              )}
            >
              <span
                className={clsx(
                  "mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full",
                  isError
                    ? "bg-rose-200 text-rose-800"
                    : isInfo
                    ? "bg-stone-100 text-stone-700"
                    : "bg-emerald-700 text-white"
                )}
                aria-hidden="true"
              >
                {isError ? (
                  <TriangleAlert className="h-3.5 w-3.5" />
                ) : isInfo ? (
                  <Info className="h-3.5 w-3.5" />
                ) : (
                  <Check className="h-3.5 w-3.5" />
                )}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold">{item.message}</p>
                {item.description && (
                  <p className="mt-0.5 text-xs text-stone-600">
                    {item.description}
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={() => dismissToast(item.id)}
                aria-label="Tutup notifikasi"
                className="rounded-lg p-1 text-stone-500 hover:bg-black/5 hover:text-stone-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error("useToast harus digunakan di dalam <ToastProvider>.");
  }
  return ctx;
}
