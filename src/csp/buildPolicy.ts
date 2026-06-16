export interface DirectiveState {
  enabled: boolean;
  values: string[];
}

export type PolicyState = Record<string, DirectiveState>;

export function createInitialPolicyState(): PolicyState {
  return {};
}

export function buildPolicyString(state: PolicyState): string {
  const parts: string[] = [];

  for (const [name, directive] of Object.entries(state)) {
    if (!directive.enabled) continue;

    if (name === "upgrade-insecure-requests") {
      parts.push(name);
      continue;
    }

    if (name === "sandbox") {
      const flags = directive.values
        .map((v) => v.trim())
        .filter((v) => v.length > 0);
      parts.push(flags.length > 0 ? `${name} ${flags.join(" ")}` : name);
      continue;
    }

    const values = directive.values
      .map((v) => v.trim())
      .filter((v) => v.length > 0);

    if (values.length === 0) continue;

    if (values.includes("'none'")) {
      parts.push(`${name} 'none'`);
      continue;
    }

    parts.push(`${name} ${values.join(" ")}`);
  }

  return parts.join("; ");
}

export function buildHeaderLine(
  policy: string,
  reportOnly: boolean,
): string {
  if (!policy) return "";
  const headerName = reportOnly
    ? "Content-Security-Policy-Report-Only"
    : "Content-Security-Policy";
  return `${headerName}: ${policy}`;
}
