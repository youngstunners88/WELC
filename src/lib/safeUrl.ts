/**
 * Returns the URL only if it is a safe http(s) link, otherwise undefined.
 * Prevents javascript: and other XSS vectors when rendering <a href>.
 */
export function safeUrl(url: string | null | undefined): string | undefined {
  if (!url) return undefined;
  try {
    const parsed = new URL(url);
    if (parsed.protocol === "http:" || parsed.protocol === "https:") return url;
  } catch {
    // not a valid URL
  }
  return undefined;
}
