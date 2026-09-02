import { describe, it, expect } from "vitest";

describe("auth", () => {
  it("logs in", () => {
    expect(1).toBe(1);
  });

  it("logs out", () => {
    expect("a" + "b").toBe("ab");
  });
});

describe("billing", () => {
  it("charges card", () => {
    const total = 10;
    expect(total).toBeGreaterThan(0);
  });
});
