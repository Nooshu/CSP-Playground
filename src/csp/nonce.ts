const NONCE_BYTES = 16;

export function generateNonce(): string {
  const bytes = new Uint8Array(NONCE_BYTES);
  crypto.getRandomValues(bytes);

  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }

  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

export function formatNonceForCsp(nonce: string): string {
  return `'nonce-${nonce}'`;
}

export function hostSourceFromUrl(urlString: string): string {
  const url = new URL(urlString);
  return `${url.protocol}//${url.host}`;
}

export function hostSourceFromScriptUrl(urlString: string): string {
  return hostSourceFromUrl(urlString);
}

function escapeHtmlAttribute(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;");
}

export function buildExternalScriptSnippet(
  nonce: string,
  scriptUrl: string,
): string {
  const safeUrl = escapeHtmlAttribute(scriptUrl.trim());
  return `<script src="${safeUrl}" nonce="${nonce}"></script>`;
}

export function buildInlineScriptSnippet(
  nonce: string,
  scriptContent: string,
): string {
  return `<script nonce="${nonce}">\n${scriptContent.trim()}\n</script>`;
}

export function buildExternalStylesheetSnippet(
  nonce: string,
  stylesheetUrl: string,
): string {
  const safeUrl = escapeHtmlAttribute(stylesheetUrl.trim());
  return `<link rel="stylesheet" href="${safeUrl}" nonce="${nonce}" />`;
}

export function buildInlineStyleSnippet(
  nonce: string,
  styleContent: string,
): string {
  return `<style nonce="${nonce}">\n${styleContent.trim()}\n</style>`;
}

function parseHttpUrl(input: string, resourceLabel: string): string {
  const trimmed = input.trim();
  if (!trimmed) {
    throw new Error(`Enter the URL of the ${resourceLabel}.`);
  }

  try {
    const url = new URL(trimmed);
    if (url.protocol !== "http:" && url.protocol !== "https:") {
      throw new Error(`Only HTTP and HTTPS ${resourceLabel} URLs are supported.`);
    }
    return url.toString();
  } catch (error) {
    if (error instanceof Error && error.message.includes("HTTP")) {
      throw error;
    }
    throw new Error(`Enter a valid ${resourceLabel} URL.`);
  }
}

export function parseScriptUrl(input: string): string {
  return parseHttpUrl(input, "script");
}

export function parseStylesheetUrl(input: string): string {
  return parseHttpUrl(input, "stylesheet");
}
