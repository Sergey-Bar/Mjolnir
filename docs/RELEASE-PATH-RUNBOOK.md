# Release-path runbook

**D-9 — an unobtainable criterion is not a criterion.**

Every row here needs something this repository cannot produce: a design
partner's codebase, a platform's CI minutes, a credential bound to one person's
account. A release gate that depends on those produces one of two states, and
both are bad:

- it blocks every release until somebody with the right credentials happens to
  have an afternoon, so it gets disabled — and a disabled release gate is a
  release gate that reports nothing;
- or it is satisfied by a person ticking a box, which is a gate that cannot
  fail.

This runbook replaces the second state with a third: **the evidence is named,
the actor who can produce it is named, and the box stays open and visible.**
Nothing here is marked closed. `EXTERNAL_PENDING` is a status, not a verdict.

## What this changes, and what it does not

It does **not** lower the bar for 1.0. The 39 boxes in
[`EXTERNAL-EVIDENCE-REQUEST.md`](EXTERNAL-EVIDENCE-REQUEST.md) remain open, and
they are the definition of done for 1.0 rather than for 5.x. That is the
market position, and it is not a lowered bar — it is a bar attached to the
right milestone. ESLint ran on the same footing for a decade: the rules were
the product, and the evidence that they were right was a community complaint
queue. What ESLint did _not_ do was put a "no external validation exists" box
in its pre-release gate, which is where a naive reading of this ledger ends up.

`npm run docs:external-evidence` prints the current count and fails if a box
that IS obtainable in-repo is sitting in the external set. That is the check
that makes the disposition falsifiable rather than a way to park work.

## The release path, and who owns each step

Ordered as a release actually runs. Every step names the proof it must
produce, because a step with no proof is a step nobody can tell was run.

| #   | Step                                                                                    | Actor                        | Proof                                                                                                                                 | Status                                                 |
| --- | --------------------------------------------------------------------------------------- | ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------ |
| 1   | Version identity agrees across `package.json`, `action.yml`, `capability-manifest.json` | automated                    | `npm run check-version`                                                                                                               | `AUTOMATED`                                            |
| 2   | Unreleased changes are recorded                                                         | automated                    | `npm run check-version -- --base=origin/main`                                                                                         | `AUTOMATED`                                            |
| 3   | The released changelog section is valid                                                 | automated                    | `npm run check-version -- --expect-version <v>`                                                                                       | `AUTOMATED`                                            |
| 4   | Claimed capabilities are demonstrated by files                                          | automated                    | `npm run ledger:check`                                                                                                                | `AUTOMATED`                                            |
| 5   | SBOM is generated, checksummed and uploaded                                             | automated                    | `stable-release.yml` steps 180/181/332/423                                                                                            | `AUTOMATED`                                            |
| 6   | Full certification                                                                      | automated                    | `npm run certify:ci`                                                                                                                  | `AUTOMATED`                                            |
| 7   | Tag matches the published version                                                       | automated                    | release job, `Verify tag matches package.json`                                                                                        | `AUTOMATED`                                            |
| 8   | **Remote release/provenance identity agrees**                                           | repo owner                   | `git ls-remote origin v<v>` matches the ledger's `32bc8ebb`; `npm view mjolnir-qa@<v> dist.integrity` matches the release attestation | `EXTERNAL_PENDING` — `GAP-M26-009`                     |
| 9   | **The DEPLOYED `stable-release.yml` is the candidate one**                              | repo owner                   | `gh api repos/<owner>/<repo>/contents/.github/workflows/stable-release.yml?ref=main` returns the candidate text, not the predecessor  | `EXTERNAL_PENDING` — `GAP-M26-010`                     |
| 10  | **Two-candidate canary and rollback drill executed**                                    | repo owner                   | the drill's log: both candidates served, traffic shifted, rollback restored, with timestamps                                          | `EXTERNAL_PENDING` — `GAP-M26-012`                     |
| 11  | Consent to the pending corpus re-sample                                                 | repo owner                   | a dated consent record naming the repositories, the date, and who gave it                                                             | `EXTERNAL_PENDING` — `GAP-M26-004`                     |
| 12  | Design-partner study                                                                    | an external team             | a signed study report                                                                                                                 | `EXTERNAL_PENDING` — `EXTERNAL-EVIDENCE-REQUEST.md` §1 |
| 13  | Held-out classification                                                                 | an external classifier       | a verdict set this repository never produced                                                                                          | `EXTERNAL_PENDING` — §2                                |
| 14  | Platform matrix                                                                         | CI minutes on each platform  | per-platform job URLs                                                                                                                 | `EXTERNAL_PENDING` — §3                                |
| 15  | Consumer install matrix                                                                 | installs by consumers        | per-consumer install logs                                                                                                             | `EXTERNAL_PENDING` — §4                                |
| 16  | Supply-chain attestation for the published artifact                                     | the registry                 | `npm audit signatures` and the provenance predicate                                                                                   | `EXTERNAL_PENDING` — §5                                |
| 17  | An independent decision on release readiness                                            | someone who did not build it | a dated written verdict                                                                                                               | `EXTERNAL_PENDING` — §6                                |
| 18  | Hosted-mode go/no-go                                                                    | repo owner                   | a decision against `docs/adr/0012-hosted-enterprise-boundary.md`                                                                      | `OPEN` — `GAP-M26-013/015/016`                         |

## Step 8 in detail, because three identities disagree

`GAP-M26-009` is not "a doc is stale". Three artifacts name three different
commits for the same release: the remote tag, the ledger, and the local
candidate. Each of the first two may be right, and the only way to know is to
ask the registry and the remote — which is two network calls from an account
this process does not hold.

The check to run, by hand, once per release:

```sh
# 1. what the remote says the tag points at
git ls-remote origin "refs/tags/v$(node -p "require('./package.json').version")"

# 2. what the registry says was published
npm view "mjolnir-qa@$(node -p "require('./package.json').version")" \
  dist.integrity gitHead

# 3. what the ledger recorded, for comparison
node -e "const m=require('./candidate-trust-manifest.json'); \
  console.log(m.provenance?.releaseSha ?? m.gitSha ?? '(no field)')"
```

All three must name the same commit. If they do not, the release is not
ready, and the discrepancy is the finding — not a reason to edit the ledger
until it agrees.

## Step 10 in detail — the canary and rollback drill

`docs/ROLLBACK-3.0.0.md` has the procedure. What it does not have is evidence
that anyone ran it, which is why `GAP-M26-012` is open. The drill is five
minutes of work; what makes it expensive is that nobody has a reason to do it
on a day when there is no incident, so it goes on the release calendar as a
step rather than as a hope.

## What would make these close

An `EXTERNAL_PENDING` row closes when its proof exists AND the proof is
attached. Not when someone says it is done — the ledger's own
`closure_evidence` field is null on every one of these, and that is the shape
of the problem: a row with no evidence and a `CLOSED` status is a green that
means nothing, and 14 open rows under 3 release-blockers is how that state is
produced.
