import Link from "next/link";
import { notFound } from "next/navigation";
import PageBlocksRenderer from "@/components/PageBlocksRenderer";
import { getConfiguredPage } from "@/lib/sitePages";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export const dynamic = "force-dynamic";

export default async function GenericPage({ params }: PageProps) {
  const { slug } = await params;
  const page = await getConfiguredPage(`/${slug}`);

  if (!page || page.status === "draft") {
    notFound();
  }

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

        {page.blocks?.length ? (
          <PageBlocksRenderer title={page.title} blocks={page.blocks} />
        ) : (
          <div className="rounded-[1.8rem] border border-outline-variant/60 bg-white p-8 text-center text-on-surface-variant shadow-[0_16px_30px_rgba(16,32,51,0.05)]">
            Trang nay chua co block. Ban co the them noi dung trong Admin &gt; Page Builder.
          </div>
        )}
      </div>
    </div>
  );
}
