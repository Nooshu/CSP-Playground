import {
  CATEGORY_LABELS,
  CATEGORY_ORDER,
  DIRECTIVES_BY_CATEGORY,
  type DirectiveCategory,
  type DirectiveDefinition,
} from "../csp/directives";
import { SITE_NAME } from "../siteMeta";

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export interface RenderIndexAppOptions {
  /** Overrides directive grouping (used for tests). */
  directivesByCategory?: Partial<
    Record<DirectiveCategory, DirectiveDefinition[]>
  >;
  /** Overrides category legend labels (used for tests). */
  categoryLabels?: Partial<Record<DirectiveCategory, string>>;
  /** Overrides render ordering (used for tests). */
  categoryOrder?: DirectiveCategory[];
}

/**
 * Build-time renderer for the main `#app` markup.
 *
 * @remarks
 * This output is injected into `index.html` during `vite build` so the app ships
 * meaningful HTML by default. Client-side code then progressively enhances the
 * existing DOM by wiring event handlers and live-updating panels.
 */
export function renderIndexAppHtml(
  options: RenderIndexAppOptions = {},
): string {
  const directivesByCategory =
    options.directivesByCategory ?? DIRECTIVES_BY_CATEGORY;
  const categoryLabels = options.categoryLabels ?? CATEGORY_LABELS;
  const categoryOrder = options.categoryOrder ?? CATEGORY_ORDER;

  const header = [
    `<header class="app-header">`,
    `<h1>${escapeHtml(SITE_NAME)}</h1>`,
    `<p class="app-subtitle">Build a Content Security Policy header by enabling directives and adding source values. Copy the result for your server configuration.</p>`,
    `</header>`,
  ].join("");

  const noScript = [
    `<noscript>`,
    `<section class="url-importer" aria-label="JavaScript required">`,
    `<h2>JavaScript required</h2>`,
    `<p class="url-importer-description">This tool needs JavaScript enabled to generate policy output, compute scores, and provide copy helpers.</p>`,
    `</section>`,
    `</noscript>`,
  ].join("");

  const urlImporterShell = `<section id="url-importer-root" class="url-importer"></section>`;

  const fieldsets = categoryOrder
    .map((category) => {
      const directives = directivesByCategory[category];
      if (!directives?.length) return "";

      const legend = escapeHtml(categoryLabels[category] ?? category);

      const list = directives
        .map((directive) => {
          const name = escapeHtml(directive.name);
          const id = `directive-section-${name}`;
          return `<article class="directive-section" id="${id}" data-directive="${name}"></article>`;
        })
        .join("");

      return [
        `<fieldset class="category-fieldset">`,
        `<legend>${legend}</legend>`,
        list,
        `</fieldset>`,
      ].join("");
    })
    .join("");

  const form = [
    `<section class="policy-builder" aria-labelledby="policy-builder-heading">`,
    `<h2 id="policy-builder-heading" class="visually-hidden">CSP directive editor</h2>`,
    `<form class="directive-form" novalidate>${fieldsets}</form>`,
    `</section>`,
  ].join("");
  const outputPanelShell = `<aside id="generated-policy" class="policy-output" aria-labelledby="generated-policy-heading"></aside>`;

  return [
    header,
    `<div class="app-layout">`,
    noScript,
    urlImporterShell,
    form,
    outputPanelShell,
    `</div>`,
  ].join("");
}
