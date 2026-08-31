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
   `.github/workflows/release.yml`, in this order:

   1. re-verifies the tag matches `package.json`'s version,
   2. re-runs typecheck / lint / test / test:coverage, builds, packs,
   3. checks whether the version is already on npm (if so, the publish is
      **skipped**, not failed — see "Re-running a release" below),
   4. **publishes to npm** with provenance,
   5. **verifies** the version actually resolves on the registry,
      polling for up to a minute,
   6. **only then** creates the GitHub Release with auto-generated notes
      and the tarball attached.

   Steps 4–6 are in that order deliberately, and
   `tests/release-workflow.spec.ts` fails the build if anyone reorders
   them. See "Why publish comes before the Release" below.

7. **npm publish** — automatic when `vars.NPM_PUBLISH == 'true'` (done)
   **and** the npmjs.com trusted publisher is configured (see below).

## Why publish comes before the Release

v0.5.0 shipped a public `v0.5.0 · Latest` GitHub Release for a version
npm never received. The gh-release step ran first and succeeded; the
publish step then failed on registry auth. The result was a Release page
telling people to install something that did not exist, while
`npx mjolnir-qa@latest` kept serving the broken 0.4.0.

A GitHub Release is a promise that `npm i` works. It must not be made
before that is true. Hence the ordering above and the verification step
between them — the job now fails rather than creating a Release for a
version nobody can install.

## Re-running a release

`release.yml` also accepts `workflow_dispatch` with a `tag` input, so a
release that failed for a reason **outside** the repo (registry auth, a
flaky runner) can be retried against the same tag:

```bash
gh workflow run release.yml -f tag=v0.5.0
```

Without this the only retry path is deleting and force-pushing the tag,
which rewrites history for anyone who already fetched it. Re-running is
safe: if the version is already on npm the publish is skipped and the job
still verifies and completes.

## Current state

**Automated publishing is live.** `mjolnir-qa` on npmjs.com, with
`bin: { "mjolnir": ... }`, so the CLI command a user types is `mjolnir`.
`latest` is **0.5.0**, published by CI on 2026-08-30 via OIDC trusted
publishing with a SLSA provenance attestation (`npm audit signatures`).

- Version 0.4.0 was published **manually** (no `v0.4.0` git tag; npm
  records its `gitHead` as `7b7a61a`). It shipped a POSIX-broken bin —
  superseded by 0.5.0.
- Every release from here is `git push --follow-tags` and nothing else.
  No `NODE_AUTH_TOKEN` exists anywhere — OIDC replaces it.

### What was wrong before 0.5.0

The publish step failed on every tag with:

```
npm http fetch POST 404 .../oidc/token/exchange/package/mjolnir-qa
npm verbose oidc  OIDC token exchange error - package not found
npm error code ENEEDAUTH
```

That message does **not** mean the package is missing. It means npm found
no trusted-publisher entry matching the workflow's OIDC claims. Root
cause: the npmjs.com Trusted Publisher had the owner as `Sergey-bar`
while GitHub's `repository` claim is `Sergey-Bar/Mjolnir` — npm matches
it **case-sensitively**. Corrected on npmjs.com, then re-run against the
existing `v0.5.0` tag with `gh workflow run release.yml -f tag=v0.5.0`.

## One-time setup (already done — recorded for a rebuild)

Neither can be automated from inside this repository.

**1. Configure the npmjs.com Trusted Publisher (account-level, on npmjs.com).**
✅ **DONE — 2026-08-30.**
On `mjolnir-qa`'s package page → **Settings** → **Publishing access** →
add a **Trusted Publisher**:

| Field         | Value                     |
| ------------- | ------------------------- |
| Publisher     | GitHub Actions            |
| Organization  | `Sergey-Bar` (exact case) |
| Repository    | `Mjolnir`                 |
| Workflow file | `release.yml`             |
| Environment   | _(leave blank)_           |

The **Organization** value must match GitHub's login casing exactly
(`Sergey-Bar`, not `Sergey-bar`) — npm matches the OIDC `repository`
claim case-sensitively, and a mismatch surfaces as the `ENEEDAUTH` /
`package not found` above with everything else looking correct.

Once configured, `npm publish --provenance` from that exact workflow
needs **no `NODE_AUTH_TOKEN`** — npm verifies the OIDC token GitHub
Actions presents (via `id-token: write`, already on the `release` job).
That is why there is no token secret anywhere: OIDC trusted publishing
replaces long-lived tokens.

The `Environment` field must be **left blank**. A value there becomes
part of the OIDC claim the registry matches against, and this workflow
does not run in a GitHub Environment — a non-empty value is the most
common cause of `ENEEDAUTH` surviving an otherwise-correct setup.

**2. Turn the publish step on.** ✅ **DONE** — `NPM_PUBLISH` was set to
`true` on 2026-08-29. Recorded here for anyone rebuilding this from
scratch:

```bash
gh variable set NPM_PUBLISH --body true
```

(or Settings → Secrets and variables → Actions → Variables → New variable
`NPM_PUBLISH` = `true`.)

**3. Release.** `git push --follow-tags` after `npm version …`. To retry a
tag that already exists (a failure outside the repo), use
`gh workflow run release.yml -f tag=vX.Y.Z` instead of re-tagging.

Confirm the outcome from outside CI — the job's own green tick is not the
proof, the registry is:

```bash
npm view mjolnir-qa version      # must print the version just tagged
npm audit signatures             # provenance attestation present
```

To eyeball a tarball before tagging: `npm publish --provenance --dry-run`,
cross-checked against `tests/package-smoke.spec.ts`.

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
