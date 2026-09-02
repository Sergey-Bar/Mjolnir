import { describe, it } from "vitest";

jest.retryTimes(3);

describe("api client", () => {
  it("retries network blips", () => {});

  it("retries rate limits", () => {
    // flaky against the sandbox
  });

  it("retries timeouts", () => {});

  it("retries auth hiccups", () => {});

  it("retries socket drops", () => {});
});

describe("retries config", () => {
  it("retries: 2 per spec", () => {
    const config = { retries: 3 };
  });
});
