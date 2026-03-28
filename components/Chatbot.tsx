"use client";

import { useEffect, useRef, useState } from "react";

type ChatEntry = {
  role: "user" | "bot";
  text: string;
};

const starterPrompts = [
  "Toi muon duoc tu van mo tai khoan doanh nghiep",
  "Giai phap SaaS nao phu hop de van hanh phong tro?",
  "Cho toi xem cac buoc dang ky nhanh",
];

export default function Chatbot() {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [chat, setChat] = useState<ChatEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [chat, loading]);

  const send = async (input?: string) => {
    const nextMessage = (input ?? message).trim();
    if (!nextMessage) return;

    setChat((prev) => [...prev, { role: "user", text: nextMessage }]);
    setMessage("");
    setLoading(true);

    try {
      const res = await fetch("/api/chatbot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: nextMessage }),
      });
      const data = await res.json();
      setChat((prev) => [
        ...prev,
        {
          role: "bot",
          text: data.reply || "Toi da nhan yeu cau. Hay cho toi them mot chut thong tin.",
        },
      ]);
    } catch {
      setChat((prev) => [
        ...prev,
        {
          role: "bot",
          text: "Co loi ket noi tam thoi. Ban co the thu lai sau it phut.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        id="chatbot-toggle"
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="animate-pulse-glow fixed bottom-6 right-6 z-50 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-[var(--gradient-start)] to-[var(--gradient-end)] text-white shadow-[0_18px_45px_rgba(31,77,183,0.28)] hover:scale-105"
        aria-label="Open chatbot"
      >
        <span className="material-symbols-outlined text-[26px]">
          {open ? "close" : "forum"}
        </span>
      </button>

      {open && (
        <div className="animate-slide-in-right fixed bottom-26 right-4 z-50 w-[calc(100vw-2rem)] max-w-[380px] overflow-hidden rounded-[2rem] border border-white/70 bg-white/92 shadow-[0_28px_70px_rgba(16,32,51,0.18)] backdrop-blur-2xl md:right-6">
          <div className="bg-gradient-to-r from-[var(--gradient-start)] via-[#10878f] to-[var(--gradient-end)] px-5 py-5 text-white">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/18">
                  <span className="material-symbols-outlined text-[22px]">smart_toy</span>
                </div>
                <div>
                  <p className="font-headline text-base font-extrabold">Banker Assistant</p>
                  <p className="text-xs text-white/78">
                    Tro ly tu van nhanh ve tai chinh va SaaS
                  </p>
                </div>
              </div>
              <div className="rounded-full bg-white/15 px-2.5 py-1 text-[11px] font-semibold">
                Online
              </div>
            </div>
          </div>

          <div ref={scrollRef} className="max-h-[360px] space-y-4 overflow-y-auto bg-white/80 p-4">
            {chat.length === 0 && (
              <div className="space-y-4">
                <div className="rounded-3xl border border-outline-variant/60 bg-surface-container-low p-4 text-sm leading-7 text-on-surface-variant">
                  Ban co the dat cau hoi nhanh, xin bao gia hoac de he thong huong dan
                  luong dang ky phu hop.
                </div>
                <div className="space-y-2">
                  {starterPrompts.map((prompt) => (
                    <button
                      key={prompt}
                      type="button"
                      onClick={() => send(prompt)}
                      className="flex w-full items-center justify-between rounded-2xl border border-outline-variant/60 bg-white px-4 py-3 text-left text-sm font-medium text-on-surface hover:border-primary/40 hover:bg-primary/5"
                    >
                      <span className="pr-3">{prompt}</span>
                      <span className="material-symbols-outlined text-[18px] text-primary">
                        north_east
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {chat.map((entry, index) => (
              <div
                key={`${entry.role}-${index}`}
                className={`flex ${entry.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[86%] rounded-[1.5rem] px-4 py-3 text-sm leading-7 ${
                    entry.role === "user"
                      ? "rounded-br-md bg-gradient-to-br from-[var(--gradient-start)] to-[var(--gradient-end)] text-white"
                      : "rounded-bl-md border border-outline-variant/60 bg-surface-container-low text-on-surface"
                  }`}
                >
                  {entry.text}
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex justify-start">
                <div className="rounded-[1.5rem] rounded-bl-md border border-outline-variant/60 bg-surface-container-low px-4 py-3">
                  <div className="inline-flex gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-primary/55 animate-bounce" />
                    <span
                      className="h-2 w-2 rounded-full bg-primary/55 animate-bounce"
                      style={{ animationDelay: "120ms" }}
                    />
                    <span
                      className="h-2 w-2 rounded-full bg-primary/55 animate-bounce"
                      style={{ animationDelay: "240ms" }}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="border-t border-outline-variant/60 bg-white/90 p-4">
            <div className="flex items-end gap-2">
              <textarea
                id="chatbot-input"
                rows={1}
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    send();
                  }
                }}
                placeholder="Nhap cau hoi cua ban..."
                className="min-h-[52px] flex-1 rounded-2xl border border-outline-variant/70 bg-surface-container-low px-4 py-3 text-sm text-on-surface outline-none focus:border-primary"
              />
              <button
                id="chatbot-send"
                type="button"
                onClick={() => send()}
                disabled={loading || !message.trim()}
                className="flex h-[52px] w-[52px] items-center justify-center rounded-2xl bg-on-surface text-white hover:bg-primary disabled:cursor-not-allowed disabled:opacity-35"
              >
                <span className="material-symbols-outlined text-[20px]">arrow_upward</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
