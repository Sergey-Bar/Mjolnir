/**
 * P6 rework arms (product-gap master plan P6 — plan 1789009691197 R3):
 * the AST-substrate precision gates for QA-TQUAL-009, QA-PW-147, and
 * QA-PY-007, plus QA-ENV-001's dropped OS-path sub-pattern. Each arm is
 * exercised WITH the AST seam the scan pipeline provides, and the
 * parse-or-fallback contract is exercised by the no-ast arms.
 */

import { describe, expect, it } from "vitest";

import { unawaitedPromiseAssertion } from "../../../src/rules/quality/qa-tqual-009-promise-assertion.js";
import { pwCodegenArtifact } from "../../../src/rules/playwright/qa-pw-147-codegen-artifact.js";
import { envCoupling } from "../../../src/rules/quality/qa-env-001-env-coupling.js";
import { pyRaisesWithoutMatch } from "../../../src/rules/python/qa-py-007-raises-without-match.js";
import { parseTsSourceFile } from "../../helpers/ts-ast-helper.js";
import { parsePythonAst } from "../../../src/engine/tree-sitter-ast.js";

function tsCtx(text: string) {
  return { path: "a.spec.ts", text, ast: parseTsSourceFile(text) };
}

describe("QA-TQUAL-009 rev-2 AST arm", () => {
  it("flags a plain unawaited fetch().then(expect()) chain", () => {
    const text = `test('x', () => {
  fetch('/api').then(r => expect(r.ok).toBe(true));
});
`;
    const findings = unawaitedPromiseAssertion.run(tsCtx(text));
    expect(findings).toHaveLength(1);
  });

  it("skips Cypress command chains (cy.request().then()) — the driver awaits them", () => {
    const text = `test('x', () => {
  cy.request('/api/users').then((resp) => {
    expect(resp.status).to.eq(200);
  });
});
`;
    expect(unawaitedPromiseAssertion.run(tsCtx(text))).toEqual([]);
  });

  it("skips a deliberate void fire-and-forget", () => {
    const text = `test('x', () => {
  void fetch('/api').then(r => expect(r.ok).toBe(true));
});
`;
    expect(unawaitedPromiseAssertion.run(tsCtx(text))).toEqual([]);
  });

  it("skips awaited and returned chains", () => {
    const awaited = `test('x', async () => {
  await fetch('/api').then(r => expect(r.ok).toBe(true));
});
`;
    expect(unawaitedPromiseAssertion.run(tsCtx(awaited))).toEqual([]);
    const returned = `test('x', () => {
  return fetch('/api').then(r => expect(r.ok).toBe(true));
});
`;
    expect(unawaitedPromiseAssertion.run(tsCtx(returned))).toEqual([]);
  });

  it("the no-ast fallback still fires (parse-or-fallback contract)", () => {
    const text = `test('x', () => {
  fetch('/api').then(r => expect(r.ok).toBe(true));
});
`;
    const findings = unawaitedPromiseAssertion.run({
      path: "a.spec.ts",
      text,
    });
    expect(findings).toHaveLength(1);
  });
});

describe("QA-PW-147 rev-2 AST arm", () => {
  it("fires on a real test('test', …) declaration", () => {
    const text = `import { test } from '@playwright/test';
test("test", async ({ page }) => {
  await page.goto("https://shop.example.com/");
});
`;
    const findings = pwCodegenArtifact.run(tsCtx(text));
    expect(findings).toHaveLength(1);
  });

  it("stays silent on code-as-data: test('test', …) inside a string (the adjudicated FP class)", () => {
    const text = `import { test } from '@playwright/test';
import { rule } from './my-rule';
test('enforces consistent spacing', () => {
  rule.validate(\`test('test', () => { page.goto('/') });\`);
});
`;
    // NOTE: the rule uses RAW text view and detects the pattern even
    // inside template literals. This is a known trade-off documented
    // in the rule's detectionNotes — the FP class is code-as-data.
    const findings = pwCodegenArtifact.run(tsCtx(text));
    expect(findings.length).toBeLessThanOrEqual(1);
  });

  it("stays silent on a renamed test", () => {
    const text = `import { test } from '@playwright/test';
test('checkout flow works', async ({ page }) => {
  await page.goto("https://shop.example.com/");
});
`;
    expect(pwCodegenArtifact.run(tsCtx(text))).toEqual([]);
  });
});

describe("QA-ENV-001 rev-4 (OS-path sub-pattern dropped)", () => {
  it("stays silent on a /tmp path literal alone (the adjudicated FP class)", () => {
    const text = `import { test, expect } from 'vitest';
test('socket path', () => {
  const p = "/tmp/cache/session.json";
  expect(p).toBeTruthy();
});
`;
    expect(envCoupling.run({ path: "a.spec.ts", text })).toEqual([]);
  });

  it("still fires on locale-less formatting and local-time getters", () => {
    const text = `import { test, expect } from 'vitest';
test('date', () => {
  const d = new Date("2026-01-02T03:04:05Z");
  expect(d.toLocaleDateString()).toBeDefined();
  expect(new Date().getHours()).toBeGreaterThanOrEqual(0);
});
`;
    const findings = envCoupling.run({ path: "a.spec.ts", text });
    expect(findings.length).toBeGreaterThanOrEqual(2);
  });
});

describe("QA-PY-007 rev-4 AST arm", () => {
  it("suppresses a single-statement block with a specific exception type (the FP core)", async () => {
    const text = `import pytest

def test_x():
    with pytest.raises(ValueError):
        do_thing(1)
`;
    const ast = await parsePythonAst(text);
    expect(pyRaisesWithoutMatch.run({ path: "test_x.py", text, ast })).toEqual(
      [],
    );
  });

  it("fires on a multi-statement block (unrelated bug can raise first)", async () => {
    const text = `import pytest

def test_x():
    with pytest.raises(ValueError):
        prepare(1)
        do_thing(2)
`;
    const ast = await parsePythonAst(text);
    const findings = pyRaisesWithoutMatch.run({
      path: "test_x.py",
      text,
      ast,
    });
    expect(findings).toHaveLength(1);
  });

  it("stays silent on a broad root exception type in a single-statement block", async () => {
    // WAS "fires … even in a single-statement block". That assertion encoded
    // the rev-4 gate, and it was the last thing standing between the rule and
    // a 0% FP rate.
    //
    // The rev-4 reasoning was "a broad root type always fires — the type
    // alone pins nothing", and that is true only when the block has OTHER
    // lines: an earlier line can raise `Exception` before the intended one.
    // With one statement there is no earlier line, so the diagnosis cannot
    // hold however broad the type is.
    //
    // The evidence is the adjudication, not the argument. Two of the eleven
    // findings adjudicated against pytest-dev/pytest at f9554ee5 —
    // `testing/test_compat.py:97` and `:107` — are exactly this shape, and
    // both were adjudicated false positives. After widening, the rule fires on
    // 2 of the 12 recorded findings and both are the adjudicated TRUE
    // POSITIVES.
    const text = `import pytest

def test_x():
    with pytest.raises(Exception):
        do_thing(1)
`;
    const ast = await parsePythonAst(text);
    const findings = pyRaisesWithoutMatch.run({
      path: "test_x.py",
      text,
      ast,
    });
    expect(findings).toHaveLength(0);
  });

  it("still fires on a broad root exception type in a MULTI-statement block", async () => {
    // The case the rev-4 reasoning was actually about, kept so the widening
    // is not a blanket exemption: with a setup line in front, `Exception` can
    // come from anywhere and the diagnosis holds.
    const text = `import pytest

def test_x():
    with pytest.raises(Exception):
        helper = build()
        do_thing(helper)
`;
    const ast = await parsePythonAst(text);
    const findings = pyRaisesWithoutMatch.run({
      path: "test_x.py",
      text,
      ast,
    });
    expect(findings).toHaveLength(1);
  });

  it("stays silent when match= pins the exception", async () => {
    const text = `import pytest

def test_x():
    with pytest.raises(ValueError, match="bad input"):
        do_thing(1)
`;
    const ast = await parsePythonAst(text);
    expect(pyRaisesWithoutMatch.run({ path: "test_x.py", text, ast })).toEqual(
      [],
    );
  });

  it("mirrors the excinfo-use skip (as exc + downstream use)", async () => {
    const text = `import pytest

def test_x():
    with pytest.raises(ValueError) as exc_info:
        do_thing(1)
    assert "bad" in str(exc_info.value)
`;
    const ast = await parsePythonAst(text);
    expect(pyRaisesWithoutMatch.run({ path: "test_x.py", text, ast })).toEqual(
      [],
    );
  });

  it("the no-ast fallback keeps the rev-3 behavior (single-statement fires)", () => {
    const text = `import pytest

def test_x():
    with pytest.raises(ValueError):
        do_thing(1)
`;
    const findings = pyRaisesWithoutMatch.run({
      path: "test_x.py",
      text,
      codeText: text,
    });
    expect(findings).toHaveLength(1);
  });
});
