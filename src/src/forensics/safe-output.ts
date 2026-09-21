/**
 * Safe URL/Path Handling (HYGIENE-005).
 *
 * Sanitizes URLs and paths in output to prevent XSS via links
 * and path traversal in rendered output.
 */

const DANGEROUS_PROTOCOLS = ["javascript:", "data:", "vbscript:", "file:"];

const PATH_TRAVERSAL_RE = /(?:^|[\\/])\.\.(?:[\\/]|$)/;

export function sanitizeUrl(url: string): string {
  const trimmed = url.trim();
  const lower = trimmed.toLowerCase();

  for (const protocol of DANGEROUS_PROTOCOLS) {
    if (lower.startsWith(protocol)) {
      return "";
    }
  }

  // eslint-disable-next-line no-control-regex -- intentionally stripping control chars for URL safety
  const whitespaceStripped = lower.replace(/[\s\x00-\x1f]+/g, "");
  for (const protocol of DANGEROUS_PROTOCOLS) {
    if (whitespaceStripped.startsWith(protocol)) {
      return "";
    }
  }

  if (
    !lower.startsWith("http://") &&
    !lower.startsWith("https://") &&
    !lower.startsWith("mailto:")
  ) {
    return "";
  }

  return trimmed;
}

export function hasPathTraversal(path: string): boolean {
  return PATH_TRAVERSAL_RE.test(path);
}

export function sanitizePath(path: string): string {
  const normalized = path.replace(/\\/g, "/");
  const parts = normalized.split("/");
  const safe: string[] = [];

  for (const part of parts) {
    if (part === ".." || part === ".") continue;
    if (part.length === 0) continue;
    safe.push(part);
  }

  return safe.join("/");
}

export function safeMarkdownLink(text: string, url: string): string {
  const safeUrl = sanitizeUrl(url);
  if (!safeUrl) {
    return text;
  }

  const escapedText = text
    .replace(/[\\[\]]/g, (ch) => `\\${ch}`)
    .replace(/\n/g, " ");

  return `[${escapedText}](${safeUrl})`;
}
