/**
 * Validates CSP policy strings and produces a corrected, normalized version.
 *
 * @remarks
 * Used after URL import to flag duplicate directives, formatting issues, and
 * other common problems. Correction merges duplicates, normalizes keywords,
 * and serializes through {@link buildPolicyString}.
 */

import { buildPolicyString, type PolicyState } from "./buildPolicy";
import { DIRECTIVES, SANDBOX_FLAGS } from "./directives";
import { KEYWORD_OPTIONS } from "./keywords";
import { parseSourceValues } from "./parsePolicy";

/** Severity of a validation finding. */
export type PolicyIssueSeverity = "error" | "warning";

/** One validation issue with optional fix guidance. */
export interface PolicyIssue {
  severity: PolicyIssueSeverity;
  directive?: string;
  message: string;
  suggestion?: string;
}

/** Result of validating a raw CSP policy string. */
export interface PolicyValidationResult {
  issues: PolicyIssue[];
  correctedPolicy: string;
  hasErrors: boolean;
}

/** Ordered segment from a semicolon-separated policy. */
interface PolicySegment {
  name: string;
  values: string[];
  valuePart: string;
}

const BOOLEAN_DIRECTIVES = new Set([
  "upgrade-insecure-requests",
  "block-all-mixed-content",
]);

const KNOWN_DIRECTIVES = new Set([
  ...DIRECTIVES.map((directive) => directive.name),
  "block-all-mixed-content",
]);

const BUILDER_DIRECTIVES = new Set(DIRECTIVES.map((directive) => directive.name));

const DEPRECATED_DIRECTIVES = new Set(
  DIRECTIVES.filter((directive) => directive.deprecated).map(
    (directive) => directive.name,
  ),
);

const SANDBOX_FLAG_SET = new Set<string>(SANDBOX_FLAGS);

const UNQUOTED_KEYWORD_MAP = new Map<string, string>();
for (const option of KEYWORD_OPTIONS) {
  if (option.quoted) {
    UNQUOTED_KEYWORD_MAP.set(option.value.slice(1, -1), option.value);
  }
}

const DIRECTIVE_ORDER = [
  ...DIRECTIVES.map((directive) => directive.name),
  "block-all-mixed-content",
];

/**
 * Tokenizes a policy string into ordered directive segments.
 *
 * @param policy - Raw semicolon-separated CSP value.
 */
function parsePolicySegments(policy: string): PolicySegment[] {
  const segments: PolicySegment[] = [];

  for (const segment of policy.split(";")) {
    const trimmed = segment.trim();
    if (!trimmed) continue;

    const spaceIndex = trimmed.indexOf(" ");
    const name = (spaceIndex === -1 ? trimmed : trimmed.slice(0, spaceIndex)).trim();
    const valuePart =
      spaceIndex === -1 ? "" : trimmed.slice(spaceIndex + 1).trim();

    if (BOOLEAN_DIRECTIVES.has(name)) {
      segments.push({ name, values: [], valuePart });
      continue;
    }

    segments.push({
      name,
      values: valuePart ? parseSourceValues(valuePart) : [],
      valuePart,
    });
  }

  return segments;
}

/**
 * Returns true when a value portion contains unclosed quote characters.
 *
 * @param valuePart - Text after the directive name.
 */
function hasUnclosedQuotes(valuePart: string): boolean {
  let inSingle = false;
  let inDouble = false;

  for (const char of valuePart) {
    if (char === "'" && !inDouble) {
      inSingle = !inSingle;
    } else if (char === '"' && !inSingle) {
      inDouble = !inDouble;
    }
  }

  return inSingle || inDouble;
}

/**
 * Normalizes a source value, quoting known keywords when unquoted.
 *
 * @param value - Raw token from the policy.
 */
function normalizeSourceValue(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return trimmed;

  if (trimmed.startsWith("'") || trimmed.startsWith('"')) {
    return trimmed;
  }

  return UNQUOTED_KEYWORD_MAP.get(trimmed) ?? trimmed;
}

/**
 * Deduplicates values while preserving first-seen order.
 *
 * @param values - Source tokens for one directive.
 */
function dedupeValues(values: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const value of values) {
    const normalized = normalizeSourceValue(value);
    if (seen.has(normalized)) continue;
    seen.add(normalized);
    result.push(normalized);
  }

  return result;
}

/**
 * Builds corrected directive state from parsed segments.
 *
 * @param segments - Ordered segments from the original policy.
 */
function buildCorrectedState(segments: PolicySegment[]): PolicyState {
  const merged = new Map<string, string[]>();

  for (const segment of segments) {
    if (!segment.name || !KNOWN_DIRECTIVES.has(segment.name)) continue;

    if (BOOLEAN_DIRECTIVES.has(segment.name)) {
      merged.set(segment.name, []);
      continue;
    }

    const existing = merged.get(segment.name) ?? [];
    const combined = [...existing, ...segment.values];
    merged.set(segment.name, dedupeValues(combined));
  }

  const state: PolicyState = {};

  for (const name of DIRECTIVE_ORDER) {
    if (!merged.has(name)) continue;
    state[name] = { enabled: true, values: applyNoneRule(merged.get(name) ?? []) };
  }

  return state;
}

/**
 * When `'none'` is present, only that token is kept.
 *
 * @param values - Normalized source list.
 */
function applyNoneRule(values: string[]): string[] {
  const normalized = values.map((value) => normalizeSourceValue(value));
  if (normalized.includes("'none'")) {
    return ["'none'"];
  }
  return normalized;
}

/**
 * Filters sandbox flags to the known allowlist.
 *
 * @param values - Raw sandbox flag tokens.
 */
function filterSandboxFlags(values: string[]): string[] {
  return dedupeValues(values).filter((flag) => SANDBOX_FLAG_SET.has(flag));
}

/**
 * Validates a CSP policy string and returns issues plus a corrected version.
 *
 * @param policy - Raw policy value (without the header name).
 */
export function validatePolicyString(policy: string): PolicyValidationResult {
  const issues: PolicyIssue[] = [];
  const segments = parsePolicySegments(policy);
  const directiveCounts = new Map<string, number>();

  if (policy.trim() && segments.length === 0) {
    issues.push({
      severity: "error",
      message: "Policy contains no valid directives.",
      suggestion: "Add at least one directive, for example default-src 'self'.",
    });
  }

  for (const segment of policy.split(";")) {
    if (segment.trim() === "" && policy.includes(";")) {
      issues.push({
        severity: "error",
        message: "Empty directive segment (stray semicolon).",
        suggestion: "Remove extra semicolons between directives.",
      });
      break;
    }
  }

  for (const segment of segments) {
    if (!segment.name) {
      issues.push({
        severity: "error",
        message: "Directive segment has no name.",
        suggestion: "Each segment must start with a directive name.",
      });
      continue;
    }

    directiveCounts.set(
      segment.name,
      (directiveCounts.get(segment.name) ?? 0) + 1,
    );

    if (!KNOWN_DIRECTIVES.has(segment.name)) {
      issues.push({
        severity: "error",
        directive: segment.name,
        message: `${segment.name} is not a recognized CSP directive.`,
        suggestion: "Remove the directive or check the spelling against MDN.",
      });
    } else if (!BUILDER_DIRECTIVES.has(segment.name)) {
      issues.push({
        severity: "warning",
        directive: segment.name,
        message: `${segment.name} is valid CSP but is not editable in this builder.`,
        suggestion:
          "You can keep it in your deployed policy; it will not appear in the form below.",
      });
    }

    if (DEPRECATED_DIRECTIVES.has(segment.name)) {
      issues.push({
        severity: "warning",
        directive: segment.name,
        message: `${segment.name} is deprecated.`,
        suggestion: "Prefer report-to with a Reporting-Endpoints header.",
      });
    }

    if (BOOLEAN_DIRECTIVES.has(segment.name) && segment.valuePart) {
      issues.push({
        severity: "error",
        directive: segment.name,
        message: `${segment.name} must not have a value list.`,
        suggestion: `Use bare ${segment.name} with no sources after the name.`,
      });
    }

    if (
      segment.valuePart &&
      !BOOLEAN_DIRECTIVES.has(segment.name) &&
      hasUnclosedQuotes(segment.valuePart)
    ) {
      issues.push({
        severity: "error",
        directive: segment.name,
        message: `Unclosed quote in ${segment.name}.`,
        suggestion: "Close every opening ' or \" in source values.",
      });
    }

    if (
      segment.name === "sandbox" ||
      (segment.name && !BOOLEAN_DIRECTIVES.has(segment.name))
    ) {
      const valueCounts = new Map<string, number>();
      for (const value of segment.values) {
        const key = value.trim();
        valueCounts.set(key, (valueCounts.get(key) ?? 0) + 1);
      }

      for (const [value, count] of valueCounts) {
        if (count > 1) {
          issues.push({
            severity: "error",
            directive: segment.name,
            message: `${value} is repeated in ${segment.name}.`,
            suggestion: "Remove duplicate values from the source list.",
          });
        }
      }
    }

    if (segment.name === "sandbox") {
      for (const flag of segment.values) {
        const trimmed = flag.trim();
        if (trimmed && !SANDBOX_FLAG_SET.has(trimmed)) {
          issues.push({
            severity: "error",
            directive: segment.name,
            message: `${trimmed} is not a valid sandbox flag.`,
            suggestion: "Use only recognized sandbox tokens from the CSP spec.",
          });
        }
      }
    } else if (
      segment.name &&
      !BOOLEAN_DIRECTIVES.has(segment.name) &&
      segment.values.length === 0
    ) {
      issues.push({
        severity: "error",
        directive: segment.name,
        message: `${segment.name} has no source values.`,
        suggestion: "Add at least one source or keyword, for example 'self'.",
      });
    }

    if (
      segment.name &&
      !BOOLEAN_DIRECTIVES.has(segment.name) &&
      segment.name !== "sandbox"
    ) {
      const hasNone = segment.values.some(
        (value) => normalizeSourceValue(value) === "'none'",
      );
      if (hasNone && segment.values.length > 1) {
        issues.push({
          severity: "error",
          directive: segment.name,
          message: `'none' in ${segment.name} must not be combined with other sources.`,
          suggestion: "Use only 'none' or remove 'none' and list explicit sources.",
        });
      }

      for (const value of segment.values) {
        const trimmed = value.trim();
        if (
          !trimmed.startsWith("'") &&
          !trimmed.startsWith('"') &&
          UNQUOTED_KEYWORD_MAP.has(trimmed)
        ) {
          const quoted = UNQUOTED_KEYWORD_MAP.get(trimmed);
          issues.push({
            severity: "error",
            directive: segment.name,
            message: `Keyword ${trimmed} in ${segment.name} should be quoted.`,
            suggestion: `Use ${quoted} instead of ${trimmed}.`,
          });
        }
      }
    }
  }

  for (const [name, count] of directiveCounts) {
    if (count > 1) {
      issues.push({
        severity: "error",
        directive: name,
        message: `${name} appears ${count} times.`,
        suggestion: "Merge into a single directive with one combined source list.",
      });
    }
  }

  const state = buildCorrectedState(segments);

  for (const [name, directive] of Object.entries(state)) {
    if (name === "sandbox") {
      directive.values = filterSandboxFlags(directive.values);
    }
  }

  const correctedPolicy = buildPolicyString(state);
  const hasErrors = issues.some((issue) => issue.severity === "error");

  return { issues, correctedPolicy, hasErrors };
}
