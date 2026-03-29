"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import HomeEditor from "@/components/HomeEditor";
import {
  defaultLinks,
  defaultSitePages,
  mergeWithDefaultSitePages,
} from "@/lib/siteConfigDefaults";

const generateId = () => Date.now().toString(36) + Math.random().toString(36).substr(2);

export default function AdminDashboard() {
  // ── Auth State ──
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState("");
  const [loginUsername, setLoginUsername] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [authChecked, setAuthChecked] = useState(false);

  const [activeTab, setActiveTab] = useState("pages");
  const [isLoaded, setIsLoaded] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  
  const [pages, setPages] = useState<any[]>([]);
  const [links, setLinks] = useState<any[]>([]);
  const [systemSettings, setSystemSettings] = useState<any>({});

  // ── Check existing session on mount ──
  useEffect(() => {
    const token = sessionStorage.getItem("admin_token");
    if (token) {
      setIsAuthenticated(true);
    }
    setAuthChecked(true);
  }, []);

  // ── Login handler ──
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginLoading(true);
    setLoginError("");
    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: loginUsername, password: loginPassword }),
      });
      const data = await res.json();
      if (res.ok && data.token) {
        sessionStorage.setItem("admin_token", data.token);
        setIsAuthenticated(true);
      } else {
        setLoginError(data.error || "Đăng nhập thất bại.");
      }
    } catch {
      setLoginError("Không thể kết nối đến server.");
    } finally {
      setLoginLoading(false);
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem("admin_token");
    setIsAuthenticated(false);
    setLoginUsername("");
    setLoginPassword("");
  };

  // Load from Supabase on mount
  useEffect(() => {
    if (!isAuthenticated) return;
    const loadConfig = async () => {
      try {
        const res = await fetch("/api/config");
        const data = await res.json();
        
        if (data.pages && Array.isArray(data.pages) && data.pages.length > 0) setPages(mergeWithDefaultSitePages(data.pages));
        else setPages(defaultSitePages);

        if (data.links) setLinks(data.links);
        else setLinks(defaultLinks);

        if (data.settings) setSystemSettings(data.settings);
        else setSystemSettings({
          chatbotName: "Nguyen Page Assistant",
          chatbotPrompt: "Bạn là chuyên gia tư vấn tài chính & ngân hàng...",
          knowledgeBaseUrl: "",
          sheetUrl: "",
          syncForms: true
        });
      } catch (e) {
        console.error("Failed to load config from Supabase:", e);
      }
      setIsLoaded(true);
    };
    loadConfig();
  }, [isAuthenticated]);

  useEffect(() => {
    if (isLoaded) {
      fetch("/api/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: "pages", value: pages }),
      }).catch(console.error);
    }
  }, [pages, isLoaded]);

  useEffect(() => {
    if (isLoaded) {
      fetch("/api/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: "links", value: links }),
      }).catch(console.error);
    }
  }, [links, isLoaded]);

  useEffect(() => {
    if (isLoaded) {
      fetch("/api/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: "settings", value: systemSettings }),
      }).catch(console.error);
    }
  }, [systemSettings, isLoaded]);

  // Manage Modals
  const [isPageModalOpen, setIsPageModalOpen] = useState(false);
  
  const handleSyncFunds = async () => {
    try {
      if (!confirm("Tiến trình đồng bộ sẽ quét tất cả các Quỹ, việc này mất một ít thời gian. Bạn có chắc chắn bắt đầu không?")) return;
      setIsSyncing(true);
      const res = await fetch("/api/cron/fund-sync");
      const data = await res.json();
      if (data.success) {
        alert("Đồng bộ dữ liệu quỹ hoàn tất: " + data.data.successCount + " bản ghi thành công.");
      } else {
        alert("Có lỗi: " + data.message);
      }
    } catch {
      alert("Lỗi kết nối khi đồng bộ!");
    } finally {
      setIsSyncing(false);
    }
  };
  const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);
  const [formData, setFormData] = useState<any>({});
  const [editingId, setEditingId] = useState<number | string | null>(null);

  // --- Handlers for Pages ---
  const handleSavePage = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingId) {
      setPages(pages.map(p => p.id === editingId ? { ...p, ...formData } : p));
    } else {
      setPages([...pages, { ...formData, id: generateId(), views: "0", blocks: formData.blocks || [] }]);
    }
    setIsPageModalOpen(false);
    setFormData({});
    setEditingId(null);
  };

  const deletePage = (id: number | string) => {
    if(confirm("Bạn có chắc chắn muốn xóa trang này?")) {
      setPages(pages.filter(p => p.id !== id));
    }
  };

  const addBlock = (type: string) => {
    let initialContent: any = "";
    if (type === "hero") initialContent = { title: "", subtitle: "", cta: "", ctaUrl: "", bgImage: "" };
    if (type === "features") initialContent = [{title: "", desc: "", ctaText: "Khám phá →", url: ""}, {title: "", desc: "", ctaText: "Khám phá →", url: ""}, {title: "", desc: "", ctaText: "Khám phá →", url: ""}];
    if (type === "columns") initialContent = { left: "", right: "" };
    if (type === "button") initialContent = { text: "Click Here", url: "" };

    const newBlock = { id: generateId(), type, content: initialContent };
    setFormData({
      ...formData,
      blocks: [...(formData.blocks || []), newBlock]
    });
  };

  const updateBlock = (blockId: string, content: any) => {
    setFormData({
      ...formData,
      blocks: formData.blocks.map((b: any) => b.id === blockId ? { ...b, content } : b)
    });
  };

  const removeBlock = (blockId: string) => {
    setFormData({
      ...formData,
      blocks: formData.blocks.filter((b: any) => b.id !== blockId)
    });
  };

  // --- Handlers for Links ---
  const handleSaveLink = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingId) {
      setLinks(links.map(l => l.id === editingId ? { ...l, ...formData } : l));
    } else {
      setLinks([...links, { ...formData, id: generateId(), order: links.length + 1, visible: true }]);
    }
    setIsLinkModalOpen(false);
    setFormData({});
    setEditingId(null);
  };

  const deleteLink = (id: number | string) => {
    if(confirm("Bạn có chắc chắn muốn xóa link này?")) {
      setLinks(links.filter(l => l.id !== id));
    }
  };

  const toggleLinkVisibility = (id: number | string) => {
    setLinks(links.map(l => l.id === id ? { ...l, visible: !l.visible } : l));
  };

  if (!authChecked) return null;

  // ── LOGIN SCREEN ──
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center p-4">
        <div className="w-full max-w-sm">
          <div className="bg-white rounded-2xl shadow-xl border border-outline-variant/20 overflow-hidden animate-fade-in">
            <div className="h-2 bg-gradient-to-r from-primary to-secondary"></div>
            <div className="p-8">
              <div className="text-center mb-8">
                <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <span className="material-symbols-outlined text-3xl text-primary">admin_panel_settings</span>
                </div>
                <h1 className="font-headline font-bold text-2xl text-on-surface">Nguyen Page CMS</h1>
                <p className="text-sm text-on-surface-variant mt-1">Đăng nhập để quản trị hệ thống</p>
              </div>

              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label className="block text-xs font-extrabold text-on-surface/70 uppercase tracking-widest mb-2">Tên đăng nhập</label>
                  <input
                    id="admin-username"
                    type="text"
                    required
                    autoFocus
                    className="w-full px-4 py-3 rounded-xl border border-outline-variant/30 focus:border-primary outline-none transition-all font-medium text-sm text-on-surface bg-surface/50"
                    placeholder="Username"
                    value={loginUsername}
                    onChange={(e) => setLoginUsername(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-xs font-extrabold text-on-surface/70 uppercase tracking-widest mb-2">Mật khẩu</label>
                  <input
                    id="admin-password"
                    type="password"
                    required
                    className="w-full px-4 py-3 rounded-xl border border-outline-variant/30 focus:border-primary outline-none transition-all font-medium text-sm text-on-surface bg-surface/50"
                    placeholder="••••••••"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                  />
                </div>

                {loginError && (
                  <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl flex items-center gap-2">
                    <span className="material-symbols-outlined text-[18px]">error</span>
                    {loginError}
                  </div>
                )}

                <button
                  id="admin-login-btn"
                  type="submit"
                  disabled={loginLoading}
                  className="w-full bg-primary text-white py-3 rounded-xl font-bold text-sm hover:bg-[#004d45] transition-all active:scale-[0.98] disabled:opacity-60 flex items-center justify-center gap-2"
                >
                  {loginLoading ? (
                    <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span> Đang xác thực...</>
                  ) : (
                    <><span className="material-symbols-outlined text-[18px]">login</span> Đăng nhập</>
                  )}
                </button>
              </form>
            </div>
          </div>
          <p className="text-center text-xs text-on-surface-variant/50 mt-6">© 2026 Nguyen Page. Protected admin area.</p>
        </div>
      </div>
    );
  }

  if (!isLoaded) return null;

  return (
    <div className="flex h-[100vh] overflow-hidden bg-surface-container-lowest font-body">
      {/* Sidebar */}
      <aside className="w-64 bg-surface border-r border-outline-variant/20 flex flex-col pt-8 shrink-0 relative z-20 shadow-xl shadow-surface/50">
        <div className="px-6 mb-8">
          <h2 className="font-headline font-bold text-primary tracking-wide text-xl">Nguyen Page</h2>
          <p className="text-xs text-on-surface-variant mt-1 font-medium">CMS Elementor v4.0</p>
        </div>

        <nav className="flex-1 px-4 space-y-2 overflow-y-auto">
          <button
            onClick={() => setActiveTab("dashboard")}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-bold transition-all ${
              activeTab === "dashboard" ? "bg-primary text-on-primary shadow-md shadow-primary/20" : "text-on-surface-variant hover:bg-surface-container-low"
            }`}
          >
            <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: activeTab === 'dashboard' ? "'FILL' 1" : "'FILL' 0" }}>dashboard</span>
            Tổng quan
          </button>

          <button
            onClick={() => setActiveTab("homepage")}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-bold transition-all ${
              activeTab === "homepage" ? "bg-primary text-on-primary shadow-md shadow-primary/20" : "text-on-surface-variant hover:bg-surface-container-low"
            }`}
          >
            <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: activeTab === 'homepage' ? "'FILL' 1" : "'FILL' 0" }}>home</span>
            Trang chủ
          </button>
          
          <button
            onClick={() => setActiveTab("pages")}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-bold transition-all ${
              activeTab === "pages" ? "bg-primary text-on-primary shadow-md shadow-primary/20" : "text-on-surface-variant hover:bg-surface-container-low"
            }`}
          >
            <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: activeTab === 'pages' ? "'FILL' 1" : "'FILL' 0" }}>design_services</span>
            Page Builder
          </button>
          
          <button
            onClick={() => setActiveTab("links")}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-bold transition-all ${
              activeTab === "links" ? "bg-primary text-on-primary shadow-md shadow-primary/20" : "text-on-surface-variant hover:bg-surface-container-low"
            }`}
          >
            <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: activeTab === 'links' ? "'FILL' 1" : "'FILL' 0" }}>link</span>
            Menu & Liên kết Nội bộ
          </button>
          
          <button
            onClick={() => setActiveTab("settings")}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-bold transition-all ${
              activeTab === "settings" ? "bg-primary text-on-primary shadow-md shadow-primary/20" : "text-on-surface-variant hover:bg-surface-container-low"
            }`}
          >
            <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: activeTab === 'settings' ? "'FILL' 1" : "'FILL' 0" }}>settings</span>
            Cài đặt & Tích hợp
          </button>
        </nav>

        <div className="p-4 border-t border-outline-variant/20 space-y-1">
          <Link href="/" className="flex items-center gap-2 text-sm text-on-surface-variant hover:text-primary font-bold transition-colors px-4 py-2 hover:bg-surface-container-low rounded-lg">
            <span className="material-symbols-outlined text-[20px]">home</span>
            Về Trang chủ
          </Link>
          <button onClick={handleLogout} className="w-full flex items-center gap-2 text-sm text-red-500 hover:text-red-700 font-bold transition-colors px-4 py-2 hover:bg-red-50 rounded-lg">
            <span className="material-symbols-outlined text-[20px]">logout</span>
            Đăng xuất
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-4 md:p-8 relative bg-[#f3faff]/30">
        <div className="absolute top-0 right-0 w-96 h-96 bg-primary/5 rounded-full blur-[100px] -z-10 -translate-y-1/2 translate-x-1/3"></div>
        
        <div className="max-w-[70rem] mx-auto">
          {/* Header Bar */}
          <div className="flex justify-between items-center mb-10 bg-white p-4 rounded-xl shadow-sm border border-outline-variant/10">
            <div className="font-headline font-semibold text-on-surface flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">admin_panel_settings</span>
              Nguyen Page CMS Builder
            </div>
          </div>

          {activeTab === "pages" && (
            <div className="animate-fade-in-up">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div>
                  <h1 className="font-headline font-bold text-3xl text-on-surface">Quản lý & Biên tập Trang</h1>
                  <p className="text-on-surface-variant text-sm mt-2">Kéo thả, soạn thảo và thiết kế nội dung trực quan cho trang web của bạn. Trang có slug `/` sẽ là landing page chính của hệ thống.</p>
                </div>
                <button 
                  onClick={() => { setEditingId(null); setFormData({ title: "", slug: "", status: "draft", blocks: [] }); setIsPageModalOpen(true); }}
                  className="bg-primary text-white px-6 py-3 rounded-lg text-sm font-bold flex items-center justify-center gap-2 hover:bg-[#004d45] transition-all shadow-md active:scale-95"
                >
                  <span className="material-symbols-outlined text-[20px]">add</span>
                  Tạo Trang Mới
                </button>
              </div>

              <div className="bg-white rounded-2xl border border-outline-variant/20 shadow-sm overflow-hidden">
                <div className="grid grid-cols-12 gap-4 p-5 border-b border-outline-variant/10 bg-surface-container-lowest/50 text-xs font-extrabold text-[#071e27]/60 uppercase tracking-widest">
                  <div className="col-span-5 md:col-span-4">Tên Trang & URL</div>
                  <div className="col-span-4 hidden md:block">Loại (Type)</div>
                  <div className="col-span-3 md:col-span-2 text-center">Trạng thái</div>
                  <div className="col-span-4 md:col-span-2 text-right">Hành động</div>
                </div>
                
                <div className="divide-y divide-outline-variant/10">
                  {pages.map((page) => (
                    <div key={page.id} className="grid grid-cols-12 gap-4 p-5 items-center hover:bg-[#f3faff]/50 transition-colors group">
                      <div className="col-span-5 md:col-span-4 font-bold text-sm text-[#071e27] flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-surface-container flex items-center justify-center text-primary group-hover:bg-primary/10 transition-colors shrink-0">
                          <span className="material-symbols-outlined text-[20px]">web</span>
                        </div>
                        <div>
                          <Link href={page.slug} target="_blank" className="hover:text-primary transition-colors flex items-center gap-1 group/link">
                             <span className="truncate">{page.title}</span>
                             <span className="material-symbols-outlined text-[14px] opacity-0 group-hover/link:opacity-100 transition-opacity">open_in_new</span>
                          </Link>
                          <div className="text-xs font-mono text-on-surface-variant mt-1">{page.slug}</div>
                        </div>
                      </div>
                      <div className="col-span-4 hidden md:flex items-center">
                        <span className="text-xs uppercase tracking-widest font-bold bg-[#e0f3f2] text-primary px-2 py-0.5 rounded-md border border-primary/10">
                          Elementor Page
                        </span>
                      </div>
                      <div className="col-span-3 md:col-span-2 flex justify-center">
                        <span className={`px-2.5 py-1 rounded-md text-[10px] font-extrabold uppercase tracking-widest ${
                          page.status === 'published' ? 'bg-[#e0f3f2] text-[#00685d]' : 'bg-surface-variant text-on-surface-variant'
                        }`}>
                          {page.status}
                        </span>
                      </div>
                      <div className="col-span-4 md:col-span-2 flex items-center justify-end gap-3 text-sm text-[#071e27]/70 font-medium">
                        <div className="flex gap-1">
                          <button 
                            onClick={() => { setEditingId(page.id); setFormData(page); setIsPageModalOpen(true); }}
                            className="bg-surface-container-low px-3 py-1.5 rounded-md hover:bg-surface-container text-primary font-bold text-xs transition-colors shadow-sm flex items-center gap-1"
                          >
                            <span className="material-symbols-outlined text-[16px]">edit_document</span> EDIT
                          </button>
                          <button 
                            onClick={() => deletePage(page.id)}
                            className="w-8 h-8 rounded-md hover:bg-red-50 flex items-center justify-center text-[#071e27]/50 hover:text-red-600 transition-colors"
                          >
                            <span className="material-symbols-outlined text-[18px]">delete</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                  {pages.length === 0 && (
                     <div className="p-12 text-center text-on-surface-variant font-medium">Chưa có trang nào. Nhấn &quot;Tạo Trang Mới&quot; để bắt đầu.</div>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === "links" && (
            <div className="animate-fade-in-up">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div>
                  <h1 className="font-headline font-bold text-3xl text-on-surface">Menu & Liên kết Nội bộ</h1>
                  <p className="text-on-surface-variant text-sm mt-2">Cấu hình thanh điều hướng Navigation Bar một cách trực quan.</p>
                </div>
                <button 
                  onClick={() => { setEditingId(null); setFormData({ label: "", url: "" }); setIsLinkModalOpen(true); }}
                  className="bg-primary text-white px-6 py-3 rounded-lg text-sm font-bold flex items-center justify-center gap-2 hover:bg-[#004d45] transition-all shadow-md active:scale-95"
                >
                  <span className="material-symbols-outlined text-[20px]">add</span>
                  Thêm Link
                </button>
              </div>

              <div className="bg-white rounded-2xl border border-outline-variant/20 shadow-sm overflow-hidden p-6 md:p-8">
                <div className="space-y-4">
                  {links.map((link) => (
                    <div key={link.id} className="flex items-center justify-between p-4 border border-outline-variant/10 rounded-xl hover:border-primary/40 focus:bg-surface-container transition-all">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-lg bg-surface-container flex items-center justify-center text-secondary shrink-0">
                           <span className="material-symbols-outlined text-[20px]">link</span>
                        </div>
                        <div>
                          <div className="font-bold text-sm text-[#071e27] flex items-center gap-2">
                            {link.label}
                            {!link.visible && <span className="text-[10px] bg-red-100 text-red-600 px-2 py-0.5 rounded-md font-extrabold uppercase tracking-widest">Đã Ẩn</span>}
                          </div>
                          <div className="text-xs text-[#071e27]/50 mt-1 font-mono">{link.url}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <button 
                          onClick={() => { setEditingId(link.id); setFormData(link); setIsLinkModalOpen(true); }}
                          className="px-3 py-1.5 rounded-md text-xs font-bold text-primary hover:bg-primary/10 transition-colors flex items-center gap-1"
                        >
                          <span className="material-symbols-outlined text-[16px]">edit</span> Sửa
                        </button>
                        <button 
                          onClick={() => toggleLinkVisibility(link.id)}
                          className={`px-3 py-1.5 rounded-md text-xs font-bold transition-colors ${link.visible ? 'text-[#071e27]/50 hover:bg-surface-container hover:text-[#071e27]' : 'text-primary hover:bg-primary/10'}`}
                        >
                          {link.visible ? 'Ẩn' : 'Hiện'}
                        </button>
                        <button onClick={() => deleteLink(link.id)} className="w-8 h-8 rounded-md hover:bg-red-50 text-[#071e27]/50 hover:text-red-600 transition-colors flex justify-center items-center">
                          <span className="material-symbols-outlined text-[18px]">delete</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === "settings" && (
            <div className="animate-fade-in-up">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div>
                  <h1 className="font-headline font-bold text-3xl text-on-surface">Cài đặt Hệ thống & Tích hợp</h1>
                  <p className="text-on-surface-variant text-sm mt-2">Cấu hình kết nối API Chatbot AI và CRM qua Google Sheets.</p>
                </div>
                <div className="flex gap-3">
                  <button 
                    onClick={handleSyncFunds}
                    disabled={isSyncing}
                    className="bg-indigo-600 text-white px-6 py-3 rounded-lg text-sm font-bold flex items-center justify-center gap-2 hover:bg-indigo-700 transition-all shadow-md active:scale-95 disabled:opacity-50"
                  >
                    {isSyncing ? (
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                    ) : (
                      <span className="material-symbols-outlined text-[20px]">sync</span>
                    )}
                    {isSyncing ? 'Đang chạy...' : 'Crawl/Sync NAV Quỹ'}
                  </button>
                  <button 
                    onClick={() => alert("Đã lưu cấu hình hệ thống thành công!")}
                    className="bg-primary text-white px-6 py-3 rounded-lg text-sm font-bold flex items-center justify-center gap-2 hover:bg-[#004d45] transition-all shadow-md active:scale-95"
                  >
                    <span className="material-symbols-outlined text-[20px]">save</span>
                    Lưu Cấu hình
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Chatbot Config */}
                <div className="bg-white rounded-2xl border border-outline-variant/20 shadow-sm overflow-hidden p-6 md:p-8 shrink-0">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-12 h-12 bg-primary/10 text-primary rounded-xl flex items-center justify-center">
                       <span className="material-symbols-outlined text-3xl">smart_toy</span>
                    </div>
                    <div>
                      <h2 className="font-headline font-bold text-xl text-[#071e27]">Cấu hình Chatbot AI</h2>
                      <p className="text-sm text-[#071e27]/50">Kết nối OpenAI Api hoặc Gemini</p>
                    </div>
                  </div>
                  
                  <div className="space-y-5">
                    <div>
                      <label className="block text-xs font-extrabold text-[#071e27]/70 uppercase tracking-widest mb-2">Tên Trợ lý Ảo</label>
                      <input type="text" className="w-full px-4 py-3 rounded-xl border border-outline-variant/30 focus:border-primary outline-none transition-all font-medium text-sm text-[#071e27] bg-[#f3faff]/50" 
                        value={systemSettings.chatbotName || ""} onChange={(e) => setSystemSettings({...systemSettings, chatbotName: e.target.value})} />
                    </div>
                    <div>
                      <label className="block text-xs font-extrabold text-[#071e27]/70 uppercase tracking-widest mb-2">Nguồn Dữ liệu Kiến thức (URL Website / PDF / Doc)</label>
                      <input type="url" placeholder="https://docs.google.com/... hoặc link website" className="w-full px-4 py-3 rounded-xl border border-outline-variant/30 focus:border-primary outline-none transition-all font-mono text-sm text-[#071e27] bg-[#f3faff]/50" 
                        value={systemSettings.knowledgeBaseUrl || ""} onChange={(e) => setSystemSettings({...systemSettings, knowledgeBaseUrl: e.target.value})} />
                      <p className="text-[11px] text-[#071e27]/50 mt-2 font-mono leading-tight">Bot sẽ đọc và học dữ liệu (FAQ, bảng giá) từ link này để trả lời đúng thông tin nghiệp vụ.</p>
                    </div>
                    <div>
                      <label className="block text-xs font-extrabold text-[#071e27]/70 uppercase tracking-widest mb-2">System Prompt (Chỉ thị AI)</label>
                      <textarea className="w-full px-4 py-3 rounded-xl border border-outline-variant/30 focus:border-primary outline-none transition-all text-sm text-[#071e27] bg-[#f3faff]/50 h-32 resize-none leading-relaxed" 
                         value={systemSettings.chatbotPrompt || ""} onChange={(e) => setSystemSettings({...systemSettings, chatbotPrompt: e.target.value})} />
                    </div>
                  </div>
                </div>

                {/* Google Sheets CRM Config */}
                <div className="bg-white rounded-2xl border border-outline-variant/20 shadow-sm overflow-hidden p-6 md:p-8 shrink-0 flex flex-col">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-12 h-12 bg-green-500/10 text-green-600 rounded-xl flex items-center justify-center">
                       <span className="material-symbols-outlined text-3xl">table_chart</span>
                    </div>
                    <div>
                      <h2 className="font-headline font-bold text-xl text-[#071e27]">Tích hợp CRM (Google Sheets)</h2>
                      <p className="text-sm text-[#071e27]/50">Đồng bộ Form Đăng Ký và Request</p>
                    </div>
                  </div>
                  
                  <div className="space-y-5 flex-1">
                    <div>
                      <label className="block text-xs font-extrabold text-[#071e27]/70 uppercase tracking-widest mb-2">Google Apps Script Webhook URL</label>
                      <input type="text" placeholder="https://script.google.com/macros/s/..." className="w-full px-4 py-3 rounded-xl border border-outline-variant/30 focus:border-green-500 outline-none transition-all font-mono text-sm text-[#071e27] bg-green-50/50" 
                        value={systemSettings.sheetUrl || ""} onChange={(e) => setSystemSettings({...systemSettings, sheetUrl: e.target.value})} />
                      <p className="text-[11px] text-[#071e27]/50 mt-2 font-mono leading-tight">URL này dùng làm Endpoint nhận data cho Form Đăng ký KH, Form Lading Sale, và Request tư vấn.</p>
                    </div>
                    
                    <div className="pt-4 border-t border-outline-variant/10">
                      <label className="flex items-center gap-3 cursor-pointer">
                        <div className="relative">
                           <input type="checkbox" className="sr-only" checked={systemSettings.syncForms || false} onChange={(e) => setSystemSettings({...systemSettings, syncForms: e.target.checked})} />
                           <div className={`block w-10 h-6 rounded-full transition-colors ${systemSettings.syncForms ? 'bg-green-500' : 'bg-surface-variant'}`}></div>
                           <div className={`dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${systemSettings.syncForms ? 'transform translate-x-4' : ''}`}></div>
                        </div>
                        <span className="text-sm font-bold text-[#071e27]">Đồng bộ dữ liệu Form tự động</span>
                      </label>
                    </div>
                  </div>
                  
                  <div className="bg-blue-50/50 border border-blue-200 p-4 rounded-xl mt-6 flex gap-3 text-blue-800">
                    <span className="material-symbols-outlined text-blue-500">info</span>
                    <p className="text-xs leading-relaxed font-medium">Bạn có thể quản lý Data nội bộ mà không cần hệ thống cồng kềnh. Tất cả Form Request từ khách hàng sẽ được gởi thẳng đến Trang Google Sheet CRM của bạn để đội nhóm Sales có thể gọi chốt đơn.</p>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {activeTab === "dashboard" && (
            <div className="animate-fade-in-up py-32 text-center text-on-surface-variant">Tổng quan Dashboard sẽ cập nhật sau.</div>
          )}

          {activeTab === "homepage" && <HomeEditor />}

        </div>
      </main>

      {/* --- FULLSCREEN EDITOR: PAGE BUILDER --- */}
      {isPageModalOpen && (
        <div className="fixed inset-0 bg-surface-container-lowest z-[100] flex flex-col animate-fade-in">
          {/* Toolbar */}
          <div className="h-16 border-b border-outline-variant/20 bg-white flex items-center justify-between px-6 shrink-0 shadow-sm relative z-20">
            <div className="flex items-center gap-4">
              <button 
                type="button" onClick={() => setIsPageModalOpen(false)} 
                className="w-10 h-10 rounded-full hover:bg-surface-container flex items-center justify-center text-on-surface-variant transition-colors"
              >
                 <span className="material-symbols-outlined">arrow_back</span>
              </button>
              <h3 className="font-headline font-bold text-xl text-[#071e27]">{editingId ? 'Sửa: '+formData.title : 'Tạo Trang (Elementor Mode)'}</h3>
            </div>
            <button 
              onClick={handleSavePage}
              className="px-8 py-2.5 bg-primary text-white rounded-lg text-sm font-bold hover:bg-[#004d45] transition-all flex items-center gap-2"
            >
              <span className="material-symbols-outlined text-[18px]">publish</span>
              {editingId ? 'Cập nhật' : 'Xuất bản Trang'}
            </button>
          </div>
          
          <div className="flex flex-1 overflow-hidden">
             {/* Builder Sidebar */}
             <div className="w-80 bg-white border-r border-outline-variant/20 flex flex-col shrink-0 overflow-y-auto p-6 shadow-xl z-10 relative">
               <h4 className="font-bold text-xs uppercase tracking-widest text-primary mb-4 p-2 bg-primary/10 rounded-lg text-center">Settings</h4>
               <div className="space-y-4">
                 <input required type="text" className="w-full px-4 py-3 rounded-lg border border-outline-variant/30 text-sm font-bold bg-[#f3faff]/50" placeholder="Tiêu đề trang..." value={formData.title || ""} onChange={e => setFormData({...formData, title: e.target.value})} />
                 <input required type="text" className="w-full px-4 py-3 rounded-lg border border-outline-variant/30 text-sm font-mono bg-[#f3faff]/50" placeholder="/url-cua-ban" value={formData.slug || ""} onChange={e => setFormData({...formData, slug: e.target.value})} />
                 <select className="w-full px-4 py-3 rounded-lg border border-outline-variant/30 text-sm font-medium bg-[#f3faff]/50" value={formData.status || "draft"} onChange={e => setFormData({...formData, status: e.target.value})}>
                   <option value="published">Xuất bản Công khai</option>
                   <option value="draft">Bản nháp (Ẩn)</option>
                 </select>
               </div>
               
               <div className="my-6 h-[1px] bg-outline-variant/20 w-full"></div>
               
               <h4 className="font-bold text-xs uppercase tracking-widest text-[#071e27]/50 mb-4">Pro Elements</h4>
               <div className="grid grid-cols-2 gap-3 mb-6">
                 {/* Advanced Blocks */}
                 <button type="button" onClick={() => addBlock("hero")} className="flex flex-col items-center justify-center p-4 rounded-xl border border-outline-variant/20 bg-primary/5 text-primary hover:bg-primary hover:text-white transition-all group">
                   <span className="material-symbols-outlined text-[24px] mb-2">view_carousel</span>
                   <span className="text-xs font-bold text-center">Hero Section</span>
                 </button>
                 <button type="button" onClick={() => addBlock("columns")} className="flex flex-col items-center justify-center p-4 rounded-xl border border-outline-variant/20 bg-primary/5 text-primary hover:bg-primary hover:text-white transition-all group">
                   <span className="material-symbols-outlined text-[24px] mb-2">view_column_2</span>
                   <span className="text-xs font-bold text-center">Chia 2 Cột</span>
                 </button>
                 <button type="button" onClick={() => addBlock("features")} className="flex flex-col items-center justify-center p-4 rounded-xl border border-outline-variant/20 bg-primary/5 text-primary hover:bg-primary hover:text-white transition-all group col-span-2">
                   <span className="material-symbols-outlined text-[24px] mb-2">grid_view</span>
                   <span className="text-xs font-bold text-center">Lưới Tính Năng (3 cột)</span>
                 </button>
               </div>

               <h4 className="font-bold text-xs uppercase tracking-widest text-[#071e27]/50 mb-4">Basic Elements</h4>
               <div className="grid grid-cols-2 gap-3">
                 <button type="button" onClick={() => addBlock("header")} className="flex flex-col items-center justify-center p-4 rounded-xl border border-outline-variant/20 hover:border-primary hover:text-primary transition-all">
                   <span className="material-symbols-outlined text-[24px] mb-2 text-on-surface-variant">format_h2</span><span className="text-xs font-bold">Tiêu đề phụ</span>
                 </button>
                 <button type="button" onClick={() => addBlock("text")} className="flex flex-col items-center justify-center p-4 rounded-xl border border-outline-variant/20 hover:border-primary hover:text-primary transition-all">
                   <span className="material-symbols-outlined text-[24px] mb-2 text-on-surface-variant">subject</span><span className="text-xs font-bold">Đoạn văn</span>
                 </button>
                 <button type="button" onClick={() => addBlock("image")} className="flex flex-col items-center justify-center p-4 rounded-xl border border-outline-variant/20 hover:border-primary hover:text-primary transition-all">
                   <span className="material-symbols-outlined text-[24px] mb-2 text-on-surface-variant">image</span><span className="text-xs font-bold">Hình ảnh</span>
                 </button>
                 <button type="button" onClick={() => addBlock("button")} className="flex flex-col items-center justify-center p-4 rounded-xl border border-outline-variant/20 hover:border-primary hover:text-primary transition-all">
                   <span className="material-symbols-outlined text-[24px] mb-2 text-on-surface-variant">smart_button</span><span className="text-xs font-bold">Nút bấm</span>
                 </button>
               </div>
             </div>
             
             {/* Canvas Renderer */}
             <div className="flex-1 bg-surface overflow-y-auto p-4 md:p-12 relative">
               <div className="max-w-4xl mx-auto space-y-8">
                 <div className="text-center pb-8 border-b-2 border-dashed border-outline-variant/30">
                   <h1 className="font-headline font-extrabold text-5xl text-on-surface">{formData.title || "Trang Trống"}</h1>
                 </div>

                 {/* Render Blocks */}
                 {formData.blocks && formData.blocks.map((block: any) => (
                   <div key={block.id} className="group relative bg-white border outline-transparent focus-within:outline-primary/50 focus-within:border-primary rounded-2xl shadow-sm transition-all p-4 px-6 md:px-12">
                     {/* Delete Block */}
                     <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                       <button onClick={() => removeBlock(block.id)} className="w-8 h-8 rounded-md bg-red-50 text-red-500 hover:bg-red-500 hover:text-white flex items-center justify-center">
                         <span className="material-symbols-outlined text-[16px]">close</span>
                       </button>
                     </div>
                     <div className="absolute top-0 left-0 w-full h-1 bg-primary/20 group-hover:bg-primary transition-colors rounded-t-2xl"></div>

                     {/* -- ADVANCED: HERO -- */}
                     {block.type === 'hero' && (
                       <div className="space-y-4 py-4">
                         <div className="flex items-center gap-2 text-primary opacity-50 mb-2 font-mono text-xs uppercase"><span className="material-symbols-outlined text-[16px]">view_carousel</span> Hero Section</div>
                         <input type="text" placeholder="Tiêu đề Hero (Ví dụ: Chào mừng tới SaaS)" className="w-full text-center font-headline font-extrabold text-4xl outline-none placeholder:opacity-30" 
                           value={block.content?.title || ''} onChange={(e) => updateBlock(block.id, {...block.content, title: e.target.value})} />
                         <textarea placeholder="Mô tả dưới tiêu đề chính..." className="w-full text-center text-lg text-on-surface-variant outline-none resize-none h-16" 
                           value={block.content?.subtitle || ''} onChange={(e) => updateBlock(block.id, {...block.content, subtitle: e.target.value})} />
                         <div className="flex gap-4">
                           <input type="text" placeholder="Chữ trên Nút (CTA)" className="flex-1 border border-outline-variant/30 rounded-lg px-4 py-3 text-sm outline-none font-bold bg-transparent" 
                             value={block.content?.cta || ''} onChange={(e) => updateBlock(block.id, {...block.content, cta: e.target.value})} />
                           <input type="text" placeholder="URL liên kết (/url)" className="flex-1 border border-outline-variant/30 rounded-lg px-4 py-3 text-sm outline-none font-mono bg-transparent" 
                             value={block.content?.ctaUrl || ''} onChange={(e) => updateBlock(block.id, {...block.content, ctaUrl: e.target.value})} />
                           <input type="text" placeholder="Link ảnh nền (Tùy chọn)" className="flex-1 border border-outline-variant/30 rounded-lg px-4 py-3 text-sm outline-none font-mono bg-transparent" 
                             value={block.content?.bgImage || ''} onChange={(e) => updateBlock(block.id, {...block.content, bgImage: e.target.value})} />
                         </div>
                       </div>
                     )}

                     {/* -- ADVANCED: COLUMNS -- */}
                     {block.type === 'columns' && (
                       <div className="py-4">
                         <div className="flex items-center gap-2 text-primary opacity-50 mb-4 font-mono text-xs uppercase"><span className="material-symbols-outlined text-[16px]">view_column_2</span> Chia 2 Cột</div>
                         <div className="flex gap-6">
                           <textarea placeholder="Nội dung cột trái..." className="flex-1 border-2 border-dashed border-outline-variant/30 rounded-xl p-4 min-h-[150px] outline-none hover:border-primary/50 focus:border-primary bg-surface/10 resize-none text-sm" 
                             value={block.content?.left || ''} onChange={(e) => updateBlock(block.id, {...block.content, left: e.target.value})} />
                           <textarea placeholder="Nội dung cột phải..." className="flex-1 border-2 border-dashed border-outline-variant/30 rounded-xl p-4 min-h-[150px] outline-none hover:border-primary/50 focus:border-primary bg-surface/10 resize-none text-sm" 
                             value={block.content?.right || ''} onChange={(e) => updateBlock(block.id, {...block.content, right: e.target.value})} />
                         </div>
                       </div>
                     )}

                     {/* -- ADVANCED: FEATURES GRID -- */}
                     {block.type === 'features' && (
                       <div className="py-4">
                         <div className="flex items-center gap-2 text-primary opacity-50 mb-4 font-mono text-xs uppercase"><span className="material-symbols-outlined text-[16px]">grid_view</span> Lưới Tính Năng 3 Cột</div>
                         <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                           {[0, 1, 2].map(i => (
                             <div key={i} className="bg-surface-container-lowest p-5 rounded-2xl border border-outline-variant/20 shadow-sm space-y-3">
                               <input type="text" placeholder={`Tiêu đề thẻ ${i+1}`} className="w-full font-bold text-lg outline-none bg-transparent"
                                 value={(block.content || [])[i]?.title || ''} 
                                 onChange={(e) => {
                                   const newContent = [...(block.content || [{},{},{}])];
                                   newContent[i] = { ...newContent[i], title: e.target.value };
                                   updateBlock(block.id, newContent);
                                 }} />
                               <textarea placeholder={`Mô tả tính năng ${i+1}`} className="w-full text-sm text-on-surface-variant outline-none bg-transparent h-16 resize-none"
                                 value={(block.content || [])[i]?.desc || ''} 
                                 onChange={(e) => {
                                   const newContent = [...(block.content || [{},{},{}])];
                                   newContent[i] = { ...newContent[i], desc: e.target.value };
                                   updateBlock(block.id, newContent);
                                 }} />
                               <div className="flex gap-2 pt-2 border-t border-outline-variant/10">
                                 <input type="text" placeholder="Nhãn nút (VD: Khám phá →)" className="w-1/2 text-xs font-bold text-primary outline-none bg-transparent"
                                   value={(block.content || [])[i]?.ctaText || ''} 
                                   onChange={(e) => {
                                     const newContent = [...(block.content || [{},{},{}])];
                                     newContent[i] = { ...newContent[i], ctaText: e.target.value };
                                     updateBlock(block.id, newContent);
                                   }} />
                                 <input type="text" placeholder="/url-dich-vu" className="w-1/2 text-xs font-mono text-on-surface-variant outline-none bg-transparent"
                                   value={(block.content || [])[i]?.url || ''} 
                                   onChange={(e) => {
                                     const newContent = [...(block.content || [{},{},{}])];
                                     newContent[i] = { ...newContent[i], url: e.target.value };
                                     updateBlock(block.id, newContent);
                                   }} />
                               </div>
                             </div>
                           ))}
                         </div>
                       </div>
                     )}

                     {/* -- BASIC: HEADER -- */}
                     {block.type === 'header' && (
                       <input type="text" placeholder="Nhập tiêu đề phụ (vd: Tính năng nổi bật)..." className="w-full bg-transparent outline-none font-headline font-bold text-3xl text-on-surface py-4 placeholder:text-on-surface-variant/30"
                         value={block.content} onChange={(e) => updateBlock(block.id, e.target.value)} />
                     )}
                     
                     {/* -- BASIC: TEXT -- */}
                     {block.type === 'text' && (
                       <textarea placeholder="Bắt đầu nhập nội dung đoạn văn..." className="w-full bg-transparent outline-none text-lg text-on-surface-variant leading-relaxed py-4 min-h-[120px] resize-none placeholder:text-on-surface-variant/30 font-body"
                         value={block.content} onChange={(e) => updateBlock(block.id, e.target.value)} />
                     )}

                     {/* -- BASIC: IMAGE -- */}
                      {block.type === 'image' && (
                        <div className="py-6 space-y-3">
                           <div className="bg-surface-container-lowest border-2 border-dashed border-outline-variant/30 rounded-xl p-8 text-center relative overflow-hidden group/img">
                              {(typeof block.content === 'object' ? block.content?.src : block.content) ? (
                                <img src={typeof block.content === 'object' ? block.content?.src : block.content} className="w-full h-64 object-cover rounded-lg shadow-sm" alt="Preview" />
                              ) : (
                                <div className="py-8"><span className="material-symbols-outlined text-4xl text-on-surface-variant opacity-50 mb-2">add_photo_alternate</span><p className="text-sm font-bold text-on-surface-variant mb-1">Dán đường dẫn Hình ảnh (URL)</p></div>
                              )}
                              <div className="absolute bottom-4 left-4 right-4 bg-white/90 backdrop-blur-md px-4 py-2 rounded-lg flex gap-2 items-center opacity-0 group-hover/img:opacity-100 transition-opacity border border-outline-variant/20 shadow-md">
                                <span className="material-symbols-outlined text-primary text-[18px]">image</span>
                                <input type="text" placeholder="Dán link ảnh vào đây..." className="flex-1 bg-transparent text-sm font-mono outline-none text-primary"
                                  value={typeof block.content === 'object' ? block.content?.src || '' : block.content || ''} 
                                  onChange={(e) => updateBlock(block.id, { src: e.target.value, url: typeof block.content === 'object' ? block.content?.url || '' : '' })} />
                              </div>
                           </div>
                           <div className="flex items-center gap-2 px-2">
                              <span className="material-symbols-outlined text-secondary text-[18px]">link</span>
                              <input type="text" placeholder="Hyperlink khi bấm vào ảnh (VD: /dang-ky hoặc https://...)" 
                                className="flex-1 text-sm font-mono outline-none border-b border-outline-variant/30 pb-1 text-secondary bg-transparent"
                                value={typeof block.content === 'object' ? block.content?.url || '' : ''} 
                                onChange={(e) => updateBlock(block.id, { src: typeof block.content === 'object' ? block.content?.src || '' : block.content || '', url: e.target.value })} />
                           </div>
                        </div>
                      )}

                     {block.type === 'button' && (
                       <div className="py-6 text-center border-2 border-dashed border-transparent focus-within:border-primary/30 rounded-xl transition-all flex flex-col items-center justify-center gap-3">
                           <input type="text" placeholder="Tên nút bấm (vd: Đăng ký ngay)" className="inline-block bg-primary text-white text-center px-8 py-3 rounded-lg font-bold outline-none placeholder:text-white/50 min-w-[200px]"
                             value={typeof block.content === 'object' ? block.content?.text : block.content} 
                             onChange={(e) => updateBlock(block.id, { text: e.target.value, url: typeof block.content === 'object' ? block.content?.url : '' })} />
                           <input type="text" placeholder="Nhập đường dẫn URL vào đây (/url)..." className="text-center font-mono text-sm outline-none border-b border-outline-variant/30 pb-1 text-primary w-64 bg-transparent"
                             value={typeof block.content === 'object' ? block.content?.url : ''} 
                             onChange={(e) => updateBlock(block.id, { text: typeof block.content === 'object' ? block.content?.text : block.content, url: e.target.value })} />
                       </div>
                     )}
                   </div>
                 ))}

                 {(!formData.blocks || formData.blocks.length === 0) && (
                   <div className="text-center py-24 border-2 border-dashed border-primary/20 bg-primary/5 rounded-3xl">
                     <span className="material-symbols-outlined text-5xl text-primary opacity-50 mb-4">edit_document</span>
                     <h3 className="font-headline font-bold text-xl text-primary mb-2">Kéo thả & Xây dựng Trang</h3>
                     <p className="text-sm text-primary/70">Sử dụng các Pro/Basic Elements ở cột bên trái để thiết kế.</p>
                   </div>
                 )}
               </div>
             </div>
          </div>
        </div>
      )}

      {/* --- MODAL: LINK --- */}
      {isLinkModalOpen && (
        <div className="fixed inset-0 bg-[#071e27]/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl relative overflow-hidden animate-fade-in">
             <div className="h-2 bg-gradient-to-r from-primary to-secondary w-full"></div>
             <div className="p-6">
               <div className="flex justify-between items-center mb-6">
                 <h3 className="font-headline font-bold text-xl text-[#071e27]">{editingId ? 'Chỉnh sửa Liên kết' : 'Thêm Liên kết Mới'}</h3>
                 <button type="button" onClick={() => setIsLinkModalOpen(false)} className="text-[#071e27]/40 hover:text-[#071e27]">
                    <span className="material-symbols-outlined">close</span>
                 </button>
               </div>
               
               <form onSubmit={handleSaveLink} className="space-y-4">
                 <div>
                   <label className="block text-xs font-extrabold text-[#071e27]/70 uppercase tracking-widest mb-2">Tên hiển thị (Label)</label>
                   <input required type="text" className="w-full px-4 py-3 rounded-xl border border-outline-variant/30 focus:border-primary outline-none transition-all font-medium text-sm text-[#071e27] bg-[#f3faff]/50" placeholder="VD: Khuyến mãi"
                     value={formData.label || ""} onChange={e => setFormData({...formData, label: e.target.value})}/>
                 </div>
                 <div>
                   <label className="block text-xs font-extrabold text-[#071e27]/70 uppercase tracking-widest mb-2">Đường dẫn (/url)</label>
                   <input required type="text" className="w-full px-4 py-3 rounded-xl border border-outline-variant/30 focus:border-primary outline-none transition-all font-mono text-sm text-[#071e27] bg-[#f3faff]/50" placeholder="/khuyen-mai"
                     value={formData.url || ""} onChange={e => setFormData({...formData, url: e.target.value})}/>
                 </div>
                 <div className="mt-8 flex justify-end gap-3 pt-4 border-t border-outline-variant/10">
                   <button type="button" onClick={() => setIsLinkModalOpen(false)} className="px-5 py-2.5 rounded-lg text-sm font-bold text-on-surface-variant hover:bg-surface-container transition-colors">Hủy bỏ</button>
                   <button type="submit" className="px-6 py-2.5 bg-primary text-white rounded-lg text-sm font-bold hover:bg-[#004d45] transition-all">Lưu Link</button>
                 </div>
               </form>
             </div>
          </div>
        </div>
      )}
    </div>
  );
}
