/**
 * Evidence hygiene — secret redaction + control-char sanitization
 * (ENGINE-012).
 *
 * Pure, deterministic, bounded. Every error text entering the forensics
 * pipeline passes through `sanitizeErrorText` so that secrets, control
 * characters, and oversized payloads never survive into reports or
 * committed artifacts.
 */

const MAX_LENGTH_DEFAULT = 10_240;

interface SanitizeOptions {
  maxLength?: number;
}

interface RedactionPattern {
  name: string;
  regex: RegExp;
}

const REDACTION_PATTERNS: readonly RedactionPattern[] = [
  {
    name: "aws-key",
    regex: /AKIA[0-9A-Z]{16}/g,
  },
  {
    name: "github-token",
    regex: /gh[pousr]_\w{36,}/g,
  },
  {
    name: "jwt",
    regex: /eyJ[\w-]+\.eyJ[\w-]+\.[\w-]+/g,
  },
  {
    name: "bearer-token",
    regex: /[Bb]earer\s+[\w.+-]+/g,
  },
  {
    name: "api-key-assignment",
    regex:
      /apikey\s*[:=]\s*['"]?[\w.]{8,}['"]?|api[_-]?key\s*[:=]\s*['"]?[\w.]{8,}['"]?/gi,
  },
  {
    name: "password-assignment",
    regex: /(?:password|passwd|pwd)\s*[:=]\s*['"]?[^\s'"]{4,}['"]?/gi,
  },
  {
    name: "private-key",
    regex: /-----BEGIN[A\s][^-]*KEY-----[\s\S]*?-----END[A\s][^-]*KEY-----/g,
  },
  {
    name: "hex-secret",
    regex: /\b[0-9a-f]{33,}\b/gi,
  },
  {
    name: "base64-secret",
    regex: /\b[\w+/]{100,}={0,2}\b/g,
  },
];

// eslint-disable-next-line no-control-regex
const CONTROL_CHAR_PATTERN = /[\0\x07\x08\v\f\x0e\x0f\x1b\x7f\x80-\x9f]/g;

/**
 * Sanitize error text: redact secrets, strip control characters, cap length.
 * Pure and deterministic — same input always yields the same output.
 */
export function sanitizeErrorText(
  text: string,
  options?: SanitizeOptions,
): string {
  const maxLength = options?.maxLength ?? MAX_LENGTH_DEFAULT;

  let result = text;

  for (const { name, regex } of REDACTION_PATTERNS) {
    result = result.replace(regex, `[REDACTED:${name}]`);
  }

  result = result.replace(CONTROL_CHAR_PATTERN, "");

  if (result.length > maxLength) {
    result = result.slice(0, maxLength) + `[truncated at ${maxLength} chars]`;
  }

  return result;
}
