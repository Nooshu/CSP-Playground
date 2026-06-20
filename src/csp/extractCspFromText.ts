/**
 * Extracts a CSP policy value from pasted HTTP headers or raw policy text.
 *
 * @remarks
 * Accepts full response header blocks, single header lines, or a bare policy
 * string. Enforce policies take precedence over report-only, matching server
 * lookup behaviour.
 */

/** Where the extracted policy text came from. */
export type ExtractCspSource =
  | "header-enforce"
  | "header-report-only"
  | "raw";

/** Successful extraction result. */
export interface ExtractCspResult {
  policy: string;
  reportOnly: boolean;
  source: ExtractCspSource;
}

/** Machine-readable extraction failure codes. */
export type ExtractCspErrorCode = "empty" | "no_csp";

/**
 * Typed error thrown when pasted text cannot yield a CSP policy.
 */
export class ExtractCspError extends Error {
  code: ExtractCspErrorCode;

  constructor(code: ExtractCspErrorCode, message: string) {
    super(message);
    this.code = code;
    this.name = "ExtractCspError";
  }
}

const ENFORCE_HEADER_PATTERN =
  /^\s*content-security-policy(?!-report-only)\s*:\s*(.+)$/i;
const REPORT_ONLY_HEADER_PATTERN =
  /^\s*content-security-policy-report-only\s*:\s*(.+)$/i;

/**
 * Normalizes line endings and outer whitespace before tokenizing source values.
 */
function normalizeInput(input: string): string {
  return input.replace(/\r\n/g, "\n").trim();
}

/** Collects all CSP header values matching `pattern` across a multi-line paste. */
function collectHeaderValues(
  text: string,
  pattern: RegExp,
): string[] {
  const values: string[] = [];

  for (const line of text.split("\n")) {
    const match = line.match(pattern);
    if (match?.[1]?.trim()) {
      values.push(match[1].trim());
    }
  }

  return values;
}

/**
 * Joins duplicate CSP header values the way browsers combine repeated headers.
 */
function joinPolicies(values: string[]): string {
  return values.join("; ");
}

/**
 * Detects whether pasted text looks like HTTP headers rather than a bare policy.
 *
 * @remarks
 * Used to distinguish "headers without CSP" (actionable error) from raw policy text.
 */
function looksLikeHttpHeaders(text: string): boolean {
  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    if (/^HTTP\/\d/i.test(trimmed)) return true;
    if (/^[\w-]+\s*:\s*.+/.test(trimmed)) return true;
  }

  return false;
}

/**
 * Parses a single-line enforce or report-only CSP header value.
 */
function extractFromSingleHeaderLine(text: string): ExtractCspResult | null {
  const reportOnlyMatch = text.match(REPORT_ONLY_HEADER_PATTERN);
  if (reportOnlyMatch?.[1]?.trim()) {
    return {
      policy: reportOnlyMatch[1].trim(),
      reportOnly: true,
      source: "header-report-only",
    };
  }

  const enforceMatch = text.match(ENFORCE_HEADER_PATTERN);
  if (enforceMatch?.[1]?.trim()) {
    return {
      policy: enforceMatch[1].trim(),
      reportOnly: false,
      source: "header-enforce",
    };
  }

  return null;
}

/**
 * Extracts a CSP policy from pasted headers or raw policy text.
 *
 * @param input - Pasted HTTP headers, a single CSP header line, or a policy value.
 * @returns Policy text, report-only flag, and discovery source.
 * @throws {@link ExtractCspError} When input is empty or contains no usable CSP.
 */
export function extractCspFromText(input: string): ExtractCspResult {
  const normalized = normalizeInput(input);
  if (!normalized) {
    throw new ExtractCspError("empty", "Paste headers or a CSP policy to import.");
  }

  const enforceValues = collectHeaderValues(normalized, ENFORCE_HEADER_PATTERN);
  if (enforceValues.length > 0) {
    return {
      policy: joinPolicies(enforceValues),
      reportOnly: false,
      source: "header-enforce",
    };
  }

  const reportOnlyValues = collectHeaderValues(
    normalized,
    REPORT_ONLY_HEADER_PATTERN,
  );
  if (reportOnlyValues.length > 0) {
    return {
      policy: joinPolicies(reportOnlyValues),
      reportOnly: true,
      source: "header-report-only",
    };
  }

  const singleLine = normalized.replace(/\s*\n\s*/g, " ");
  const singleHeaderResult = extractFromSingleHeaderLine(singleLine);
  if (singleHeaderResult) {
    return singleHeaderResult;
  }

  if (looksLikeHttpHeaders(normalized)) {
    throw new ExtractCspError(
      "no_csp",
      "No Content-Security-Policy was found in the pasted text.",
    );
  }

  const rawPolicy = singleLine.trim();

  return {
    policy: rawPolicy,
    reportOnly: false,
    source: "raw",
  };
}
