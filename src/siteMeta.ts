/**
 * Shared SEO, Open Graph, and Twitter Card metadata for public pages.
 */

/** Canonical site origin for absolute URLs and social previews. */
export const SITE_ORIGIN = "https://csp-playground.dev";

/** Path to the social preview image in `public/` (1200 × 464 px). */
export const OG_IMAGE_PATH = "/og-image.jpg";

/** Social preview image width in pixels. */
export const OG_IMAGE_WIDTH = 1200;

/** Social preview image height in pixels. */
export const OG_IMAGE_HEIGHT = 464;

/** MIME type of the social preview image. */
export const OG_IMAGE_TYPE = "image/jpeg";

/** Site name shown in Open Graph metadata. */
export const SITE_NAME = "CSP Playground";

/** Page keys supported by {@link renderSiteMetaHtml}. */
export type SiteMetaPage = "home" | "whyCsp";

/** Recommended max lengths for search and social preview snippets. */
export const META_DESCRIPTION_MAX_LENGTH = 160;
export const OG_DESCRIPTION_MAX_LENGTH = 125;

/** Per-page SEO fields and canonical path. */
export const SITE_PAGE_META: Record<
  SiteMetaPage,
  {
    title: string;
    /** Meta description and JSON-LD (≤ {@link META_DESCRIPTION_MAX_LENGTH} chars). */
    description: string;
    /** Open Graph and Twitter description (≤ {@link OG_DESCRIPTION_MAX_LENGTH} chars). */
    ogDescription: string;
    path: string;
    imageAlt: string;
    schemaType: "WebApplication" | "Article";
  }
> = {
  home: {
    title: "Content Security Policy Header Generator | CSP Playground",
    description:
      "Build and validate Content Security Policy headers in your browser. Import policies, score your CSP, and copy server snippets for Apache, Nginx, and Caddy.",
    ogDescription:
      "Build CSP headers in your browser. Import policies, score security, and copy snippets for Apache, Nginx, Caddy, and more.",
    path: "/",
    imageAlt: "Content Security Policy header generator — CSP Playground",
    schemaType: "WebApplication",
  },
  whyCsp: {
    title: "Why Use Content Security Policy (CSP)? | CSP Playground",
    description:
      "Learn why Content Security Policy matters for XSS protection, what risks you face without a CSP, and how to adopt a policy safely with report-only mode.",
    ogDescription:
      "Why CSP matters for XSS protection, risks without a policy, and how to adopt one safely with report-only mode.",
    path: "/why-csp.html",
    imageAlt:
      "Why use Content Security Policy — security guide from CSP Playground",
    schemaType: "Article",
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

function renderJsonLd(page: SiteMetaPage, pageUrl: string): string {
  const { title, description, schemaType } = SITE_PAGE_META[page];
  const imageUrl = absoluteUrl(OG_IMAGE_PATH);

  const schema =
    schemaType === "WebApplication"
      ? {
          "@context": "https://schema.org",
          "@type": "WebApplication",
          name: SITE_NAME,
          url: pageUrl,
          description,
          applicationCategory: "DeveloperApplication",
          operatingSystem: "Any",
          image: imageUrl,
          offers: {
            "@type": "Offer",
            price: "0",
            priceCurrency: "USD",
          },
        }
      : {
          "@context": "https://schema.org",
          "@type": "Article",
          headline: title,
          description,
          url: pageUrl,
          image: imageUrl,
          author: {
            "@type": "Organization",
            name: SITE_NAME,
          },
          publisher: {
            "@type": "Organization",
            name: SITE_NAME,
          },
        };

  return `<script type="application/ld+json">${JSON.stringify(schema)}</script>`;
}

/**
 * Returns `<head>` SEO tags: description, canonical, Open Graph, Twitter Card,
 * and JSON-LD structured data.
 *
 * @param page - Which public page is being rendered.
 */
export function renderSiteMetaHtml(page: SiteMetaPage): string {
  const { title, description, ogDescription, path, imageAlt } =
    SITE_PAGE_META[page];
  const pageUrl = absoluteUrl(path);
  const imageUrl = absoluteUrl(OG_IMAGE_PATH);

  const attrs = {
    title: escapeHtmlAttribute(title),
    description: escapeHtmlAttribute(description),
    ogDescription: escapeHtmlAttribute(ogDescription),
    pageUrl: escapeHtmlAttribute(pageUrl),
    imageUrl: escapeHtmlAttribute(imageUrl),
    imageAlt: escapeHtmlAttribute(imageAlt),
    siteName: escapeHtmlAttribute(SITE_NAME),
  };

  return `<title>${attrs.title}</title>
    <meta name="description" content="${attrs.description}" />
    <link rel="canonical" href="${attrs.pageUrl}" />
    <meta property="og:type" content="website" />
    <meta property="og:site_name" content="${attrs.siteName}" />
    <meta property="og:title" content="${attrs.title}" />
    <meta property="og:description" content="${attrs.ogDescription}" />
    <meta property="og:url" content="${attrs.pageUrl}" />
    <meta property="og:locale" content="en_GB" />
    <meta property="og:image" content="${attrs.imageUrl}" />
    <meta property="og:image:secure_url" content="${attrs.imageUrl}" />
    <meta property="og:image:type" content="${OG_IMAGE_TYPE}" />
    <meta property="og:image:width" content="${OG_IMAGE_WIDTH}" />
    <meta property="og:image:height" content="${OG_IMAGE_HEIGHT}" />
    <meta property="og:image:alt" content="${attrs.imageAlt}" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${attrs.title}" />
    <meta name="twitter:description" content="${attrs.ogDescription}" />
    <meta name="twitter:image" content="${attrs.imageUrl}" />
    <meta name="twitter:image:alt" content="${attrs.imageAlt}" />
    ${renderJsonLd(page, pageUrl)}`;
}

/**
 * Resolves which page metadata to inject from a Vite HTML entry filename.
 *
 * @param filename - Absolute or relative path to the HTML entry (for example `why-csp.html`).
 */
export function siteMetaPageFromFilename(filename: string): SiteMetaPage {
  return filename.includes("why-csp") ? "whyCsp" : "home";
}
