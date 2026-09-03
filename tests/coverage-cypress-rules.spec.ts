/**
 * Cypress rules coverage (Phase 5): the isCypressFile gate arms, the
 * numeric-literal vs alias-wait oracle arms, .only focus detection, and
 * the cypress.config.* gate — all three rules against real invocations.
 */

import { describe, expect, it } from "vitest";

import {
  cypCyWait,
  isCypressFile,
} from "../src/rules/cypress/qa-cyp-001-cy-wait.js";
import { cypFocusedTest } from "../src/rules/cypress/qa-cyp-002-focused-test.js";
import { cypConfigSecurity } from "../src/rules/cypress/qa-cyp-003-config-security.js";

function ctx(
  path: string,
  text: string,
  frameworkTags?: string[],
): { path: string; text: string; codeText: string; frameworkTags?: string[] } {
  return {
    path,
    text,
    codeText: text,
    ...(frameworkTags !== undefined ? { frameworkTags } : {}),
  };
}

describe("isCypressFile — all three gate arms", () => {
  it("framework tag → true", () => {
    expect(isCypressFile(ctx("a.spec.ts", "test('a');", ["cypress"]))).toBe(
      true,
    );
  });

  it(".cy.* extension → true", () => {
    expect(isCypressFile(ctx("checkout.cy.ts", "anything"))).toBe(true);
    expect(isCypressFile(ctx("x.cy.js", ""))).toBe(true);
    expect(isCypressFile(ctx("x.cy.jsx", ""))).toBe(true);
  });

  it("cy.* API usage in the text → true (the codegen-fingerprint arm)", () => {
    expect(isCypressFile(ctx("checkout.spec.ts", "cy.get('#x');"))).toBe(true);
    expect(isCypressFile(ctx("checkout.spec.ts", "cy\n  .get('#x');"))).toBe(
      true,
    );
  });

  it("no arm matches → false", () => {
    expect(isCypressFile(ctx("checkout.spec.ts", "test('a', () => {});"))).toBe(
      false,
    );
  });
});

describe("QA-CYP-001 — numeric vs alias cy.wait oracle", () => {
  it("numeric waits fire; alias waits never do", () => {
    const findings = cypCyWait.run(
      ctx(
        "checkout.cy.ts",
        "cy.wait(3000);\ncy.wait('@route');\ncy.wait(200);",
      ),
    );
    expect(findings).toHaveLength(2);
    expect(findings[0]?.line).toBe(1);
    expect(findings[1]?.line).toBe(3);
  });

  it("non-cypress file with numeric waits → silent (gate)", () => {
    // plain.ts has cy. usage → gate passes → fires. Use a NO-cy file.
    expect(cypCyWait.run(ctx("plain.ts", "waitFor(3000);")).length).toBe(0);
  });

  it("a file that is not cypress at all → gate returns false", () => {
    expect(isCypressFile(ctx("plain.ts", "setTimeout(500);"))).toBe(false);
  });
});

describe("QA-CYP-002 — .only detection arms", () => {
  it("it.only/describe.only/context.only all fire", () => {
    const findings = cypFocusedTest.run(
      ctx(
        "focus.cy.ts",
        "it.only('a', () => {});\ndescribe.only('b', () => {});\ncontext.only('c', () => {});\n",
      ),
    );
    expect(findings).toHaveLength(3);
  });

  it("plain it/describe → silent", () => {
    const findings = cypFocusedTest.run(
      ctx("focus.cy.ts", "it('a', () => {});\ndescribe('b', () => {});\n"),
    );
    expect(findings).toHaveLength(0);
  });

  it("a non-cypress file is silent (gate arm exercised)", () => {
    const findings = cypFocusedTest.run(
      ctx("plain.ts", "it.only('a', () => {});\n"),
    );
    expect(findings).toHaveLength(0);
  });
});

describe("QA-CYP-003 — cypress.config gate arms", () => {
  it("chromeWebSecurity: false fires on the declared config filename", () => {
    const findings = cypConfigSecurity.run(
      ctx(
        "cypress.config.js",
        "module.exports = { e2e: { chromeWebSecurity: false } };\n",
      ),
    );
    expect(findings).toHaveLength(1);
    expect(findings[0]?.severity).toBe("error");
  });

  it("cypress.config.ts variant also matches the declared gate", () => {
    const findings = cypConfigSecurity.run(
      ctx(
        "cypress.config.ts",
        "export default defineConfig({ chromeWebSecurity: false });\n",
      ),
    );
    expect(findings).toHaveLength(1);
  });

  it("enabled config → silent", () => {
    const findings = cypConfigSecurity.run(
      ctx(
        "cypress.config.js",
        "module.exports = { chromeWebSecurity: true };\n",
      ),
    );
    expect(findings).toHaveLength(0);
  });

  it("a non-config filename → gate returns [] (belt-and-suspenders arm)", () => {
    const findings = cypConfigSecurity.run(
      ctx("other.ts", "const x = { chromeWebSecurity: false };\n"),
    );
    expect(findings).toHaveLength(0);
  });
});
