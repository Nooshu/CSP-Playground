/**
 * Root application shell for the CSP builder UI.
 *
 * @remarks
 * Wires together directive sections (grouped by category), the policy output panel,
 * security score sidebar, and URL importer. State is collected from all directive
 * sections on each change and passed to the output and score panels.
 *
 * @see {@link createDirectiveSection}
 * @see {@link createPolicyOutput}
 * @see {@link createSecurityScorePanel}
 * @see {@link createUrlImporter}
 */

import type { PolicyState } from "../csp/buildPolicy";
import {
  CATEGORY_LABELS,
  DIRECTIVES_BY_CATEGORY,
  type DirectiveCategory,
} from "../csp/directives";
import {
  createDirectiveSection,
  type DirectiveSectionHandle,
} from "./DirectiveSection";
import { createPolicyOutput, type PolicyOutputPanel } from "./PolicyOutput";
import { createSecurityScorePanel } from "./SecurityScore";
import { createUrlImporter } from "./UrlImporter";

const CATEGORY_ORDER: DirectiveCategory[] = [
  "fetch",
  "document",
  "navigation",
  "reporting",
  "other",
];

/**
 * Mounts the CSP builder into the given DOM root.
 *
 * @param root - Container element (typically `#app` from the page shell).
 *
 * @remarks
 * Clears and repopulates `root`, appends the security score panel to
 * `document.body`, places the policy output after all directive fieldsets,
 * and triggers an initial output refresh.
 */
export function createApp(root: HTMLElement): void {
  const sections: DirectiveSectionHandle[] = [];
  let outputPanel: PolicyOutputPanel | null = null;
  let securityScorePanel: ReturnType<typeof createSecurityScorePanel> | null = null;

  function collectState(): PolicyState {
    const state: PolicyState = {};
    for (const section of sections) {
      const directiveName =
        section.element.dataset.directive ??
        section.element.querySelector(".directive-name")?.textContent;
      if (!directiveName) continue;
      state[directiveName] = section.getState();
    }
    return state;
  }

  function handleChange(): void {
    outputPanel?.update();
    securityScorePanel?.update();
  }

  root.classList.add("app");

  const hasSsgShell =
    root.querySelector(".app-layout") &&
    root.querySelector(".directive-form") &&
    root.querySelector("#generated-policy");

  if (hasSsgShell) {
    const outputContainer = root.querySelector<HTMLElement>("#generated-policy");
    outputPanel = createPolicyOutput({
      getState: collectState,
      onModeChange: handleChange,
      container: outputContainer ?? undefined,
    }) as PolicyOutputPanel;

    securityScorePanel = createSecurityScorePanel({
      getState: collectState,
      getReportOnly: () => outputPanel?.getReportOnly() ?? false,
    });
    document.body.appendChild(securityScorePanel);

    const form = root.querySelector<HTMLFormElement>(".directive-form");
    if (form) {
      form.addEventListener("submit", (e) => e.preventDefault());
    }

    for (const category of CATEGORY_ORDER) {
      const directives = DIRECTIVES_BY_CATEGORY[category];
      if (!directives?.length) continue;

      for (const directive of directives) {
        const existing = root.querySelector<HTMLElement>(
          `[data-directive="${directive.name}"]`,
        );
        const section = createDirectiveSection({
          directive,
          onChange: handleChange,
          container: existing ?? undefined,
        });
        sections.push(section);
      }
    }

    const urlImporterContainer =
      root.querySelector<HTMLElement>("#url-importer-root") ??
      root.querySelector<HTMLElement>(".url-importer");

    createUrlImporter({
      sections,
      outputPanel,
      onApplied: handleChange,
      container: urlImporterContainer ?? undefined,
    });

    handleChange();
    return;
  }

  // Fallback: fully client-rendered (used for tests or non-SSG pages).
  root.innerHTML = "";

  outputPanel = createPolicyOutput({
    getState: collectState,
    onModeChange: handleChange,
  }) as PolicyOutputPanel;

  securityScorePanel = createSecurityScorePanel({
    getState: collectState,
    getReportOnly: () => outputPanel?.getReportOnly() ?? false,
  });
  document.body.appendChild(securityScorePanel);

  const header = document.createElement("header");
  header.className = "app-header";

  const title = document.createElement("h1");
  title.textContent = "CSP Builder";

  const subtitle = document.createElement("p");
  subtitle.className = "app-subtitle";
  subtitle.textContent =
    "Build a Content Security Policy header by enabling directives and adding source values. Copy the result for your server configuration.";

  header.append(title, subtitle);
  root.appendChild(header);

  const layout = document.createElement("div");
  layout.className = "app-layout";
  root.appendChild(layout);

  const form = document.createElement("form");
  form.className = "directive-form";
  form.setAttribute("novalidate", "");
  form.addEventListener("submit", (e) => e.preventDefault());

  for (const category of CATEGORY_ORDER) {
    const directives = DIRECTIVES_BY_CATEGORY[category];
    if (!directives?.length) continue;

    const fieldset = document.createElement("fieldset");
    fieldset.className = "category-fieldset";

    const legend = document.createElement("legend");
    legend.textContent = CATEGORY_LABELS[category];
    fieldset.appendChild(legend);

    const list = document.createElement("div");
    list.className = "directive-list";

    for (const directive of directives) {
      const section = createDirectiveSection({
        directive,
        onChange: handleChange,
      });
      sections.push(section);
      list.appendChild(section.element);
    }

    fieldset.appendChild(list);
    form.appendChild(fieldset);
  }

  form.appendChild(outputPanel);

  const urlImporter = createUrlImporter({
    sections,
    outputPanel,
    onApplied: handleChange,
  });

  layout.append(urlImporter, form);

  handleChange();
}
