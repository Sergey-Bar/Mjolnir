import { test, expect } from "vitest";

test("fetches from fixed remote host:port", async () => {
  // Rev 3: host:port literals no longer fire (deliberate fixture vs
  // coupling is not statically decidable); the absolute-OS-path and
  // locale sub-patterns carry the rule's TP surface.
  const res = await fetch(`https://staging.example.com/api/users`);
  expect(res.ok).toBe(true);
});

test("reads OS path", () => {
  const p = "/tmp/cache/session.json";
  expect(p).toBeTruthy();
});

test("formats date without locale", () => {
  const d = new Date("2026-01-02T03:04:05Z");
  expect(d.toLocaleDateString()).toBeDefined();
  expect(new Date().getHours()).toBeGreaterThanOrEqual(0);
});
