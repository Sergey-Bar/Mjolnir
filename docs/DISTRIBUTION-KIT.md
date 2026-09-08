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

`release.yml`'s `action-tags` job moves the **`v1` major moving tag** to
every stable release (rc tags never move it — the same ruling as npm's
`next` dist-tag). Consumers choose their exposure:

```yaml
# Follow the action's major line (recommended for most users):
- uses: Sergey-Bar/Mjolnir@v1

# Pin an exact release for a reproducible gate (no surprises on merge):
- uses: Sergey-Bar/Mjolnir@v0.5.32
```

The scan itself always runs the **published npm package**
(`npx mjolnir-qa@<version>`), never a build of this repo — the action
works for consumers, not contributors. Pin the tool exactly in your
workflow (`with: version: 0.5.32`) when gate reproducibility matters;
`version: latest` follows the registry.

## GitHub Actions Marketplace (P1.5)

**Owner clicks only:** publish from the repo's "Releases" side panel
("Publish to GitHub Marketplace" → draft → publish), accepting the tag
it offers (`v1` must be a valid tag at publish time — the action-tags
job guarantees it after the first stable release following this merge).

Listing content (paste verbatim into the marketplace draft):

- **Name:** Mjölnir — verification trust scan
- **Tagline:** Fail your PR when a test suite or CI workflow cannot go
  red. Measured false-positive rates per rule.
- **Description (short):** Mjölnir audits the verification _system_ —
  tests, Playwright configs, CI workflows — for gates that cannot fail:
  skipped tests, swallowed exit codes, always-success steps, retries
  that mask flakiness. 99 rules over TS/JS, Python, Java, C#, GitHub
  Actions YAML, with a measured false-positive rate published per rule.
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

| #   | Step                                                                               | State   |
| --- | ---------------------------------------------------------------------------------- | ------- |
| 1   | Merge P1; confirm `v1` tag moved by the action-tags job on the next stable release | pending |
| 2   | Draft marketplace listing on the repo Releases page                                | pending |
| 3   | Attach screenshots, categories, link README                                        | pending |
| 4   | **Owner: click Publish**                                                           | pending |
| 5   | Verify: `uses: Sergey-Bar/Mjolnir@v1` on a scratch repo runs green                 | pending |

## Awesome-list PRs (P1.6)

All three lists are curated; read their CONTRIBUTING before opening.
Draft PR body (shared): "Adds Mjölnir (mjolnir-qa on npm) — a CI tool
that audits the verification system itself: test suites, Playwright
configs and CI workflows, for gates that cannot go red. 99 rules;
per-rule measured FP rates against real OSS code; GitHub Action
(`Sergey-Bar/Mjolnir@v1`), MCP server, SARIF. MIT."

| Channel            | Where it belongs                                                    | State   |
| ------------------ | ------------------------------------------------------------------- | ------- |
| awesome-playwright | Tools section (after the config helpers)                            | pending |
| awesome-testing    | CI/CD tooling section                                               | pending |
| awesome-actions    | Linting / testing categories — list the ACTION, not the npm package | pending |

## MCP registries (P1.6)

| Channel                      | Artifact                                                                                                                                                                                       | State   |
| ---------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------- |
| modelcontextprotocol/servers | PR adding Mjölnir to the community servers README (line: `- [mjolnir-qa](…) — verification trust scanning: fails CI on tests that cannot fail; stdio MCP server with scan/explain/diff tools`) | pending |
| Smithery                     | `/smithery.yaml` ships with the repo; submit via smithery.ai "Add server" pointing at the repo                                                                                                 | pending |
| PulseMCP                     | Directory entry form (owner: requires Sergey-Bar identity): name, description from smithery.yaml, stdio transport, install `npx -y mjolnir-qa@latest mcp`                                      | pending |
| mcp.so                       | Entry form with the same payload as PulseMCP                                                                                                                                                   | pending |

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
> always-success steps masking failures. 99 rules over TypeScript/JS,
> Python, Java, C# and GitHub Actions YAML.
>
> Two things it does differently from a linter: every rule ships a
> must-fire AND a must-not-fire fixture, and every rule publishes a
> false-positive rate measured against real OSS code (n ≥ 10
> hand-classified findings) — the rate that gates CI is ≤ 10%, and the
> rules that cannot demonstrate that sit in quarantine behind `--strict`,
> capped to info, never gating. It scores what it finds, publishes the
> score's full deduction table, and refuses to score an empty repo as a 100.
>
> Try it: `npx mjolnir-qa@latest` (or in CI, `mjolnir ci install`).
> GitHub Action: `Sergey-Bar/Mjolnir@v1`. MIT.

Comment-strategy note: lead with the FP-rate honesty angle on HN
(technical audience), the Action pinning story on r/devops, and the
"why not a linter" table on LinkedIn. Owner posts (identity-bound).

## Node floor honesty (P1.7)

**Why ≥ 22.18:** the build toolchain (tsdown/tsdown targets
`node22.18.0`) sets the floor — it is the oldest runtime the release
pipeline compiles and smoke-tests against; the runtime dependencies
themselves have no such requirement. (Two sentences live in README and
the site FAQ; the floor itself stays unchanged per owner decision 2.)
