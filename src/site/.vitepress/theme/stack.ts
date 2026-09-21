/**
 * Shared display-name and classification maps for the technology stack.
 *
 * Kept in one place so `home.data.ts`, `Home.vue`, and
 * `scripts/generate-readme-brand.ts` all read the same canonical list.
 * If you add a language/framework/CI system, add it here.
 */

export const NAMES: Record<string, string> = {
  typescript: "TypeScript",
  javascript: "JavaScript",
  python: "Python",
  java: "Java",
  csharp: "C#",
  playwright: "Playwright",
  cypress: "Cypress",
  selenium: "Selenium",
  jest: "Jest",
  vitest: "Vitest",
  mocha: "Mocha",
  pytest: "pytest",
  junit: "JUnit",
  testng: "TestNG",
  nunit: "NUnit",
  xunit: "xUnit",
  mstest: "MSTest",
  "github-actions": "GitHub Actions",
  "azure-pipelines": "Azure Pipelines",
  jenkins: "Jenkins",
};

export const CI_SYSTEMS = new Set([
  "github-actions",
  "azure-pipelines",
  "jenkins",
]);

export const NOT_SHOWN = new Set(["yaml", "groovy", "pytest-playwright"]);

export const MONOGRAM: Record<string, string> = {
  Playwright: "PW",
  TestNG: "NG",
  NUnit: "NU",
  xUnit: "xU",
  MSTest: "MS",
  "Azure Pipelines": "AP",
};
