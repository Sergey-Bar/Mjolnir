import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import {
  looksLikeTrxXml,
  mapTrxOutcome,
  parseTrxXml,
} from "../../src/forensics/parse-trx.js";
import { parseJunitXml } from "../../src/forensics/parse-junit.js";
import { parseFile } from "../../src/forensics/run.js";

const ROOT = join(import.meta.dirname, "..", "..");
const trx = readFileSync(
  join(
    ROOT,
    "tests",
    "forensics",
    "fixtures",
    "dotnet",
    "Sample_2026-10-04.trx",
  ),
  "utf8",
);

describe("TRX — what `dotnet test` writes", () => {
  it("recognises a TRX document by shape, not by extension", () => {
    expect(looksLikeTrxXml(trx)).toBe(true);
    expect(looksLikeTrxXml('<?xml version="1.0"?><testsuite name="x"/>')).toBe(
      false,
    );
  });

  it("reads every result with its outcome and duration", () => {
    const records = parseTrxXml(trx);
    expect(records).toHaveLength(5);
    const byTitle = new Map(records.map((r) => [r.title, r]));

    expect(byTitle.get("CheckoutSucceeds")?.attempts[0]?.status).toBe("passed");
    // 12ms — the fraction is truncated, not rounded, so this is exact.
    expect(byTitle.get("CheckoutSucceeds")?.attempts[0]?.durationMs).toBe(12);
    expect(byTitle.get("CartRemembersItems")?.attempts[0]?.status).toBe(
      "failed",
    );
    expect(byTitle.get("CartRemembersItems")?.attempts[0]?.durationMs).toBe(
      1250,
    );
    // 1m30s across the hours/minutes/seconds boundary.
    expect(byTitle.get("SlowCheckoutTimesOut")?.attempts[0]?.durationMs).toBe(
      90_000,
    );
    expect(byTitle.get("SlowCheckoutTimesOut")?.attempts[0]?.status).toBe(
      "timedOut",
    );
    expect(byTitle.get("LegacyPaymentFlow")?.attempts[0]?.status).toBe(
      "skipped",
    );
  });

  it("carries the failure message, sanitised", () => {
    const cart = parseTrxXml(trx).find((r) => r.title === "CartRemembersItems");
    expect(cart?.errors?.[0]).toContain("Expected: not null");
  });

  it("maps every outcome, and sends an unrecognised one to the non-claiming side", () => {
    expect(mapTrxOutcome("Passed")).toBe("passed");
    expect(mapTrxOutcome("Failed")).toBe("failed");
    expect(mapTrxOutcome("Error")).toBe("failed");
    expect(mapTrxOutcome("Timeout")).toBe("timedOut");
    expect(mapTrxOutcome("Aborted")).toBe("interrupted");
    expect(mapTrxOutcome("NotExecuted")).toBe("skipped");
    expect(mapTrxOutcome("Inconclusive")).toBe("skipped");
    // The important one: an outcome this engine has never seen must never read
    // as passed. It reads as skipped, which contributes nothing to "the suite
    // passed".
    expect(mapTrxOutcome("SomethingNewFromAProducer")).toBe("skipped");
    expect(mapTrxOutcome(undefined)).toBe("skipped");
  });

  it("does NOT read TRX file paths out of a dotted CLR type name", () => {
    // TRX carries `className="Shop.Tests.CartTests"`. Mapping that onto a
    // source path would invent a location no run ever reported, and
    // test-level runtime corroboration matches a finding's LINE against a test's
    // declaration span — a guessed path would silently never match, or worse,
    // match the wrong file.
    for (const record of parseTrxXml(trx)) {
      expect(record.file).toBe("unknown");
      expect(record.line).toBeUndefined();
    }
  });

  it("carries one attempt per record, so TRUE-FLAKE cannot fire from TRX", () => {
    // A TRX UnitTestResult has ONE outcome. Retries live in <Execution>
    // entries cross-referenced by id, which is a lookup table and not an ordered
    // attempt log. Claiming a second attempt would invent evidence.
    for (const record of parseTrxXml(trx)) {
      expect(record.attempts).toHaveLength(1);
      expect(record.attempts[0]?.index).toBe(1);
    }
  });

  it("returns nothing for a document that is not TRX, rather than throwing", () => {
    expect(parseTrxXml('<?xml version="1.0"?><testsuite/>')).toEqual([]);
    expect(parseTrxXml("not xml at all")).toEqual([]);
  });

  it("is dispatched as TRX and NOT parsed as JUnit", () => {
    // The failure this prevents: the JUnit branch is reached by an `<?xml`
    // sniff, so a TRX file used to be handed to a parser looking for
    // <testsuite>, match nothing, and produce an EMPTY run — which reads as
    // "the suite ran and passed nothing", the most reassuring possible wrong
    // answer for a .NET project whose tests were never examined at all.
    expect(parseJunitXml(trx)).toHaveLength(0);
    const fixture = join(
      ROOT,
      "tests",
      "forensics",
      "fixtures",
      "dotnet",
      "Sample_2026-10-04.trx",
    );
    const parsed = parseFile(fixture, trx);
    expect(parsed.source).toBe("dotnet-trx");
    expect(parsed.records).toHaveLength(5);
  });
});

describe("duration parsing", () => {
  const one = (xml: string) =>
    parseTrxXml(
      `<TestRun><Results><UnitTestResult testName="T" outcome="Passed" duration="${xml}" /></Results></TestRun>`,
    )[0]?.attempts[0]?.durationMs;

  it("reads the seven-digit fraction TRX writes", () => {
    expect(one("00:00:00.0120000")).toBe(12);
    expect(one("00:00:01.2500000")).toBe(1250);
    expect(one("00:00:00")).toBe(0);
  });

  it("returns 0 for a duration it cannot read, never NaN", () => {
    // NaN would propagate into duration totals and make every downstream
    // comparison false — including the flakiness ordering.
    expect(one("-")).toBe(0);
    expect(one("garbage")).toBe(0);
    expect(one("00:00")).toBe(0);
    expect(Number.isFinite(one("nonsense") ?? Number.NaN)).toBe(true);
  });

  it("truncates rather than rounds the sub-millisecond remainder", () => {
    // Truncating keeps two adjacent durations distinct. Rounding would make
    // 1.0005 and 1.0004 collide, and ordering is what flake derivation reads.
    expect(one("00:00:00.0005000")).toBe(0);
    expect(one("00:00:00.0015000")).toBe(1);
  });
});
