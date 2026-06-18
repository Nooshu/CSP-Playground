/**
 * Root application shell for the CSP Playground UI.
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
  CATEGORY_ORDER,
  DIRECTIVES_BY_CATEGORY,
} from "../csp/directives";
import { SITE_NAME } from "../siteMeta";
import {
  createDirectiveSection,
  type DirectiveSectionHandle,
} from "./DirectiveSection";
import { createPolicyOutput, type PolicyOutputPanel } from "./PolicyOutput";
import { createPolicyUpdateSnapshot } from "./policyUpdate";
import { createSecurityScorePanel } from "./SecurityScore";
import { createUrlImporter } from "./UrlImporter";

function mountSecurityScorePanel(
  panel: HTMLElement,
  root: HTMLElement,
): void {
  const layout = root.querySelector(".app-layout");
  if (layout) {
    layout.insertAdjacentElement("afterend", panel);
    return;
  }

  root.appendChild(panel);
}

/**
 * Mounts CSP Playground into the given DOM root.
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
    const snapshot = createPolicyUpdateSnapshot(collectState());
    outputPanel?.update(snapshot);
    securityScorePanel?.update(snapshot);
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
    mountSecurityScorePanel(securityScorePanel, root);

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

  const header = document.createElement("header");
  header.className = "app-header";

  const title = document.createElement("h1");
  title.textContent = SITE_NAME;

  const subtitle = document.createElement("p");
  subtitle.className = "app-subtitle";
  subtitle.textContent =
    "Build a Content Security Policy header by enabling directives and adding source values. Copy the result for your server configuration.";

  header.append(title, subtitle);
  root.appendChild(header);

  const layout = document.createElement("div");
  layout.className = "app-layout";
  root.appendChild(layout);

  const builderSection = document.createElement("section");
  builderSection.className = "policy-builder";
  builderSection.setAttribute("aria-labelledby", "policy-builder-heading");

  const builderHeading = document.createElement("h2");
  builderHeading.id = "policy-builder-heading";
  builderHeading.className = "visually-hidden";
  builderHeading.textContent = "CSP directive editor";

  const form = document.createElement("form");
  form.className = "directive-form";
  form.setAttribute("novalidate", "");
  form.addEventListener("submit", (e) => e.preventDefault());

  builderSection.append(builderHeading, form);

  for (const category of CATEGORY_ORDER) {
    const directives = DIRECTIVES_BY_CATEGORY[category];
    if (!directives?.length) continue;

    const fieldset = document.createElement("fieldset");
    fieldset.className = "category-fieldset";

    const legend = document.createElement("legend");
    legend.textContent = CATEGORY_LABELS[category];
    fieldset.appendChild(legend);

    for (const directive of directives) {
      const section = createDirectiveSection({
        directive,
        onChange: handleChange,
      });
      sections.push(section);
      fieldset.appendChild(section.element);
    }

    form.appendChild(fieldset);
  }

  const urlImporter = createUrlImporter({
    sections,
    outputPanel,
    onApplied: handleChange,
  });

  layout.append(urlImporter, builderSection, outputPanel);
  mountSecurityScorePanel(securityScorePanel, root);

  handleChange();
}
