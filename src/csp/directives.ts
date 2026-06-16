/**
 * CSP directive metadata driving the builder form structure.
 *
 * @remarks
 * Each {@link DirectiveDefinition} describes one directive’s UI category, control
 * type, and help text. {@link DIRECTIVES} is the canonical list rendered in the
 * form; {@link DIRECTIVES_BY_CATEGORY} groups them for fieldset legends.
 *
 * @see {@link getMdnDirectiveUrl} for documentation links shown beside each directive.
 */

/** High-level CSP directive grouping used for form fieldsets. */
export type DirectiveCategory =
  | "fetch"
  | "document"
  | "navigation"
  | "reporting"
  | "other";

/** Determines which editor control set is rendered for a directive. */
export type DirectiveType =
  | "source-list"
  | "source-single"
  | "sandbox"
  | "trusted-types"
  | "require-trusted-types-for"
  | "boolean";

/** Static metadata for one CSP directive in the builder. */
export interface DirectiveDefinition {
  name: string;
  category: DirectiveCategory;
  type: DirectiveType;
  description: string;
  deprecated?: boolean;
}

/** Human-readable legend text for each {@link DirectiveCategory}. */
export const CATEGORY_LABELS: Record<DirectiveCategory, string> = {
  fetch: "Fetch directives",
  document: "Document directives",
  navigation: "Navigation directives",
  reporting: "Reporting directives",
  other: "Other directives",
};

/**
 * Sandbox flag tokens selectable when the `sandbox` directive is enabled.
 *
 * @see {@link https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Content-Security-Policy/sandbox | sandbox on MDN}
 */
export const SANDBOX_FLAGS = [
  "allow-downloads",
  "allow-forms",
  "allow-modals",
  "allow-orientation-lock",
  "allow-pointer-lock",
  "allow-popups",
  "allow-popups-to-escape-sandbox",
  "allow-presentation",
  "allow-same-origin",
  "allow-scripts",
  "allow-storage-access-by-user-activation",
  "allow-top-navigation",
  "allow-top-navigation-by-user-activation",
  "allow-top-navigation-to-custom-protocols",
] as const;

/** Allowed values for `require-trusted-types-for` (currently only `'script'`). */
export const TRUSTED_TYPES_FOR_OPTIONS = ["'script'"] as const;

/** Base MDN URL for per-directive documentation links. */
export const MDN_CSP_DIRECTIVE_BASE =
  "https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Content-Security-Policy";

/**
 * Builds the MDN documentation URL for a CSP directive name.
 *
 * @param directiveName - Directive token (for example, `script-src`).
 */
export function getMdnDirectiveUrl(directiveName: string): string {
  return `${MDN_CSP_DIRECTIVE_BASE}/${directiveName}`;
}

/**
 * Complete list of directives shown in the builder, in definition order.
 *
 * @remarks
 * Category section comments (`// Fetch directives`, etc.) mirror MDN groupings.
 */
export const DIRECTIVES: DirectiveDefinition[] = [
  // Fetch directives
  {
    name: "default-src",
    category: "fetch",
    type: "source-list",
    description:
      "Fallback for other fetch directives when they are not explicitly set.",
  },
  {
    name: "script-src",
    category: "fetch",
    type: "source-list",
    description: "Valid sources for JavaScript and WebAssembly resources.",
  },
  {
    name: "script-src-elem",
    category: "fetch",
    type: "source-list",
    description: "Valid sources for JavaScript <script> elements.",
  },
  {
    name: "script-src-attr",
    category: "fetch",
    type: "source-list",
    description: "Valid sources for JavaScript inline event handlers.",
  },
  {
    name: "style-src",
    category: "fetch",
    type: "source-list",
    description: "Valid sources for stylesheets.",
  },
  {
    name: "style-src-elem",
    category: "fetch",
    type: "source-list",
    description:
      "Valid sources for <style> elements and <link rel=\"stylesheet\">.",
  },
  {
    name: "style-src-attr",
    category: "fetch",
    type: "source-list",
    description: "Valid sources for inline styles on individual DOM elements.",
  },
  {
    name: "img-src",
    category: "fetch",
    type: "source-list",
    description: "Valid sources for images and favicons.",
  },
  {
    name: "font-src",
    category: "fetch",
    type: "source-list",
    description: "Valid sources for fonts loaded via @font-face.",
  },
  {
    name: "connect-src",
    category: "fetch",
    type: "source-list",
    description:
      "Valid sources for fetch, XHR, WebSocket, and EventSource connections.",
  },
  {
    name: "media-src",
    category: "fetch",
    type: "source-list",
    description: "Valid sources for <audio>, <video>, and <track> elements.",
  },
  {
    name: "object-src",
    category: "fetch",
    type: "source-list",
    description: "Valid sources for <object> and <embed> elements.",
  },
  {
    name: "frame-src",
    category: "fetch",
    type: "source-list",
    description: "Valid sources for nested browsing contexts in <frame> and <iframe>.",
  },
  {
    name: "child-src",
    category: "fetch",
    type: "source-list",
    description:
      "Valid sources for web workers and nested browsing contexts (fallback for frame-src and worker-src).",
  },
  {
    name: "worker-src",
    category: "fetch",
    type: "source-list",
    description:
      "Valid sources for Worker, SharedWorker, and ServiceWorker scripts.",
  },
  {
    name: "manifest-src",
    category: "fetch",
    type: "source-list",
    description: "Valid sources for web application manifest files.",
  },
  {
    name: "prefetch-src",
    category: "fetch",
    type: "source-list",
    description: "Valid sources to be prefetched or prerendered.",
  },
  {
    name: "fenced-frame-src",
    category: "fetch",
    type: "source-list",
    description: "Valid sources for <fencedframe> elements.",
  },
  // Document directives
  {
    name: "base-uri",
    category: "document",
    type: "source-list",
    description: "Restricts URLs that can be used in a document's <base> element.",
  },
  {
    name: "sandbox",
    category: "document",
    type: "sandbox",
    description:
      "Enables a sandbox for the requested resource, similar to the <iframe sandbox> attribute.",
  },
  // Navigation directives
  {
    name: "form-action",
    category: "navigation",
    type: "source-list",
    description: "Restricts URLs that can be used as form submission targets.",
  },
  {
    name: "frame-ancestors",
    category: "navigation",
    type: "source-list",
    description:
      "Specifies valid parents that may embed a page using <frame>, <iframe>, <object>, or <embed>.",
  },
  // Reporting directives
  {
    name: "report-uri",
    category: "reporting",
    type: "source-single",
    description:
      "URL where CSP violation reports should be sent. Deprecated in favor of report-to.",
    deprecated: true,
  },
  {
    name: "report-to",
    category: "reporting",
    type: "source-single",
    description:
      "Reporting endpoint group name for CSP violation reports (used with Reporting-Endpoints header).",
  },
  // Other directives
  {
    name: "trusted-types",
    category: "other",
    type: "trusted-types",
    description:
      "Specifies an allowlist of Trusted Types policy names, or * to allow any policy.",
  },
  {
    name: "require-trusted-types-for",
    category: "other",
    type: "require-trusted-types-for",
    description: "Enforces Trusted Types at DOM XSS injection sinks.",
  },
  {
    name: "upgrade-insecure-requests",
    category: "other",
    type: "boolean",
    description:
      "Instructs the browser to upgrade insecure HTTP URLs to HTTPS.",
  },
];

/**
 * Directives grouped by {@link DirectiveCategory} for rendering categorized fieldsets.
 */
export const DIRECTIVES_BY_CATEGORY = DIRECTIVES.reduce(
  (acc, directive) => {
    if (!acc[directive.category]) {
      acc[directive.category] = [];
    }
    acc[directive.category].push(directive);
    return acc;
  },
  {} as Record<DirectiveCategory, DirectiveDefinition[]>,
);
