"use client";
import { useState, useRef } from "react";
import Link from "next/link";
import Chatbot from "@/components/Chatbot";

export default function DangKyPage() {
  const [step, setStep] = useState(1);
  const [data, setData] = useState<any>({});
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const update = (field: string, value: string) => {
    setData((prev: any) => ({ ...prev, [field]: value }));
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
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

  const next = () => setStep((s) => Math.min(s + 1, 4));
  const prev = () => setStep((s) => Math.max(s - 1, 1));

  const submit = async () => {
    setLoading(true);
    try {
      await fetch("/api/form", {
        method: "POST",
        body: JSON.stringify(data),
      });
      setDone(true);
      setStep(4);
    } catch (e) {
      alert("Có lỗi xảy ra");
    }
    setLoading(false);
  };

  const steps = [
    { id: 1, label: "Thông tin", icon: "info" },
    { id: 2, label: "Dịch vụ", icon: "business_center" },
    { id: 3, label: "Chi tiết", icon: "assignment" },
    { id: 4, label: "Xác nhận", icon: "verified" },
  ];

  return (
    <main className="flex-grow flex w-full max-w-7xl mx-auto overflow-hidden">
      {/* SideNavBar (Smart Form Navigation) */}
      <aside className="hidden lg:flex flex-col h-[calc(100vh-64px)] w-64 bg-[#ffffff] border-r border-[#bcc9c5]/20 py-8 sticky top-16 shadow-[32px_0_32px_-8px_rgba(7,30,39,0.04)]">
        <div className="px-6 mb-10">
          <h2 className="font-headline font-bold text-[#00685d] text-lg uppercase tracking-wider">Smart Form</h2>
          <p className="text-xs text-[#071e27]/60 font-medium mt-1">Quy trình đăng ký</p>
        </div>
        <nav className="flex flex-col gap-1">
          {steps.map((s) => {
            const isActive = step === s.id;
            const isCompleted = step > s.id;
            if (done && s.id !== 4) return null;
            return (
              <div 
                key={s.id}
                className={`${
                  isActive
                    ? "bg-[#00685d]/10 text-[#00685d] border-r-4 border-[#00685d] font-bold"
                    : isCompleted
                    ? "text-[#00685d] opacity-70 cursor-pointer"
                    : "text-[#071e27]/60 cursor-not-allowed"
                } px-6 py-4 flex items-center gap-3 font-body text-sm transition-all duration-200`}
                onClick={() => {
                  if (isCompleted && !done) setStep(s.id);
                }}
              >
                <span className="material-symbols-outlined">{isCompleted && !isActive ? "check_circle" : s.icon}</span>
                <span>{s.label}</span>
              </div>
            );
          })}
        </nav>
      </aside>

      {/* Content Canvas */}
      <section className="flex-grow p-8 md:p-12 lg:p-16 overflow-y-auto">
        <div className="max-w-2xl mx-auto">
          {!done ? (
            <>
              {/* Progress Section */}
              <div className="mb-12">
                <div className="flex justify-between items-end mb-4">
                  <div>
                    <span className="text-primary font-bold text-sm tracking-widest uppercase">Bước 0{step}/04</span>
                    <h1 className="font-headline text-3xl font-extrabold text-on-surface mt-1">
                      {step === 1 && "Thông tin cơ bản"}
                      {step === 2 && "Lựa chọn Dịch vụ"}
                      {step === 3 && "Chi tiết yêu cầu"}
                      {step === 4 && "Xác nhận & Gửi"}
                    </h1>
                  </div>
                  <span className="text-primary font-bold text-lg font-headline">{step * 25}%</span>
                </div>
                <div className="w-full h-2 bg-surface-container rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-primary rounded-full transition-all duration-500"
                    style={{ width: `${step * 25}%` }}
                  ></div>
                </div>
              </div>

              {/* Form Card */}
              <div className="bg-surface-container-lowest p-8 md:p-10 rounded-xl shadow-[0_32px_64px_-12px_rgba(7,30,39,0.04)]">
                <div className="space-y-8">
                  
                  {step === 1 && (
                    <>
                      <div className="space-y-2">
                        <label className="block font-label text-xs font-semibold text-on-surface-variant uppercase tracking-wider">Họ và tên <span className="text-error">*</span></label>
                        <div className="relative group">
                          <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-outline-variant group-focus-within:text-primary transition-colors">person</span>
                          <input 
                            value={data.name || ""} onChange={(e) => update("name", e.target.value)}
                            className="w-full pl-12 pr-4 py-4 bg-surface-container-low border-none rounded-lg focus:ring-2 focus:ring-primary focus:bg-surface-container-lowest text-on-surface placeholder:text-outline-variant/60 transition-all outline-none" 
                            placeholder="Nguyễn Văn A" type="text"
                          />
                        </div>
                        <p className="text-[10px] text-outline-variant font-medium">Vui lòng nhập tên đầy đủ như trên CCCD/Hộ chiếu.</p>
                      </div>

                      <div className="space-y-2">
                        <label className="block font-label text-xs font-semibold text-on-surface-variant uppercase tracking-wider">Số điện thoại <span className="text-error">*</span></label>
                        <div className="relative group">
                          <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-outline-variant group-focus-within:text-primary transition-colors">call</span>
                          <input 
                            value={data.phone || ""} onChange={(e) => update("phone", e.target.value)}
                            className="w-full pl-12 pr-4 py-4 bg-surface-container-low border-none rounded-lg focus:ring-2 focus:ring-primary focus:bg-surface-container-lowest text-on-surface placeholder:text-outline-variant/60 transition-all outline-none" 
                            placeholder="090 123 4567" type="tel"
                          />
                        </div>
                        <p className="text-[10px] text-outline-variant font-medium">Định dạng số điện thoại Việt Nam.</p>
                      </div>
                    </>
                  )}

                  {step === 2 && (
                    <>
                      <div className="space-y-3">
                        <label className="block text-sm font-semibold text-on-surface-variant ml-1">Lĩnh vực dịch vụ <span className="text-error">*</span></label>
                        <div className="relative group">
                          <select 
                            value={data.service || ""} onChange={(e) => update("service", e.target.value)}
                            className="w-full appearance-none bg-surface-container-high border-none rounded-lg py-4 px-5 text-on-surface focus:ring-2 focus:ring-primary focus:bg-surface-container-lowest transition-all cursor-pointer font-medium outline-none"
                          >
                            <option value="" disabled>Vui lòng chọn loại hình...</option>
                            <optgroup className="font-bold py-2" label="Ngành Tài chính - Ngân hàng">
                              <option value="Tài khoản">Ngân hàng: Tài khoản</option>
                              <option value="Khoản vay">Ngân hàng: Khoản vay</option>
                              <option value="Đầu tư">Ngân hàng: Đầu tư</option>
                            </optgroup>
                            <optgroup className="font-bold py-2" label="Giải pháp Công nghệ SaaS">
                              <option value="SaaS App">SaaS: Phát triển ứng dụng</option>
                              <option value="SaaS Quản lý">SaaS: Quản lý cho thuê</option>
                            </optgroup>
                          </select>
                          <span className="material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-outline">expand_more</span>
                        </div>
                      </div>

                      {data.service === "Khoản vay" && (
                        <div className="space-y-3 pt-2">
                          <label className="block text-sm font-semibold text-on-surface-variant ml-1">Số tiền vay dự kiến (VNĐ)</label>
                          <div className="relative flex items-center">
                            <span className="material-symbols-outlined absolute left-4 text-primary opacity-60">payments</span>
                            <input 
                              value={data.amount || ""} onChange={(e) => update("amount", e.target.value)}
                              className="w-full bg-surface-container-high border-none rounded-lg py-4 pl-12 pr-5 text-on-surface focus:ring-2 focus:ring-primary focus:bg-surface-container-lowest transition-all outline-none" 
                              placeholder="Nhập số tiền..." type="number"
                            />
                          </div>
                        </div>
                      )}
                    </>
                  )}

                  {step === 3 && (
                    <>
                      <div className="space-y-3">
                        <label className="block text-sm font-semibold text-on-surface-variant ml-1">Mô tả chi tiết nhu cầu</label>
                        <div className="relative">
                          <span className="material-symbols-outlined absolute left-4 top-4 text-primary opacity-60">notes</span>
                          <textarea 
                            value={data.message || ""} onChange={(e) => update("message", e.target.value)}
                            className="w-full bg-surface-container-high border-none rounded-lg py-4 pl-12 pr-5 text-on-surface focus:ring-2 focus:ring-primary focus:bg-surface-container-lowest transition-all outline-none resize-none" 
                            placeholder="Mô tả các tính năng hoặc yêu cầu cụ thể..." rows={4}
                          ></textarea>
                        </div>
                      </div>

                      <div className="space-y-3">
                        <label className="block text-sm font-semibold text-on-surface-variant ml-1">Hình ảnh đính kèm (Tùy chọn)</label>
                        <div 
                          onClick={() => fileInputRef.current?.click()}
                          className="w-full px-4 py-8 rounded-xl border-2 border-dashed border-outline-variant hover:border-primary text-center cursor-pointer transition-colors bg-surface-container-lowest"
                        >
                          <input 
                            type="file" ref={fileInputRef} onChange={handleImageUpload} accept="image/*" className="hidden" 
                          />
                          {data.image ? (
                            <div className="flex flex-col items-center">
                              <img src={data.image} alt="Preview" className="h-24 object-contain rounded-md mb-2 shadow-sm" />
                              <span className="text-xs text-primary font-medium">Nhấn để thay đổi hình ảnh</span>
                            </div>
                          ) : (
                            <div className="text-outline flex flex-col items-center gap-2">
                              <span className="material-symbols-outlined text-3xl opacity-70">image</span>
                              <span className="text-sm font-medium">Nhấn để tải lên hình ảnh</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </>
                  )}

                  {step === 4 && (
                    <div className="space-y-6">
                      <div className="bg-primary/5 rounded-xl p-6 border border-primary/20">
                        <h3 className="font-headline font-bold text-lg text-primary mb-4 flex items-center gap-2">
                          <span className="material-symbols-outlined">description</span>
                          Tóm tắt hồ sơ
                        </h3>
                        <div className="grid grid-cols-2 gap-y-4 text-sm">
                          <div className="text-on-surface-variant">Họ và tên:</div>
                          <div className="font-semibold text-on-surface text-right">{data.name || "—"}</div>
                          
                          <div className="text-on-surface-variant">Số điện thoại:</div>
                          <div className="font-semibold text-on-surface text-right">{data.phone || "—"}</div>
                          
                          <div className="text-on-surface-variant">Dịch vụ:</div>
                          <div className="font-semibold text-on-surface text-right">{data.service || "—"}</div>

                          {data.amount && (
                            <>
                              <div className="text-on-surface-variant">Số tiền:</div>
                              <div className="font-semibold text-on-surface text-right">{data.amount} VNĐ</div>
                            </>
                          )}
                        </div>
                        {data.image && (
                          <div className="mt-4 pt-4 border-t border-primary/10 text-xs text-primary font-medium flex items-center gap-2">
                            <span className="material-symbols-outlined text-sm">attach_file</span>
                            Đã đính kèm hình ảnh minh chứng
                          </div>
                        )}
                      </div>
                      <label htmlFor="agree-terms" className="ml-2 block text-sm text-on-surface-variant">
                        Bằng việc nhấn "Gửi yêu cầu", bạn đồng ý với Điều khoản và Chính sách bảo mật của Nguyen Page.
                      </label>
                    </div>
                  )}

                  {/* Action Bar */}
                  <div className="pt-6 flex justify-between items-center border-t border-outline-variant/10">
                    {step > 1 ? (
                      <button 
                        onClick={prev}
                        className="text-primary font-bold px-6 py-3 flex items-center gap-2 hover:bg-surface-container rounded-lg transition-all active:scale-95" 
                      >
                        <span className="material-symbols-outlined">arrow_back</span>
                        Quay lại
                      </button>
                    ) : <div></div>}

                    {step < 4 ? (
                      <button 
                        onClick={next}
                        className="bg-gradient-to-br from-[#00685d] to-[#008376] text-white px-8 py-3 rounded-lg font-headline font-bold text-sm tracking-widest uppercase hover:opacity-90 active:scale-95 transition-all flex items-center gap-2"
                      >
                        Tiếp tục
                        <span className="material-symbols-outlined text-sm">arrow_forward</span>
                      </button>
                    ) : (
                      <button 
                        onClick={submit} disabled={loading}
                        className="bg-primary text-white px-8 py-3 rounded-lg font-headline font-bold text-sm tracking-widest uppercase hover:shadow-lg disabled:opacity-50 transition-all flex items-center gap-2"
                      >
                        {loading ? "Đang xử lý..." : "Gửi yêu cầu"}
                        <span className="material-symbols-outlined text-sm">send</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {step < 4 && (
                <div className="mt-12 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-6 bg-surface-container rounded-xl border border-outline-variant/10">
                    <span className="material-symbols-outlined text-primary mb-3" style={{ fontVariationSettings: "'FILL' 1" }}>security</span>
                    <h4 className="font-headline font-bold text-on-surface mb-2">Bảo mật tuyệt đối</h4>
                    <p className="text-xs text-on-surface-variant leading-relaxed">Thông tin cá nhân được mã hóa AES-256 bảo vệ theo tiêu chuẩn quốc tế.</p>
                  </div>
                  <div className="p-6 bg-surface-container rounded-xl border border-outline-variant/10">
                    <span className="material-symbols-outlined text-secondary mb-3" style={{ fontVariationSettings: "'FILL' 1" }}>support_agent</span>
                    <h4 className="font-bold text-sm text-on-surface mb-1">Hỗ trợ 24/7</h4>
                    <p className="text-xs text-on-surface-variant leading-relaxed">Đội ngũ chuyên gia Nguyen Page luôn sẵn sàng hỗ trợ tại box Chatbot.</p>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="bg-surface-container-lowest p-12 rounded-xl text-center shadow-[0_32px_64px_-12px_rgba(7,30,39,0.04)] mt-12">
              <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
                <span className="material-symbols-outlined text-primary text-4xl">task_alt</span>
              </div>
              <h2 className="font-headline font-bold text-3xl mb-4 text-on-surface">Đăng ký thành công!</h2>
              <p className="text-on-surface-variant mb-10 max-w-sm mx-auto">
                Cảm ơn bạn đã tin tưởng Nguyen Page. Chuyên viên tài chính của chúng tôi sẽ liên hệ với bạn trong vòng 2H làm việc.
              </p>
              <div className="flex gap-4 justify-center">
                <Link href="/" className="px-6 py-3 border border-outline-variant rounded-lg font-bold text-sm text-on-surface-variant hover:bg-surface-container transition-all">
                  Về trang chủ
                </Link>
                <button onClick={() => { setDone(false); setStep(1); setData({}); }} className="px-6 py-3 bg-primary text-white rounded-lg font-bold text-sm hover:shadow-lg transition-all">
                  Gửi yêu cầu mới
                </button>
              </div>
            </div>
          )}
        </div>
      </section>
      <Chatbot />
    </main>
  );
}
