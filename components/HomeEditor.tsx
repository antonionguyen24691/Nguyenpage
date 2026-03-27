"use client";

import { useState, useEffect } from "react";
import { defaultHomeConfig, type HomeConfig, type HomeCard } from "@/lib/homeConfig";

export default function HomeEditor() {
  const [config, setConfig] = useState<HomeConfig>(defaultHomeConfig);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const loadConfig = async () => {
      try {
        const res = await fetch("/api/config?key=home");
        const data = await res.json();
        if (data.value) {
          setConfig({ ...defaultHomeConfig, ...data.value });
        }
      } catch { /* use defaults */ }
    };
    loadConfig();
  }, []);

  const save = async () => {
    try {
      await fetch("/api/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: "home", value: config }),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e) {
      console.error("Failed to save home config:", e);
    }
  };

  const updateBankingCard = (index: number, field: keyof HomeCard, value: any) => {
    const cards = [...config.bankingCards];
    cards[index] = { ...cards[index], [field]: value };
    setConfig({ ...config, bankingCards: cards });
  };

  const updateBankingTag = (cardIndex: number, tagIndex: number, field: string, value: string) => {
    const cards = [...config.bankingCards];
    const tags = [...(cards[cardIndex].tags || [])];
    tags[tagIndex] = { ...tags[tagIndex], [field]: value };
    cards[cardIndex] = { ...cards[cardIndex], tags };
    setConfig({ ...config, bankingCards: cards });
  };

  const updateSaasCard = (index: number, field: keyof HomeCard, value: string) => {
    const cards = [...config.saasCards];
    cards[index] = { ...cards[index], [field]: value };
    setConfig({ ...config, saasCards: cards });
  };

  const updateFeature = (index: number, field: string, value: string) => {
    const feats = [...config.dynamicFeatures];
    feats[index] = { ...feats[index], [field]: value };
    setConfig({ ...config, dynamicFeatures: feats });
  };

  const inputCls = "w-full px-3 py-2.5 rounded-lg border border-outline-variant/30 text-sm font-medium bg-[#f3faff]/50 focus:border-primary outline-none transition-all";
  const labelCls = "block text-[10px] font-extrabold text-[#071e27]/50 uppercase tracking-widest mb-1.5";
  const sectionCls = "bg-white rounded-2xl border border-outline-variant/20 shadow-sm p-6 md:p-8";

  return (
    <div className="animate-fade-in-up">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="font-headline font-bold text-3xl text-on-surface">Biên tập Trang chủ</h1>
          <p className="text-on-surface-variant text-sm mt-2">Chỉnh sửa nội dung, hyperlink và thông tin hiển thị trên trang chủ.</p>
        </div>
        <button
          onClick={save}
          className={`px-8 py-3 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-all shadow-md active:scale-95 ${saved ? 'bg-green-500 text-white' : 'bg-primary text-white hover:bg-[#004d45]'}`}
        >
          <span className="material-symbols-outlined text-[20px]">{saved ? 'check_circle' : 'save'}</span>
          {saved ? 'Đã lưu!' : 'Lưu Trang chủ'}
        </button>
      </div>

      <div className="space-y-8">
        {/* ── SECTION 1: Banking ── */}
        <div className={sectionCls}>
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-primary/10 text-primary rounded-xl flex items-center justify-center">
              <span className="material-symbols-outlined">account_balance</span>
            </div>
            <div>
              <h2 className="font-headline font-bold text-lg text-on-surface">Section 1 — Dịch vụ Tài chính</h2>
              <p className="text-[11px] text-on-surface-variant">Header + 4 thẻ dịch vụ ngân hàng</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div>
              <label className={labelCls}>Nhãn section</label>
              <input className={inputCls} value={config.bankingLabel} onChange={(e) => setConfig({ ...config, bankingLabel: e.target.value })} />
            </div>
            <div>
              <label className={labelCls}>Tiêu đề lớn</label>
              <input className={inputCls} value={config.bankingTitle} onChange={(e) => setConfig({ ...config, bankingTitle: e.target.value })} />
            </div>
            <div>
              <label className={labelCls}>Link &quot;Xem tất cả&quot;</label>
              <input className={`${inputCls} font-mono`} value={config.bankingViewAllUrl} onChange={(e) => setConfig({ ...config, bankingViewAllUrl: e.target.value })} />
            </div>
          </div>
          <div className="mb-6">
            <label className={labelCls}>Mô tả section</label>
            <input className={inputCls} value={config.bankingDesc} onChange={(e) => setConfig({ ...config, bankingDesc: e.target.value })} />
          </div>

          <h4 className="font-bold text-xs uppercase tracking-widest text-on-surface-variant/60 mb-4 mt-2">4 thẻ dịch vụ</h4>
          <div className="space-y-4">
            {config.bankingCards.map((card, i) => (
              <div key={i} className="bg-surface-container-low/50 rounded-xl p-4 border border-outline-variant/10">
                <div className="flex items-center gap-2 mb-3 text-primary">
                  <span className="material-symbols-outlined text-[18px]">{card.icon}</span>
                  <span className="text-xs font-bold uppercase tracking-widest">Thẻ {i + 1}: {card.title || '...'}</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                  <div>
                    <label className={labelCls}>Tiêu đề</label>
                    <input className={inputCls} value={card.title} onChange={(e) => updateBankingCard(i, 'title', e.target.value)} />
                  </div>
                  <div>
                    <label className={labelCls}>Icon (Material)</label>
                    <input className={inputCls} value={card.icon} placeholder="credit_card" onChange={(e) => updateBankingCard(i, 'icon', e.target.value)} />
                  </div>
                  <div>
                    <label className={labelCls}>Hyperlink URL</label>
                    <input className={`${inputCls} font-mono text-primary`} value={card.url} placeholder="/dang-ky" onChange={(e) => updateBankingCard(i, 'url', e.target.value)} />
                  </div>
                  <div>
                    <label className={labelCls}>Mô tả</label>
                    <input className={inputCls} value={card.desc} onChange={(e) => updateBankingCard(i, 'desc', e.target.value)} />
                  </div>
                </div>
                {/* Tags (for card 0) */}
                {card.tags && card.tags.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-outline-variant/10">
                    <label className={labelCls}>Tags (nhãn + link)</label>
                    <div className="flex flex-wrap gap-3">
                      {card.tags.map((tag, ti) => (
                        <div key={ti} className="flex items-center gap-2 bg-white rounded-lg p-2 border border-outline-variant/20">
                          <input className="px-2 py-1 text-xs font-bold border border-outline-variant/20 rounded w-36 outline-none focus:border-primary" 
                            value={tag.label} onChange={(e) => updateBankingTag(i, ti, 'label', e.target.value)} placeholder="Tên tag" />
                          <input className="px-2 py-1 text-xs font-mono border border-outline-variant/20 rounded w-28 outline-none focus:border-primary text-primary" 
                            value={tag.url} onChange={(e) => updateBankingTag(i, ti, 'url', e.target.value)} placeholder="/url" />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* ── SECTION 2: SaaS ── */}
        <div className={sectionCls}>
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-secondary/10 text-secondary rounded-xl flex items-center justify-center">
              <span className="material-symbols-outlined">code_blocks</span>
            </div>
            <div>
              <h2 className="font-headline font-bold text-lg text-on-surface">Section 2 — Giải pháp SaaS</h2>
              <p className="text-[11px] text-on-surface-variant">4 thẻ dịch vụ công nghệ</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div>
              <label className={labelCls}>Nhãn section</label>
              <input className={inputCls} value={config.saasLabel} onChange={(e) => setConfig({ ...config, saasLabel: e.target.value })} />
            </div>
            <div>
              <label className={labelCls}>Tiêu đề (phần đầu)</label>
              <input className={inputCls} value={config.saasTitle} onChange={(e) => setConfig({ ...config, saasTitle: e.target.value })} />
            </div>
            <div>
              <label className={labelCls}>Tiêu đề (highlight)</label>
              <input className={`${inputCls} text-secondary font-bold`} value={config.saasTitleHighlight} onChange={(e) => setConfig({ ...config, saasTitleHighlight: e.target.value })} />
            </div>
          </div>
          <div className="mb-6">
            <label className={labelCls}>Mô tả section</label>
            <input className={inputCls} value={config.saasDesc} onChange={(e) => setConfig({ ...config, saasDesc: e.target.value })} />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {config.saasCards.map((card, i) => (
              <div key={i} className="bg-surface-container-low/50 rounded-xl p-4 border border-outline-variant/10">
                <div className="flex items-center gap-2 mb-3 text-secondary">
                  <span className="material-symbols-outlined text-[18px]">{card.icon}</span>
                  <span className="text-xs font-bold uppercase tracking-widest">Thẻ SaaS {i + 1}</span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelCls}>Tiêu đề</label>
                    <input className={inputCls} value={card.title} onChange={(e) => updateSaasCard(i, 'title', e.target.value)} />
                  </div>
                  <div>
                    <label className={labelCls}>Icon</label>
                    <input className={inputCls} value={card.icon} onChange={(e) => updateSaasCard(i, 'icon', e.target.value)} />
                  </div>
                  <div>
                    <label className={labelCls}>Hyperlink URL</label>
                    <input className={`${inputCls} font-mono text-secondary`} value={card.url} onChange={(e) => updateSaasCard(i, 'url', e.target.value)} />
                  </div>
                  <div>
                    <label className={labelCls}>Nhãn link</label>
                    <input className={inputCls} value={card.linkText || ''} onChange={(e) => updateSaasCard(i, 'linkText', e.target.value)} />
                  </div>
                </div>
                <div className="mt-3">
                  <label className={labelCls}>Mô tả</label>
                  <input className={inputCls} value={card.desc} onChange={(e) => updateSaasCard(i, 'desc', e.target.value)} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── SECTION 3: Dynamic Content ── */}
        <div className={sectionCls}>
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-primary/10 text-primary rounded-xl flex items-center justify-center">
              <span className="material-symbols-outlined">auto_awesome</span>
            </div>
            <div>
              <h2 className="font-headline font-bold text-lg text-on-surface">Section 3 — Nội dung Chi tiết</h2>
              <p className="text-[11px] text-on-surface-variant">Hình ảnh, tiêu đề chính và danh sách đặc điểm</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div>
              <label className={labelCls}>Tiêu đề (phần đầu)</label>
              <input className={inputCls} value={config.dynamicTitle} onChange={(e) => setConfig({ ...config, dynamicTitle: e.target.value })} />
            </div>
            <div>
              <label className={labelCls}>Tiêu đề (highlight)</label>
              <input className={`${inputCls} text-primary font-bold`} value={config.dynamicTitleHighlight} onChange={(e) => setConfig({ ...config, dynamicTitleHighlight: e.target.value })} />
            </div>
          </div>
          <div className="mb-4">
            <label className={labelCls}>Mô tả chi tiết</label>
            <textarea className={`${inputCls} h-20 resize-none`} value={config.dynamicDesc} onChange={(e) => setConfig({ ...config, dynamicDesc: e.target.value })} />
          </div>
          <div className="mb-6">
            <label className={labelCls}>URL Hình ảnh minh họa</label>
            <input className={`${inputCls} font-mono`} value={config.dynamicImage} onChange={(e) => setConfig({ ...config, dynamicImage: e.target.value })} />
          </div>

          <h4 className="font-bold text-xs uppercase tracking-widest text-on-surface-variant/60 mb-3">Danh sách đặc điểm</h4>
          <div className="space-y-3">
            {config.dynamicFeatures.map((feat, i) => (
              <div key={i} className="flex items-start gap-3 bg-surface-container-low/50 rounded-xl p-3 border border-outline-variant/10">
                <div className="shrink-0 w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center text-primary">
                  <span className="material-symbols-outlined text-[18px]">{feat.icon}</span>
                </div>
                <div className="flex-1 grid grid-cols-3 gap-2">
                  <div>
                    <label className={labelCls}>Icon</label>
                    <input className={inputCls} value={feat.icon} onChange={(e) => updateFeature(i, 'icon', e.target.value)} />
                  </div>
                  <div>
                    <label className={labelCls}>Tiêu đề</label>
                    <input className={inputCls} value={feat.title} onChange={(e) => updateFeature(i, 'title', e.target.value)} />
                  </div>
                  <div>
                    <label className={labelCls}>Mô tả</label>
                    <input className={inputCls} value={feat.desc} onChange={(e) => updateFeature(i, 'desc', e.target.value)} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── SECTION 4: CTA ── */}
        <div className={sectionCls}>
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-primary text-white rounded-xl flex items-center justify-center">
              <span className="material-symbols-outlined">campaign</span>
            </div>
            <div>
              <h2 className="font-headline font-bold text-lg text-on-surface">Section 4 — Call to Action</h2>
              <p className="text-[11px] text-on-surface-variant">Khung kêu gọi hành động cuối trang</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className={labelCls}>Tiêu đề CTA</label>
              <input className={inputCls} value={config.ctaTitle} onChange={(e) => setConfig({ ...config, ctaTitle: e.target.value })} />
            </div>
            <div>
              <label className={labelCls}>Mô tả</label>
              <input className={inputCls} value={config.ctaDesc} onChange={(e) => setConfig({ ...config, ctaDesc: e.target.value })} />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Chữ nút bấm</label>
              <input className={inputCls} value={config.ctaButtonText} onChange={(e) => setConfig({ ...config, ctaButtonText: e.target.value })} />
            </div>
            <div>
              <label className={labelCls}>Hyperlink nút bấm</label>
              <input className={`${inputCls} font-mono text-primary`} value={config.ctaButtonUrl} onChange={(e) => setConfig({ ...config, ctaButtonUrl: e.target.value })} />
            </div>
          </div>
        </div>
      </div>

      {/* Bottom save bar */}
      <div className="sticky bottom-4 mt-8">
        <button
          onClick={save}
          className={`w-full py-4 rounded-2xl text-sm font-bold flex items-center justify-center gap-2 transition-all shadow-xl ${saved ? 'bg-green-500 text-white' : 'bg-primary text-white hover:bg-[#004d45]'}`}
        >
          <span className="material-symbols-outlined text-[20px]">{saved ? 'check_circle' : 'publish'}</span>
          {saved ? 'Đã lưu thành công!' : 'Lưu & Cập nhật Trang chủ'}
        </button>
      </div>
    </div>
  );
}
