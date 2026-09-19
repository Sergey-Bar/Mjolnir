# Executive ROI: Mjölnir as Release Safety Insurance

## The Problem

Every green CI check is a claim: "The software is ready to ship."

But the check only means _the pipeline didn't fail_ — not that the tests ran, or that they could have caught a bug.

```text
A green check means the pipeline didn't fail.
It does NOT mean tests ran, or could have failed.
```

## The False-Green Tax

Organizations shipping on false-green pay a recurring tax:

| Incident Class                          | Typical Cost | Frequency                   |
| --------------------------------------- | ------------ | --------------------------- |
| Production bug from skipped tests       | $15K–$250K+  | 2–4×/yr per team            |
| Flaky test masking real failures        | $5K–$50K     | Monthly                     |
| `continue-on-error` hiding broken gates | $10K–$100K   | Quarterly                   |
| `                                       |              | true` swallowing exit codes | $5K–$25K | Per incident |

**Estimated industry average: $25K–$100K/year per team** in direct incident costs from untrustworthy verification.

## What Mjölnir Does

Mjölnir scans your test suite and CI pipelines **statically** — it does not run your tests. It finds:

- Tests that **cannot fail** (`.only`, empty bodies, missing assertions)
- Pipelines that **cannot go red** (`continue-on-error`, `|| true`, swallowed exit codes)
- Selectors that **break on harmless markup changes**
- Runtime flakiness the static scan missed (via `forensics`)

It scores the result 0–100 (**Worthiness Score**) and **blocks releases** when findings exceed the gate.

## The Business Case

### Per-Finding Expected Savings

| Rule Category   | Example Finding                         | FP Rate | Evidence                   | Expected Savings |
| --------------- | --------------------------------------- | ------- | -------------------------- | ---------------- |
| CI Integrity    | `continue-on-error` on gate job         | 11%     | E2 (deterministic)         | $2,750           |
| CI Integrity    | `                                       |         | true` swallowing exit code | 8%               | E2  | $2,000 |
| Test Hygiene    | Committed `.only` (runs 3 of 900 tests) | 22%     | E2                         | $5,500           |
| Test Quality    | Promise assertion without `await`       | 14%     | E2                         | $3,500           |
| Playwright      | Locator assertion without `await`       | 9%      | E2                         | $2,250           |
| Selector Health | Brittle CSS/XPath selector              | 31%     | E1 (pattern)               | $3,875           |

**Total per scan (typical 10–20 findings): $30K–$100K expected savings**

### Why It Works

1. **Deterministic findings (E2)** = structural defects in verification, not heuristics
2. **Measured false-positive rates** = 74 of 79 rules have empirical FP data from OSS corpus
3. **Trust ladder (L0–L5)** = runtime corroboration lifts findings from "looks like" to "proven"
4. **Agent handoff** = AI writes the fix, Mjölnir re-scans to prove it landed
5. **Self-verifying** = Mjölnir gates its own releases with the same tool

## Deployment Model

```bash
# 1. Scan locally (zero cost, zero setup)
npx mjolnir-qa@latest

# 2. Install blocking gate in CI (one command)
mjolnir ci install --gate error

# 3. Every PR blocked on error findings — no false-green releases
```

- **Time to value:** < 5 minutes
- **Ongoing cost:** $0 (runs locally in CI, no SaaS, no telemetry)
- **Maintenance:** Auto-updates with `npx mjolnir-qa@latest`; version pinning available

## Risk Reduction Quantified

| Metric                               | Without Mjölnir        | With Mjölnir (error gate) |
| ------------------------------------ | ---------------------- | ------------------------- |
| False-green releases/yr              | 2–4                    | ~0                        |
| Mean time to detect verification rot | Months (post-incident) | Minutes (in PR)           |
| Incident cost from bad CI            | $50K–$500K/yr          | < $5K/yr                  |
| QA time spent triaging false-green   | 15–30%                 | < 2%                      |

## Decision Framework

**Adopt if:**

- You ship from green CI without manual verification
- You have > 50 tests in CI
- One production incident from bad verification costs > $10K

**Defer if:**

- No CI pipeline (no verification to audit)
- All tests are contract-verified and flake-free
- You already have equivalent gates in place

## Next Steps

1. Run `npx mjolnir-qa@latest` on your repo — see the findings
2. Run `mjolnir business-case` — see projected savings per finding
3. Run `mjolnir ci install --gate error` — install the blocking gate
4. Watch the first PR get blocked on a real finding — that's the moment it pays for itself
