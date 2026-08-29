/**
 * A `.then()` that only transforms data (no expect/assert) is not this
 * rule's target, even when it sits inside a larger awaited expression.
 * Real regression: vitejs/vite's ssr-html.spec.ts —
 *   const contents = await Promise.all(
 *     scripts.map((s) => fetch(s).then((res) => res.text())),
 *   )
 * The old code grabbed an unrelated `{ … }` further down the file that
 * happened to contain `expect(...)`.
 */
import { it, expect } from "vitest";

it("collects script bodies then asserts on them", async () => {
  const urls = ["/a.js", "/b.js"];
  const contents = await Promise.all(
    urls.map((u) => fetch(u).then((res) => res.text())),
  );
  for (const code of contents) {
    expect(code).toBeTruthy();
  }
});

it("awaited chain with an assertion in the then is fine", async () => {
  await fetch("/x").then((res) => {
    expect(res.ok).toBe(true);
  });
});
