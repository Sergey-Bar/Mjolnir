import { test, expect } from "vitest";

const BASE_URL = process.env.TEST_BASE_URL ?? "http://127.0.0.1:0";

test("uses injected base url", async () => {
  const res = await fetch(`${BASE_URL}/api/health`);
  expect(res.status).toBeLessThan(500);
});

test("explicit locale and UTC getters", () => {
  const d = new Date("2026-01-02T03:04:05Z");
  expect(d.toLocaleDateString("en-US", { timeZone: "UTC" })).toContain("2026");
  expect(d.getUTCHours()).toBe(3);
});

test("relative workspace path", () => {
  const p = join("fixtures", "data.json");
  expect(p.endsWith("data.json")).toBe(true);
});

import { join } from "node:path";
