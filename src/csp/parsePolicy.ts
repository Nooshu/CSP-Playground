export interface ParsedPolicy {
  reportOnly: boolean;
  directives: Record<string, string[]>;
}

function parseSourceValues(valuePart: string): string[] {
  const values: string[] = [];
  let index = 0;

  while (index < valuePart.length) {
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

    const start = index;
    while (index < valuePart.length && !/\s/.test(valuePart[index] ?? "")) {
      index += 1;
    }
    values.push(valuePart.slice(start, index));
  }

  return values;
}

export function parsePolicyString(policy: string): ParsedPolicy {
  const directives: Record<string, string[]> = {};

  for (const segment of policy.split(";")) {
    const trimmed = segment.trim();
    if (!trimmed) continue;

    const spaceIndex = trimmed.indexOf(" ");
    const name = (spaceIndex === -1 ? trimmed : trimmed.slice(0, spaceIndex)).trim();
    const valuePart =
      spaceIndex === -1 ? "" : trimmed.slice(spaceIndex + 1).trim();

    if (!name) continue;

    if (name === "upgrade-insecure-requests" || name === "block-all-mixed-content") {
      directives[name] = [];
      continue;
    }

    directives[name] = valuePart ? parseSourceValues(valuePart) : [];
  }

  return { reportOnly: false, directives };
}

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

    if (equiv === "content-security-policy") {
      enforcePolicy = content;
    } else if (equiv === "content-security-policy-report-only") {
      reportOnlyPolicy = content;
    }
  }

  if (enforcePolicy) {
    return { policy: enforcePolicy, reportOnly: false };
  }

  if (reportOnlyPolicy) {
    return { policy: reportOnlyPolicy, reportOnly: true };
  }

  return { policy: null, reportOnly: false };
}
