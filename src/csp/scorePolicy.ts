/**
 * Heuristic CSP security scoring and improvement recommendations.
 *
 * @remarks
 * The score is educational—not a substitute for deployment testing. Points are
 * awarded for restrictive defaults (nonces, `object-src 'none'`, frame ancestors)
 * and deducted for common weakeners (`'unsafe-inline'`, wildcards, Report-Only).
 * {@link buildRecommendations} suggests UI targets the user can jump to.
 */

import { buildPolicyString, type PolicyState } from "./buildPolicy";

/** Letter grade derived from the numeric score. */
export type SecurityGrade = "Poor" | "Fair" | "Good" | "Strong" | "Excellent";

/** One line item in the score breakdown panel. */
export interface ScoreFactor {
  label: string;
  /** Positive points reward good practices; negative points flag risk. */
  points: number;
}

/** Actionable suggestion linked to a scroll target in the builder UI. */
export interface ScoreRecommendation {
  id: string;
  label: string;
  /** Estimated score increase if the suggestion is fully applied. */
  pointsGain: number;
  /** DOM id or `data-directive` value for {@link scrollToRecommendationTarget}. */
  targetId: string;
}

/** Full scoring result shown in the security score panel. */
export interface SecurityScore {
  score: number;
  grade: SecurityGrade;
  summary: string;
  factors: ScoreFactor[];
  recommendations: ScoreRecommendation[];
  /** Upper bound if all recommendations were applied (capped at 100). */
  potentialScore: number;
}

/** Options that affect scoring but are not part of {@link PolicyState}. */
export interface ScorePolicyOptions {
  /** When true, applies a penalty because violations are not blocked. */
  reportOnly?: boolean;
  /**
   * Pre-serialized policy string.
   *
   * @remarks
   * When provided, skips redundant {@link buildPolicyString} calls inside
   * {@link scorePolicy} and {@link buildRecommendations}.
   */
  policy?: string;
}

/** Maps a directive name to the `id` of its section in the DOM. */
function directiveTarget(name: string): string {
  return `directive-section-${name}`;
}

/** Returns enabled directive values, or `null` when the directive is off. */
function getDirectiveValues(state: PolicyState, name: string): string[] | null {
  const directive = state[name];
  if (!directive?.enabled) return null;
  if (name === "upgrade-insecure-requests") return [];
  return directive.values;
}

/**
 * Resolves effective script sources from `script-src` or `default-src` fallback.
 */
function getScriptSources(state: PolicyState): string[] {
  const scriptSrc = getDirectiveValues(state, "script-src");
  if (scriptSrc?.length) return scriptSrc;

  const defaultSrc = getDirectiveValues(state, "default-src");
  if (defaultSrc?.length) return defaultSrc;

  return [];
}

function containsAny(values: string[], ...needles: string[]): boolean {
  return needles.some((needle) => values.includes(needle));
}

/** True when any source list contains a nonce or hash expression. */
function hasNonceOrHash(values: string[]): boolean {
  return values.some(
    (value) =>
      value.startsWith("'nonce-") ||
      value.startsWith("'sha256-") ||
      value.startsWith("'sha384-") ||
      value.startsWith("'sha512-"),
  );
}

/** True for `*`, `*.`, scheme-only, or host wildcard patterns. */
function hasWildcardSource(values: string[]): boolean {
  return values.some(
    (value) =>
      value === "*" ||
      value.startsWith("*.") ||
      value.includes("://*") ||
      value === "http:" ||
      value === "https:",
  );
}

function isSelfOrNoneOnly(values: string[]): boolean {
  return (
    values.length > 0 &&
    values.every((value) => value === "'self'" || value === "'none'")
  );
}

function gradeForScore(score: number): SecurityGrade {
  if (score >= 85) return "Excellent";
  if (score >= 70) return "Strong";
  if (score >= 50) return "Good";
  if (score >= 25) return "Fair";
  return "Poor";
}

function summaryForScore(score: number): string {
  if (score >= 85) {
    return "Excellent protection with strong restrictions and few risky exceptions.";
  }
  if (score >= 70) {
    return "Strong policy with solid defaults; minor improvements may still be possible.";
  }
  if (score >= 50) {
    return "Reasonable baseline, but notable gaps or risky directives remain.";
  }
  if (score >= 25) {
    return "Limited protection; several common CSP weaknesses are present.";
  }
  if (score > 0) {
    return "Weak policy that may not meaningfully reduce XSS or injection risk.";
  }
  return "No policy configured yet.";
}

/**
 * Builds prioritized recommendations based on gaps in the current policy.
 *
 * @remarks
 * Sorted by `pointsGain` descending so the highest-impact fixes appear first.
 */
function buildRecommendations(
  state: PolicyState,
  options: ScorePolicyOptions,
  policy = options.policy ?? buildPolicyString(state),
): ScoreRecommendation[] {
  const recommendations: ScoreRecommendation[] = [];

  if (!policy) {
    recommendations.push({
      id: "enable-default-src",
      label: "Enable default-src with 'self' as a baseline policy",
      pointsGain: 20,
      targetId: directiveTarget("default-src"),
    });
    return recommendations;
  }

  const scriptValues = getScriptSources(state);
  const hasScriptPolicy = scriptValues.length > 0;
  const objectValues = getDirectiveValues(state, "object-src");
  const defaultValues = getDirectiveValues(state, "default-src");
  const scriptDirective = state["script-src"]?.enabled
    ? "script-src"
    : "default-src";

  if (!hasScriptPolicy) {
    recommendations.push({
      id: "add-script-coverage",
      label: "Add script-src or default-src to control script loading",
      pointsGain: 18,
      targetId: directiveTarget("script-src"),
    });
  } else {
    if (containsAny(scriptValues, "'unsafe-inline'")) {
      recommendations.push({
        id: "remove-unsafe-inline",
        label: "Remove 'unsafe-inline' and use nonces or hashes for scripts",
        pointsGain: 35,
        targetId: directiveTarget(scriptDirective),
      });
    }

    if (containsAny(scriptValues, "'unsafe-eval'")) {
      recommendations.push({
        id: "remove-unsafe-eval",
        label: "Remove 'unsafe-eval' to block eval()-style execution",
        pointsGain: 28,
        targetId: directiveTarget(scriptDirective),
      });
    }

    if (!hasNonceOrHash(scriptValues)) {
      recommendations.push({
        id: "add-nonce-hash",
        label: "Add a nonce or hash source for trusted scripts",
        pointsGain: 15,
        targetId: directiveTarget(scriptDirective),
      });
    }

    if (
      hasNonceOrHash(scriptValues) &&
      !containsAny(scriptValues, "'strict-dynamic'")
    ) {
      recommendations.push({
        id: "add-strict-dynamic",
        label: "Add 'strict-dynamic' alongside your nonce or hash",
        pointsGain: 5,
        targetId: directiveTarget(scriptDirective),
      });
    }

    if (containsAny(scriptValues, "data:")) {
      recommendations.push({
        id: "remove-data-scripts",
        label: "Remove data: from script sources",
        pointsGain: 8,
        targetId: directiveTarget(scriptDirective),
      });
    }

    if (hasWildcardSource(scriptValues)) {
      recommendations.push({
        id: "tighten-script-sources",
        label:
          "Replace wildcards or broad schemes in script sources with specific hosts",
        pointsGain: 12,
        targetId: directiveTarget(scriptDirective),
      });
    }
  }

  if (!objectValues || !containsAny(objectValues, "'none'")) {
    recommendations.push({
      id: "object-src-none",
      label: "Set object-src to 'none' to block plugins",
      pointsGain: 22,
      targetId: directiveTarget("object-src"),
    });
  }

  if (!defaultValues) {
    recommendations.push({
      id: "add-default-src",
      label: "Add default-src to define a fallback for all resource types",
      pointsGain: 11,
      targetId: directiveTarget("default-src"),
    });
  } else {
    if (!isSelfOrNoneOnly(defaultValues)) {
      recommendations.push({
        id: "restrict-default-src",
        label: "Tighten default-src to 'self' or explicit trusted hosts",
        pointsGain: 5,
        targetId: directiveTarget("default-src"),
      });
    }

    if (hasWildcardSource(defaultValues)) {
      recommendations.push({
        id: "remove-default-wildcards",
        label: "Remove wildcards or scheme-only sources from default-src",
        pointsGain: 10,
        targetId: directiveTarget("default-src"),
      });
    }
  }

  const frameAncestors = getDirectiveValues(state, "frame-ancestors");
  if (!frameAncestors) {
    recommendations.push({
      id: "add-frame-ancestors",
      label: "Add frame-ancestors 'self' to reduce clickjacking risk",
      pointsGain: 8,
      targetId: directiveTarget("frame-ancestors"),
    });
  } else if (hasWildcardSource(frameAncestors)) {
    recommendations.push({
      id: "tighten-frame-ancestors",
      label: "Restrict frame-ancestors to specific trusted embedders",
      pointsGain: 6,
      targetId: directiveTarget("frame-ancestors"),
    });
  }

  const baseUri = getDirectiveValues(state, "base-uri");
  if (!baseUri) {
    recommendations.push({
      id: "add-base-uri",
      label: "Add base-uri 'self' to restrict base tag URLs",
      pointsGain: 10,
      targetId: directiveTarget("base-uri"),
    });
  } else if (!containsAny(baseUri, "'self'", "'none'")) {
    recommendations.push({
      id: "restrict-base-uri",
      label: "Restrict base-uri to 'self' or 'none'",
      pointsGain: 6,
      targetId: directiveTarget("base-uri"),
    });
  }

  if (!getDirectiveValues(state, "form-action")) {
    recommendations.push({
      id: "add-form-action",
      label: "Add form-action 'self' to restrict form submission targets",
      pointsGain: 4,
      targetId: directiveTarget("form-action"),
    });
  }

  if (!state["upgrade-insecure-requests"]?.enabled) {
    recommendations.push({
      id: "upgrade-insecure-requests",
      label: "Enable upgrade-insecure-requests to prefer HTTPS",
      pointsGain: 5,
      targetId: directiveTarget("upgrade-insecure-requests"),
    });
  }

  if (!state["require-trusted-types-for"]?.enabled) {
    recommendations.push({
      id: "require-trusted-types",
      label: "Enable require-trusted-types-for to enforce Trusted Types",
      pointsGain: 8,
      targetId: directiveTarget("require-trusted-types-for"),
    });
  }

  if (!state["trusted-types"]?.enabled) {
    recommendations.push({
      id: "trusted-types",
      label: "Define a trusted-types policy allowlist",
      pointsGain: 3,
      targetId: directiveTarget("trusted-types"),
    });
  }

  if (options.reportOnly) {
    recommendations.push({
      id: "enforce-policy",
      label: "Switch to enforcing mode instead of Report-Only",
      pointsGain: 8,
      targetId: "policy-header-mode",
    });
  }

  return recommendations.sort((a, b) => b.pointsGain - a.pointsGain);
}

/**
 * Computes a security score, grade, and recommendations for a policy state.
 *
 * @param state - Current builder policy state.
 * @param options - Scoring modifiers (for example, Report-Only header mode).
 * @returns Score breakdown suitable for the live security score panel.
 */
export function scorePolicy(
  state: PolicyState,
  options: ScorePolicyOptions = {},
): SecurityScore {
  const factors: ScoreFactor[] = [];
  let rawScore = 0;

  const policy = options.policy ?? buildPolicyString(state);
  if (!policy) {
    const recommendations = buildRecommendations(state, options, policy);
    return {
      score: 0,
      grade: "Poor",
      summary: "No policy configured yet.",
      factors: [{ label: "No CSP directives enabled", points: 0 }],
      recommendations,
      potentialScore: Math.min(
        100,
        recommendations.reduce((sum, item) => sum + item.pointsGain, 0),
      ),
    };
  }

  factors.push({ label: "Policy is defined", points: 20 });
  rawScore += 20;

  const scriptValues = getScriptSources(state);
  const hasScriptPolicy = scriptValues.length > 0;
  const objectValues = getDirectiveValues(state, "object-src");
  const defaultValues = getDirectiveValues(state, "default-src");

  if (hasScriptPolicy) {
    if (containsAny(scriptValues, "'unsafe-inline'")) {
      factors.push({ label: "Allows 'unsafe-inline' scripts", points: -25 });
      rawScore -= 25;
    } else {
      factors.push({ label: "Blocks inline scripts by default", points: 10 });
      rawScore += 10;
    }

    if (containsAny(scriptValues, "'unsafe-eval'")) {
      factors.push({ label: "Allows 'unsafe-eval'", points: -20 });
      rawScore -= 20;
    } else {
      factors.push({ label: "Blocks eval()-style execution", points: 8 });
      rawScore += 8;
    }

    if (hasNonceOrHash(scriptValues)) {
      factors.push({ label: "Uses nonce or hash for scripts", points: 15 });
      rawScore += 15;
    }

    if (
      containsAny(scriptValues, "'strict-dynamic'") &&
      hasNonceOrHash(scriptValues)
    ) {
      factors.push({
        label: "'strict-dynamic' with a trusted root script",
        points: 5,
      });
      rawScore += 5;
    }

    if (containsAny(scriptValues, "data:")) {
      factors.push({ label: "Allows data: URIs for scripts", points: -8 });
      rawScore -= 8;
    }

    if (hasWildcardSource(scriptValues)) {
      factors.push({
        label: "Permissive wildcard or scheme in script sources",
        points: -12,
      });
      rawScore -= 12;
    }
  } else {
    factors.push({
      label: "No script-src or default-src coverage",
      points: -10,
    });
    rawScore -= 10;
  }

  if (objectValues && containsAny(objectValues, "'none'")) {
    factors.push({ label: "object-src is 'none'", points: 12 });
    rawScore += 12;
  } else {
    factors.push({
      label: "object-src is not set to 'none'",
      points: -10,
    });
    rawScore -= 10;
  }

  if (defaultValues) {
    factors.push({ label: "default-src is specified", points: 6 });
    rawScore += 6;

    if (isSelfOrNoneOnly(defaultValues)) {
      factors.push({ label: "Restrictive default-src fallback", points: 5 });
      rawScore += 5;
    }

    if (hasWildcardSource(defaultValues)) {
      factors.push({
        label: "Wildcard or broad scheme in default-src",
        points: -10,
      });
      rawScore -= 10;
    }
  }

  const frameAncestors = getDirectiveValues(state, "frame-ancestors");
  if (frameAncestors) {
    factors.push({ label: "frame-ancestors limits embedding", points: 8 });
    rawScore += 8;
    if (hasWildcardSource(frameAncestors)) {
      factors.push({
        label: "frame-ancestors is overly permissive",
        points: -6,
      });
      rawScore -= 6;
    }
  } else {
    factors.push({
      label: "frame-ancestors missing (clickjacking risk)",
      points: -8,
    });
    rawScore -= 8;
  }

  const baseUri = getDirectiveValues(state, "base-uri");
  if (baseUri && containsAny(baseUri, "'self'", "'none'")) {
    factors.push({ label: "base-uri is restricted", points: 6 });
    rawScore += 6;
  } else if (!baseUri) {
    factors.push({ label: "base-uri is not restricted", points: -4 });
    rawScore -= 4;
  }

  const formAction = getDirectiveValues(state, "form-action");
  if (formAction) {
    factors.push({ label: "form-action is restricted", points: 4 });
    rawScore += 4;
  }

  if (state["upgrade-insecure-requests"]?.enabled) {
    factors.push({ label: "upgrade-insecure-requests is enabled", points: 5 });
    rawScore += 5;
  }

  if (state["require-trusted-types-for"]?.enabled) {
    factors.push({ label: "Trusted Types enforcement enabled", points: 8 });
    rawScore += 8;
  }

  if (state["trusted-types"]?.enabled) {
    factors.push({ label: "trusted-types policy allowlist set", points: 3 });
    rawScore += 3;
  }

  if (options.reportOnly) {
    factors.push({
      label: "Report-Only mode (violations are not blocked)",
      points: -8,
    });
    rawScore -= 8;
  }

  const score = Math.max(0, Math.min(100, Math.round(rawScore)));
  const recommendations = buildRecommendations(state, options, policy);
  const potentialScore = Math.min(
    100,
    score + recommendations.reduce((sum, item) => sum + item.pointsGain, 0),
  );

  return {
    score,
    grade: gradeForScore(score),
    summary: summaryForScore(score),
    factors: factors.sort((a, b) => Math.abs(b.points) - Math.abs(a.points)),
    recommendations,
    potentialScore,
  };
}
