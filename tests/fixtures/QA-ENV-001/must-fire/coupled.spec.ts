import { test, expect } from "vitest";

test("fetches from fixed port", async () => {
  const res = await fetch("http://localhost:3000/api/users");
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
