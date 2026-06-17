import { describe, expect, it } from "vitest";
import {
  OG_IMAGE_PATH,
  renderSiteMetaHtml,
  SITE_ORIGIN,
  SITE_PAGE_META,
  siteMetaPageFromFilename,
} from "../src/siteMeta";

describe("siteMeta", () => {
  it("renders Open Graph and Twitter tags for the home page", () => {
    const html = renderSiteMetaHtml("home");
    const { title, description } = SITE_PAGE_META.home;

    expect(html).toContain('property="og:type" content="website"');
    expect(html).toContain(`property="og:title" content="${title}"`);
    expect(html).toContain(`property="og:description" content="${description}"`);
    expect(html).toContain(`property="og:url" content="${SITE_ORIGIN}/"`);
    expect(html).toContain(
      `property="og:image" content="${SITE_ORIGIN}${OG_IMAGE_PATH}"`,
    );
    expect(html).toContain('property="og:image:width" content="1200"');
    expect(html).toContain('property="og:image:height" content="464"');
    expect(html).toContain('name="twitter:card" content="summary_large_image"');
    expect(html).toContain(`name="twitter:title" content="${title}"`);
    expect(html).toContain(
      `name="twitter:image" content="${SITE_ORIGIN}${OG_IMAGE_PATH}"`,
    );
  });

  it("renders page-specific metadata for the why-CSP guide", () => {
    const html = renderSiteMetaHtml("whyCsp");
    const { title, description } = SITE_PAGE_META.whyCsp;

    expect(html).toContain(`property="og:title" content="${title}"`);
    expect(html).toContain(`property="og:description" content="${description}"`);
    expect(html).toContain(`property="og:url" content="${SITE_ORIGIN}/why-csp.html"`);
  });

  it("includes image alt text for accessibility", () => {
    const html = renderSiteMetaHtml("home");
    expect(html).toContain('property="og:image:alt" content="CSP Builder —');
    expect(html).toContain('name="twitter:image:alt" content="CSP Builder —');
  });

  it("maps HTML entry filenames to site meta pages", () => {
    expect(siteMetaPageFromFilename("/why-csp.html")).toBe("whyCsp");
    expect(siteMetaPageFromFilename("index.html")).toBe("home");
  });
});
