/**
 * A locator call written as test DATA is not a locator call.
 *
 * These are arguments to the function under test — classifyLocator receives
 * a selector expression as a string and grades it. Reading raw text (which
 * this rule must, to see selector content) makes them match; the codeText
 * mask oracle is what tells them apart from live calls.
 */

describe("classifyLocator", () => {
  it("classifies xpath as BAD", () => {
    expect(classifyLocator("page.$x('//div/button')")).toBe("xpath");
    expect(classifyLocator("page.locator('xpath=//div')")).toBe("xpath");
  });

  it("classifies css chains as BAD", () => {
    expect(classifyLocator("page.locator('.btn.primary > span')")).toBe(
      "css-chain",
    );
    expect(classifyLocator("page.locator('#root .item > a > b')")).toBe(
      "css-chain",
    );
  });

  it("documents the anti-pattern in a template literal", () => {
    const sample = `page.locator('.a.b.c')`;
    expect(sample).toContain("locator");
  });

  it("uses a resilient locator for its own assertions", async ({ page }) => {
    await expect(page.getByRole("button", { name: "Submit" })).toBeVisible();
  });
});
