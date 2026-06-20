/**
 * Parses CSP policy strings and extracts policies from HTML meta tags.
 *
 * @remarks
 * Used when importing an existing policy from a URL or pasted text. Parsing is
 * intentionally lenient for real-world policies: quoted keywords, host sources,
 * and scheme sources are tokenized without fully validating CSP grammar.
 */

/** Result of parsing a policy string before report-only mode is applied. */
export interface ParsedPolicy {
  /** Whether the policy should be treated as Report-Only (set by importers). */
  reportOnly: boolean;
  /** Directive name mapped to its source value list (empty for boolean directives). */
  directives: Record<string, string[]>;
}

/**
 * Tokenizes the value portion of a directive into individual CSP sources.
 *
 * @param valuePart - Text after the directive name (for example, `'self' https://cdn.example.com`).
 * @returns Quoted and unquoted tokens preserving their original quoting where applicable.
 *
 * @remarks
 * Handles single- and double-quoted tokens so values like `'nonce-abc'` survive intact.
 */
export function parseSourceValues(valuePart: string): string[] {
  const values: string[] = [];
  let index = 0;

  while (index < valuePart.length) {
    // Skip whitespace between tokens before reading the next source expression.
    while (index < valuePart.length && /\s/.test(valuePart[index] ?? "")) {
      index += 1;
    }
    if (index >= valuePart.length) break;

    const char = valuePart[index];
    if (char === "'" || char === '"') {
      const quote = char;
      index += 1;
      const start = index;
      while (index < valuePart.length && valuePart[index] !== quote) {
        index += 1;
      }
      values.push(`${quote}${valuePart.slice(start, index)}${quote}`);
      index += 1;
      continue;
    }

    // Unquoted token (host, scheme, or keyword without surrounding quotes in input).
    const start = index;
    while (index < valuePart.length && !/\s/.test(valuePart[index] ?? "")) {
      index += 1;
    }
    values.push(valuePart.slice(start, index));
  }

  return values;
}

/**
 * Parses a semicolon-separated CSP policy string into directive buckets.
 *
 * @param policy - Raw policy value (without the header name).
 * @returns Parsed directives; `reportOnly` defaults to `false` until an importer sets it.
 */
export function parsePolicyString(policy: string): ParsedPolicy {
  const directives: Record<string, string[]> = {};

  for (const segment of policy.split(";")) {
    const trimmed = segment.trim();
    if (!trimmed) continue;

    const spaceIndex = trimmed.indexOf(" ");
    const name = (
      spaceIndex === -1 ? trimmed : trimmed.slice(0, spaceIndex)
    ).trim();
    const valuePart =
      spaceIndex === -1 ? "" : trimmed.slice(spaceIndex + 1).trim();

    if (!name) continue;

    // Legacy boolean directives have no source list.
    if (
      name === "upgrade-insecure-requests" ||
      name === "block-all-mixed-content"
    ) {
      directives[name] = [];
      continue;
    }

    directives[name] = valuePart ? parseSourceValues(valuePart) : [];
  }

  return { reportOnly: false, directives };
}

/**
 * Extracts a CSP from HTML `<meta http-equiv="Content-Security-Policy" …>` tags.
 *
 * @param html - Raw HTML document text (truncated server-side before calling).
 * @returns The enforce policy if present, otherwise report-only, otherwise `null`.
 *
 * @remarks
 * Enforce policies take precedence over report-only. Both attribute orderings
 * (`http-equiv` before `content` and the reverse) are supported.
 */
export function extractMetaCsp(html: string): {
  policy: string | null;
  reportOnly: boolean;
} {
  const metaPattern =
    /<meta\b[^>]*http-equiv\s*=\s*["']([^"']+)["'][^>]*content\s*=\s*["']([^"']+)["'][^>]*>/gi;

  let enforcePolicy: string | null = null;
  let reportOnlyPolicy: string | null = null;

  for (const match of html.matchAll(metaPattern)) {
    const equiv = match[1]?.trim().toLowerCase();
    const content = match[2]?.trim();
    if (!content) continue;

    // Standard attribute order: http-equiv before content.
    if (equiv === "content-security-policy") {
      enforcePolicy = content;
    } else if (equiv === "content-security-policy-report-only") {
      reportOnlyPolicy = content;
    }
  }

  const reversedPattern =
    /<meta\b[^>]*content\s*=\s*["']([^"']+)["'][^>]*http-equiv\s*=\s*["']([^"']+)["'][^>]*>/gi;

  for (const match of html.matchAll(reversedPattern)) {
    const content = match[1]?.trim();
    const equiv = match[2]?.trim().toLowerCase();
    if (!content) continue;

    // Reversed attribute order: content before http-equiv.
    if (equiv === "content-security-policy") {
      enforcePolicy = content;
    } else if (equiv === "content-security-policy-report-only") {
      reportOnlyPolicy = content;
    }
  }

  if (enforcePolicy) {
    // Enforce policies always win over report-only meta tags.
    return { policy: enforcePolicy, reportOnly: false };
  }

  if (reportOnlyPolicy) {
    return { policy: reportOnlyPolicy, reportOnly: true };
  }

  return { policy: null, reportOnly: false };
}
