import Link from "next/link";
import { notFound } from "next/navigation";
import PageBlocksRenderer from "@/components/PageBlocksRenderer";
import { getConfiguredPage } from "@/lib/sitePages";
import { getPage } from "@/lib/sheet";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export const dynamic = "force-dynamic";

export default async function ServicePage({ params }: PageProps) {
  const { slug } = await params;
  const configuredPage = await getConfiguredPage(`/service/${slug}`);

  if (configuredPage && configuredPage.status !== "draft") {
    return (
      <div className="px-6 pb-24 pt-10 md:px-8 md:pt-16">
        <div className="mx-auto max-w-7xl">
          <div className="mb-8">
            <Link
              href="/"
              className="inline-flex items-center gap-2 rounded-full border border-outline-variant/70 bg-white/80 px-4 py-2 text-sm font-semibold text-on-surface hover:text-primary"
            >
              <span className="material-symbols-outlined text-[18px]">arrow_back</span>
              Ve trang chu
            </Link>
          </div>
          <PageBlocksRenderer
            title={configuredPage.title}
            blocks={configuredPage.blocks || []}
          />
        </div>
      </div>
    );
  }

  const sheetPage = await getPage(slug);
  if (!sheetPage) {
    notFound();
  }

  return (
    <div className="px-6 pb-24 pt-10 md:px-8 md:pt-16">
      <div className="mx-auto max-w-4xl">
        <div className="mb-8">
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-full border border-outline-variant/70 bg-white/80 px-4 py-2 text-sm font-semibold text-on-surface hover:text-primary"
          >
            <span className="material-symbols-outlined text-[18px]">arrow_back</span>
            Ve trang chu
          </Link>
        </div>

        <div className="glass rounded-[2rem] p-8 shadow-[0_18px_36px_rgba(16,32,51,0.08)]">
          <h1 className="font-headline text-4xl font-extrabold gradient-text">{sheetPage.title}</h1>
          <div className="mt-6 space-y-4 text-base leading-8 text-on-surface-variant whitespace-pre-line">
            {sheetPage.content}
          </div>
        </div>
      </div>
    </div>
  );
}
