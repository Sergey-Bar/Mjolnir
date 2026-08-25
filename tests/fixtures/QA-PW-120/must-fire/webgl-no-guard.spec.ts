import { expect, test } from "@playwright/test";

test("renders webgl scene", async ({ page }) => {
  await page.goto("/scene");
  const gl = await page.evaluate(() => {
    const canvas = document.querySelector("canvas");
    return canvas?.getContext("webgl") !== null;
  });
  await expect(gl).toBe(true);
});
