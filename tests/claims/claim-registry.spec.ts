import { execFileSync, spawnSync } from "node:child_process";
import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { describe, expect, it } from "vitest";

const root = join(import.meta.dirname, "..", "..");
const script = join(root, "scripts", "check-claim-registry.mjs");

describe("claim registry", () => {
  it("validates the current release envelope and generated sources", () => {
    const output = execFileSync(process.execPath, [script, root], {
      encoding: "utf8",
    });
    expect(output).toContain('"status":"PASS"');
  });

  it("keeps historical certification sources separate from current claims", () => {
    const output = execFileSync(process.execPath, [script, root], {
      encoding: "utf8",
    });
    expect(output).toContain('"historical":2');
  });

  it("every claim names the it() title that would settle it", () => {
    // The registry now carries `proof.verificationTest` /
    // `proof.verificationCase` and the checker AST-matches the title against
    // that spec, mirroring `TRUST_INVARIANTS`. This asserts the fields are
    // actually present here rather than trusting the CLI's PASS, because a
    // `toContain('"status":"PASS"')` would be satisfied by a checker that had
    // stopped checking.
    const registry = JSON.parse(
      readFileSync(join(root, "docs", "claim-registry.json"), "utf8"),
    ) as {
      claims: Array<{
        id: string;
        proof: {
          status: string;
          verificationTest?: string;
          verificationCase?: string;
        };
      }>;
    };
    expect(registry.claims.length).toBeGreaterThan(0);
    for (const claim of registry.claims) {
      expect(claim.proof.verificationTest, claim.id).toBeTruthy();
      expect(claim.proof.verificationCase, claim.id).toBeTruthy();
      expect(
        existsSync(join(root, claim.proof.verificationTest as string)),
        `${claim.id}: verificationTest does not exist`,
      ).toBe(true);
    }
  });

  it("the checker rejects a claim whose verification title is not a test", () => {
    // A copy of the registry with one title mutated to a string that is not a
    // literal `it()` in the named spec. The checker must fail and name the
    // claim — the failure path is the part worth having.
    const dir = mkdtempSync(join(tmpdir(), "mjolnir-claim-registry-"));
    try {
      cpSync(join(root, "docs"), join(dir, "docs"), { recursive: true });
      cpSync(join(root, "package.json"), join(dir, "package.json"));
      cpSync(
        join(root, "candidate-trust-manifest.json"),
        join(dir, "candidate-trust-manifest.json"),
      );
      mkdirSync(join(dir, "scripts"), { recursive: true });
      cpSync(
        join(root, "scripts", "check-claim-registry.mjs"),
        join(dir, "scripts", "check-claim-registry.mjs"),
      );
      // The checker imports `typescript`, and Node resolves from the
      // importing file's own ancestry — which in a temp directory is
      // nothing. A junction gives the copy the module without copying it, and
      // without putting the fixture inside the repository, where it would
      // make the tree dirty for the candidate-manifest gate running in
      // parallel in another worker.
      symlinkSync(
        join(root, "node_modules"),
        join(dir, "node_modules"),
        "junction",
      );

      // Every path the claims themselves cite, copied in. Listing them by
      // hand would mean editing this test every time a claim gains a source,
      // and a fixture missing one fails on THAT instead of on the assertion
      // under test.
      const claims = (
        JSON.parse(
          readFileSync(join(dir, "docs", "claim-registry.json"), "utf8"),
        ) as {
          claims: Array<{
            valueSource: string;
            relatedSources: string[];
            implementation: string[];
            tests: string[];
            corpus: string[];
            proof: { verificationTest: string; artifact?: string };
          }>;
        }
      ).claims;
      for (const claim of claims) {
        for (const cited of [
          claim.valueSource,
          ...claim.relatedSources,
          ...claim.implementation,
          ...claim.tests,
          ...claim.corpus,
          claim.proof.verificationTest,
          ...(claim.proof.artifact ? [claim.proof.artifact] : []),
        ]) {
          if (cited === "N/A") continue;
          const source = join(root, cited);
          if (!existsSync(source)) continue;
          const target = join(dir, cited);
          mkdirSync(dirname(target), { recursive: true });
          cpSync(source, target);
        }
      }

      const path = join(dir, "docs", "claim-registry.json");
      const mutated = JSON.parse(readFileSync(path, "utf8")) as {
        claims: Array<{ proof: { verificationCase: string } }>;
      };
      const first = mutated.claims[0];
      if (first === undefined)
        throw new Error("the fixture registry has no claims");
      first.proof.verificationCase = "not a real test title";
      writeFileSync(path, JSON.stringify(mutated, null, 2));

      const result = spawnSync(
        process.execPath,
        [join(dir, "scripts", "check-claim-registry.mjs"), dir],
        {
          encoding: "utf8",
        },
      );
      expect(result.status, result.stdout).not.toBe(0);
      expect(`${result.stdout}${result.stderr}`).toContain(
        "is not an it()/test() title",
      );
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
