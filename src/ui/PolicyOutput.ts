/**
 * Generated policy preview, copy actions, and web-server export snippets.
 *
 * @remarks
 * Subscribes to builder state via a getter and re-serializes through
 * {@link buildPolicyString} and {@link buildHeaderLine}. Supports enforce vs
 * report-only header mode and formats output for common server configs.
 *
 * @see {@link buildPolicyString}
 * @see {@link buildHeaderLine}
 */

import type { PolicyState } from "../csp/buildPolicy";
import { buildHeaderLine, buildPolicyString } from "../csp/buildPolicy";
import { WEB_SERVER_EXPORTS, type WebServerId } from "../csp/serverExports";
import { GITHUB_REPO_URL } from "../siteBuildInfo";
import { createFlagInfoIcon } from "./FlagInfoIcon";
import type { PolicyUpdateSnapshot } from "./policyUpdate";
import { showToast } from "./toast";

/** Options for the live policy output sidebar. */
export interface PolicyOutputOptions {
  /** Returns current builder state whenever the preview should refresh. */
  getState: () => PolicyState;
  /** Optional callback when enforce vs report-only mode changes. */
  onModeChange?: () => void;
  /**
   * Optional existing container to progressively enhance.
   *
   * @remarks
   * When provided, the container is cleared and reused rather than creating a
   * new `<aside>`. This enables build-time rendered HTML with client-side wiring.
   */
  container?: HTMLElement;
}

/**
 * Creates the policy output panel with previews and clipboard actions.
 *
 * @param options - State getter and optional mode-change hook.
 * @returns An `<aside>` element augmented with `update`, `getReportOnly`, and `setReportOnly`.
 *
 * @remarks
 * Clipboard copy uses {@link navigator.clipboard}; success and failure are shown
 * via a top-of-screen toast and announced in an `aria-live` region. The returned
 * element is cast to {@link PolicyOutputPanel}
 * at the call site for typed access to extension methods.
 */
export function createPolicyOutput(options: PolicyOutputOptions): HTMLElement {
  const { getState, onModeChange, container } = options;
  let reportOnly = false;
  let selectedServer: WebServerId = "apache";
  let htmlOnly = false;

  const panel = container ?? document.createElement("aside");
  panel.innerHTML = "";
  panel.className = "policy-output";
  panel.id = "generated-policy";
  panel.setAttribute("aria-labelledby", "generated-policy-heading");

  const heading = document.createElement("h2");
  heading.id = "generated-policy-heading";
  heading.textContent = "Generated policy";
  heading.tabIndex = -1;
  panel.appendChild(heading);

  const warning = document.createElement("aside");
  warning.className = "policy-warning";
  warning.setAttribute("aria-label", "Content Security Policy disclaimer");

  const warningText = document.createElement("p");
  warningText.textContent =
    "A CSP deployed without careful testing can break your site. Use at your own risk: the author accepts no liability for outages or regressions. For more information see: ";

  const guideLink = document.createElement("a");
  guideLink.href =
    "https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/CSP";
  guideLink.target = "_blank";
  guideLink.rel = "noopener noreferrer";
  guideLink.referrerPolicy = "no-referrer";
  guideLink.title = "Opens in a new tab";
  guideLink.textContent = "MDN: implementing CSP safely";
  guideLink.setAttribute(
    "aria-label",
    "MDN: implementing CSP safely (opens in new tab)",
  );

  warningText.append(guideLink);
  warning.appendChild(warningText);
  panel.appendChild(warning);

  const modeFieldset = document.createElement("fieldset");
  modeFieldset.className = "mode-fieldset";
  modeFieldset.id = "policy-header-mode";

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

  const enforceText = document.createElement("span");
  enforceText.textContent = "Content-Security-Policy";

  const reportOnlyText = document.createElement("span");
  reportOnlyText.textContent = "Content-Security-Policy-Report-Only";

  enforceLabel.append(
    enforceRadio,
    enforceText,
    createFlagInfoIcon({
      group: "headerMode",
      flagKey: "content-security-policy",
      idPrefix: "policy-header-mode-enforce",
    }),
  );
  reportOnlyLabel.append(
    reportOnlyRadio,
    reportOnlyText,
    createFlagInfoIcon({
      group: "headerMode",
      flagKey: "content-security-policy-report-only",
      idPrefix: "policy-header-mode-report-only",
    }),
  );
  modeFieldset.append(enforceLabel, reportOnlyLabel);
  panel.appendChild(modeFieldset);

  const policyGroup = document.createElement("section");
  policyGroup.className = "output-group";

  const policyLabel = document.createElement("span");
  policyLabel.id = "policy-preview-label";
  policyLabel.className = "field-caption";
  policyLabel.textContent = "Policy value";

  const policyPreview = document.createElement("pre");
  policyPreview.id = "policy-preview";
  policyPreview.className = "policy-preview";
  policyPreview.setAttribute("aria-labelledby", "policy-preview-label");
  policyPreview.tabIndex = 0;
  policyPreview.setAttribute("role", "status");
  policyPreview.textContent = "";

  policyGroup.append(policyLabel, policyPreview);
  panel.appendChild(policyGroup);

  const headerGroup = document.createElement("section");
  headerGroup.className = "output-group";

  const headerLabel = document.createElement("span");
  headerLabel.id = "header-preview-label";
  headerLabel.className = "field-caption";
  headerLabel.textContent = "HTTP header";

  const headerPreview = document.createElement("pre");
  headerPreview.id = "header-preview";
  headerPreview.className = "policy-preview";
  headerPreview.setAttribute("aria-labelledby", "header-preview-label");
  headerPreview.tabIndex = 0;
  headerPreview.textContent = "";

  headerGroup.append(headerLabel, headerPreview);
  panel.appendChild(headerGroup);

  const serverGroup = document.createElement("section");
  serverGroup.className = "output-group";

  const serverLabel = document.createElement("label");
  serverLabel.htmlFor = "server-export-select";
  serverLabel.textContent = "Web server export";

  const serverExportWarning = document.createElement("aside");
  serverExportWarning.className = "policy-warning server-export-warning";
  serverExportWarning.setAttribute(
    "aria-label",
    "Web server export syntax reminder",
  );

  const serverExportWarningText = document.createElement("p");
  serverExportWarningText.textContent =
    "Double-check the syntax before deploying. Please ";

  const issuesLink = document.createElement("a");
  issuesLink.href = `${GITHUB_REPO_URL}/issues`;
  issuesLink.target = "_blank";
  issuesLink.rel = "noopener noreferrer";
  issuesLink.referrerPolicy = "no-referrer";
  issuesLink.title = "Opens in a new tab";
  issuesLink.textContent = "log an issue";
  issuesLink.setAttribute(
    "aria-label",
    "Log an issue on GitHub (opens in new tab)",
  );

  serverExportWarningText.append(issuesLink, " if incorrect.");
  serverExportWarning.appendChild(serverExportWarningText);

  const serverSelect = document.createElement("select");
  serverSelect.id = "server-export-select";
  serverSelect.className = "server-select";

  const serverHelp = document.createElement("p");
  serverHelp.id = "server-export-help";
  serverHelp.className = "server-help";

  const serverExportNote = document.createElement("aside");
  serverExportNote.id = "server-export-note";
  serverExportNote.className = "policy-warning server-export-note";
  serverExportNote.hidden = true;
  serverExportNote.setAttribute("aria-label", "Server export setup note");

  const serverExportNoteHeading = document.createElement("p");
  serverExportNoteHeading.className = "server-export-note-heading";

  const serverExportNoteText = document.createElement("p");
  serverExportNoteText.className = "server-export-note-text";

  serverExportNote.append(serverExportNoteHeading, serverExportNoteText);

  const htmlOnlyLabel = document.createElement("label");
  htmlOnlyLabel.className = "mode-label";

  const htmlOnlyCheckbox = document.createElement("input");
  htmlOnlyCheckbox.type = "checkbox";
  htmlOnlyCheckbox.checked = false;
  htmlOnlyCheckbox.setAttribute("aria-describedby", "server-export-help");

  const htmlOnlyText = document.createElement("span");
  htmlOnlyText.textContent = "Only apply CSP response header to HTML files";

  htmlOnlyLabel.append(
    htmlOnlyCheckbox,
    htmlOnlyText,
    createFlagInfoIcon({
      group: "serverExport",
      flagKey: "only-html-files",
      idPrefix: "server-export-html-only",
    }),
  );

  const serverPreview = document.createElement("pre");
  serverPreview.id = "server-export-preview";
  serverPreview.className = "policy-preview server-preview";
  serverPreview.tabIndex = 0;
  serverPreview.setAttribute("aria-describedby", "server-export-help");
  serverPreview.textContent = "";

  serverGroup.append(
    serverLabel,
    serverExportWarning,
    serverSelect,
    serverHelp,
    serverExportNote,
    htmlOnlyLabel,
    serverPreview,
  );
  panel.appendChild(serverGroup);

  const actions = document.createElement("section");
  actions.className = "output-actions";
  actions.setAttribute("aria-label", "Copy actions");

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

  function populateServerSelect(): void {
    if (serverSelect.options.length > 0) return;

    for (const server of WEB_SERVER_EXPORTS) {
      const opt = document.createElement("option");
      opt.value = server.id;
      const supportsHtmlOnly = server.supportsHtmlOnly === true;
      opt.textContent = supportsHtmlOnly
        ? server.name
        : `${server.name} (no HTML-only)`;
      opt.className = supportsHtmlOnly
        ? ""
        : "server-option--no-html-only";
      if (!supportsHtmlOnly && server.htmlOnlyUnsupportedReason) {
        opt.title = server.htmlOnlyUnsupportedReason;
      }
      serverSelect.appendChild(opt);
    }

    serverSelect.value = selectedServer;
  }

  function syncHtmlOnlyControl(server: (typeof WEB_SERVER_EXPORTS)[number] | undefined): void {
    const supportsHtmlOnly = server?.supportsHtmlOnly === true;

    htmlOnlyCheckbox.disabled = !supportsHtmlOnly;
    htmlOnlyLabel.classList.toggle(
      "html-only-label--unsupported",
      !supportsHtmlOnly,
    );
    serverSelect.classList.toggle(
      "server-select--no-html-only",
      !supportsHtmlOnly,
    );

    if (supportsHtmlOnly) {
      htmlOnlyCheckbox.removeAttribute("title");
      htmlOnlyLabel.removeAttribute("title");
      return;
    }

    const reason =
      server?.htmlOnlyUnsupportedReason ??
      "This export format cannot scope the CSP header to HTML files only.";
    htmlOnlyCheckbox.title = reason;
    htmlOnlyLabel.title = reason;
    htmlOnly = false;
    htmlOnlyCheckbox.checked = false;
  }

  populateServerSelect();

  function announce(message: string): void {
    liveRegion.textContent = "";
    // Clear then set on the next frame so screen readers re-announce the message.
    requestAnimationFrame(() => {
      liveRegion.textContent = message;
    });
  }

  async function copyText(text: string, successMessage: string): Promise<void> {
    if (!text) {
      const message = "Nothing to copy";
      announce(message);
      showToast(message, "error");
      return;
    }
    try {
      await navigator.clipboard.writeText(text);
      announce(successMessage);
      showToast(successMessage, "success");
    } catch {
      const message = "Copy failed";
      announce(message);
      showToast(message, "error");
    }
  }

  function getHeaderName(): string {
    return reportOnly
      ? "Content-Security-Policy-Report-Only"
      : "Content-Security-Policy";
  }

  function getServerExportText(): string {
    const policy = buildPolicyString(getState());
    if (!policy) return "";

    const server = WEB_SERVER_EXPORTS.find(
      (item) => item.id === (serverSelect.value as WebServerId),
    );
    if (!server) return "";

    return server.format(getHeaderName(), policy, { htmlOnly });
  }

  function getServerExportNote(
    server: (typeof WEB_SERVER_EXPORTS)[number],
  ): string {
    if (htmlOnly && server.htmlOnlySetupNote) {
      return server.htmlOnlySetupNote;
    }
    return server.setupNote ?? "";
  }

  function updateServerPreview(policy: string, headerName: string): void {
    const server = WEB_SERVER_EXPORTS.find(
      (item) => item.id === selectedServer,
    );
    syncHtmlOnlyControl(server);

    if (server) {
      serverHelp.textContent = server.description;
      const exportNote = getServerExportNote(server);
      serverExportNote.hidden = !exportNote;
      serverExportNoteHeading.textContent = exportNote
        ? `${server.name} setup`
        : "";
      serverExportNoteText.textContent = exportNote;
      const describedBy = ["server-export-help"];
      if (exportNote) {
        describedBy.push("server-export-note");
      }
      htmlOnlyCheckbox.setAttribute(
        "aria-describedby",
        describedBy.join(" "),
      );
    } else {
      serverHelp.textContent = "";
      serverExportNote.hidden = true;
      serverExportNoteHeading.textContent = "";
      serverExportNoteText.textContent = "";
      htmlOnlyCheckbox.setAttribute("aria-describedby", "server-export-help");
    }

    if (server && policy) {
      serverPreview.textContent = server.format(headerName, policy, {
        htmlOnly,
      });
    } else {
      serverPreview.textContent = "(no server config to display)";
    }
  }

  function update(snapshot?: PolicyUpdateSnapshot): void {
    const state = snapshot?.state ?? getState();
    const policy = snapshot?.policy ?? buildPolicyString(state);
    const headerName = getHeaderName();
    const header = buildHeaderLine(policy, reportOnly);

    policyPreview.textContent = policy || "(no directives configured)";
    headerPreview.textContent = header || "(no header to display)";
    updateServerPreview(policy, headerName);
  }

  enforceRadio.addEventListener("change", () => {
    reportOnly = false;
    update();
    onModeChange?.();
  });

  reportOnlyRadio.addEventListener("change", () => {
    reportOnly = true;
    update();
    onModeChange?.();
  });

  serverSelect.addEventListener("change", () => {
    selectedServer = serverSelect.value as WebServerId;
    update();
  });

  htmlOnlyCheckbox.addEventListener("change", () => {
    htmlOnly = htmlOnlyCheckbox.checked;
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
    void copyText(getServerExportText(), "Server config copied to clipboard");
  });

  return Object.assign(panel, {
    update,
    getReportOnly: () => reportOnly,
    setReportOnly: (value: boolean) => {
      reportOnly = value;
      enforceRadio.checked = !value;
      reportOnlyRadio.checked = value;
      update();
      onModeChange?.();
    },
  });
}

/** Policy output panel element with imperative update and mode accessors. */
export type PolicyOutputPanel = HTMLElement & {
  /** Refreshes policy, header, and server export previews from current state. */
  update: (snapshot?: PolicyUpdateSnapshot) => void;
  /** Whether report-only header mode is selected. */
  getReportOnly: () => boolean;
  /** Sets enforce vs report-only mode and refreshes previews. */
  setReportOnly: (value: boolean) => void;
};
