import { describe, it, expect } from "@playwright/test";

describe("fetch wrapper", () => {
  it("resolves json one", async () => {
    fetch("/api/data").then((res) => {
      expect(res.status).toBe(200);
    });
  });

  it("resolves json two", async () => {
    fetch("/api/text").then((res) => {
      expect(res.body).toContain("ok");
    });
  });

  it("asserts in then without await", async () => {
    const p = Promise.resolve({ id: 1 });
    p.then((v) => {
      expect(v.id).toBe(1);
    });
  });

  it("chained then assertion", async () => {
    Promise.resolve([1, 2, 3]).then((xs) => {
      expect(xs).toHaveLength(3);
    });
  });

  it("response then assert", async () => {
    fetch("/api/health").then((r) => {
      expect(r.ok).toBe(true);
    });
  });
});
