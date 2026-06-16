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
import { createUrlImporter } from "./UrlImporter";

const CATEGORY_ORDER: DirectiveCategory[] = [
  "fetch",
  "document",
  "navigation",
  "reporting",
  "other",
];

export function createApp(root: HTMLElement): void {
  const sections: DirectiveSectionHandle[] = [];
  let outputPanel: PolicyOutputPanel | null = null;

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
  }

  root.innerHTML = "";
  root.className = "app";

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

  outputPanel = createPolicyOutput({ getState: collectState }) as PolicyOutputPanel;

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

  const urlImporter = createUrlImporter({
    sections,
    outputPanel,
    onApplied: handleChange,
  });

  layout.append(urlImporter, form, outputPanel);

  handleChange();
}
