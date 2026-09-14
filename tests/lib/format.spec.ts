import { describe, it, expect } from "vitest";
import { pct } from "../../src/lib/format.js";

describe("pct", () => {
  it("formats 0 as 0%", () => {
    expect(pct(0)).toBe("0%");
  });
  it("formats 1 as 100%", () => {
    expect(pct(1)).toBe("100%");
  });
  it("formats 0.5 as 50%", () => {
    expect(pct(0.5)).toBe("50%");
  });
  it("formats 0.9812 as 98%", () => {
    expect(pct(0.9812)).toBe("98%");
  });
  it("rounds correctly", () => {
    expect(pct(0.986)).toBe("99%");
    expect(pct(0.984)).toBe("98%");
  });
  it("handles values above 1", () => {
    expect(pct(1.5)).toBe("150%");
  });
  it("handles very small values", () => {
    expect(pct(0.001)).toBe("0%");
    expect(pct(0.005)).toBe("1%");
  });
  it("handles NaN", () => {
    expect(pct(NaN)).toBe("NaN%");
  });
});
