/**
 * Live CSP security score sidebar with breakdown and recommendations.
 *
 * @remarks
 * Scores policy via {@link scorePolicy} whenever builder state or report-only mode
 * changes. Recommendation buttons delegate navigation to
 * {@link scrollToRecommendationTarget}.
 *
 * @see {@link scorePolicy}
 * @see {@link scrollToRecommendationTarget}
 */

import type { PolicyState } from "../csp/buildPolicy";
import { scorePolicy } from "../csp/scorePolicy";
import type { PolicyUpdateSnapshot } from "./policyUpdate";
import {
  scrollToGeneratedPolicy,
  scrollToRecommendationTarget,
} from "./scrollToTarget";

/** Options for the floating security score panel. */
export interface SecurityScorePanelOptions {
  /** Returns current builder state for scoring. */
  getState: () => PolicyState;
  /** Whether the output panel is in report-only mode (affects scoring). */
  getReportOnly: () => boolean;
}

/** CSS class suffix keyed by letter grade from {@link scorePolicy}. */
const GRADE_CLASS: Record<string, string> = {
  Poor: "score-poor",
  Fair: "score-fair",
  Good: "score-good",
  Strong: "score-strong",
  Excellent: "score-excellent",
};

/**
 * Creates the security score panel appended to the document body.
 *
 * @param options - State and report-only accessors shared with the output panel.
 * @returns An `<aside>` element with an `update` method to refresh score UI.
 */
export function createSecurityScorePanel(
  options: SecurityScorePanelOptions,
): HTMLElement & { update: (snapshot?: PolicyUpdateSnapshot) => void } {
  const { getState, getReportOnly } = options;

  const panel = document.createElement("aside");
  panel.className = "security-score-panel";
  panel.setAttribute(
    "aria-labelledby",
    "security-score-heading security-score-summary",
  );

  const panelHeading = document.createElement("h2");
  panelHeading.id = "security-score-heading";
  panelHeading.className = "security-score-heading";
  panelHeading.textContent = "Security score";

  const value = document.createElement("p");
  value.className = "security-score-value";
  value.setAttribute("aria-live", "polite");
  value.setAttribute("aria-atomic", "true");

  const grade = document.createElement("p");
  grade.className = "security-score-grade";

  const summary = document.createElement("p");
  summary.id = "security-score-summary";
  summary.className = "security-score-summary";

  const breakdownDetails = document.createElement("details");
  breakdownDetails.className = "security-score-details";

  const breakdownSummary = document.createElement("summary");
  breakdownSummary.textContent = "Score breakdown";

  const factorList = document.createElement("ul");
  factorList.className = "security-score-factors";

  const recommendationDetails = document.createElement("details");
  recommendationDetails.className =
    "security-score-details security-score-recommendations";

  const recommendationSummary = document.createElement("summary");
  recommendationSummary.className = "security-score-recommendations-summary";

  const recommendationIntro = document.createElement("p");
  recommendationIntro.className = "security-score-recommendations-intro";

  const recommendationList = document.createElement("ul");
  recommendationList.className = "security-score-recommendations-list";

  const recommendationItems = new Map<string, HTMLLIElement>();

  recommendationList.addEventListener("click", (event) => {
    const button = (event.target as HTMLElement).closest<HTMLButtonElement>(
      ".security-score-recommendation-btn",
    );
    if (!button) return;
    const targetId = button.dataset.targetId;
    if (targetId) scrollToRecommendationTarget(targetId);
  });

  breakdownDetails.append(breakdownSummary, factorList);
  recommendationDetails.append(
    recommendationSummary,
    recommendationIntro,
    recommendationList,
  );

  const nav = document.createElement("nav");
  nav.className = "security-score-nav";
  nav.setAttribute("aria-label", "Page navigation");

  const viewPolicyBtn = document.createElement("button");
  viewPolicyBtn.type = "button";
  viewPolicyBtn.className = "security-score-nav-btn";
  viewPolicyBtn.textContent = "View generated policy";
  viewPolicyBtn.addEventListener("click", () => {
    scrollToGeneratedPolicy();
  });

  const backToTopBtn = document.createElement("button");
  backToTopBtn.type = "button";
  backToTopBtn.className = "security-score-nav-btn security-score-back-to-top";
  backToTopBtn.textContent = "Back to top";
  backToTopBtn.setAttribute("aria-hidden", "true");
  backToTopBtn.tabIndex = -1;
  backToTopBtn.addEventListener("click", () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  });

  const backToTopWrap = document.createElement("div");
  backToTopWrap.className = "security-score-back-to-top-wrap";
  backToTopWrap.appendChild(backToTopBtn);

  const scrollThreshold = 240;

  function updateBackToTopVisibility(): void {
    const visible = window.scrollY > scrollThreshold;
    backToTopWrap.classList.toggle("is-visible", visible);
    backToTopBtn.setAttribute("aria-hidden", visible ? "false" : "true");
    backToTopBtn.tabIndex = visible ? 0 : -1;
  }

  window.addEventListener("scroll", updateBackToTopVisibility, {
    passive: true,
  });
  updateBackToTopVisibility();

  nav.append(viewPolicyBtn, backToTopWrap);
  panel.append(
    panelHeading,
    value,
    grade,
    summary,
    breakdownDetails,
    recommendationDetails,
    nav,
  );

  function syncRecommendations(
    recommendations: ReturnType<typeof scorePolicy>["recommendations"],
  ): void {
    const nextIds = new Set(recommendations.map((item) => item.id));

    for (const [id, item] of recommendationItems) {
      if (!nextIds.has(id)) {
        item.remove();
        recommendationItems.delete(id);
      }
    }

    for (const recommendation of recommendations) {
      const text = `${recommendation.label} (+${recommendation.pointsGain})`;
      const ariaLabel = `${recommendation.label}. Adds up to ${recommendation.pointsGain} points.`;

      let item = recommendationItems.get(recommendation.id);
      if (!item) {
        item = document.createElement("li");
        const button = document.createElement("button");
        button.type = "button";
        button.className = "security-score-recommendation-btn";
        item.appendChild(button);
        recommendationItems.set(recommendation.id, item);
      }

      const button = item.querySelector("button");
      if (!(button instanceof HTMLButtonElement)) {
        continue;
      }
      if (button.textContent !== text) button.textContent = text;
      if (button.getAttribute("aria-label") !== ariaLabel) {
        button.setAttribute("aria-label", ariaLabel);
      }
      if (button.dataset.targetId !== recommendation.targetId) {
        button.dataset.targetId = recommendation.targetId;
      }

      recommendationList.appendChild(item);
    }
  }

  function update(snapshot?: PolicyUpdateSnapshot): void {
    const state = snapshot?.state ?? getState();
    const result = scorePolicy(state, {
      reportOnly: getReportOnly(),
      policy: snapshot?.policy,
    });

    panel.className = `security-score-panel ${GRADE_CLASS[result.grade] ?? "score-poor"}`;
    value.textContent = `${result.score}%`;
    grade.textContent = result.grade;
    summary.textContent = result.summary;

    factorList.innerHTML = "";
    for (const factor of result.factors) {
      const item = document.createElement("li");
      item.className =
        factor.points > 0
          ? "factor-positive"
          : factor.points < 0
            ? "factor-negative"
            : "factor-neutral";

      const sign = factor.points > 0 ? "+" : "";
      item.textContent = `${factor.label} (${sign}${factor.points})`;
      factorList.appendChild(item);
    }

    if (result.score >= 100 || result.recommendations.length === 0) {
      recommendationDetails.hidden = true;
      for (const item of recommendationItems.values()) item.remove();
      recommendationItems.clear();
      return;
    }

    recommendationDetails.hidden = false;
    recommendationSummary.textContent = `Recommendations (up to ${result.potentialScore}%)`;
    recommendationIntro.textContent =
      "Select a recommendation to jump to the relevant setting. Applying all items below could raise your score toward 100%.";

    syncRecommendations(result.recommendations);
  }

  return Object.assign(panel, { update });
}

/** Security score panel element with imperative refresh. */
export type SecurityScorePanel = HTMLElement & {
  update: (snapshot?: PolicyUpdateSnapshot) => void;
};
