export async function sha256Base64FromText(text: string): Promise<string> {
  const data = new TextEncoder().encode(text);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const bytes = new Uint8Array(hashBuffer);

  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }

  return btoa(binary);
}

export function formatSha256HashForCsp(base64Hash: string): string {
  return `'sha256-${base64Hash}'`;
}

function escapeHtmlAttribute(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;");
}

export function buildInlineStyleAttributeSnippet(styleValue: string): string {
  const safeValue = escapeHtmlAttribute(styleValue);
  return `<div style="${safeValue}">...</div>`;
}

export const STYLE_ATTR_UNSAFE_HASHES = "'unsafe-hashes'";
