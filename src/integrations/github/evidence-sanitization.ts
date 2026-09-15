/**
 * Evidence Sanitization (PRUX-008).
 *
 * Escapes Markdown special characters, prevents HTML injection,
 * prevents malformed links, and caps rendered content length.
 *
 * Pure functions — no I/O, no clock, no randomness.
 */

import { sanitizeErrorText } from "../../forensics/evidence-hygiene.js";

const MAX_MARKDOWN_TEXT_LENGTH = 500;
const MAX_TEST_NAME_LENGTH = 120;
const MAX_FILE_PATH_LENGTH = 200;
const MAX_ERROR_MESSAGE_LENGTH = 1000;
const MAX_RENDERED_FINDINGS = 50;

/**
 * Characters that have special meaning in Markdown and must be escaped
 * to render as literal text.
 */
const MARKDOWN_SPECIAL_RE = /[[\]*_`~\\|{}()<>#!]/g;

/**
 * HTML tags and entities that could enable injection.
 */
const HTML_INJECTION_RE = /<[^>]*>/g;
const HTML_ENTITY_RE = /&\w+;|&#\d+;|&#x[\da-f]+;/gi;

/**
 * Patterns that could form malformed or malicious links.
 */
const MALFORMED_LINK_PATTERNS = [
  /\]\s*\(\s*(?:javascript|data|vbscript)\s*:/gi,
  /\]\s*\(\s*[^)]{0,200}<[^)]{0,200}>/g,
];

const RTL_OVERRIDE_RE = /[\u200f\u202e\u2067\u2066\u2069\u2068]/g;

/**
 * Escape Markdown special characters in text so they render as literals.
 */
function escapeMarkdownChars(text: string): string {
  return text.replace(MARKDOWN_SPECIAL_RE, "\\$&");
}

/**
 * Strip HTML tags and entities to prevent injection.
 */
function stripHtml(text: string): string {
  return text.replace(HTML_ENTITY_RE, "").replace(HTML_INJECTION_RE, "");
}

/**
 * Neutralize potential malformed link patterns.
 */
function neutralizeMalformedLinks(text: string): string {
  let result = text;
  for (const pattern of MALFORMED_LINK_PATTERNS) {
    result = result.replace(
      pattern,
      (match) => `[sanitized: ${match.slice(0, 40)}]`,
    );
  }
  return result;
}

/**
 * Strip RTL override characters that could confuse display.
 */
function stripRtlOverrides(text: string): string {
  return text.replace(RTL_OVERRIDE_RE, "");
}

/**
 * Sanitize arbitrary text for safe inclusion in Markdown.
 * Escapes special chars, strips HTML, prevents link injection,
 * strips RTL overrides, and caps length.
 */
export function sanitizeForMarkdown(text: string): string {
  let result = text;
  result = stripHtml(result);
  result = stripRtlOverrides(result);
  result = neutralizeMalformedLinks(result);
  result = escapeMarkdownChars(result);
  if (result.length > MAX_MARKDOWN_TEXT_LENGTH) {
    result = result.slice(0, MAX_MARKDOWN_TEXT_LENGTH) + "\\.\\.\\.";
  }
  return result;
}

/**
 * Sanitize a test name: escape Markdown, truncate.
 */
export function sanitizeTestName(name: string): string {
  let result = stripHtml(name);
  result = stripRtlOverrides(result);
  result = escapeMarkdownChars(result);
  if (result.length > MAX_TEST_NAME_LENGTH) {
    result = result.slice(0, MAX_TEST_NAME_LENGTH) + "\\.\\.\\.";
  }
  return result;
}

/**
 * Sanitize a file path: escape Markdown, truncate.
 */
export function sanitizeFilePath(path: string): string {
  let result = stripHtml(path);
  result = stripRtlOverrides(result);
  result = escapeMarkdownChars(result);
  if (result.length > MAX_FILE_PATH_LENGTH) {
    result = "\\.\\" + result.slice(result.length - MAX_FILE_PATH_LENGTH + 4);
  }
  return result;
}

/**
 * Sanitize an error message: leverage evidence-hygiene (secret redaction
 * + control-char sanitization), then escape Markdown.
 */
export function sanitizeErrorMessage(msg: string): string {
  let result = sanitizeErrorText(msg, { maxLength: MAX_ERROR_MESSAGE_LENGTH });
  result = stripRtlOverrides(result);
  result = neutralizeMalformedLinks(result);
  result = escapeMarkdownChars(result);
  return result;
}

/**
 * Cap the number of findings rendered to prevent excessively large comments.
 */
export function capFindingsCount<T>(
  findings: T[],
  max: number = MAX_RENDERED_FINDINGS,
): T[] {
  return findings.slice(0, max);
}
