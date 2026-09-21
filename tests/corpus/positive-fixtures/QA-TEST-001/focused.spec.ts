import { describe, it, expect } from "vitest";

describe("auth", () => {
  it.only("logs in", () => {
    expect(true).toBe(true);
  });

  it("logs out", () => {
    expect(1).toBe(1);
  });

  it.skip("2fa flow", () => {
    expect(false).toBe(false);
  });
});

describe("billing", () => {
  it.only("charges card", () => {
    expect(null).toBe(null);
  });

  fit("refund flow", () => {
    expect(0).toBe(0);
  });

  it("invoice listing", () => {
    expect(undefined).toBeUndefined();
  });
});
