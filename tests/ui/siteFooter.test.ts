import { describe, expect, it, vi } from "vitest";
import {
  getFooterEndYear,
  renderSiteFooterHtml,
  updateSiteFooterYear,
} from "../../src/ui/siteFooter";

describe("siteFooter", () => {
  it("renders centered footer markup with author link", () => {
    const html = renderSiteFooterHtml();
    expect(html).toContain('class="site-footer"');
    expect(html).toContain('class="site-footer-year"');
    expect(html).toContain('href="https://nooshu.com"');
    expect(html).toContain("Matt Hobbs");
    expect(html).toContain("Built with");
    expect(html).toContain(">Cloudflare</a>");
    expect(html).toContain('href="https://www.cloudflare.com"');
    expect(html).toContain('href="https://cursor.com/referral?code=XDKDHWAJX4RJ"');
    expect(html).toContain("/site-footer-year.mjs");
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
