import { describe, it, expect } from "vitest";

describe("guards", () => {
  it("computed equality", () => {
    const a = { v: 1 };
    expect(a.v).toBe(1);
  });

  it("real assertion", () => {
    expect(2 + 2).toBe(4);
  });

  it("string comparison", () => {
    expect("a".toUpperCase()).toBe("A");
  });
});
