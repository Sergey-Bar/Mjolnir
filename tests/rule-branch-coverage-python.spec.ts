/**
 * Python-rule regex/parsing edge cases (Test Hardening Plan — coverage-
 * gap closure). extractBlock's helper (duplicated across several Python
 * rules) has two genuinely rare shapes: a completely empty function body
 * (nothing at all after the `:`, end of file), and a same-line inline
 * body at end-of-file with no trailing newline. QA-PY-012's dedup loop
 * has a real subtlety worth pinning: its patterns lack the `g` flag, so
 * `re.lastIndex` writes are no-ops for exec() — the "already seen" path
 * only actually terminates the loop early when there's no trailing
 * newline after the match to advance to.
 */

import { describe, expect, it } from "vitest";
import { pyNoAssertions } from "../src/rules/python/qa-py-003-no-assertions.js";
import { pyMockOnly } from "../src/rules/python/qa-py-008-mock-only.js";
import { pyRaisesWithoutMatch } from "../src/rules/python/qa-py-007-raises-without-match.js";
import { pyRandomTimeDependence } from "../src/rules/python/qa-py-010-random-time.js";
import { pyTautological } from "../src/rules/python/qa-py-012-tautological.js";

describe("QA-PY-003 / QA-PY-008: extractBlock edge shapes", () => {
  it("a function definition at true end-of-file with nothing after the colon does not throw", () => {
    const text = "def test_nothing():";
    expect(() => pyNoAssertions.run({ path: "test_x.py", text })).not.toThrow();
    expect(() => pyMockOnly.run({ path: "test_x.py", text })).not.toThrow();
  });

  it("an inline body at end-of-file with no trailing newline is still parsed", () => {
    const text = "def test_x(): do_thing()";
    const findings = pyNoAssertions.run({ path: "test_x.py", text });
    expect(findings.length).toBeGreaterThan(0);
  });

  it("QA-PY-008: an inline mock-only body at end-of-file with no trailing newline is still parsed", () => {
    const text = "def test_x(): mock.save.assert_called_once()";
    const findings = pyMockOnly.run({ path: "test_x.py", text });
    expect(findings.length).toBeGreaterThan(0);
  });
});

describe("QA-PY-007: pytest.raises( paren matching edge cases", () => {
  it("does not throw on an unterminated pytest.raises(", () => {
    const text = "def test_x():\n    with pytest.raises(ValueError\n";
    expect(() =>
      pyRaisesWithoutMatch.run({ path: "test_x.py", text }),
    ).not.toThrow();
  });

  it("paren matcher handles an escaped quote inside a string argument", () => {
    const text =
      'def test_x():\n    with pytest.raises(ValueError, match="a\\"b"):\n        do()\n';
    const findings = pyRaisesWithoutMatch.run({ path: "test_x.py", text });
    expect(findings).toHaveLength(0);
  });
});

describe("QA-PY-010: freeze/mock/patch on the same line suppresses the finding", () => {
  it("does not fire when the time.time() line also mentions freeze_time", () => {
    const text = "def test_x():\n    now = time.time()  # under freeze_time\n";
    expect(
      pyRandomTimeDependence.run({ path: "test_x.py", text }),
    ).toHaveLength(0);
  });
});

describe("QA-PY-012: dedup-loop early exit at end-of-file with no trailing newline", () => {
  it("a single tautological assert as the very last line (no trailing \\n) does not hang and still reports once", () => {
    const text = "def test_x():\n    assert True";
    const findings = pyTautological.run({ path: "test_x.py", text });
    expect(findings).toHaveLength(1);
  });
});
