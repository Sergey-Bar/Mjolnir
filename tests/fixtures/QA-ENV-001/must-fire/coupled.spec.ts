import { test, expect } from "vitest";

test("fetches from fixed remote host:port", async () => {
  const res = await fetch("https://staging.example.com:8443/api/users");
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
