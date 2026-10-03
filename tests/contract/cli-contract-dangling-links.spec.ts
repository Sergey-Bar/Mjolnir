/**
 * A relative link that resolves to nothing is a name that resolves to nothing.
 *
 * `scripts/check-cli-contract.mjs` gained a fourth contract for this in 6.0,
 * and the arm that matters is the one below that a careless exemption would
 * kill: the gate must still FAIL on a dangling link in a live surface.
 *
 * A gate with no negative arm is the shape this repository has already paid for
 * twice — the provenance-stamp bug in `docs/capability-registry.json` and the
 * `--allow-doc-drift` escape in `check-provenance` were both gates that could
 * only pass. So every exemption the link pass inherits from `isLiveSurface` is
 * asserted here as an exemption, and each one is asserted by NAME rather than by
 * pattern, because an exemption with a pattern in it cannot be argued with.
 *
 * The scope decisions are measured, not guessed, and the measurements are the
 * reason for three of these arms:
 *
 *   - Only INLINE links are read. A link-reference definition whose value is
 *     itself a link — `[^pit]: PIT, [PIT](https://pitest.org)` — is a footnote,
 *     and a bare-token capture cannot tell it from a real destination without
 *     parsing CommonMark. Guessing produced 30 false positives in one research
 *     document on the first attempt.
 *   - Fenced blocks and inline code spans are blanked. Documentation about
 *     markdown contains markdown.
 *   - Anchors are not resolved. That is a different check with a different
 *     false-positive profile; this one is about a link that leads nowhere at all.
 *
 * Mutations happen in a fixture tree. Editing a tracked root file while
 * `tests/certification/candidate-manifest.spec.ts` hashes the working tree is
 * the cross-test interference this repository has already paid for once.
 */

import { execFileSync } from "node:child_process";
import {
  cpSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

const ROOT = join(import.meta.dirname, "..", "..");
const CHECKER = join(ROOT, "scripts", "check-cli-contract.mjs");

const scratch: string[] = [];

afterEach(() => {
  while (scratch.length > 0) {
    const dir = scratch.pop();
    if (dir !== undefined) rmSync(dir, { recursive: true, force: true });
  }
});

/**
 * A fixture tree carrying the inputs the gate reads to get past its own
 * bookkeeping, plus the documents under test.
 *
 * The real `docs/cli-contract.json`, `src/engine/cli-command-names.ts` and
 * `src/rules/index.ts` are copied rather than hand-written. A hand-written set
 * would be a second contract to keep in sync, and the first version of a fixture
 * like that tests the fixture.
 */
function fixtureTree(docs: Record<string, string>): string {
  const dir = mkdtempSync(join(tmpdir(), "mjolnir-link-contract-"));
  scratch.push(dir);
  for (const d of [
    "docs",
    join("src", "engine"),
    join("src", "rules"),
    "scripts",
  ]) {
    mkdirSync(join(dir, d), { recursive: true });
  }
  cpSync(join(ROOT, "package.json"), join(dir, "package.json"));
  cpSync(
    join(ROOT, "docs", "cli-contract.json"),
    join(dir, "docs", "cli-contract.json"),
  );
  cpSync(
    join(ROOT, "src", "engine", "cli-command-names.ts"),
    join(dir, "src", "engine", "cli-command-names.ts"),
  );
  // Without the registry, every `docs/rules/*.md` would count as a preserved
  // doc and the exemption below would pass for the wrong reason.
  cpSync(
    join(ROOT, "src", "rules", "index.ts"),
    join(dir, "src", "rules", "index.ts"),
  );
  cpSync(CHECKER, join(dir, "scripts", "check-cli-contract.mjs"));
  // The gate imports `yaml` to read workflow files. A fixture without a
  // `node_modules` fails on ERR_MODULE_NOT_FOUND before it reads a single
  // document, which is a test that passes or fails for a reason that has
  // nothing to do with the contract. A directory JUNCTION needs no privileges on
  // Windows and resolves the same package the real run does.
  symlinkSync(
    join(ROOT, "node_modules"),
    join(dir, "node_modules"),
    "junction",
  );
  for (const [name, body] of Object.entries(docs)) {
    const target = join(dir, name);
    mkdirSync(join(target, ".."), { recursive: true });
    writeFileSync(target, body, "utf8");
  }
  return dir;
}

function runCheck(dir: string): { code: number; output: string } {
  try {
    const output = execFileSync(
      process.execPath,
      [join(dir, "scripts", "check-cli-contract.mjs")],
      { cwd: dir, encoding: "utf8", stdio: "pipe" },
    );
    return { code: 0, output };
  } catch (error) {
    const e = error as { status?: number; stderr?: string; stdout?: string };
    return {
      code: e.status ?? 1,
      output: `${e.stderr ?? ""}${e.stdout ?? ""}`,
    };
  }
}

describe("a dangling relative link in a live markdown surface", () => {
  it("is a failure — the arm an exemption can kill", () => {
    const dir = fixtureTree({
      "docs/LIVE.md":
        "# Live\n\nSee [the request](EXTERNAL-EVIDENCE-REQUEST.md).\n",
    });

    const { code, output } = runCheck(dir);

    expect(code).toBe(1);
    expect(output).toContain("docs/LIVE.md");
    expect(output).toContain("EXTERNAL-EVIDENCE-REQUEST.md");
    expect(output).toContain("no such file");
  });

  it("is not a failure in an ADR, because the exemption is inherited", () => {
    // I wrote this arm expecting the opposite, having assumed `isLiveSurface`
    // excluded `docs/adr/` from this check and not from the removed-verb check.
    // It is the other way round: the link pass reuses that predicate verbatim,
    // so an ADR's dangling link is invisible here too. The run found it by
    // hand — `docs/adr/0012-hosted-enterprise-boundary.md` linked up to the
    // deleted request document — and this arm is the record of why the gate
    // could not have.
    //
    // Asserted rather than left implied, because the alternative — a link pass
    // with its own narrower list — would have caught that one and drifted from
    // every other exemption at the same time.
    const dir = fixtureTree({
      "docs/adr/0013-live.md":
        "# ADR\n\nSee [the runbook](../RELEASE-PATH-RUNBOOK.md).\n",
    });

    expect(runCheck(dir).code).toBe(0);
  });

  it("is still a failure beside a document that is exempt", () => {
    // The two live in one tree on purpose: the arm a per-directory exemption
    // gets wrong is one where skipping the exempt file also skips a live doc
    // that happens to sit near it.
    const dir = fixtureTree({
      "docs/RELEASE-3.0.0-READINESS.md":
        "# 3.0.0\n\nThe [request](EXTERNAL-EVIDENCE-REQUEST.md) was the plan.\n",
      "docs/PUBLISHING.md":
        "# Publishing\n\nThe [request](EXTERNAL-EVIDENCE-REQUEST.md) governs.\n",
    });

    const { code, output } = runCheck(dir);
    expect(code).toBe(1);
    expect(output).toContain("docs/PUBLISHING.md");
    expect(output).not.toContain("RELEASE-3.0.0-READINESS.md");
  });
});

describe("what the link pass deliberately does not read", () => {
  it("a fenced code block containing markdown is documentation", () => {
    const dir = fixtureTree({
      "docs/STYLE.md":
        "# Style\n\n```md\n[broken](EXTERNAL-EVIDENCE-REQUEST.md)\n```\n",
    });

    expect(runCheck(dir).code).toBe(0);
  });

  it("an inline code span containing markdown is documentation", () => {
    const dir = fixtureTree({
      "docs/STYLE.md":
        "# Style\n\nWrite `[broken](EXTERNAL-EVIDENCE-REQUEST.md)` like so.\n",
    });

    expect(runCheck(dir).code).toBe(0);
  });

  it("a footnote whose value is a link is not a bare destination", () => {
    // `[^pit]: PIT, [PIT](https://pitest.org)` — the second token is prose, not
    // a destination. Reading definitions without parsing CommonMark produced 30
    // false positives in one research document.
    const dir = fixtureTree({
      "docs/RESEARCH.md":
        "# Research\n\nPIT[^pit].\n\n[^pit]: PIT, [PIT](https://pitest.org).\n",
    });

    expect(runCheck(dir).code).toBe(0);
  });

  it("an absolute, scheme-qualified or same-document target is not this check", () => {
    // Nothing on this machine can tell you whether a URL is reachable, and a
    // target with no path part has nothing to resolve. An anchor on a path that
    // does exist is not this check's business either — that is a different check
    // with a different false-positive profile.
    const dir = fixtureTree({
      "docs/guide.md": "# Guide\n",
      "docs/LINKS.md": [
        "# Links",
        "",
        "- [absolute](/CONTRIBUTING.md)",
        "- [remote](https://example.invalid/nothing-here.md)",
        "- [anchor](#a-heading-that-is-not-there)",
        "- [with-anchor](guide.md#a-section)",
        "",
      ].join("\n"),
    });

    expect(runCheck(dir).code).toBe(0);
  });

  it("a link whose path is missing fails even when it carries an anchor", () => {
    const dir = fixtureTree({
      "docs/guide.md": "# Guide\n",
      "docs/LINKS.md": "# Links\n\n[gone](NOT-HERE.md#a-section)\n",
    });

    const { code, output } = runCheck(dir);
    expect(code).toBe(1);
    expect(output).toContain("NOT-HERE.md");
  });

  it("a non-markdown surface is out of scope", () => {
    const dir = fixtureTree({
      "docs/data.json": '{ "link": "[x](EXTERNAL-EVIDENCE-REQUEST.md)" }\n',
    });

    expect(runCheck(dir).code).toBe(0);
  });
});

describe("the resolutions that must keep passing", () => {
  it("a link to a file that exists resolves", () => {
    const dir = fixtureTree({
      "docs/LIVE.md": "# Live\n\nSee [the contract](cli-contract.json).\n",
    });

    expect(runCheck(dir).code).toBe(0);
  });

  it("an extensionless link resolves to the .md, which is the site's convention", () => {
    const dir = fixtureTree({
      "docs/guide.md": "# Guide\n",
      "docs/INDEX.md": "# Index\n\nSee [the guide](./guide).\n",
    });

    expect(runCheck(dir).code).toBe(0);
  });

  it("an image link is a link", () => {
    const dir = fixtureTree({
      "assets/rune.svg": "<svg xmlns='http://www.w3.org/2000/svg'/>",
      "docs/LIVE.md": "# Live\n\n![rune](../assets/rune.svg)\n",
    });

    expect(runCheck(dir).code).toBe(0);
  });

  it("and a missing image is a failure", () => {
    const dir = fixtureTree({
      "docs/LIVE.md": "# Live\n\n![rune](../assets/gone.svg)\n",
    });

    const { code, output } = runCheck(dir);
    expect(code).toBe(1);
    expect(output).toContain("gone.svg");
  });
});

describe("the exemptions are inherited, by name", () => {
  it("the link pass reuses isLiveSurface rather than a second list", () => {
    const source = readFileSync(CHECKER, "utf8");
    // If the pass grew its own exemption sets, a file added to one of them and
    // not the other would be protected from one contract and not the other —
    // which is exactly how `docs/RELEASE-3.0.0-READINESS.md` came to be exempt
    // from the npm-name check and not the removed-verb check.
    const linkSection = source.slice(source.indexOf("(4) every relative"));
    expect(linkSection).toContain("isLiveSurface(file)");
    expect(linkSection).not.toMatch(/const\s+(LINK_EXEMPT|DANGLING_LINKS)/);
  });

  it("this repository passes, and it says how many links it checked", () => {
    const { code, output } = runCheck(ROOT);

    expect(code).toBe(0);
    // A resolver that checks nothing also passes, so the count is asserted: it
    // is the difference between "no dangling links" and "no link was read".
    const checked = Number(
      /"relativeLinksChecked": (\d+)/.exec(output)?.[1] ?? "0",
    );
    expect(checked).toBeGreaterThan(100);
  });
});
