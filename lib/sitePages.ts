import { getConfigValue } from "@/lib/siteConfigStore";
import {
  defaultSitePages,
  mergeWithDefaultSitePages,
  type SitePage,
} from "@/lib/siteConfigDefaults";

export async function getConfiguredPages(): Promise<SitePage[]> {
  const pages = await getConfigValue<SitePage[]>("pages", defaultSitePages);
  return Array.isArray(pages) && pages.length > 0 ? mergeWithDefaultSitePages(pages) : defaultSitePages;
}

export async function getConfiguredPage(slug: string): Promise<SitePage | null> {
  const pages = await getConfiguredPages();
  return (
    pages.find((page) => {
      if (!page?.slug) return false;
      const normalized = page.slug.startsWith("/") ? page.slug : `/${page.slug}`;
      return normalized === slug;
    }) || null
  );
}
