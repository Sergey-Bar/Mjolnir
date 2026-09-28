# Mjölnir contract v2 migration guide

`CONTRACT_VERSION` moves from **1** to **2**. The package version is
unchanged: this is a machine-contract version, not a release. Nothing about
how you install, invoke, or gate on Mjölnir changes. What changes is what the
machine contract _says_, and a consumer that trusted the old reading was
reading something that was not true.

## Why this is a version bump and not an additive field

Every field v2 adds is **semantic**, and every semantic field participates in
`canonicalScanJson` — the digest a stored result is verified against. Leaving
`contractVersion` at 1 would have let a stored v1 artifact keep verifying
while the digest no longer described which rules ran. A version that does not
change when the meaning of the digest changes is a version that lies.

`degradations` was in the same hole before this release: the ledger computed
it, and the digest and the completeness literal both dropped it. A scan that
lost the tree-sitter grammar and one that did not hashed identically.

## What changed

### `completeness.coverageState` — new, `"COMPLETE" | "PARTIAL"`

The claim "this scan covered the registry", and the honesty problem behind
it. `completeness.rules` answers _"did a rule fail?"_ — and it said
`"complete"` on a scan that ran **45 of 79 detectors**, because the
withheld-rule set was computed at the one site that knew it and then
discarded. `coverageState` answers a different question: _"were rules
present?"_

```jsonc
{
  "completeness": {
    "partial": false, // unchanged meaning
    "rules": "complete", // unchanged meaning: no rule FAILED
    "coverageState": "PARTIAL", // new: 34 of 79 rules did not run
    "rulesApplied": 45, // new
    "rulesWithheld": 34, // new
  },
}
```

### `coverageState` is ORTHOGONAL to `partial` — read this before you gate

This is the part that will bite you if you skim.

`partial` means _this run lost something while doing it_: a truncated walk, a
crash-isolated rule, a swallowed parser error. It drives `scanExitCode`,
SARIF `executionSuccessful`, and whether generated CI blocks. **v2 adds no
input to `partial`.** A scan that read every file it was given, parsed all of
them and crashed no rule is `partial: false` — and was still run with a third
of the registry switched off.

That separation is deliberate. Folding coverage into `partial` would make
nearly every ordinary scan exit 2, and the fix a user reaches for is
`--strict`, which switches the quarantine ON and leaves the flag nothing to
check.

If you want coverage to gate, ask for it:

```bash
mjolnir . --require-full-coverage    # EXIT_PARTIAL when a rule was withheld
```

Off by default, and the default is the point. `coverageState` is `"PARTIAL"`
on every scan that is not `--strict`, because the quarantine tier is
non-empty. A flag that fired everywhere would be a flag whose remedy inverts
it.

### `completeness.degradations` — new, `[{ reason, count }]`

Capability lost inside a `catch` that returned a clean default, per reason.
Previously computed and then dropped from both the digest and the
completeness literal, so two materially different scans hashed alike.

Two sites this release made honest: the Python framework detector reading a
manifest it could not read, and the tree-sitter grammar load. A missing
grammar used to be invisible; the E2E tarball journey now exits 2 instead of
1, which is the correct answer for a run that parsed nothing structurally.

### `summary.scoreClampReason` — new, on the result

`"scope-degraded" | "partial-scan"`, or absent. A 100 is the strongest claim
the scorer makes and neither condition permits it, so two sites turn 100 into 99. The clamp was always right; the defect was that the **result was
byte-identical to a genuine 99**. The PR comment now stamps a clamped score so
a reader can tell the two apart.

It is on `ScanResult` and deliberately **not** inside `runIdentity`:
`runIdentity` is the machine anchor, and a presentation reason must not move
its digest.

## Migration steps

1. **Nothing breaks.** `partial`, `findings`, `score`, and every exit code are
   unchanged. If your integration reads only those, you can upgrade without
   touching it.

2. **If you consume the machine contract**, decide what `coverageState` means
   for you. The options, in the order this release would recommend them:

   - **report it, gate on it not at all** (what this release does) — a clean
     result is presented as a clean result _over the rules that ran_, with the
     withheld count stated;
   - **gate on it** — add `--require-full-coverage` to the scan and treat
     `EXIT_PARTIAL` as a failure. Do this if a quarantined detector being
     switched off is a loss of coverage you cannot accept;
   - **ignore it** — defensible, and now an explicit choice rather than the
     default. Before v2 you had no way to tell the difference.

3. **If you verify a stored contract**, it will fail. That is intended. Re-scan
   and re-store; a v1 artifact cannot be migrated, because the digest it
   carries was computed without the coverage inputs and there is no way to
   recover which rules ran.

4. **If you assert on the contract's shape**, add the three fields. They are
   optional in the type (a producer predating v2 omits them) and the
   completeness validator checks them for INTERNAL consistency only —
   `coverageState: "PARTIAL"` with `rulesWithheld: 0` fails as
   self-contradictory, while `coverageState: "PARTIAL"` with `partial: false`
   is a perfectly good report and is not a validation failure.

## Reading the v2 contract honestly

- `completeness.rules === "complete"` no longer implies the whole registry
  ran. Read `coverageState`.
- `completeness.partial === false` no longer implies the scan was
  comprehensive. It never did; v2 just stopped implying it by omission.
- The digest now separates scans that differ only in coverage or only in
  degradation. Two stored artifacts that used to compare equal are now
  distinct, which is the fix.

## Related

- `docs/machine-contract.md` — the generated, drift-locked contract reference
- `docs/EXTERNAL-EVIDENCE-REQUEST.md` — the external validation this contract
  deliberately does **not** assert
- `TRUST_INVARIANTS` (`src/trust/invariants.ts`) — TI-018 through TI-021 now
  assert the surfaces this version added
