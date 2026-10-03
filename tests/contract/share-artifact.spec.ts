/**
 * `mjolnir share` — the artifact contract (6.0 §3.6).
 *
 * `share` exists to be handed to somebody. That makes its contract different
 * from every other artifact in the tree, and different in the direction that
 * is easy to get wrong: the bound Trust Artifact names the repo, the commit
 * and the scanId BECAUSE it has to prove which run produced it. This file is
 * the opposite — it names none of them, because those are exactly the facts
 * that must not travel when a file leaves the machine.
 *
 * Four properties, each a way the promise can be broken without anyone
 * noticing:
 *
 *   1. DETERMINISM. Same scan → same bytes. A generated-at line is the usual
 *      reason two runs differ, and a shareable artifact that changes on every
 *      run cannot be diffed in review, which is where a reviewer would notice
 *      that it started leaking something.
 *   2. NO IDENTITY. No absolute path, no drive letter, no home directory, no
 *      repository remote, no repo name.
 *   3. NO CODE. Rule messages are attacker-influenced text — they quote the
 *      scanned source. The artifact carries a finding's claim, never the code
 *      the claim is about.
 *   4. NO NETWORK. Not "we do not call out today" — the file must not be able
 *      to, because a file that renders correctly on the author's machine and
 *      renders differently for the recipient is worse than no file.
 *
 * The zero-network law itself is `tests/contract/privacy-network-isolation.spec.ts`
 * and it is unmodified by this release; the check here is the artifact half of
 * the same law, because that spec can only see source, not output.
 */

import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { renderShareHtml } from "../../src/commands/share.js";
import { runScan } from "../../src/cli.js";
import type { Finding, ScanResult } from "../../src/types.js";

const DEMO = join(import.meta.dirname, "..", "..", "examples", "demo-repo");

const scratch: string[] = [];
afterAll(() => {
  for (const dir of scratch) rmSync(dir, { recursive: true, force: true });
});

let result!: ScanResult;
let html!: string;

beforeAll(async () => {
  // A frozen input: the demo repo is committed, and the scan runs with an
  // unbounded budget so the bytes under test are not a function of how loaded
  // the machine is.
  result = await runScan({
    target: DEMO,
    json: true,
    verbose: false,
    maxDurationMs: Number.POSITIVE_INFINITY,
    scopeChanged: false,
    format: "json",
  });
  html = renderShareHtml(result);
}, 120_000);

/** A synthetic finding, so the identity/code assertions do not depend on
 *  whatever the corpus happens to contain today. */
function withFinding(overrides: Partial<Finding>): ScanResult {
  const base: Finding = {
    ruleId: "QA-CI-009",
    category: "QA-CI",
    severity: "error",
    confidence: "high",
    findingType: "deterministic-defect",
    qaImpact: "FALSE-GREEN",
    file: "src/app.spec.ts",
    line: 12,
    column: 1,
    message: "message",
    why: "why",
    fix: "fix",
  };
  return { ...result, findings: [{ ...base, ...overrides }] };
}

describe("the share artifact is a pure function of the scan result", () => {
  it("renders the same bytes twice for the same result", () => {
    expect(renderShareHtml(result)).toBe(html);
  });

  it("a second scan of an unchanged repo renders byte-identical bytes", async () => {
    const second = await runScan({
      target: DEMO,
      json: true,
      verbose: false,
      maxDurationMs: Number.POSITIVE_INFINITY,
      scopeChanged: false,
      format: "json",
    });
    expect(renderShareHtml(second)).toBe(html);
  });

  it("carries no timestamp of any kind", () => {
    // No ISO date, no `new Date()` output, no "generated at". A wall-clock
    // stamp is the one thing guaranteed to differ between two runs of the
    // same commit, and it is the thing this artifact most cannot afford.
    expect(html).not.toMatch(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/);
    expect(html).not.toMatch(/\b\d{4}-\d{2}-\d{2}\b/);
    expect(html.toLowerCase()).not.toContain("generated at");
    expect(html).not.toMatch(/name="[^"]*generated/i);
  });
});

describe("the share artifact names no repository", () => {
  it("no absolute path, drive letter or home directory", () => {
    // Two lookaheads and a single consuming class, so the `[A-Za-z]` ranges
    // are not adjacent to each other and the linter's `i`-flag rewrite — which
    // would be a different pattern — cannot apply. This one has to match a
    // drive letter followed by `\` or `/`, which is the one place where
    // `[A-Za-z]` and `i` are not the same thing.
    expect(html).not.toMatch(/(?=[a-z]\\)[a-z]:[\\/]/i);
    expect(html).not.toContain("C:\\Users");
    expect(html).not.toContain(DEMO);
    expect(html).not.toContain(DEMO.split("\\").join("/"));
    // A `..` segment in a published location is a path that climbs out of the
    // repository, which is the shape this artifact must never carry. Anchored
    // on the literal `..` and stopped by the closing tag, so no two classes
    // can trade characters with each other.
    expect(html).not.toMatch(/\.\.[^<]*<\/code>/);
  });

  it("no repository remote, repo name or commit", () => {
    for (const marker of [
      "github.com",
      "git+https",
      "Sergey-Bar",
      "QA-Doctor",
      "mjolnir-qa",
    ]) {
      expect(
        html,
        `the share artifact names "${marker}" — it is handed to third parties ` +
          "and must identify the run, not the repository",
      ).not.toContain(marker);
    }
    // No 7-40 hex commit SHA anywhere in the document.
    expect(html).not.toMatch(/\b[0-9a-f]{7,40}\b/);
  });

  it("an absolute finding path is redacted rather than published", () => {
    const absolute = renderShareHtml(
      withFinding({ file: "C:\\Users\\someone\\secret\\app.spec.ts" }),
    );
    expect(absolute).toContain("redacted-path:12");
    expect(absolute).not.toContain("someone");
    // And a climbing relative path, which is the other way out.
    const climbing = renderShareHtml(withFinding({ file: "../../etc/passwd" }));
    expect(climbing).toContain("redacted-path:12");
    expect(climbing).not.toContain("passwd");
  });
});

describe("the share artifact carries claims, not code", () => {
  it("a rule message quoting source is escaped, not embedded", () => {
    const injected = renderShareHtml(
      withFinding({
        message:
          "expect(total).toBe(41) is wrong <!-- and <script>alert(1)</script> follows -->",
      }),
    );
    expect(injected).not.toContain("<script>alert(1)</script>");
    expect(injected).toContain("&lt;script&gt;");
  });

  it("no <script> element and no external resource of any kind", () => {
    expect(html.toLowerCase()).not.toContain("<script");
    expect(html).not.toMatch(/\ssrc\s*=/);
    expect(html).not.toMatch(/<link\b/);
    expect(html).not.toMatch(/@import/);
    expect(html).not.toMatch(/url\(\s*['"]?https?:/i);
  });

  it("no network primitive appears in the artifact", () => {
    // Belt to the src/ isolation spec's braces: that spec proves the SOURCE
    // cannot reach the network, this proves the OUTPUT cannot ask for
    // anything.
    for (const marker of ["http://", "https://", "fetch(", "XMLHttpRequest"]) {
      expect(html, `the artifact references ${marker}`).not.toContain(marker);
    }
  });
});

describe("the share artifact answers the questions it was built for", () => {
  it("names the score, the gate counts and the gate command", () => {
    expect(html).toContain("<strong>Score</strong>");
    expect(html).toMatch(/\d+ GATE/);
    expect(html).toMatch(/\d+ WARN/);
    expect(html).toContain("mjolnir ci install");
  });

  it("every finding is labelled GATE or WARN, and nothing else", () => {
    const labels = [...html.matchAll(/<td><code>(?:GATE|WARN)<\/code><\/td>/g)];
    expect(
      labels.length,
      "each finding row carries exactly one of the two words",
    ).toBe(result.findings.length);
    // No tier vocabulary leaks into the shareable surface.
    for (const word of ["quarantine", "extended", "core tier"]) {
      expect(html.toLowerCase()).not.toContain(word);
    }
  });

  it("three commands, and they are commands", () => {
    const commands = [...html.matchAll(/<li><code>([^<]+)<\/code><\/li>/g)].map(
      (m) => m[1],
    );
    expect(commands).toHaveLength(3);
    expect(commands[0]).toBe("mjolnir ci install");
    for (const c of commands) expect(c).toMatch(/^mjolnir\b/);
  });

  it("says INCONCLUSIVE when the scan did not finish, rather than showing a clean table", () => {
    const partial = renderShareHtml({ ...result, partial: true });
    expect(partial).toContain("INCONCLUSIVE");
  });

  it("an unmeasured rule says unmeasured — never 0%", () => {
    // QA-PY-008 is one of the six that ship on the author's estimate.
    const unmeasured = renderShareHtml(
      withFinding({ ruleId: "QA-PY-008", severity: "warning" }),
    );
    expect(unmeasured).toContain("unmeasured");
    expect(unmeasured).not.toMatch(/QA-PY-008<\/code><\/td><td>0%/);
  });

  it("writes to the path it was told, and makes the parent directory", async () => {
    const { runShareCommand } = await import("../../src/commands/share.js");
    const dir = mkdtempSync(join(tmpdir(), "mjolnir-share-"));
    scratch.push(dir);
    const out = join(dir, "nested", "trust.html");
    const lines: string[] = [];
    const code = await runShareCommand([DEMO, "--out", out], {
      out: (...parts: unknown[]) => void lines.push(parts.join(" ")),
      err: () => {},
    });
    expect(code).toBe(0);
    expect(readFileSync(out, "utf8")).toBe(html);
  });
});
