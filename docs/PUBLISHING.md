# Publishing Runbook

Mjölnir releases are prepared on protected release branches and published only after a reviewed dry run. Merging to protected `main` never bumps a version, pushes a tag, or publishes to npm.

## Release model

- `main` is the stable integration branch and stays protected.
- A release branch such as `release/v2.0.3` contains the reviewed version and changelog PR.
- The package version for a release candidate must be `X.Y.Z-rc.N`; the corresponding annotated tag is `vX.Y.Z-rc.N`.
- `.github/workflows/release.yml` is dry-run by default.
- Publishing additionally requires the repository variable `NPM_PUBLISH=true` and approval of the `release-candidate` and `npm-publish` GitHub Environments.
- npm publication upgrades to npm 11.5.1 or newer, uses OIDC trusted publishing and provenance, and publishes release candidates under the `next` dist-tag. No long-lived npm token is stored in the repository.
- The GitHub Release is created as a prerelease only after the exact audited tarball is resolvable from npm.

## Repository configuration

Configure these once before publishing:

1. Protect `main` and `release/*` so unreviewed direct pushes cannot create a candidate.
2. Create a `release-candidate` Environment with required reviewer approval.
3. Create an `npm-publish` Environment with required reviewer approval.
4. Set `NPM_PUBLISH` as a repository Actions variable with value `true`.
5. Configure npm Trusted Publisher for repository `Sergey-Bar/Mjolnir`, workflow `release.yml`, and Environment `npm-publish`.

The npm Trusted Publisher Environment must match the workflow exactly. Leave `NODE_AUTH_TOKEN` unset.

## `v2.0.3` decision gate

The existing `v2.0.3` tag points at commit `460c7d71e67d54d667414ff36e6f100d604b6185`, which is not reachable from current `main`. Before the 2.1.0 promotion, npm `latest` is `2.0.2`.

Do not delete, move, force-update, or republish `v2.0.3` without an owner decision. The safe options are deliberately separate:

- leave the historical tag untouched and publish a new reviewed version;
- recreate `v2.0.3` on a new release branch only after explicitly deciding how the existing tag is handled;
- retain the tag as historical metadata and document that it is not an installable release.

The RC workflow rejects stable versions, so it cannot silently resolve this decision.

## Prepare a release candidate

1. Start from protected `main`.

   ```bash
   git switch main
   git pull --ff-only origin main
   git switch -c release/v3.0.0
   ```

2. Prepare a normal version PR:
   - set the root `package.json` version to `3.0.0` or the approved next RC;
   - the historical `2.0.3-rc.1` path remains subject to the decision gate above; do not recreate it without owner approval;
   - add the matching `CHANGELOG.md` heading;
   - update synchronized version surfaces with the existing version scripts;
   - include any reviewed corpus and golden updates;
   - do not edit or move the existing `v2.0.3` tag.

3. Run the local release gate.

   ```bash
   npm ci
   npm run ci-local
   ```

4. Open the version PR into protected `main`. The PR must receive normal review and merge protection.

5. Run a dry-run dispatch from the merged release branch. Keep **Dry run** enabled.

   ```bash
   gh workflow run release.yml --ref release/v2.0.3 -f dry_run=true
   ```

The dry run validates the RC-only version, release branch, changelog, ancestry from protected `main`, complete local gate, tarball contents, and SHA-256. It uploads the candidate artifact but creates no tag, npm version, or GitHub Release.

## Publish an approved candidate

After reviewing the dry-run artifact and approving the two Environments:

1. Dispatch the same release branch with **Dry run** disabled.
2. Confirm repository variable `NPM_PUBLISH` is `true`.
3. Approve the `release-candidate` Environment.
4. Approve the `npm-publish` Environment.

```bash
gh workflow run release.yml --ref release/v2.0.3 -f dry_run=false
```

The workflow:

1. re-runs all validation and produces one audited tarball;
2. creates `vX.Y.Z-rc.N` at the validated commit if the tag does not exist, or verifies that an existing tag resolves to that exact commit, without force;
3. downloads the same tarball and verification assets with their release directory structure intact, then verifies its SHA-256;
4. upgrades to npm 11.5.1 and publishes with `npm publish --tag next --provenance --ignore-scripts`;
5. verifies the package version on the registry;
6. creates a GitHub prerelease with the tarball and trust verdict attached.

A rerun is safe. An existing matching tag is verified, an already-published npm version is not republished, and an existing GitHub Release is updated to prerelease form while missing assets are uploaded and matching assets are compared byte-for-byte.

## Stable promotion

Promote an RC to a stable release through a new reviewed version branch and PR. Never move an RC or historical tag to manufacture a stable release. Stable publication remains an explicit owner decision.

Stable `X.Y.Z` publication is explicit and uses `stable-release.yml` from
`release/vX.Y.Z`. First run a dry-run dispatch, then rerun with dry-run disabled:

```bash
gh workflow run stable-release.yml --ref release/v3.0.0 -f dry_run=true
gh workflow run stable-release.yml --ref release/v3.0.0 -f dry_run=false
```

The stable workflow creates an annotated tag without force, publishes the exact
audited tarball to npm `latest` with OIDC provenance, and creates or repairs the
GitHub Release. RC and historical tags are never moved.

## Verification

Use the registry as publication evidence:

```bash
npm view mjolnir-qa@next version
npm view mjolnir-qa@2.0.3-rc.1 version
npm view mjolnir-qa dist-tags
npm audit signatures
gh release view v2.0.3-rc.1
```

A green workflow alone is not proof of publication.

## Failure and recovery

| Symptom                                                | Required response                                                                                                                                         |
| ------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Dry run rejects version, changelog, or branch          | Fix the release PR; do not bypass validation.                                                                                                             |
| Candidate scan or build is incomplete                  | Fix the repository; never package a partial result.                                                                                                       |
| Tag creation succeeds but npm publish fails            | Re-run the same dispatch. The verified tag is retained and publish retries.                                                                               |
| npm publish succeeds but GitHub Release creation fails | Re-run; the registry check skips republishing and the Release step uploads missing assets, verifies existing assets, and updates the prerelease metadata. |
| Protected-main ancestry fails                          | Rebase or recreate the release branch from current protected `main`; do not edit the protected branch directly.                                           |
| Trusted publishing returns `ENEEDAUTH`                 | Verify exact Organization/repository casing and that the npm Environment is `npm-publish`.                                                                |
| A published version is defective                       | Deprecate it and publish a new version. Do not unpublish or move the tag.                                                                                 |

```bash
npm deprecate mjolnir-qa@<version> "defective; use <fixed-version>"
```

## Local pack verification

Before dispatching, inspect the same kind of artifact the workflow publishes:

```bash
npm run build
TARBALL=$(npm pack --ignore-scripts --pack-destination "$RUNNER_TEMP" | tail -n 1)
node scripts/pack-audit.mjs "$RUNNER_TEMP/$TARBALL"
```

`npm run ci-local` already performs the build, certification, property, fuzz, coverage, ratchet, audit, brand, and site checks. Corpus audit remains a separate fail-closed network gate because authoritative upstream revisions and baseline provenance require owner review.

## Lifecycle scripts

| Hook             | Command         | Consumer behavior and justification                                                                             |
| ---------------- | --------------- | --------------------------------------------------------------------------------------------------------------- |
| `prepare`        | `husky`         | Developer checkouts only; installs local Git hooks after `npm ci`. Published consumers do not run it.           |
| `prepublishOnly` | `npm run build` | Runs only on an explicit publish attempt and ensures `dist/` cannot be stale. Consumers never receive the hook. |

No additional lifecycle hook may be added without an equivalent row explaining who executes it and why.

## Current state

- npm `latest` is **3.0.0** after this stable promotion.
- protected `main`: `3f31ac7e` after PR #538.
- historical `v2.0.3`: `460c7d71e67d54d667414ff36e6f100d604b6185`, retained unchanged; a tag alone is not an installable release.
- automatic publishing from `main`: disabled.
- stable and RC npm publication: gated by their GitHub Environments.
