import { test, expect } from "vitest";

// Phase 2 retune (revision 3): host:port literals of ANY shape are
// dropped from the fixed-port sub-pattern — loopback endpoints are the
// suite's OWN fixture containers (Azurite / DynamoDB Local / Mongo; the
// wave-1 FP cohort) and remote/mock host:port literals are fixture URLs,
// fake domains, or snapshot strings (the wave-2 FP cohort). Must NOT fire.
test("uploads to the local Azurite fixture", async () => {
  const res = await fetch("http://localhost:10000/devstoreaccount1/cont");
  expect(res.status).toBeLessThan(500);
});

test("reads the local DynamoDB fixture", async () => {
  const res = await fetch("http://127.0.0.1:8000/");
  expect(res.ok).toBe(true);
});

test("connects to the surrealdb test fixture", async () => {
  expect("ws://0.0.0.0:8000").toContain("0.0.0.0");
});

test("builds a URL against a mocked host", () => {
  expect("http://streamlit.mock:80/mock/base/path/").toContain("mock");
});

// Docker-style single-label image refs are not host:port. Must NOT fire.
test("uses the postgres fixture image", () => {
  const image = "postgres:15";
  expect(image).toContain("postgres");
});

test("asserts on a snapshot containing a network URL", () => {
  const messages = ["http://172.18.0.1:5173/"];
  expect(messages).toHaveLength(1);
});

// A path-like `file.ts:10` reference is a source location, not a socket.
test("reports the config file location", () => {
  expect("vite.config.ts:10").toMatch(/\.ts:\d+/);
});
