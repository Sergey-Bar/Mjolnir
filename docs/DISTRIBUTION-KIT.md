# Distribution Kit — Marketplace & Registry Publishing

Product-gap-remediation master plan P1 (plan 1788853205786): everything
below is **content prepared** — the final submission clicks are
**owner-only** (they are identity-bound: they require the Sergey-Bar
account, its 2FA, or its GitHub admin rights; decision 10 keeps A4
adjudication human and this document keeps publishing accountable to a
person). Each channel carries a checklist with the three states the plan
requires: **submitted → accepted → live**.

The artifacts this kit ships in-repo:

| Artifact              | Location         | Consumer                                |
| --------------------- | ---------------- | --------------------------------------- |
| Composite action      | `/action.yml`    | GitHub Actions Marketplace              |
| MCP server descriptor | `/smithery.yaml` | Smithery registry                       |
| Screenshots / hero    | `assets/readme/` | Marketplace listing, awesome PRs        |
| npm package           | `mjolnir-qa`     | npm (automated, see docs/PUBLISHING.md) |

## Versioning & pinning guidance (P1.2)

`action-tags.yml` moves the **`v3` major moving tag** to
every stable release (rc tags never move it — the same ruling as npm's
`next` dist-tag). Consumers choose their exposure:

```yaml
# Follow the action's major line (recommended for most users):
- uses: Sergey-Bar/Mjolnir@v3

# Pin an exact release for a reproducible gate (no surprises on merge):
- uses: Sergey-Bar/Mjolnir@v3.0.0
```

The scan itself always runs the **published npm package**
(`npx mjolnir-qa@3.0.0`) — never a build of this repo: the action
works for consumers, not contributors. Leave `version` unset to take the
Action's default, which is the last published stable release; or pin it
explicitly to another published exact version
(`with: version: 3.0.0`). Do not use `version: latest` in an enforcing gate,
and do not pin a release candidate — it is not on the registry until it ships.

## GitHub Actions Marketplace (P1.5)

**Owner clicks only:** publish from the repo's "Releases" side panel
("Publish to GitHub Marketplace" → draft → publish), accepting the tag
it offers (`v3` must be a valid tag at publish time — the action-tags
workflow guarantees it after a stable release).

Listing content (paste verbatim into the marketplace draft):

- **Name:** Mjölnir — verification trust scan
- **Tagline:** Fail your PR when a test suite or CI workflow cannot go
  red. Measured false-positive rates per rule.
- **Description (short):** Mjölnir audits the verification _system_ —
  tests, Playwright configs, CI workflows — for gates that cannot fail:
  skipped tests, swallowed exit codes, always-success steps, retries
  that mask flakiness. 79 active rules over TS/JS, Python, Java, C#, GitHub
  Actions YAML; 74 have corpus-measured false-positive rates and 5 are
  explicitly unmeasured.
- **Categories:** `Continuous integration`, `Code quality`
- **Screenshots:** `assets/readme/terminal-hero.svg` (hero),
  `assets/readme/score-gauge.svg`, `assets/readme/demo.svg` —
  Marketplace renders SVG via user-content; if the upload dialog rejects
  SVG, convert with `npm run docs:video`'s renderer stack (same fonts,
  same palette) to PNG 1280×640.
- **Link back:** README quickstart anchors the listing's "Usage"
  section; keep `action.yml`'s `description:` in sync with the listing
  (test: `tests/integrations/action-surface.spec.ts`).

Checklist (tick with dates, states in the table header):

| #   | Step                                                                                    | State   |
| --- | --------------------------------------------------------------------------------------- | ------- |
| 1   | Merge P1; confirm `v3` tag moved by the action-tags workflow on the next stable release | pending |
| 2   | Draft marketplace listing on the repo Releases page                                     | pending |
| 3   | Attach screenshots, categories, link README                                             | pending |
| 4   | **Owner: click Publish**                                                                | pending |
| 5   | Verify: `uses: Sergey-Bar/Mjolnir@v3` on a scratch repo runs green                      | pending |

## Awesome-list PRs (P1.6)

All three lists are curated; read their CONTRIBUTING before opening.
Draft PR body (shared): "Adds Mjölnir (mjolnir-qa on npm) — a CI tool
that audits the verification system itself: test suites, Playwright
configs and CI workflows, for gates that cannot go red. 79 active rules;
74 corpus-measured FP rates and 5 explicitly unmeasured rules; GitHub Action
(`Sergey-Bar/Mjolnir@v3`), MCP server, SARIF. MIT."

| Channel            | Where it belongs                                                    | State   |
| ------------------ | ------------------------------------------------------------------- | ------- |
| awesome-playwright | Tools section (after the config helpers)                            | pending |
| awesome-testing    | CI/CD tooling section                                               | pending |
| awesome-actions    | Linting / testing categories — list the ACTION, not the npm package | pending |

**Agent-loop listing angles (P7):** the MCP registries' entries and the
awesome PR bodies should lead with the agent loop — `mjolnir verify`
gives an agent a before/after digest (resolved per §15 lifecycle, new,
unchanged by ruleId+location, score delta) with frozen exit semantics;
the MCP `verify` tool is 1:1 under the same transport guardrails. The
agent-loop pitch belongs in the PulseMCP/mcp.so descriptions and the
modelcontextprotocol/servers PR (the stdio transport ships `verify`
since v0.5.37).

## MCP registries (P1.6)

| Channel                      | Artifact                                                                                                                                                                                                                         | State   |
| ---------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------- |
| modelcontextprotocol/servers | PR adding Mjölnir to the community servers README (line: `- [mjolnir-qa](…) — verification trust scanning: fails CI on tests that cannot fail; stdio MCP server with scan/explain/diff/verify/forensics/triage/pw-report tools`) | pending |
| Smithery                     | `/smithery.yaml` ships with the repo; submit via smithery.ai "Add server" pointing at the repo                                                                                                                                   | pending |
| PulseMCP                     | Directory entry form (owner: requires Sergey-Bar identity): name, description from smithery.yaml, stdio transport, install `npx -y mjolnir-qa@3.0.0 mcp`                                                                         | pending |
| mcp.so                       | Entry form with the same payload as PulseMCP                                                                                                                                                                                     | pending |

## Ministry of Testing (P1.6)

Tool page (owner: account-bound): title "Mjölnir", category
"Test automation — CI/verification tooling", body = the marketplace
description plus the measured-FP paragraph from README ("How much of
this is measured"). Link `sergey-bar.github.io/Mjolnir`.

## Announcement post draft (P1.6)

Title: **Mjölnir: fail CI when your tests cannot go red**

Body (HN/Reddit/LinkedIn variants — same facts, different tone):

> Mjölnir is a CLI (and now a GitHub Action + MCP server) that audits
> the verification system itself. It scans test suites, Playwright
> configs and CI workflows for the patterns that make a green gate
> meaningless: focused tests committed, assertions removed, exit codes
> swallowed (`|| true`, `continue-on-error`), retries hiding flakiness,
> always-success steps masking failures. 79 active rules over TypeScript/JS,
> Python, Java, C# and GitHub Actions YAML; 74 have measured FP rates and
> 5 remain explicitly unmeasured.
>
> Two things it does differently from a linter: every rule ships a
> must-fire AND a must-not-fire fixture, and every rule publishes a
> false-positive rate measured against real OSS code (n ≥ 10
> hand-classified findings) — the rate that gates CI is ≤ 10%, and the
> rules that cannot demonstrate that sit in quarantine behind `--strict`,
> capped to info, never gating. It scores what it finds, publishes the
> score's full deduction table, and refuses to score an empty repo as a 100.
>
> Try it: `npx mjolnir-qa@3.0.0` (or in CI, `mjolnir ci install`).
> GitHub Action: `Sergey-Bar/Mjolnir@v3`. MIT.

Comment-strategy note: lead with the FP-rate honesty angle on HN
(technical audience), the Action pinning story on r/devops, and the
"why not a linter" table on LinkedIn. Owner posts (identity-bound).

## Node floor honesty (P1.7)

**Why ≥ 22.18:** the build toolchain (tsdown/tsdown targets
`node22.18.0`) sets the floor — it is the oldest runtime the release
pipeline compiles and smoke-tests against; the runtime dependencies
themselves have no such requirement. (Two sentences live in README and
the site FAQ; the floor itself stays unchanged per owner decision 2.)
