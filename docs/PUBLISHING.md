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
   `package.json`'s version, re-runs typecheck/lint/test, builds, packs
   a tarball, and creates a GitHub Release with auto-generated notes and
   the tarball attached.
7. **npm publish** — automatic once the OIDC trusted publisher is
   configured (see "Current state" below). Until then it is a manual,
   out-of-band step.

## Current state — npm publish is not yet automated

The package name is **resolved and live**: `mjolnir-qa` on npmjs.com,
with `bin: { "mjolnir": ... }`, so the CLI command a user types is
`mjolnir`. Version 0.4.0 was published manually.

`release.yml` does **not** publish to npm yet. It packs a tarball and
attaches it to a GitHub Release only. This is deliberate, not an
oversight: the npmjs.com OIDC trusted-publisher setup has not been
completed. Running `npm publish --provenance` as written would fail
without that configuration.

A `Publish to npm with provenance` step exists in `release.yml`,
disabled via `if: false`, ready to flip on once the OIDC setup below is
done.

## One-time setup required before that step can run (account-level, manual)

This cannot be automated from inside this repository — it is an action
a maintainer takes once on npmjs.com.

1. ~~Claim the package name~~ — **done**: `mjolnir-qa` is published and
   owned. Nothing to do here for this package.
2. On the package's npmjs.com settings page, under **Publishing
   access**, configure a **Trusted Publisher** (OIDC): select GitHub
   Actions, the repository (`Sergey-Bar/Mjolnir`), the exact workflow
   file path (`.github/workflows/release.yml`), and leave the
   environment field blank unless this workflow later adds a GitHub
   Environment gate.
3. Once configured, `npm publish --provenance` from that exact workflow
   file needs **no npm token secret at all** — npm verifies the OIDC
   token GitHub Actions presents (via `id-token: write`, already
   declared on the `release` job) matches the trusted-publisher config.
   This is why the workflow has no `NODE_AUTH_TOKEN` step: OIDC trusted
   publishing is meant to replace long-lived tokens, not sit alongside
   one.
4. Flip `if: false` to a real condition (or delete the line) on the
   `Publish to npm with provenance` step in `release.yml`.
5. Do a dry run first: `npm publish --provenance --dry-run` locally (or
   temporarily point the workflow step at `--dry-run`) against the
   chosen name before the first real publish, to confirm the tarball
   contents are exactly what's expected (cross-check against
   `tests/package-smoke.spec.ts`'s assertions).

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
