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

import { scrollToRecommendationTarget } from "./scrollToTarget";
import { scorePolicy } from "../csp/scorePolicy";
import type { PolicyState } from "../csp/buildPolicy";

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
): HTMLElement & { update: () => void } {
  const { getState, getReportOnly } = options;

  const panel = document.createElement("aside");
  panel.className = "security-score-panel";
  panel.setAttribute("aria-label", "CSP security score");

  const value = document.createElement("p");
  value.className = "security-score-value";
  value.setAttribute("aria-live", "polite");
  value.setAttribute("aria-atomic", "true");

  const grade = document.createElement("p");
  grade.className = "security-score-grade";

  const summary = document.createElement("p");
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

  breakdownDetails.append(breakdownSummary, factorList);
  recommendationDetails.append(
    recommendationSummary,
    recommendationIntro,
    recommendationList,
  );
  panel.append(value, grade, summary, breakdownDetails, recommendationDetails);

  function update(): void {
    const result = scorePolicy(getState(), { reportOnly: getReportOnly() });

    panel.className = `security-score-panel ${GRADE_CLASS[result.grade] ?? "score-poor"}`;
    value.textContent = `${result.score}%`;
    grade.textContent = result.grade;
    summary.textContent = result.summary;

    panel.setAttribute(
      "aria-label",
      `CSP security score: ${result.score} percent, ${result.grade}. ${result.summary}`,
    );

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

    recommendationList.innerHTML = "";

    if (result.score >= 100 || result.recommendations.length === 0) {
      recommendationDetails.hidden = true;
      return;
    }

    recommendationDetails.hidden = false;
    recommendationSummary.textContent = `Recommendations (up to ${result.potentialScore}%)`;
    recommendationIntro.textContent =
      "Select a recommendation to jump to the relevant setting. Applying all items below could raise your score toward 100%.";

    for (const recommendation of result.recommendations) {
      const item = document.createElement("li");

      const button = document.createElement("button");
      button.type = "button";
      button.className = "security-score-recommendation-btn";
      button.textContent = `${recommendation.label} (+${recommendation.pointsGain})`;
      button.setAttribute(
        "aria-label",
        `${recommendation.label}. Adds up to ${recommendation.pointsGain} points.`,
      );

      button.addEventListener("click", () => {
        scrollToRecommendationTarget(recommendation.targetId);
      });

      item.appendChild(button);
      recommendationList.appendChild(item);
    }
  }

  return Object.assign(panel, { update });
}

/** Security score panel element with imperative refresh. */
export type SecurityScorePanel = HTMLElement & { update: () => void };
