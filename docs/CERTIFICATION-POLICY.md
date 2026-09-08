# Mjölnir — Certification Policy (Consolidated & Owner-Ratified)

> **Status: BINDING.** This document consolidates the certification-audit
> plan (`.kilo/plans/1788771091931`, Wave-1 execution + owner chat
> lawbook, 2026-09-07/08) into one normative policy. Every law below was
> individually ratified by the owner (vote record summarized in §8).
> Where this document and an older plan clause disagree, **this document
> wins** (it is the post-contradiction-pass consolidation).
>
> Notation: **Law** = normative rule with enforcement; **Check** =
> doctor check enforcing it; **Gate** = CI or process control;
> **Evidence** = artifact or command that proves compliance.
> Exit-code authority: `docs/VERSIONING.md`.

---

## 1. The evidence-first axioms (foundations)

These four axioms are the ground the rest of the lawbook stands on.
They were ratified as part of laws 1, 12 and 22.

- **A1 — Evidence over assertion.** Every completion claim carries:
  what changed → why → which invariant is protected → proving
  command/test → actual result. Nothing is claimed that was not run
  (Law 12, Mandatory Evidence Rule).
- **A2 — Never render "cannot prove" as "pass".** A check is either
  proven (pass), violated (fail), or not evaluable (inconclusive —
  blocking, never rendered as pass in text, JSON, or exit code)
  (Law 1, G2).
- **A3 — No silent substitution.** A historical artifact (MEASURED_FP,
  baseline, cached verdicts) may inform evaluation but may never
  quietly stand in for evidence that is absent, unreadable, or stale.
  Absent evidence → inconclusive; invalid evidence → fail or
  inconclusive per failure type (Laws 3, 18, L4 ruling).
- **A4 — The engine must not measure itself.** No automatic bulk
  classification of verdicts, no self-awarded evidence levels, no
  self-upgraded tiers. Where only a human can attest, the gate stays
  human (Laws 18–19, §19 adjudication).

---

## 2. The doctor and its statuses (Law 22 — binding model)

**The doctor check model is three-status.** `status: "pass" | "fail" |
"inconclusive"`.

- **PASS = proven.** The check ran, evidence exists, no violation.
- **FAIL = violated.** The check ran and found a breach — blocking.
- **INCONCLUSIVE = cannot be proven → blocking.** The check could not
  be evaluated (missing inputs, installed package, unreadable manifest,
  malformed evidence). Rendered `? INCONCLUSIVE <name>`, `ok: false`,
  contributes to exit 1. **Never** rendered as pass.

**WARN is not a Doctor status.** WARN exists only as a CI annotation
class (the D8v2 base-diff `::warning::`), for explicitly non-blocking
conditions defined in a contract. A WARN health status invites the
reading "sort of passed" — forbidden (evidence-first). Adding a `warn`
status to `CheckStatus` requires a conscious model change AND a policy
amendment; silence is never a downgrade path.

**The eleven checks** (all must be pass for `healthy`):

| #   | Check                     | Enforces                                                  |
| --- | ------------------------- | --------------------------------------------------------- |
| 1   | `fixture-firewall`        | Law 9 (every rule: must-fire AND must-not-fire)           |
| 2   | `registry-sanity`         | L1 (unique IDs, closed families, per-family titles)       |
| 3   | `trust-metadata`          | L2 (presence-only, by owner ruling)                       |
| 4   | `evidence-honesty`        | L3 (E-level derived, never self-claimed)                  |
| 5   | `tier-enforcement`        | L4 (effective-core ⇒ measured; `MAX_UNMEASURED_CORE = 0`) |
| 6   | `anti-creep`              | L5 (`CORE_CAP = 65`, promote ⇒ demote)                    |
| 7   | `quarantine-enforcement`  | L6 (every quarantine rule ⇒ info/E0 cap)                  |
| 8   | `category-integrity`      | Law 5/D6 (closed category set)                            |
| 9   | `fixture-integrity`       | Law 9 (orphans/empties blocking; allowlist census)        |
| 10  | `revision-integrity`      | Laws 2–3 (manifest ↔ source ↔ registry)                   |
| 11  | `measurement-consistency` | Law 6/D7 (MEASURED_FP ↔ live verdicts ↔ sidecar)          |

The `measurement` census block in `doctor --json`
(`{measured, unmeasured, total, quarantine}`) is **the** reproducible
answer to "how many rules are measured" — derived from the live
registry and revision-valid measurements (currently 78/21/99, 43
quarantine).

**Machine contract:** `mjolnir doctor --json` emits
`mjolnir.doctor-report@1` — frozen key order
(`schema, healthy, summary, checks, measurement`), details truncated
exactly like the text render, byte-deterministic on the same tree,
zero absolute paths, `NON_DETERMINISTIC_FIELDS` empty (Law 7).

---

## 3. Detector source identity (Laws 2, 3, 14)

`tests/corpus/detector-hashes.json` attests, per registered rule:
`logicHash = sha256(metadataJson ‖ moduleTokenStream)` +
`detectorRevision`.

- Metadata order is canonical; the token stream is the full non-trivia
  token sequence of the defining module (regex/string/template texts
  preserved exactly; comments and whitespace excluded).
- **Claim scope:** only defining positions claim a rule — `id:` property
  or family-factory first argument. `overlapWith`, dedup tables,
  `index.ts`, `*.generated.ts`, and any string/comment mention never
  claim. Double claim → hard fail.
- **Outcomes:** hash changed + revision changed → INFO (legitimate
  bump, re-measurement expected). Hash changed + revision identical →
  **CI WARN annotation** ("confirm behavior-neutrality or bump") — the
  only WARN surface in this policy. Unattested/unreconciled → doctor
  FAIL. Manifest missing/unreadable, or source tree unavailable →
  INCONCLUSIVE.
- Regeneration: `npm run detector-hashes:update` (byte-deterministic);
  wired into the generated-docs-drift job — a stale manifest is a drift
  failure.

---

## 4. Fixtures — two independent layers (Laws 4, 13, 9)

- **Layer A (structural):** `tsc --noEmit -p tsconfig.fixtures.json` —
  fixtures must work as code (imports resolve; the QA-PW-125 class).
  Deliberately-malformed detector input lives in
  `tests/fixtures/typecheck-allowlist.json`, each entry with a one-line
  justification; the allowlist is snapshot-locked, fails on stale rows,
  and cannot grow silently.
- **Layer B (behavioral):** `fixture-harness.spec.ts` +
  `fixture-firewall-completeness.spec.ts` — the sole authority on
  detection behavior. Neither layer may replace or weaken the other.
- **Structure:** orphaned fixture dirs (no registered rule) and empty
  `must-fire`/`must-not-fire` dirs are blocking (`fixture-integrity`).
  `tests/**/tmp-*.mts` is gitignored — probe scripts never re-enter the
  tree.

---

## 5. Categories and registry hygiene (Laws 5, 28, L1, L5, L6)

- `RULE_CATEGORIES` (13 values) is declared first; `RuleCategory` is
  derived from it (compile-time exhaustiveness). `--category` is
  validated by one shared helper across scan/why/handoff — unknown or
  missing value → usage error 10, at parse time.
- Rule IDs are immutable and never reused; registry IDs are unique and
  well-formed; titles are unique within a family (cross-family title
  sharing is by design).
- `CORE_CAP = 65` on effective-core rules — promote requires demote.
- Every quarantine rule is capped to `severity: info` / `evidence: E0`
  per-rule (the cap itself is asserted; policy drift fails loudly).

---

## 6. Measurement law (Laws 6, 18, 19; A4)

- A measurement is valid only at the rule's current declared
  `detectorRevision` (Law 18) — stale ⇒ unmeasured ⇒ provisional, in
  all three places that count (tier-enforcement, measurement-consistency,
  census — they must agree).
- `MEASURED_FP.n` must equal the live classified verdict count; sidecar
  revisions must agree; every sidecar row maps to a registered rule;
  unparseable verdict rows fail corpus integrity. Missing/unreadable
  evidence → inconclusive, never pass.
- **No bulk auto-classification** — `unclassified`/`UNSURE` caps are 0
  and mechanically enforced. The 21 unmeasured rules await human §19
  adjudication; certification remains **CONDITIONAL** on that human gate
  by design.

---

## 7. Evidence transport — CI gates and determinism (Laws 7, 8, 20, 26)

- `certification` job: runs `dist/cli.mjs doctor . --json` on the built
  artifact; non-zero exit fails the job; **no** `continue-on-error`, no
  `|| true`, no masking. Byte-equality replay: a second run must diff
  clean. Report uploaded as a 90-day artifact. Exit-code table is
  frozen: `0` healthy · `1` violations (incl. inconclusive) · `2` not a
  checkout / partial scan honesty · `10` usage · `20` crash.
- `detector-revision-diff` job: base-diff WARN annotations (Law 2).
- `generated-docs-drift` job: all generated artifacts (rule pages,
  COUNT-LOCK, capability matrix, machine contract, golden, hero, demo,
  detector-hashes) must match regeneration.
- `self-scan` job: the repo scans itself — `partial: false`, zero rule
  crashes, zero error findings, else fail (A3/A4 applied to ourselves).
- Per-file coverage ratchet: 100/100/100/100. No pragma escapes; new
  branches require tests (Law 11) — enforced via exported seams only
  (Law 15): injected parameters must be default-preserving, no private
  reach-in, no test-side reimplementation.

---

## 8. Ratification record

| Set            | Laws  | Outcome                                                                                                                                                                            |
| -------------- | ----- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Wave-1 lawbook | 1–12  | Ratified (10 as-is; D14 amended per owner; 11–12 approved)                                                                                                                         |
| Deviation      | 22    | Ratified as option A — three-status model, WARN = CI-annotation only (binding, supersedes plan Phase 5.1 WARN clause)                                                              |
| Chat lawbook   | 13–21 | Ratified (8 as-is; 17 ratified in standing form: "every PR adding a new runtime dependency requires explicit justification in review" — not wave-scoped; backstop: npm-pack probe) |
| Legacy checks  | L1–L6 | Ratified (5 as-is; L4 amended — INCONCLUSIVE without live verdicts, implemented in PR #58)                                                                                         |
| Standing laws  | 23–34 | Balloted 2026-09-08 (this document's consolidation pass; contradictions resolved in §9)                                                                                            |

Vote format: `N 🟢 (as-is) / 🟡 (approved with named change) / 🔴
(rejected)`. Unmarked items are "pending", never "approved".

---

## 9. Contradiction pass (Policy → Implementation → Gate → Evidence → Exit Code)

Result of the final sweep across all 28 ratified items:

1. **Doctor three-status vs CI WARN** — resolved by Law 22: two
   different surfaces (doctor statuses vs CI annotations), no shared
   vocabulary, no overlap. ✓ no conflict.
2. **L4 vs MEASURED_FP baking** — resolved: the generated map is a
   historical artifact used only when live evidence exists; missing
   evidence is inconclusive (PR #58). ✓ no conflict.
3. **D14 re-baseline vs PARTIAL repos** — resolved per owner amendment:
   re-baseline-per-wave is blocking; PARTIAL repos are tracked debt,
   never baselines, never a certification gate; zero-PARTIAL is the end
   state, not the gate. ✓ no conflict.
4. **Law 25 (rendering) vs Law 18 (revisions)** — the only live tension:
   the baseline fingerprint (`ruleId\0file\0message`) is revision-blind,
   so a metadata-only change can render "FIXED SINCE BASELINE" without
   verification. **Recorded as P2 debt** (revision-aware fingerprint +
   fresh baselines), disclosed — not a policy contradiction, and
   certification verdicts must disclose it (§24/§25).
5. **Law 22 vs plan Phase 5.1 original WARN clause** — resolved: this
   document supersedes; the plan carries the AMENDED block.
6. **Law 8 (certification gate) vs Law 26 (partial honesty)** — aligned:
   scan `partial` surfaces as exit 2 to the consumer and as a failed
   self-scan for ourselves; the doctor never evaluates on partial
   evidence (L4/18 inconclusive arms). ✓ no conflict.
7. **Law 15 (seams) vs Law 30 (internal APIs unstable)** — aligned:
   seams are exported, default-preserving function signatures; tests
   never reach into internals, so internal churn cannot break the
   certification suite. ✓ no conflict.

No unresolved contradictions. Two disclosed debts carry review-visible
controls: (a) §19 human adjudication (21 rules — the CONDITIONAL cap),
(b) baseline revision-blind fingerprint (P2, Law 25 note).

---

## 10. Certification verdict semantics

- The machine layer proves what it can prove: doctor `healthy: true`
  (11/11), full gates green, coverage ratchet, determinism, drift locks.
- The **certification verdict** remains **CONDITIONAL** until the §19
  human adjudication of the 21 unmeasured rules completes — by Law 19/A4
  this gate is human and cannot be closed by any automation, including
  this policy's own tooling.
- Every verdict must be evidenced by the `doctor --json` artifact and
  the evidence-run commands (typecheck, lint, test, coverage, build,
  self-scan, corpus regression, bench, translations) — asserted
  statuses are not evidence (A1).

---

_Adopted 2026-09-08. Amendment procedure: conscious edit here + a
ratification row in §8 + tests updated in the same change. This document
is the normative certification policy; the audit plan remains the
historical execution record._
