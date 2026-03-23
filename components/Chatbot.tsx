"use client";
import { useState, useRef, useEffect } from "react";

export default function Chatbot() {
  const [open, setOpen] = useState(false);
  const [msg, setMsg] = useState("");
  const [chat, setChat] = useState<{ role: "user" | "bot"; text: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [chat]);

  const send = async () => {
    if (!msg.trim()) return;
    const userMsg = msg.trim();
    setChat((prev) => [...prev, { role: "user", text: userMsg }]);
    setMsg("");
    setLoading(true);

    try {
      const res = await fetch("/api/chatbot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userMsg }),
      });
      const data = await res.json();
      setChat((prev) => [...prev, { role: "bot", text: data.reply }]);
    } catch {
      setChat((prev) => [...prev, { role: "bot", text: "Xin lỗi, có lỗi xảy ra. Vui lòng thử lại." }]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  return (
    <>
      {/* Toggle Button */}
      <button
        id="chatbot-toggle"
        onClick={() => setOpen(!open)}
        className="fixed bottom-6 right-6 w-14 h-14 rounded-full bg-gradient-to-br from-[var(--gradient-start)] to-[var(--gradient-end)] text-white flex items-center justify-center shadow-xl shadow-blue-500/30 hover:scale-110 transition-transform cursor-pointer z-50 animate-pulse-glow"
      >
        {open ? "✕" : "💬"}
      </button>

      {/* Chat Panel */}
      {open && (
        <div className="fixed bottom-24 right-6 w-[360px] glass rounded-2xl shadow-2xl z-50 animate-slide-in-right overflow-hidden glow">
          {/* Header */}
          <div className="bg-gradient-to-r from-[var(--gradient-start)] to-[var(--gradient-end)] px-5 py-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center text-lg">🤖</div>
              <div>
                <div className="font-semibold text-white text-sm">Banker Bot</div>
                <div className="text-[10px] text-white/60 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block"></span>
                  Online
                </div>
              </div>
            </div>
          </div>

          {/* Messages */}
          <div ref={scrollRef} className="h-[280px] overflow-y-auto p-4 space-y-3">
            {chat.length === 0 && (
              <div className="text-center text-[var(--muted)] text-sm mt-8">
                <div className="text-3xl mb-2">👋</div>
                <p>Xin chào! Tôi có thể giúp gì cho bạn?</p>
              </div>
            )}
            {chat.map((c, i) => (
              <div
                key={i}
                className={`flex ${c.role === "user" ? "justify-end" : "justify-start"} animate-fade-in-up`}
              >
                <div
                  className={`max-w-[80%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                    c.role === "user"
                      ? "bg-gradient-to-r from-[var(--gradient-start)] to-[var(--gradient-end)] text-white rounded-tr-sm"
                      : "bg-[var(--surface-hover)] text-[var(--foreground)] rounded-tl-sm"
                  }`}
                >
                  {c.text}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start animate-fade-in-up">
                <div className="bg-[var(--surface-hover)] px-4 py-2.5 rounded-2xl rounded-tl-sm text-sm">
                  <span className="inline-flex gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-[var(--muted)] animate-bounce" style={{ animationDelay: "0ms" }}></span>
                    <span className="w-1.5 h-1.5 rounded-full bg-[var(--muted)] animate-bounce" style={{ animationDelay: "150ms" }}></span>
                    <span className="w-1.5 h-1.5 rounded-full bg-[var(--muted)] animate-bounce" style={{ animationDelay: "300ms" }}></span>
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Input */}
          <div className="border-t border-[var(--border)] p-3">
            <div className="flex items-center gap-2">
              <input
                id="chatbot-input"
                value={msg}
                onChange={(e) => setMsg(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Nhập tin nhắn..."
                className="flex-1 px-4 py-2.5 rounded-xl bg-[var(--surface)] border border-[var(--border)] text-sm text-[var(--foreground)] placeholder:text-[var(--muted)]/50 focus:outline-none focus:border-[var(--primary)] transition-all"
              />
              <button
                id="chatbot-send"
                onClick={send}
                disabled={loading || !msg.trim()}
                className="w-10 h-10 rounded-xl bg-gradient-to-r from-[var(--gradient-start)] to-[var(--gradient-end)] text-white flex items-center justify-center hover:opacity-90 transition-all disabled:opacity-40 cursor-pointer"
              >
                ➤
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
