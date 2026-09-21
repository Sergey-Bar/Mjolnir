/**
 * `sleep(n)` that produces a value rather than pausing the test body is
 * not a hard sleep — it is how real suites (TanStack Query, MSW) give a
 * mock async source a controlled latency. The rule requires `await`
 * before sleep/delay/wait for exactly this reason.
 */
import { test, expect } from "@playwright/test";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

test("mock query function with simulated latency", async () => {
  const queryFn = () => sleep(10).then(() => "data");
  const result = await queryFn();
  expect(result).toBe("data");
});

test("mutation with a delayed mock, asserted properly", async () => {
  const mutationFn = () => sleep(20);
  await mutationFn();
  expect(true).toBe(true);
});

test("microtask yield is not a wall-clock wait", async () => {
  await sleep(0);
  expect(1).toBe(1);
});
