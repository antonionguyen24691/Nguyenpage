"use client";
import { useState, useCallback, useRef } from "react";

const STEPS = [
  { id: 1, label: "Thông tin", icon: "👤" },
  { id: 2, label: "Dịch vụ", icon: "📋" },
  { id: 3, label: "Gửi yêu cầu", icon: "✉️" },
];

const SERVICES = [
  { value: "Loan", label: "🏦 Khoản vay", desc: "Vay cá nhân, tín dụng, thế chấp" },
  { value: "Account", label: "💳 Tài khoản", desc: "Mở tài khoản, thẻ ngân hàng" },
  { value: "SaaS", label: "🚀 SaaS", desc: "Giải pháp phần mềm doanh nghiệp" },
];

export default function MultiStepForm() {
  const [step, setStep] = useState(1);
  const [data, setData] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const update = useCallback((field: string, value: string) => {
    setData((prev) => ({ ...prev, [field]: value }));
  }, []);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate size (e.g. max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        alert("Hình ảnh quá lớn, vui lòng chọn file dưới 5MB");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        update("image", reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const next = () => setStep((s) => Math.min(s + 1, 3));
  const prev = () => setStep((s) => Math.max(s - 1, 1));

  const submit = async () => {
    setLoading(true);
    try {
      await fetch("/api/form", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      setDone(true);
    } catch {
      alert("Có lỗi xảy ra, vui lòng thử lại.");
    } finally {
      setLoading(false);
    }
  };

  if (done) {
    return (
      <div className="glass rounded-2xl p-10 max-w-lg mx-auto text-center animate-fade-in-up glow">
        <div className="text-5xl mb-4">🎉</div>
        <h3 className="text-2xl font-bold gradient-text mb-2">Gửi thành công!</h3>
        <p className="text-[var(--muted)]">Chúng tôi sẽ liên hệ bạn trong thời gian sớm nhất.</p>
        <button
          onClick={() => { setDone(false); setStep(1); setData({}); }}
          className="mt-6 px-6 py-2.5 rounded-full bg-[var(--surface-hover)] text-sm font-medium hover:bg-[var(--border)] transition-all cursor-pointer"
        >
          Gửi yêu cầu mới
        </button>
      </div>
    );
  }

  return (
    <div className="glass rounded-2xl p-8 max-w-lg mx-auto glow animate-fade-in-up">
      {/* Stepper */}
      <div className="flex items-center justify-between mb-8">
        {STEPS.map((s, i) => (
          <div key={s.id} className="flex items-center flex-1">
            <div className="flex flex-col items-center gap-1.5 flex-1">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold transition-all duration-300 ${
                  step >= s.id
                    ? "bg-gradient-to-br from-[var(--gradient-start)] to-[var(--gradient-end)] text-white shadow-lg shadow-blue-500/25"
                    : "bg-[var(--surface-hover)] text-[var(--muted)]"
                }`}
              >
                {step > s.id ? "✓" : s.icon}
              </div>
              <span className={`text-xs font-medium ${step >= s.id ? "text-[var(--foreground)]" : "text-[var(--muted)]"}`}>
                {s.label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div className={`h-[2px] flex-1 mx-2 mt-[-18px] rounded-full transition-all duration-500 ${
                step > s.id ? "bg-gradient-to-r from-[var(--gradient-start)] to-[var(--gradient-end)]" : "bg-[var(--border)]"
              }`} />
            )}
          </div>
        ))}
      </div>

      {/* Step 1 */}
      {step === 1 && (
        <div className="space-y-4 animate-fade-in-up">
          <div>
            <label className="block text-sm font-medium text-[var(--muted)] mb-1.5">Họ và tên</label>
            <input
              placeholder="Nguyễn Văn A"
              value={data.name || ""}
              onChange={(e) => update("name", e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-[var(--surface)] border border-[var(--border)] text-[var(--foreground)] placeholder:text-[var(--muted)]/50 focus:outline-none focus:border-[var(--primary)] focus:ring-1 focus:ring-[var(--primary)]/30 transition-all"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--muted)] mb-1.5">Số điện thoại</label>
            <input
              placeholder="0901 234 567"
              value={data.phone || ""}
              onChange={(e) => update("phone", e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-[var(--surface)] border border-[var(--border)] text-[var(--foreground)] placeholder:text-[var(--muted)]/50 focus:outline-none focus:border-[var(--primary)] focus:ring-1 focus:ring-[var(--primary)]/30 transition-all"
            />
          </div>
        </div>
      )}

      {/* Step 2 */}
      {step === 2 && (
        <div className="space-y-3 animate-fade-in-up">
          <label className="block text-sm font-medium text-[var(--muted)] mb-1">Chọn dịch vụ</label>
          {SERVICES.map((svc) => (
            <button
              key={svc.value}
              onClick={() => update("service", svc.value)}
              className={`w-full p-4 rounded-xl text-left transition-all duration-200 cursor-pointer border ${
                data.service === svc.value
                  ? "border-[var(--primary)] bg-[var(--primary)]/10 glow-sm"
                  : "border-[var(--border)] bg-[var(--surface)] hover:border-[var(--muted)]/40"
              }`}
            >
              <div className="font-medium">{svc.label}</div>
              <div className="text-xs text-[var(--muted)] mt-0.5">{svc.desc}</div>
            </button>
          ))}
        </div>
      )}

      {/* Step 3 */}
      {step === 3 && (
        <div className="space-y-4 animate-fade-in-up">
          <div>
            <label className="block text-sm font-medium text-[var(--muted)] mb-1.5">Tin nhắn / Yêu cầu</label>
            <textarea
              rows={4}
              placeholder="Mô tả nhu cầu của bạn..."
              value={data.message || ""}
              onChange={(e) => update("message", e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-[var(--surface)] border border-[var(--border)] text-[var(--foreground)] placeholder:text-[var(--muted)]/50 focus:outline-none focus:border-[var(--primary)] focus:ring-1 focus:ring-[var(--primary)]/30 transition-all resize-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--muted)] mb-1.5">Hình ảnh đính kèm (Tùy chọn)</label>
            <div 
              onClick={() => fileInputRef.current?.click()}
              className="w-full px-4 py-4 rounded-xl border-2 border-dashed border-[var(--border)] hover:border-[var(--primary)] text-center cursor-pointer transition-colors bg-[var(--surface)]"
            >
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleImageUpload} 
                accept="image/*" 
                className="hidden" 
              />
              {data.image ? (
                <div className="flex flex-col items-center">
                  <img src={data.image} alt="Preview" className="h-24 object-contain rounded-md mb-2 shadow-sm" />
                  <span className="text-xs text-[var(--accent)] font-medium">Nhấn để thay đổi hình ảnh</span>
                </div>
              ) : (
                <div className="text-[var(--muted)] flex flex-col items-center gap-2">
                  <svg className="w-8 h-8 opacity-70" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                  </svg>
                  <span className="text-sm">Nhấn để tải lên hình ảnh</span>
                </div>
              )}
            </div>
          </div>
          <div className="glass-light rounded-xl p-4 text-sm mt-2">
            <div className="font-medium mb-2 text-[var(--accent)]">📋 Tóm tắt</div>
            <div className="space-y-1 text-[var(--muted)]">
              <p>👤 {data.name || "—"}</p>
              <p>📞 {data.phone || "—"}</p>
              <p>📋 {data.service || "—"}</p>
              {data.image && <p className="text-[var(--success)]">🖼️ Đã đính kèm ảnh</p>}
            </div>
          </div>
        </div>
      )}

      {/* Navigation */}
      <div className="flex justify-between mt-8">
        {step > 1 ? (
          <button
            onClick={prev}
            className="px-5 py-2.5 rounded-xl bg-[var(--surface-hover)] text-sm font-medium hover:bg-[var(--border)] transition-all cursor-pointer"
          >
            ← Quay lại
          </button>
        ) : <div />}

        {step < 3 ? (
          <button
            onClick={next}
            disabled={step === 1 && (!data.name || !data.phone)}
            className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-[var(--gradient-start)] to-[var(--gradient-end)] text-white text-sm font-semibold hover:opacity-90 transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shadow-lg shadow-blue-500/20"
          >
            Tiếp theo →
          </button>
        ) : (
          <button
            onClick={submit}
            disabled={loading}
            className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-[var(--success)] to-emerald-400 text-white text-sm font-semibold hover:opacity-90 transition-all disabled:opacity-50 cursor-pointer shadow-lg shadow-emerald-500/20"
          >
            {loading ? "⏳ Đang gửi..." : "✅ Gửi yêu cầu"}
          </button>
        )}
      </div>
    </div>
  );
}
