import { useEffect } from "react";

const BASE_URL = "https://avodanow.co.il";
const DEFAULT_OG_IMAGE = "https://d2xsxph8kpxj0f.cloudfront.net/310519663359495587/REsBLBseSeXTZwj6TLp8WJ/og-default-29zavHYfF5qrQJEhQy9iTk.png";

interface SEOOptions {
  title?: string;
  description?: string;
  ogImage?: string;
  /** Canonical URL path, e.g. "/find-jobs" or "/find-jobs?city=תל אביב" */
  canonical?: string;
  /** Prevent search engines from indexing this page */
  noIndex?: boolean;
  /** Comma-separated keywords for the meta keywords tag */
  keywords?: string;
}

function setMeta(name: string, content: string, attr: "name" | "property" = "name") {
  let el = document.querySelector<HTMLMetaElement>(`meta[${attr}="${name}"]`);
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, name);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
}

function setLink(rel: string, href: string) {
  let el = document.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`);
  if (!el) {
    el = document.createElement("link");
    el.setAttribute("rel", rel);
    document.head.appendChild(el);
  }
  el.setAttribute("href", href);
}

export function useSEO({
  title,
  description,
  ogImage,
  canonical,
  noIndex = false,
  keywords,
}: SEOOptions) {
  useEffect(() => {
    const fullTitle = title
      ? `${title} | AvodaNow`
      : "AvodaNow | מצא עבודה או עובדים עכשיו";
    const fullDescription =
      description ?? "לוח דרושים מהיר ופשוט. מצא עבודות זמניות קרוב אליך.";
    const fullOgImage = ogImage ?? DEFAULT_OG_IMAGE;
    const canonicalUrl = canonical
      ? `${BASE_URL}${canonical}`
      : `${BASE_URL}${window.location.pathname}`;

    // Title
    document.title = fullTitle;

    // Standard meta
    setMeta("description", fullDescription);
    if (keywords) setMeta("keywords", keywords);

    // Open Graph
    setMeta("og:title", fullTitle, "property");
    setMeta("og:description", fullDescription, "property");
    setMeta("og:image", fullOgImage, "property");
    setMeta("og:url", canonicalUrl, "property");
    setMeta("og:type", "website", "property");
    setMeta("og:locale", "he_IL", "property");
    setMeta("og:site_name", "AvodaNow", "property");

    // Twitter Card
    setMeta("twitter:card", "summary_large_image");
    setMeta("twitter:title", fullTitle);
    setMeta("twitter:description", fullDescription);
    setMeta("twitter:image", fullOgImage);

    // Canonical
    setLink("canonical", canonicalUrl);

    // Robots
    setMeta("robots", noIndex ? "noindex,nofollow" : "index,follow");
  }, [title, description, ogImage, canonical, noIndex, keywords]);
}
