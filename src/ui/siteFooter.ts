/**
 * Shared site footer markup for all public pages.
 */

const AUTHOR_URL = "https://nooshu.com";
const CLOUDFLARE_URL = "https://www.cloudflare.com";
const CURSOR_REFERRAL_URL = "https://cursor.com/referral?code=XDKDHWAJX4RJ";
const FOOTER_START_YEAR = 2009;

/**
 * Returns the end year shown in the site footer copyright range.
 */
export function getFooterEndYear(): number {
  return new Date().getFullYear();
}

function footerTextHtml(): string {
  return `© ${FOOTER_START_YEAR} - <span class="site-footer-year"></span> <a href="${AUTHOR_URL}" target="_blank" rel="noopener noreferrer" title="Opens in a new tab" aria-label="Matt Hobbs (opens in new tab)">Matt Hobbs</a>. All Rights Reserved. Built with <a href="${CLOUDFLARE_URL}" target="_blank" rel="noopener noreferrer" title="Opens in a new tab" aria-label="Cloudflare (opens in new tab)">Cloudflare</a>, ❤️, and <a href="${CURSOR_REFERRAL_URL}" target="_blank" rel="noopener noreferrer" title="Opens in a new tab" aria-label="Cursor referral (opens in new tab)">🤖</a>.`;
}

/**
 * Updates footer year placeholders to the current calendar year.
 */
export function updateSiteFooterYear(): void {
  const year = String(getFooterEndYear());
  for (const element of document.querySelectorAll(".site-footer-year")) {
    element.textContent = year;
  }
}

/**
 * Returns footer HTML for static injection during the Vite HTML transform.
 */
export function renderSiteFooterHtml(): string {
  return `<footer class="site-footer">
  <p class="site-footer-text">
    ${footerTextHtml()}
  </p>
</footer>
<script type="module" src="/site-footer-year.mjs"></script>`;
}

/**
 * Creates the site footer element for client-side mounting.
 */
export function createSiteFooter(): HTMLElement {
  const footer = document.createElement("footer");
  footer.className = "site-footer";

  const text = document.createElement("p");
  text.className = "site-footer-text";
  text.innerHTML = footerTextHtml();

  const yearSpan = text.querySelector(".site-footer-year");
  if (yearSpan) {
    yearSpan.textContent = String(getFooterEndYear());
  }

  footer.appendChild(text);
  return footer;
}

/**
 * Appends the site footer when it is not already present.
 */
export function ensureSiteFooter(): void {
  if (document.querySelector(".site-footer")) {
    updateSiteFooterYear();
    return;
  }

  document.body.appendChild(createSiteFooter());
}
