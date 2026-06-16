import { buildHeaderLine, buildPolicyString } from "../csp/buildPolicy";
import type { PolicyState } from "../csp/buildPolicy";
import {
  WEB_SERVER_EXPORTS,
  type WebServerId,
} from "../csp/serverExports";

export interface PolicyOutputOptions {
  getState: () => PolicyState;
}

export function createPolicyOutput(options: PolicyOutputOptions): HTMLElement {
  const { getState } = options;
  let reportOnly = false;
  let selectedServer: WebServerId = "apache";

  const panel = document.createElement("aside");
  panel.className = "policy-output";
  panel.setAttribute("aria-label", "Generated policy");

  const heading = document.createElement("h2");
  heading.textContent = "Generated policy";
  panel.appendChild(heading);

  const modeFieldset = document.createElement("fieldset");
  modeFieldset.className = "mode-fieldset";

  const modeLegend = document.createElement("legend");
  modeLegend.textContent = "Header mode";
  modeFieldset.appendChild(modeLegend);

  const enforceLabel = document.createElement("label");
  enforceLabel.className = "mode-label";

  const enforceRadio = document.createElement("input");
  enforceRadio.type = "radio";
  enforceRadio.name = "header-mode";
  enforceRadio.value = "enforce";
  enforceRadio.checked = true;

  const reportOnlyLabel = document.createElement("label");
  reportOnlyLabel.className = "mode-label";

  const reportOnlyRadio = document.createElement("input");
  reportOnlyRadio.type = "radio";
  reportOnlyRadio.name = "header-mode";
  reportOnlyRadio.value = "report-only";

  enforceLabel.append(enforceRadio, " Content-Security-Policy");
  reportOnlyLabel.append(
    reportOnlyRadio,
    " Content-Security-Policy-Report-Only",
  );
  modeFieldset.append(enforceLabel, reportOnlyLabel);
  panel.appendChild(modeFieldset);

  const policyGroup = document.createElement("div");
  policyGroup.className = "output-group";

  const policyLabel = document.createElement("label");
  policyLabel.htmlFor = "policy-preview";
  policyLabel.textContent = "Policy value";

  const policyPreview = document.createElement("pre");
  policyPreview.id = "policy-preview";
  policyPreview.className = "policy-preview";
  policyPreview.tabIndex = 0;
  policyPreview.setAttribute("role", "status");
  policyPreview.textContent = "";

  policyGroup.append(policyLabel, policyPreview);
  panel.appendChild(policyGroup);

  const headerGroup = document.createElement("div");
  headerGroup.className = "output-group";

  const headerLabel = document.createElement("label");
  headerLabel.htmlFor = "header-preview";
  headerLabel.textContent = "HTTP header";

  const headerPreview = document.createElement("pre");
  headerPreview.id = "header-preview";
  headerPreview.className = "policy-preview";
  headerPreview.tabIndex = 0;
  headerPreview.textContent = "";

  headerGroup.append(headerLabel, headerPreview);
  panel.appendChild(headerGroup);

  const serverGroup = document.createElement("div");
  serverGroup.className = "output-group";

  const serverLabel = document.createElement("label");
  serverLabel.htmlFor = "server-export-select";
  serverLabel.textContent = "Web server export";

  const serverSelect = document.createElement("select");
  serverSelect.id = "server-export-select";
  serverSelect.className = "server-select";

  for (const server of WEB_SERVER_EXPORTS) {
    const opt = document.createElement("option");
    opt.value = server.id;
    opt.textContent = server.name;
    serverSelect.appendChild(opt);
  }

  const serverHelp = document.createElement("p");
  serverHelp.id = "server-export-help";
  serverHelp.className = "server-help";
  serverHelp.textContent = WEB_SERVER_EXPORTS[0].description;

  const serverPreview = document.createElement("pre");
  serverPreview.id = "server-export-preview";
  serverPreview.className = "policy-preview server-preview";
  serverPreview.tabIndex = 0;
  serverPreview.setAttribute("aria-describedby", "server-export-help");
  serverPreview.textContent = "";

  serverGroup.append(serverLabel, serverSelect, serverHelp, serverPreview);
  panel.appendChild(serverGroup);

  const actions = document.createElement("div");
  actions.className = "output-actions";

  const copyPolicyBtn = document.createElement("button");
  copyPolicyBtn.type = "button";
  copyPolicyBtn.className = "btn btn-secondary";
  copyPolicyBtn.textContent = "Copy policy";

  const copyHeaderBtn = document.createElement("button");
  copyHeaderBtn.type = "button";
  copyHeaderBtn.className = "btn btn-primary";
  copyHeaderBtn.textContent = "Copy header";

  const copyServerBtn = document.createElement("button");
  copyServerBtn.type = "button";
  copyServerBtn.className = "btn btn-secondary";
  copyServerBtn.textContent = "Copy server config";

  actions.append(copyPolicyBtn, copyHeaderBtn, copyServerBtn);
  panel.appendChild(actions);

  const liveRegion = document.createElement("div");
  liveRegion.className = "visually-hidden";
  liveRegion.setAttribute("aria-live", "polite");
  liveRegion.setAttribute("aria-atomic", "true");
  panel.appendChild(liveRegion);

  function announce(message: string): void {
    liveRegion.textContent = "";
    requestAnimationFrame(() => {
      liveRegion.textContent = message;
    });
  }

  async function copyText(text: string, successMessage: string): Promise<void> {
    if (!text) {
      announce("Nothing to copy");
      return;
    }
    try {
      await navigator.clipboard.writeText(text);
      announce(successMessage);
    } catch {
      announce("Copy failed");
    }
  }

  function getHeaderName(): string {
    return reportOnly
      ? "Content-Security-Policy-Report-Only"
      : "Content-Security-Policy";
  }

  function update(): void {
    const policy = buildPolicyString(getState());
    const headerName = getHeaderName();
    const header = buildHeaderLine(policy, reportOnly);

    policyPreview.textContent = policy || "(no directives configured)";
    headerPreview.textContent = header || "(no header to display)";

    const server = WEB_SERVER_EXPORTS.find((s) => s.id === selectedServer);
    if (server && policy) {
      serverHelp.textContent = server.description;
      serverPreview.textContent = server.format(headerName, policy);
    } else {
      serverPreview.textContent = "(no server config to display)";
    }
  }

  enforceRadio.addEventListener("change", () => {
    reportOnly = false;
    update();
  });

  reportOnlyRadio.addEventListener("change", () => {
    reportOnly = true;
    update();
  });

  serverSelect.addEventListener("change", () => {
    selectedServer = serverSelect.value as WebServerId;
    update();
  });

  copyPolicyBtn.addEventListener("click", () => {
    void copyText(buildPolicyString(getState()), "Policy copied to clipboard");
  });

  copyHeaderBtn.addEventListener("click", () => {
    const policy = buildPolicyString(getState());
    void copyText(
      buildHeaderLine(policy, reportOnly),
      "Header copied to clipboard",
    );
  });

  copyServerBtn.addEventListener("click", () => {
    const policy = buildPolicyString(getState());
    const server = WEB_SERVER_EXPORTS.find((s) => s.id === selectedServer);
    if (server && policy) {
      void copyText(
        server.format(getHeaderName(), policy),
        "Server config copied to clipboard",
      );
    }
  });

  return Object.assign(panel, { update });
}

export type PolicyOutputPanel = HTMLElement & { update: () => void };
