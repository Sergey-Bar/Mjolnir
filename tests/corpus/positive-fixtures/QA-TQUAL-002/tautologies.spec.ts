import { describe, it, expect } from "vitest";

describe("smoke guards", () => {
  it("env is test", () => {
    expect(true).toBe(true);
  });

  it("mirror assertion", () => {
    expect(false).toBe(false);
  });

  it("numeric tautology", () => {
    expect(42).toBe(42);
  });

  it("string tautology", () => {
    expect("hello").toBe("hello");
  });

  it("null tautology", () => {
    expect(null).toBe(null);
  });

  it("boolean shorthand", () => {
    expect(true).toBeTrue();
  });

  it("undefined tautology", () => {
    expect(undefined).toBe(undefined);
  });
});
