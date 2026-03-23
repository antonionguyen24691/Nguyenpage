export async function getPage(slug: string) {
  const res = await fetch(
    `https://opensheet.elk.sh/${process.env.SHEET_ID || "YOUR_SHEET_ID"}/pages`,
    { next: { revalidate: 60 } }
  );
  const data = await res.json();
  return data.find((p: { slug: string; title: string; content: string }) => p.slug === slug) || null;
}
