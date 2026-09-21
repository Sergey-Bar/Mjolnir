import { describe, it, expect } from "vitest";

describe("fetch wrapper", () => {
  it("resolves json", async () => {
    const res = await fetch("/api/data");
    expect(res.status).toBe(200);
  });

  it("asserts in awaited then", async () => {
    await Promise.resolve({ id: 1 }).then((v) => {
      expect(v.id).toBe(1);
    });
  });

  it("returns the promise chain", () => {
    return Promise.resolve([1, 2, 3]).then((xs) => {
      expect(xs).toHaveLength(3);
    });
  });
});
