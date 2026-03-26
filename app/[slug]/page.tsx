"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

export default function GenericPage() {
  const params = useParams();
  const slug = params.slug as string;
  const fullSlug = `/${slug}`;

  const [pageData, setPageData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadPage = async () => {
      try {
        const res = await fetch("/api/config?key=pages");
        const data = await res.json();
        if (data.value && Array.isArray(data.value)) {
          const foundPage = data.value.find((p: any) => p.slug === fullSlug || p.slug === slug);
          if (foundPage && foundPage.status === "published") {
            setPageData(foundPage);
          }
        }
      } catch (e) {
        console.error("Failed to load page config:", e);
      }
      setLoading(false);
    };
    loadPage();
  }, [fullSlug, slug]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface pt-16">
        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!pageData) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-surface pt-16 text-center px-4">
        <div className="w-24 h-24 bg-surface-container rounded-full flex items-center justify-center text-primary mb-6">
          <span className="material-symbols-outlined text-4xl">travel_explore</span>
        </div>
        <h1 className="font-headline font-bold text-4xl text-on-surface mb-4">404 - Trang không tồn tại</h1>
        <p className="text-on-surface-variant max-w-md mx-auto mb-8">
          Đường dẫn <strong>{fullSlug}</strong> không tồn tại hoặc chưa được xuất bản. Vui lòng kiểm tra lại URL hoặc quay về trang chủ.
        </p>
        <Link href="/" className="bg-primary text-white px-6 py-3 rounded-lg font-bold hover:shadow-lg transition-all">
          Quay về Trang chủ
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface pt-[64px]">
      
      {/* 
        If the first block is a Hero, we render it directly as the Header.
        If not, we render a default page header. 
      */}
      {(!pageData.blocks || pageData.blocks.length === 0 || pageData.blocks[0].type !== 'hero') && (
        <div className="bg-surface-container-lowest py-16 border-b border-outline-variant/10 mb-12 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-primary/5 to-transparent pointer-events-none"></div>
          <div className="max-w-4xl mx-auto px-8 relative z-10 text-center">
            <h1 className="font-headline font-extrabold text-4xl md:text-5xl text-on-surface mb-4">{pageData.title}</h1>
            <p className="text-on-surface-variant font-medium">Tạo bởi Nguyen Page Elementor</p>
          </div>
        </div>
      )}

      {/* Dynamic Content Blocks */}
      <div className="pb-20">
        {pageData.blocks && pageData.blocks.length > 0 ? (
          pageData.blocks.map((block: any) => {
            switch (block.type) {
              case "hero":
                return (
                  <div key={block.id} className="relative bg-surface-container-lowest py-24 md:py-32 mb-12 flex flex-col items-center justify-center text-center overflow-hidden border-b border-outline-variant/10">
                    {block.content?.bgImage && (
                      <div className="absolute inset-0">
                         <img src={block.content.bgImage} className="w-full h-full object-cover" alt="Hero background" />
                         <div className="absolute inset-0 bg-white/80 backdrop-blur-sm"></div>
                      </div>
                    )}
                    <div className="relative z-10 max-w-4xl px-6">
                      <h1 className="font-headline font-extrabold text-5xl md:text-6xl text-primary tracking-tight mb-6">{block.content?.title || 'Tiêu đề Hero'}</h1>
                      {block.content?.subtitle && <p className="text-xl md:text-2xl text-on-surface-variant mb-10 leading-relaxed font-body max-w-2xl mx-auto">{block.content.subtitle}</p>}
                      {block.content?.cta && (
                        <Link href={block.content.ctaUrl || "#"} className="inline-block bg-primary text-white px-10 py-4 rounded-xl font-extrabold text-lg hover:bg-[#004d45] transition-all shadow-xl shadow-primary/20 hover:scale-105">
                          {block.content.cta}
                        </Link>
                      )}
                    </div>
                  </div>
                );
              
              case "features":
                return (
                  <div key={block.id} className="max-w-6xl mx-auto px-6 lg:px-8 my-16">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                       {(block.content || []).map((feat: any, i: number) => {
                         const cardContent = (
                           <div className="bg-white p-8 rounded-3xl border border-outline-variant/20 shadow-lg shadow-surface-variant/20 hover:-translate-y-2 transition-transform duration-300 h-full flex flex-col">
                             <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center text-primary mb-6 shrink-0">
                                <span className="material-symbols-outlined text-[28px]">stars</span>
                             </div>
                             <h3 className="font-headline font-bold text-2xl text-on-surface mb-3">{feat.title || 'Tính năng'}</h3>
                             <p className="text-on-surface-variant leading-relaxed text-sm md:text-base flex-1">{feat.desc || 'Mô tả chi tiết về tính năng này...'}</p>
                             {feat.ctaText && (
                               <div className="mt-6 pt-4 border-t border-outline-variant/10 text-primary font-bold text-sm tracking-wide flex items-center gap-1 group-hover:gap-2 transition-all">
                                 {feat.ctaText} <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                               </div>
                             )}
                           </div>
                         );
                         return feat.url ? (
                           <Link key={i} href={feat.url} className="block group h-full">
                             {cardContent}
                           </Link>
                         ) : (
                           <div key={i} className="group h-full">{cardContent}</div>
                         );
                       })}
                    </div>
                  </div>
                );
              
              case "columns":
                return (
                  <div key={block.id} className="max-w-6xl mx-auto px-6 lg:px-8 my-12">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-12 lg:gap-20 items-center">
                       <div className="prose prose-lg text-on-surface-variant leading-relaxed font-medium whitespace-pre-wrap">{block.content?.left}</div>
                       <div className="prose prose-lg text-on-surface-variant leading-relaxed font-medium whitespace-pre-wrap">{block.content?.right}</div>
                    </div>
                  </div>
                );

              case "header":
                return <div key={block.id} className="max-w-4xl mx-auto px-6 lg:px-8"><h2 className="font-headline font-bold text-3xl text-on-surface mt-12 mb-6">{block.content}</h2></div>;
              
              case "text":
                return <div key={block.id} className="max-w-4xl mx-auto px-6 lg:px-8"><p className="text-on-surface-variant text-lg leading-relaxed whitespace-pre-wrap">{block.content}</p></div>;
              
              case "image":
                return (
                  <div key={block.id} className="max-w-5xl mx-auto px-6 lg:px-8 my-10">
                    <div className="rounded-3xl overflow-hidden shadow-2xl shadow-surface-variant/30 border border-outline-variant/10">
                      <img src={block.content || 'https://via.placeholder.com/800x400?text=No+Image'} alt="Dynamic content" className="w-full h-auto object-cover" />
                    </div>
                  </div>
                );
              
              case "button":
                const btnText = typeof block.content === 'object' ? block.content?.text : block.content;
                const btnUrl = typeof block.content === 'object' ? block.content?.url : "#";
                return (
                  <div key={block.id} className="max-w-4xl mx-auto px-6 lg:px-8 py-4 text-center">
                    <Link href={btnUrl || "#"} className="inline-block bg-primary text-white px-8 py-3 rounded-lg font-bold hover:bg-[#004d45] transition-colors shadow-md">
                      {btnText || 'Click Here'}
                    </Link>
                  </div>
                );
              default:
                return null;
            }
          })
        ) : (
          <div className="max-w-4xl mx-auto px-8">
            <div className="p-12 text-center border-2 border-dashed border-outline-variant/30 rounded-2xl bg-surface-container-low text-on-surface-variant">
              Trang này chưa có nội dung. Quản trị viên vui lòng sử dụng Canva Builder để thêm block.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
