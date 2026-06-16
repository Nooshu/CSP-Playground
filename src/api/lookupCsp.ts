export interface CspLookupSuccess {
  url: string;
  policy: string;
  reportOnly: boolean;
  source:
    | "header-enforce"
    | "header-report-only"
    | "meta-enforce"
    | "meta-report-only";
}

export interface CspLookupFailure {
  error: "invalid_url" | "blocked_url" | "fetch_failed" | "no_csp";
  message: string;
}

export async function lookupCspFromUrl(
  url: string,
): Promise<CspLookupSuccess> {
  const response = await fetch("/api/csp-lookup", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({ url }),
  });

  const payload = (await response.json()) as CspLookupSuccess | CspLookupFailure;

  if (!response.ok) {
    const failure = payload as CspLookupFailure;
    throw failure;
  }

  return payload as CspLookupSuccess;
}
