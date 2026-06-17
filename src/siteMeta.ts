/**
 * Shared Open Graph and Twitter Card metadata for public pages.
 */

/** Canonical site origin for absolute social preview URLs. */
export const SITE_ORIGIN = "https://csp-playground.dev";

/** Path to the social preview image in `public/` (1200 × 464 px). */
export const OG_IMAGE_PATH = "/og-image.jpg";

/** Social preview image width in pixels. */
export const OG_IMAGE_WIDTH = 1200;

/** Social preview image height in pixels. */
export const OG_IMAGE_HEIGHT = 464;

/** Site name shown in Open Graph metadata. */
export const SITE_NAME = "CSP Builder";

/** Page keys supported by {@link renderSiteMetaHtml}. */
export type SiteMetaPage = "home" | "whyCsp";

/** Per-page title, description, and canonical path. */
export const SITE_PAGE_META: Record<
  SiteMetaPage,
  { title: string; description: string; path: string }
> = {
  home: {
    title: "CSP Builder",
    description:
      "Build a Content Security Policy (CSP) header with an accessible form-based tool.",
    path: "/",
  },
  whyCsp: {
    title: "Why use a Content Security Policy? | CSP Builder",
    description:
      "Why your website should use a Content Security Policy (CSP) and the security benefits it provides.",
    path: "/why-csp.html",
  },
};

function absoluteUrl(path: string): string {
  return `${SITE_ORIGIN}${path}`;
}

function escapeHtmlAttribute(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

/**
 * Returns `<head>` meta tags for Open Graph and Twitter Card previews.
 *
 * @param page - Which public page is being rendered.
 */
export function renderSiteMetaHtml(page: SiteMetaPage): string {
  const { title, description, path } = SITE_PAGE_META[page];
  const pageUrl = absoluteUrl(path);
  const imageUrl = absoluteUrl(OG_IMAGE_PATH);
  const imageAlt = `${SITE_NAME} — ${description}`;

  const attrs = {
    title: escapeHtmlAttribute(title),
    description: escapeHtmlAttribute(description),
    pageUrl: escapeHtmlAttribute(pageUrl),
    imageUrl: escapeHtmlAttribute(imageUrl),
    imageAlt: escapeHtmlAttribute(imageAlt),
    siteName: escapeHtmlAttribute(SITE_NAME),
  };

  return `<meta property="og:type" content="website" />
    <meta property="og:site_name" content="${attrs.siteName}" />
    <meta property="og:title" content="${attrs.title}" />
    <meta property="og:description" content="${attrs.description}" />
    <meta property="og:url" content="${attrs.pageUrl}" />
    <meta property="og:locale" content="en_GB" />
    <meta property="og:image" content="${attrs.imageUrl}" />
    <meta property="og:image:width" content="${OG_IMAGE_WIDTH}" />
    <meta property="og:image:height" content="${OG_IMAGE_HEIGHT}" />
    <meta property="og:image:alt" content="${attrs.imageAlt}" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${attrs.title}" />
    <meta name="twitter:description" content="${attrs.description}" />
    <meta name="twitter:image" content="${attrs.imageUrl}" />
    <meta name="twitter:image:alt" content="${attrs.imageAlt}" />`;
}

/**
 * Resolves which page metadata to inject from a Vite HTML entry filename.
 *
 * @param filename - Absolute or relative path to the HTML entry (for example `why-csp.html`).
 */
export function siteMetaPageFromFilename(filename: string): SiteMetaPage {
  return filename.includes("why-csp") ? "whyCsp" : "home";
}
