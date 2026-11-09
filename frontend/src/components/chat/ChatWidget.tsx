"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowRight, Leaf, Send, X } from "lucide-react";
import { clsx } from "clsx";
import { StatusChip } from "@/components/ui";
import { ApiError, chatbotApi } from "@/lib/api";
import { formatTicket } from "@/lib/format";
import type { ChatHistoryItem, ChatTicketCard } from "@/lib/types";

export const OPEN_CHAT_WIDGET_EVENT = "kw:open-chat-widget";

export function openChatWidget(): void {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(OPEN_CHAT_WIDGET_EVENT));
  }
}

interface ChatMessageItem {
  id: string;
  role: "user" | "assistant";
  content: string;
  tickets?: ChatTicketCard[];
  isError?: boolean;
}

const INITIAL_ASSISTANT_MESSAGE: ChatMessageItem = {
  id: "welcome-msg",
  role: "assistant",
  content: "Halo! Kirim ID tiket untuk mengecek laporan Anda.",
};

const QUICK_CHIPS = [
  { label: "Cek Status Tiket", message: "Cek Status Tiket" },
  { label: "Lupa ID Tiket", message: "Lupa ID Tiket" },
  { label: "Cara Melapor", message: "Cara Melapor" },
] as const;

export interface ChatWidgetProps {
  defaultOpen?: boolean;
}

export function ChatWidget({ defaultOpen = false }: ChatWidgetProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const [messages, setMessages] = useState<ChatMessageItem[]>([
    INITIAL_ASSISTANT_MESSAGE,
  ]);
  const [inputValue, setInputValue] = useState("");
  const [sending, setSending] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (defaultOpen) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setIsOpen(true);
    }
  }, [defaultOpen]);

  useEffect(() => {
    const handleOpenEvent = () => {
      setIsOpen(true);
    };
    window.addEventListener(OPEN_CHAT_WIDGET_EVENT, handleOpenEvent);
    return () => {
      window.removeEventListener(OPEN_CHAT_WIDGET_EVENT, handleOpenEvent);
    };
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, sending, isOpen]);

  const sendChatMessage = useCallback(
    async (rawText: string) => {
      const trimmed = rawText.trim();
      if (!trimmed || sending) return;

      const userMsg: ChatMessageItem = {
        id: `user-${Date.now()}`,
        role: "user",
        content: trimmed.slice(0, 500),
      };

      const historyPayload: ChatHistoryItem[] = messages
        .filter((m) => !m.isError)
        .slice(-6)
        .map((m) => ({
          role: m.role,
          content: m.content,
        }));

      setMessages((prev) => [...prev, userMsg]);
      setInputValue("");
      setSending(true);

      try {
        const res = await chatbotApi.sendMessage({
          message: userMsg.content,
          history: historyPayload,
        });

        const assistantMsg: ChatMessageItem = {
          id: `assistant-${Date.now()}`,
          role: "assistant",
          content: res.reply,
          tickets: res.tickets && res.tickets.length > 0 ? res.tickets : undefined,
        };

        setMessages((prev) => [...prev, assistantMsg]);
      } catch (err) {
        let friendlyError =
          "Maaf, asisten AI sedang mengalami kendala koneksi. Silakan coba beberapa saat lagi atau gunakan kotak Lacak Laporan di halaman ini.";

        if (err instanceof ApiError && err.status === 429) {
          friendlyError =
            "Anda mengirim terlalu banyak pesan dalam waktu singkat. Mohon tunggu sekitar satu menit sebelum mengirim pesan kembali.";
        } else if (err instanceof ApiError && err.message) {
          friendlyError = err.message;
        }

        const errorBubble: ChatMessageItem = {
          id: `error-${Date.now()}`,
          role: "assistant",
          content: friendlyError,
          isError: true,
        };

        setMessages((prev) => [...prev, errorBubble]);
      } finally {
        setSending(false);
      }
    },
    [messages, sending]
  );

  function handleFormSubmit(e: React.FormEvent) {
    e.preventDefault();
    sendChatMessage(inputValue);
  }

  return (
    <>
      {/* Panel Chat (Desktop 380px di kanan bawah, Mobile hampir layar penuh) */}
      {isOpen && (
        <section
          aria-label="Panel Asisten AI KawalWarga"
          className="fixed inset-x-0 bottom-0 top-0 z-50 flex flex-col overflow-hidden bg-stone-50 shadow-2xl sm:inset-auto sm:bottom-20 sm:right-5 sm:h-[560px] sm:max-h-[calc(100vh-6.5rem)] sm:w-[380px] sm:rounded-2xl sm:border sm:border-stone-200"
        >
          {/* Header Hijau Tua */}
          <div className="flex items-center justify-between gap-3 bg-emerald-800 px-4 py-3.5 text-white">
            <div className="flex items-center gap-3 min-w-0">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-emerald-600/70 bg-emerald-700/80">
                <Leaf className="h-5 w-5 text-white" aria-hidden="true" />
              </div>
              <div className="min-w-0">
                <h2 className="truncate text-sm font-bold text-white">
                  Asisten KawalWarga
                </h2>
                <p className="truncate text-xs text-emerald-100">
                  AI untuk membantu Anda
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsOpen(false)}
              aria-label="Tutup panel asisten AI"
              className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-emerald-100 transition-colors hover:bg-emerald-700/70 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
            >
              <X className="h-5 w-5" aria-hidden="true" />
            </button>
          </div>

          {/* Baris Chip Cepat */}
          <div className="border-b border-stone-200 bg-white px-4 py-3 space-y-2">
            <p className="text-[11px] font-medium text-stone-500">
              Mulai dengan pertanyaan cepat
            </p>
            <div className="flex flex-wrap gap-1.5">
              {QUICK_CHIPS.map((chip) => (
                <button
                  key={chip.label}
                  type="button"
                  disabled={sending}
                  onClick={() => sendChatMessage(chip.message)}
                  className="rounded-full border border-emerald-200 bg-emerald-50/70 px-3 py-1 text-xs font-semibold text-emerald-900 transition-colors hover:bg-emerald-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 disabled:opacity-50"
                >
                  {chip.label}
                </button>
              ))}
            </div>
          </div>

          {/* Area Pesan */}
          <div className="flex-1 space-y-3 overflow-y-auto px-4 py-3.5">
            <p className="text-center text-[11px] text-stone-400">
              Hari ini · 10.45 WIB
            </p>

            {messages.map((msg) => {
              if (msg.role === "user") {
                return (
                  <div key={msg.id} className="flex justify-end">
                    <div className="max-w-[85%] rounded-2xl rounded-tr-sm bg-emerald-800 px-3.5 py-2.5 text-xs sm:text-sm leading-relaxed text-white shadow-2xs">
                      {msg.content}
                    </div>
                  </div>
                );
              }

              // Bubble asisten yang membawa kartu tiket (tickets[])
              if (msg.tickets && msg.tickets.length > 0) {
                if (msg.tickets.length === 1) {
                  const ticket = msg.tickets[0];
                  const firstSentenceEnd = msg.content.indexOf(".");
                  const headline =
                    firstSentenceEnd > 0
                      ? msg.content.slice(0, firstSentenceEnd + 1)
                      : `Laporan ${formatTicket(ticket.ticket_id)} (${ticket.title})`;
                  const detailBody =
                    firstSentenceEnd > 0
                      ? msg.content.slice(firstSentenceEnd + 1).trim()
                      : msg.content;

                  return (
                    <div key={msg.id} className="flex justify-start">
                      <div className="w-full max-w-[92%] space-y-2.5 rounded-2xl border border-stone-200 bg-white p-3.5 text-xs sm:text-sm text-stone-800 shadow-2xs">
                        <p className="font-medium text-stone-900">{headline}</p>

                        <div>
                          <StatusChip status={ticket.status} size="sm" />
                        </div>

                        {detailBody && (
                          <p className="leading-relaxed text-stone-700">
                            {detailBody}
                          </p>
                        )}

                        <div className="pt-0.5">
                          <Link
                            href={`/lacak?id=${encodeURIComponent(ticket.ticket_id)}`}
                            className="inline-flex items-center gap-1 text-xs font-bold text-emerald-800 hover:text-emerald-950 hover:underline"
                          >
                            <span>Lihat detail laporan</span>
                            <ArrowRight
                              className="h-3.5 w-3.5"
                              aria-hidden="true"
                            />
                          </Link>
                        </div>
                      </div>
                    </div>
                  );
                }

                // Lebih dari 1 tiket (mis. pencarian via nomor WhatsApp)
                return (
                  <div key={msg.id} className="space-y-2">
                    <div className="max-w-[90%] rounded-2xl rounded-tl-sm border border-stone-200 bg-white px-3.5 py-2.5 text-xs sm:text-sm leading-relaxed text-stone-800 shadow-2xs">
                      {msg.content}
                    </div>

                    <div className="space-y-2 pl-1">
                      {msg.tickets.map((ticket) => (
                        <div
                          key={ticket.ticket_id}
                          className="max-w-[92%] space-y-2 rounded-2xl border border-stone-200 bg-white p-3.5 text-xs shadow-2xs"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-extrabold text-emerald-800">
                              {formatTicket(ticket.ticket_id)}
                            </span>
                            <StatusChip status={ticket.status} size="sm" />
                          </div>
                          <p className="font-semibold text-stone-900">
                            {ticket.title}
                          </p>
                          <Link
                            href={`/lacak?id=${encodeURIComponent(ticket.ticket_id)}`}
                            className="inline-flex items-center gap-1 font-bold text-emerald-800 hover:text-emerald-950 hover:underline"
                          >
                            <span>Lihat detail laporan</span>
                            <ArrowRight
                              className="h-3.5 w-3.5"
                              aria-hidden="true"
                            />
                          </Link>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              }

              // Bubble asisten biasa / pesan error ramah
              return (
                <div key={msg.id} className="flex justify-start">
                  <div
                    className={clsx(
                      "max-w-[88%] rounded-2xl rounded-tl-sm border px-3.5 py-2.5 text-xs sm:text-sm leading-relaxed shadow-2xs",
                      msg.isError
                        ? "border-rose-200 bg-rose-50 text-rose-900"
                        : "border-stone-200 bg-white text-stone-800"
                    )}
                  >
                    {msg.content}
                  </div>
                </div>
              );
            })}

            {/* Indikator Mengetik (3 Titik) */}
            {sending && (
              <div className="flex justify-start" aria-live="polite">
                <div className="inline-flex items-center gap-1.5 rounded-2xl rounded-tl-sm border border-stone-200 bg-white px-4 py-3 shadow-2xs">
                  <span className="sr-only">Asisten AI sedang mengetik...</span>
                  <span className="h-2 w-2 animate-bounce rounded-full bg-emerald-600 [animation-delay:-0.3s]" />
                  <span className="h-2 w-2 animate-bounce rounded-full bg-emerald-600 [animation-delay:-0.15s]" />
                  <span className="h-2 w-2 animate-bounce rounded-full bg-emerald-600" />
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input Area & Catatan Kaki */}
          <div className="border-t border-stone-200 bg-white px-3.5 pb-2.5 pt-3 space-y-1.5">
            <form
              onSubmit={handleFormSubmit}
              className="flex items-center gap-2 rounded-xl border border-stone-200 bg-stone-50/70 px-3.5 py-1.5 focus-within:border-emerald-600 focus-within:bg-white focus-within:ring-2 focus-within:ring-emerald-600/20"
            >
              <input
                ref={inputRef}
                type="text"
                maxLength={500}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="Tulis pesan Anda..."
                aria-label="Tulis pesan kepada asisten AI"
                className="h-8 flex-1 bg-transparent text-xs sm:text-sm text-stone-900 placeholder:text-stone-400 focus:outline-none"
              />
              <button
                type="submit"
                disabled={!inputValue.trim() || sending}
                aria-label="Kirim pesan"
                className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-emerald-700 transition-colors hover:bg-emerald-50 hover:text-emerald-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <Send className="h-4 w-4" aria-hidden="true" />
              </button>
            </form>

            <p className="text-center text-[10px] text-stone-400">
              AI dapat keliru. Keputusan laporan oleh instansi.
            </p>
          </div>
        </section>
      )}

      {/* Tombol Melayang "Tanya AI" */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-expanded={isOpen}
        aria-label="Buka asisten Tanya AI"
        className="fixed bottom-5 right-5 z-40 inline-flex h-12 items-center gap-2 rounded-full bg-emerald-800 px-5 text-xs sm:text-sm font-bold text-white shadow-lg transition-all hover:bg-emerald-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2"
      >
        <Leaf className="h-4 w-4 text-emerald-200" aria-hidden="true" />
        <span>Tanya AI</span>
      </button>
    </>
  );
}
