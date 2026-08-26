# LEGENDARY ROADMAP — TIER 5 QA WAR ROOM

> Extracted from Legendary-Roadmap.txt (source of truth). See docs/plans/ for full context.

# TIER 5 — INSIGHTS FROM INSIDE THE QA WAR ROOM 🧪

## What a QA engineer actually lives through (and what the tool must feel)

> Written from the seat of a working QA engineer: sprint pressure,
> flaky triage meetings, "works on my machine", release-day panic.
> These insights come from real QA pain, not from linter architecture.

## 21. Speak QA's Language, Not Dev's 🔥🔥🔥 ✅ DONE — `qaImpact` field + BLOCKS-RELEASE/FLAKY-RISK/FALSE-GREEN/HYGIENE in `src/types.ts:30-40,53`

Developers lint code. **QAs defend releases.** The entire output vocabulary
must map to QA reality:

```text
❌ DEV-SPEAK (current):          ✅ QA-SPEAK (upgrade):
"Missing negative assertion"  →  "This test can't catch the bug
                                  you're paid to catch"
"Score dropped 84 → 79"       →  "Release risk went UP this PR"
"3 heuristic risks found"     →  "3 things that will wake you
                                  up at 2 AM before a release"
```

Concretely:

- Every finding gets a **"QA impact" line**: does this affect release
  confidence, test reliability, or coverage honesty?
- Severity labels in QA terms: `BLOCKS-RELEASE` / `FLAKY-RISK` /
  `FALSE-GREEN` / `HYGIENE` — not error/warning/info alone.
- The score banner gains one line: **"Can I sign off on this release?"**
  with YES / CONDITIONAL / NO based on gate rules.

This is the single cheapest, highest-impact change on this list.

## 22. The Triage Meeting Killer 🔥🔥🔥 🟡 PARTIAL — `triage` command + TRIAGE.md shipped (`src/forensics/triage.ts`); no `quarantine --apply` command found

Every QA team has a weekly "flaky test meeting". It's miserable and it's
where QA engineers burn out. Build the artifact that ends it:

```text
qa-doctor triage
```

Generates `TRIAGE.md` for the meeting:

```text
THIS WEEK'S FLAKY TRIAGE — auto-generated, do not edit

| Test | Fail rate | Last fail | Attempt # passed | Owner | Suggested action |
|---|---|---|---|---|---|
| checkout.spec:88 | 34% | 2d ago | always #2 | @dana | quarantine + ticket |
| login.spec:12 | 12% | 1h ago | #3 | @omri | fix selector drift |

Auto-quarantine proposal: 2 tests (fail-rate > 30%, > 5 occurrences)
Run `qa-doctor quarantine --apply` to move them to quarantine suite.
```

- Quarantine isn't deletion — quarantined tests run nightly, not per-PR
- Every quarantine auto-creates a tracked issue with the trace attached
- Meeting time drops from 45 min to 10 min of "approve these actions"

**This is the feature that makes QA teams evangelize the tool internally.**

## 23. Release-Day Confidence Report 🔥🔥 ⬜ NOT BUILT — no `release-report` command

The moment of maximum QA pain: the release go/no-go call. Give QAs the
artifact they must present to management:

```text
qa-doctor release-report --since v2.3.0
```

```text
RELEASE READINESS — v2.4.0

Test hygiene since last release:    12 issues fixed, 3 introduced
New tests added:                    41 (18 without assertions ⚠)
Skipped during the cycle:           9  ← what are we NOT verifying?
Flaky at release time:              2  (was 7 last release ✓)
CI integrity:                       1 continue-on-error still active

VERDICT: CONDITIONAL GO
Blocking: none · Watch: 9 skipped tests include 3 payment-path tests
```

One command, screenshot into the release channel. Managers understand it.
No competitor produces this artifact.

## 24. "Works On My Machine" Detector 🔥 ✅ DONE — QA-ENV-001 `envCoupling` rule shipped, `src/rules/quality/qa-env-001-env-coupling.ts`

The oldest QA wound. Static + config analysis finds environment coupling:

- Tests depending on localhost URLs, fixed ports, specific OS paths
- Timezone/locale-sensitive assertions (`toLocaleDateString` without locale)
- Hardcoded credentials/test users in spec files (also a security smell!)
- Filesystem assumptions (`/tmp`, `C:\`)
- Order-dependent shared state across spec files

```text
⚠ ENV-COUPLING: 6 tests assume port 3000 is free
⚠ TIMEZONE: date assertion will fail for any UTC+X ≠ dev's timezone
```

## 25. Coverage Honesty for the QA Dashboard 🔥 ⬜ NOT BUILT — no `coverage-honesty` command

QAs get asked "what's your coverage?" by managers constantly. Raw %
is a lie they're forced to tell. Replace it:

```text
qa-doctor coverage-honesty
```

```text
COVERAGE HONESTY REPORT

Reported coverage (Istanbul):        87%
Tests with no meaningful assertion: −4%   (tests that can't fail)
Mock-only verification:             −9%   (wiring, not behavior)
Skipped-but-counted:                −3%
─────────────────────────────────────────
HONEST COVERAGE:                     71%

You are reporting 16 points of coverage you cannot defend.
```

Same philosophy as Effective Coverage from Product.txt §26 — shipped as
a standalone command that plugs into existing coverage reports.

## 26. Migration & Upgrade Copilot 🔥 ⬜ NOT BUILT — no `migrate` command

QA engineers' hidden nightmare: framework upgrades break hundreds of tests.
Be the tool that carries them across:

- `qa-doctor migrate jest→vitest` — mechanical transforms + report of
  manual work remaining (Jest globals, mock semantics differences)
- Playwright major-version upgrade advisor: deprecated APIs in use,
  breaking-change checklist against their config
- Protractor→Playwright migration path (thousands of teams still stuck!)

Each migration becomes a marketing event: _"We migrated 400 tests in an
afternoon"_ writes itself.

## 27. Test Debt Register (make debt visible & negotiable) 🔥 ✅ DONE — `src/commands/debt.ts`

QA knows the debt; nobody above them sees it. Make it a first-class,
exportable artifact:

```text
qa-doctor debt
```

```text
TEST DEBT REGISTER — generated 2026-08-24

DEBT CLASS           COUNT   TREND   EST. COST/QUARTER
Hard sleeps            47     ↑        ~19h wasted CI + flaky risk
Skipped tests          34     ↑        unknown unverified behavior
Duplicate suites       12     →        double maintenance
No-assertion tests     28     ↓        false confidence
──────────────────────────────────────
TOTAL ESTIMATED DRAG:  ~2.5 engineer-weeks per quarter
```

Exportable to CSV/Markdown for planning meetings. Turns "we should really
fix testing" into a line item with numbers.

## 28. The New-QA-Onboarding Artifact 👋 ✅ DONE — `src/commands/handover.ts`

Every QA joining a team spends week one discovering where the bodies are
buried. One command generates the map:

```text
qa-doctor handover
```

```text
WELCOME TO THE TEST SUITE — WHAT YOU NEED TO KNOW

⚠ Do-not-touch (order-dependent):    billing/e2e-flow.spec.ts
🔴 Known flaky (quarantined):         4 tests → see FLAKY.md
🟡 Fake-green suspects:               11 tests, no real assertions
🟢 Solid foundation:                  auth/, payments/ specs
📖 Untested critical flows:           password reset, refunds
```

Massive goodwill generator — every new QA hire receives it on day one.

## 29. CI Minutes Economy 💰 ⬜ NOT BUILT — no CI-minutes cost estimation found

Management speaks money. Flaky tests and hard sleeps burn CI minutes:

- Estimate cost per finding: `~340 CI min/month wasted on retries of X`
- Optional: connect GitHub API (opt-in!) for real billing data
- ROI framing in the Impact Report: "QA Doctor pays for its attention"

## 30. Emotional Design: Respect the QA, Don't Shame Them 🔥 ⬜ UNVERIFIABLE FROM CODE — copy/tone audit, no roast mode exists to check against (see Tier 4 #16)

Tone audit of every message. QA engineers are blamed enough.

- Never: "Your tests are terrible."
- Always: "Found 3 traps waiting for the next release — here's how we
  disarm them."
- Progress framing over deficit framing: "You've fixed 14 of 22 this
  quarter" beats "8 remain".
- The roast mode stays opt-in comedy; default tone = professional ally.

---

# TIER 5 SEQUENCING (insertion into roadmap)

```text
QUICK WINS (< 1 week each, huge resonance):
  ├─ QA-speak severity labels (#21)      ← rename + reframe only
  ├─ ENV-coupling detector core (#24)    ← static patterns first
  └─ Tone audit pass (#30)               ← copywriting day

NEXT QUARTER:
  ├─ qa-doctor triage + TRIGAGE.md       ← needs forensics data (R4)
  ├─ coverage-honesty command            ← consumes existing reports
  └─ debt register export                ← trivial over current findings

STRATEGIC:
  ├─ release-report                      ← after gates + baselines mature
  ├─ migrate copilots                    ← one framework pair at a time
  └─ handover artifact                   ← cheap once everything above exists
```

# THE SIXTH NORTH STAR SENTENCE

Add to the north-star list: 5. _"The triage meeting went from 45 minutes to 10."_ 6. _"I finally had something to show management besides a coverage %."_

A tool that gives QA engineers **artifacts they can present upward**
(release-report, debt register) and **time back** (triage automation)
stops being a linter and becomes career infrastructure. That's the
moat no competitor crosses.

---
