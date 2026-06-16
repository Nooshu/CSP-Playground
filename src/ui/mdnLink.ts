/**
 * MDN documentation link for a CSP directive name.
 *
 * @remarks
 * Renders an external info icon anchor with safe `rel` and `referrerPolicy`
 * attributes. URL resolution is delegated to {@link getMdnDirectiveUrl}.
 *
 * @see {@link getMdnDirectiveUrl}
 */

import { getMdnDirectiveUrl } from "../csp/directives";

const INFO_ICON_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>`;

/**
 * Creates an MDN info link for a CSP directive.
 *
 * @param directiveName - CSP directive identifier shown in the builder.
 * @returns An anchor element opening MDN in a new tab.
 */
export function createMdnInfoLink(directiveName: string): HTMLAnchorElement {
  const link = document.createElement("a");
  link.href = getMdnDirectiveUrl(directiveName);
  link.className = "directive-info-link";
  link.target = "_blank";
  link.rel = "noopener noreferrer";
  link.referrerPolicy = "no-referrer";
  link.setAttribute(
    "aria-label",
    `Learn more about ${directiveName} on MDN (opens in new tab)`,
  );
  link.innerHTML = INFO_ICON_SVG;

  return link;
}
