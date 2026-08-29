# Publishing Runbook

Covers: the release checklist for every version bump, and the one-time
account-level setup required before `npm publish` can go live.

## Release checklist (every version)

1. **Version bump** — `npm version patch|minor|major`. This is the
   single source of truth for the version (per Master-Stabilization-Plan
   Sprint 0 Task 4) — nothing else should hardcode it except
   `src/reporter/sarif.ts`'s `driver.version`, which
   `scripts/sync-sarif-version.cjs` keeps in sync automatically during
   release, and `tests/version-consistency.spec.ts` verifies locally.
2. **Changelog entry** — add a dated entry to `CHANGELOG.md` under
   `## [Unreleased]` before bumping (or move `[Unreleased]`'s contents
   under the new version heading as part of the bump). Rule behavior
   changes (new rules, FP-rate changes, severity changes, deprecations —
   see `docs/RULE-LIFECYCLE.md`) are first-class entries; a version bump
   with no changelog entry is a release with no record of what changed.
3. **FP-audit docs sync** — if any rule's detection logic changed, run
   the reviewed corpus-audit update and regenerate the docs page:
   ```bash
   npm run corpus:regression:update   # review every new finding manually first
   npm run fp-audit:generate
   ```
4. **Golden lock** — if the change legitimately shifts scores, run
   `npm run golden:update` and include the reviewed diff in the PR. An
   unreviewed score shift is a regression, not an improvement.
5. **Standing gate** — `npm run typecheck && npm run lint && npm test &&
npm run test:coverage && npm run build && npm run self-scan`. All
   must pass before tagging.
6. **Tag and push** — `git push --follow-tags`. This triggers
   `.github/workflows/release.yml`: it re-verifies the tag matches
   `package.json`'s version, re-runs typecheck / lint / test /
   test:coverage, builds, packs a tarball, creates a GitHub Release with
   auto-generated notes and the tarball attached, and — once the two
   one-time steps below are done — publishes to npm with provenance.
7. **npm publish** — automatic when `vars.NPM_PUBLISH == 'true'` and the
   npmjs.com trusted publisher is configured (both below). Until then the
   step is skipped and publishing is a manual, out-of-band step.

## Current state — npm publish is not yet automated

The package name is **resolved and live**: `mjolnir-qa` on npmjs.com,
with `bin: { "mjolnir": ... }`, so the CLI command a user types is
`mjolnir`. Version 0.4.0 was published manually.

`release.yml` does **not** publish to npm yet. It packs a tarball and
attaches it to a GitHub Release only. This is deliberate, not an
oversight: the npmjs.com OIDC trusted-publisher setup has not been
completed. Running `npm publish --provenance` as written would fail
without that configuration.

A `Publish to npm with provenance` step exists in `release.yml`, gated on
`if: vars.NPM_PUBLISH == 'true'` — it stays inert until the repo variable
`NPM_PUBLISH` is set. No code change is needed to activate it, only the
two one-time steps below.

## One-time setup before publishing is automatic (both required)

Neither can be automated from inside this repository.

**1. Configure the npmjs.com Trusted Publisher (account-level, on npmjs.com).**
On `mjolnir-qa`'s package page → **Settings** → **Publishing access** →
add a **Trusted Publisher**:

| Field         | Value                           |
| ------------- | ------------------------------- |
| Publisher     | GitHub Actions                  |
| Organization  | `Sergey-Bar`                    |
| Repository    | `Mjolnir`                       |
| Workflow file | `.github/workflows/release.yml` |
| Environment   | _(leave blank)_                 |

Once configured, `npm publish --provenance` from that exact workflow
needs **no `NODE_AUTH_TOKEN`** — npm verifies the OIDC token GitHub
Actions presents (via `id-token: write`, already on the `release` job).
That is why there is no token secret anywhere: OIDC trusted publishing
replaces long-lived tokens.

**2. Turn the publish step on (one command, or the GitHub UI).**

```bash
gh variable set NPM_PUBLISH --body true
```

(or Settings → Secrets and variables → Actions → Variables → New variable
`NPM_PUBLISH` = `true`.)

**3. First publish — dry-run first.** Before the first real tag, confirm
the tarball contents locally:

```bash
npm publish --provenance --dry-run
```

Cross-check the file list against `tests/package-smoke.spec.ts`. Then
`git push --follow-tags` — the tag triggers `release.yml`, which runs the
full gate, creates the GitHub Release, and publishes to npm with
provenance. Every subsequent release is fully automatic.

## Verifying provenance after a real publish

Once live, every published version gets a verifiable provenance
attestation visible on its npmjs.com page ("Provenance" tab) and
checkable via:

```bash
npm audit signatures
```

This is the same falsifiable-claim philosophy the rest of this project
uses (badges, self-scan artifacts) applied to the package itself: a
stranger can verify the published tarball was built by this exact
workflow from this exact commit, not hand-assembled and uploaded.
