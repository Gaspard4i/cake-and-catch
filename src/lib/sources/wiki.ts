const BASE = "https://wiki.cobblemon.com";
const UA = "cake-and-catch/0.1 (contact: quatrei.gaspard@gmail.com)";

export interface WikiSummary {
  title: string;
  url: string;
  extract: string;
}

interface MediaWikiExtractResponse {
  query?: {
    pages?: Record<
      string,
      {
        pageid?: number;
        title: string;
        extract?: string;
        missing?: boolean | "";
      }
    >;
  };
}

/**
 * Fetches the intro (first plain-text section) for a page.
 * Returns null if the page does not exist on the wiki.
 */
export async function fetchWikiSummary(title: string): Promise<WikiSummary | null> {
  const url = new URL(`${BASE}/api.php`);
  url.searchParams.set("action", "query");
  url.searchParams.set("prop", "extracts");
  url.searchParams.set("exintro", "1");
  url.searchParams.set("explaintext", "1");
  url.searchParams.set("redirects", "1");
  url.searchParams.set("format", "json");
  url.searchParams.set("titles", title);

  const res = await fetch(url, {
    headers: { "User-Agent": UA, Accept: "application/json" },
  });
  if (!res.ok) return null;
  const data = (await res.json()) as MediaWikiExtractResponse;
  const pages = data.query?.pages;
  if (!pages) return null;
  const page = Object.values(pages)[0];
  if (!page || page.missing === "" || page.missing === true) return null;
  if (!page.extract) return null;
  return {
    title: page.title,
    url: `${BASE}/index.php?title=${encodeURIComponent(page.title.replaceAll(" ", "_"))}`,
    extract: page.extract.trim(),
  };
}
