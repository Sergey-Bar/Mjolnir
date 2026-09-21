import { describe, expect, it } from "vitest";
import { sanitizeErrorText } from "../../src/forensics/evidence-hygiene.js";

describe("sanitizeErrorText", () => {
  describe("secret redaction", () => {
    it("redacts AWS access keys", () => {
      const input = "Access denied with key AKIAIOSFODNN7EXAMPLE";
      const result = sanitizeErrorText(input);
      expect(result).toBe("Access denied with key [REDACTED:aws-key]");
    });

    it("redacts GitHub PAT tokens (ghp_)", () => {
      const input = "Auth failed: ghp_ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghij";
      const result = sanitizeErrorText(input);
      expect(result).toBe("Auth failed: [REDACTED:github-token]");
    });

    it("redacts GitHub OAuth tokens (gho_)", () => {
      const input = "Token: gho_ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghij";
      const result = sanitizeErrorText(input);
      expect(result).toBe("Token: [REDACTED:github-token]");
    });

    it("redacts GitHub App tokens (ghs_)", () => {
      const input = "Token: ghs_ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghij";
      const result = sanitizeErrorText(input);
      expect(result).toBe("Token: [REDACTED:github-token]");
    });

    it("redacts GitHub refresh tokens (ghr_)", () => {
      const input = "Token: ghr_ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghij";
      const result = sanitizeErrorText(input);
      expect(result).toBe("Token: [REDACTED:github-token]");
    });

    it("redacts JWT tokens", () => {
      const input =
        "Invalid token: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dozjgNryP4J3jVmNHl0w5N_XgL0n3I9PlFUP0THsR8U";
      const result = sanitizeErrorText(input);
      expect(result).toContain("[REDACTED:jwt]");
      expect(result).not.toContain("eyJhbGciOi");
    });

    it("redacts Bearer tokens", () => {
      const input = "Authorization: Bearer sk-abc123def456ghi789";
      const result = sanitizeErrorText(input);
      expect(result).toBe("Authorization: [REDACTED:bearer-token]");
    });

    it("redacts bearer (lowercase) tokens", () => {
      const input = "bearer mytokenvalue123456789";
      const result = sanitizeErrorText(input);
      expect(result).toBe("[REDACTED:bearer-token]");
    });

    it("redacts api_key assignments", () => {
      const input = 'api_key = "supersecretkey12345678"';
      const result = sanitizeErrorText(input);
      expect(result).toBe("[REDACTED:api-key-assignment]");
    });

    it("redacts APIKEY assignments", () => {
      const input = "APIKEY: longapikeyvalue123456789";
      const result = sanitizeErrorText(input);
      expect(result).toBe("[REDACTED:api-key-assignment]");
    });

    it("redacts api-key assignments", () => {
      const input = "api-key=mysecretvalue1234567890";
      const result = sanitizeErrorText(input);
      expect(result).toBe("[REDACTED:api-key-assignment]");
    });

    it("redacts password assignments", () => {
      const input = 'password="mysecretpassword123"';
      const result = sanitizeErrorText(input);
      expect(result).toBe("[REDACTED:password-assignment]");
    });

    it("redacts passwd assignments", () => {
      const input = "passwd: secretpw123";
      const result = sanitizeErrorText(input);
      expect(result).toBe("[REDACTED:password-assignment]");
    });

    it("redacts pwd assignments", () => {
      const input = "pwd = secretvalue123";
      const result = sanitizeErrorText(input);
      expect(result).toBe("[REDACTED:password-assignment]");
    });

    it("redacts private keys", () => {
      const input =
        "-----BEGIN RSA PRIVATE KEY-----\nMIIEpAIBAAKCAQEA...\n-----END RSA PRIVATE KEY-----";
      const result = sanitizeErrorText(input);
      expect(result).toBe("[REDACTED:private-key]");
    });

    it("redacts generic hex strings longer than 32 chars", () => {
      const hex = "abcdef0123456789".repeat(3); // 48 chars
      const input = `token: ${hex}`;
      const result = sanitizeErrorText(input);
      expect(result).toBe("token: [REDACTED:hex-secret]");
    });

    it("does not redact hex strings at exactly 32 chars", () => {
      const hex32 = "abcdef012345678901234567890abcde"; // 32 chars
      const input = `hash: ${hex32}`;
      const result = sanitizeErrorText(input);
      expect(result).toBe(`hash: ${hex32}`);
    });

    it("redacts base64 strings longer than 100 chars", () => {
      const b64 =
        "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/".repeat(
          2,
        );
      const input = `data: ${b64}`;
      const result = sanitizeErrorText(input);
      expect(result).toContain("[REDACTED:base64-secret]");
    });

    it("does not redact base64 strings at 100 chars or less", () => {
      const b64 =
        "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/ABCD";
      expect(b64.length).toBeLessThanOrEqual(100);
      // Must not be 33+ hex-only chars. Use mixed alpha+digit with "/" to avoid hex match.
      const input = `data: ${b64}`;
      const result = sanitizeErrorText(input);
      expect(result).toBe(`data: ${b64}`);
    });

    it("redacts multiple secrets in one text", () => {
      const input = 'AWS key AKIAIOSFODNN7EXAMPLE and password="hunter2"';
      const result = sanitizeErrorText(input);
      expect(result).toContain("[REDACTED:aws-key]");
      expect(result).toContain("[REDACTED:password-assignment]");
    });
  });

  describe("control character sanitization", () => {
    it("strips NUL characters", () => {
      const result = sanitizeErrorText("hello\x00world");
      expect(result).toBe("helloworld");
    });

    it("strips BEL characters", () => {
      const result = sanitizeErrorText("hello\x07world");
      expect(result).toBe("helloworld");
    });

    it("strips BS characters", () => {
      const result = sanitizeErrorText("hello\x08world");
      expect(result).toBe("helloworld");
    });

    it("strips VT characters", () => {
      const result = sanitizeErrorText("hello\x0bworld");
      expect(result).toBe("helloworld");
    });

    it("strips FF characters", () => {
      const result = sanitizeErrorText("hello\x0cworld");
      expect(result).toBe("helloworld");
    });

    it("strips SO characters", () => {
      const result = sanitizeErrorText("hello\x0eworld");
      expect(result).toBe("helloworld");
    });

    it("strips SI characters", () => {
      const result = sanitizeErrorText("hello\x0fworld");
      expect(result).toBe("helloworld");
    });

    it("strips ESC characters", () => {
      const result = sanitizeErrorText("hello\x1bworld");
      expect(result).toBe("helloworld");
    });

    it("strips DEL characters", () => {
      const result = sanitizeErrorText("hello\x7fworld");
      expect(result).toBe("helloworld");
    });

    it("strips C1 control characters (0x80-0x9F)", () => {
      const result = sanitizeErrorText("hello\x80\x85\x9fworld");
      expect(result).toBe("helloworld");
    });

    it("preserves newline characters", () => {
      const result = sanitizeErrorText("hello\nworld");
      expect(result).toBe("hello\nworld");
    });

    it("preserves carriage return characters", () => {
      const result = sanitizeErrorText("hello\rworld");
      expect(result).toBe("hello\rworld");
    });

    it("preserves tab characters", () => {
      const result = sanitizeErrorText("hello\tworld");
      expect(result).toBe("hello\tworld");
    });

    it("strips mixed control characters while preserving allowed ones", () => {
      const result = sanitizeErrorText("a\x00b\tc\nd\x08e\rf");
      expect(result).toBe("ab\tc\nde\rf");
    });
  });

  describe("bounded ingestion", () => {
    it("truncates text exceeding default max length (10240)", () => {
      const long = "error: something went wrong. ".repeat(600);
      const result = sanitizeErrorText(long);
      expect(result).toContain("[truncated at 10240 chars]");
    });

    it("truncates at custom maxLength", () => {
      const long = "error: something went wrong. ".repeat(10);
      const result = sanitizeErrorText(long, { maxLength: 100 });
      expect(result).toContain("[truncated at 100 chars]");
    });

    it("does not truncate text under max length", () => {
      const short = "hello world";
      const result = sanitizeErrorText(short);
      expect(result).toBe("hello world");
    });

    it("handles empty string", () => {
      const result = sanitizeErrorText("");
      expect(result).toBe("");
    });

    it("handles text exactly at max length", () => {
      const exact = "Err msg. ".repeat(1138); // 10242, close enough - use pattern that won't trigger redaction
      const trimmed = exact.slice(0, 10_240);
      const result = sanitizeErrorText(trimmed);
      expect(result).toBe(trimmed);
      expect(result).not.toContain("[truncated");
    });

    it("handles text one char over max length", () => {
      const over = "Err msg. ".repeat(1138).slice(0, 10_241);
      const result = sanitizeErrorText(over);
      expect(result).toContain("[truncated at 10240 chars]");
    });
  });

  describe("determinism", () => {
    it("produces identical output on repeated calls", () => {
      const input = "Error with AKIAIOSFODNN7EXAMPLE and \x00 control chars";
      const first = sanitizeErrorText(input);
      const second = sanitizeErrorText(input);
      const third = sanitizeErrorText(input);
      expect(first).toBe(second);
      expect(second).toBe(third);
    });
  });

  describe("adversarial inputs", () => {
    it("handles null bytes interspersed in text", () => {
      const input = "a\x00b\x00c\x00d";
      expect(sanitizeErrorText(input)).toBe("abcd");
    });

    it("handles text that looks like truncation marker", () => {
      const input = "[truncated at 10240 chars]";
      const result = sanitizeErrorText(input);
      expect(result).toBe("[truncated at 10240 chars]");
    });

    it("handles text with only control characters", () => {
      const input = "\x00\x07\x08\x0b\x0c\x0e\x0f\x1b\x7f";
      expect(sanitizeErrorText(input)).toBe("");
    });

    it("redaction does not break on overlapping patterns", () => {
      const input = "password=AKIAIOSFODNN7EXAMPLE";
      const result = sanitizeErrorText(input);
      expect(result).not.toContain("AKIAIOSFODNN7EXAMPLE");
      expect(result).not.toContain("password=AKIA");
    });

    it("handles very small maxLength", () => {
      const result = sanitizeErrorText("hello world", { maxLength: 5 });
      expect(result).toBe("hello[truncated at 5 chars]");
    });
  });
});
