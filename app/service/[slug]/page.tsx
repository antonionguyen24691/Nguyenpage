import { getPage } from "@/lib/sheet";
import Link from "next/link";
import { notFound } from "next/navigation";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export default async function ServicePage({ params }: PageProps) {
  const { slug } = await params;
  const page = await getPage(slug);

  if (!page) {
    notFound();
  }

  return (
    <div className="min-h-screen relative">
      <div className="particles-bg" />

      {/* Nav */}
      <nav className="glass sticky top-0 z-40 px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <Link href="/" className="text-lg font-bold gradient-text hover:opacity-80 transition-opacity">
            ← Banker System
          </Link>
        </div>
      </nav>

      <main className="max-w-3xl mx-auto px-6 py-16">
        <div className="glass rounded-2xl p-10 glow animate-fade-in-up">
          <h1 className="text-3xl font-bold gradient-text mb-6">{page.title}</h1>
          <div className="text-[var(--muted)] leading-relaxed whitespace-pre-line text-base">
            {page.content}
          </div>
        </div>
      </main>
    </div>
  );
}
