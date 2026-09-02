import { chromium } from "@playwright/test";

export default async function globalSetup() {
  // Regenerates .auth/user.json on EVERY run — always fresh.
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto("https://staging3.example.com/login");
  await page.getByLabel("Username").fill("e2e");
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.context().storageState({ path: ".auth/user-3.json" });
  await browser.close();
}
