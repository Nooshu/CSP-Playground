import { getMdnDirectiveUrl } from "../csp/directives";

const INFO_ICON_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>`;

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
