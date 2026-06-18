import { describe, expect, it, vi } from "vitest";
import {
  GITHUB_REPO_URL,
  githubCommitUrl,
  githubLicenseUrl,
} from "../../src/siteBuildInfo";
import {
  getFooterEndYear,
  renderSiteFooterHtml,
  updateSiteFooterYear,
} from "../../src/ui/siteFooter";

const TEST_BUILD_INFO = {
  version: "1.0",
  gitCommitShort: "abc1234",
};

describe("siteFooter", () => {
  it("renders centered footer markup with author link", () => {
    const html = renderSiteFooterHtml(TEST_BUILD_INFO);
    expect(html).toContain('class="site-footer"');
    expect(html).toContain('class="site-footer-year"');
    expect(html).toContain('class="site-footer-meta"');
    expect(html).toContain('href="https://nooshu.com"');
    expect(html).toContain("Matt Hobbs");
    expect(html).toContain("Built with");
    expect(html).toContain(">Cloudflare</a>");
    expect(html).toContain('href="https://www.cloudflare.com"');
    expect(html).toContain('href="https://cursor.com/referral?code=XDKDHWAJX4RJ"');
    expect(html).toContain("/site-footer-year.mjs");
  });

  it("renders license and version metadata with GitHub links", () => {
    const html = renderSiteFooterHtml(TEST_BUILD_INFO);

    expect(html).toContain("MIT License");
    expect(html).toContain("Version 1.0");
    expect(html).toContain("abc1234");
    expect(html).toContain(`href="${githubLicenseUrl()}"`);
    expect(html).toContain(`href="${githubCommitUrl("abc1234")}"`);
    expect(html).toContain(`${GITHUB_REPO_URL}/blob/main/LICENSE`);
    expect(html).toContain(`${GITHUB_REPO_URL}/commit/abc1234`);
  });

  it("uses the current calendar year in the footer", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2031-06-17T12:00:00Z"));

    expect(getFooterEndYear()).toBe(2031);

    document.body.innerHTML =
      '<footer class="site-footer"><p>© 2009 - <span class="site-footer-year"></span></p></footer>';
    updateSiteFooterYear();
    expect(document.querySelector(".site-footer-year")?.textContent).toBe("2031");

    vi.useRealTimers();
  });
});
