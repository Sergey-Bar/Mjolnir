# archive/ — pre-cleanup safety net

Nothing in this directory is source. It exists so that a judgement call made
during the 5.0.0 deployment is **recoverable from the remote alone**.

Plan: `.kilo/plans/1790482999233-deploy-5-0-0-remote-source-of-truth.md`,
Phase 0 steps 3–5.

## Why this exists

Git stashes are reflog-only. They are not reachable from any branch or tag, so
once the local repository is discarded the content is gone. Phase 1 of the plan
drops five stashes; the patches below were exported **before** any drop, so every
one of them can be re-applied with:

```
git apply --3way archive/stash-N.patch
```

None of the five patches was restored. Each was assessed first, and the
assessment is recorded here so the decision can be re-litigated later without
re-deriving it.

## Exported stashes

All five were captured with `git stash show -p <sha>`. None had a third parent,
so no untracked-file content was omitted by that command — the patches are
complete.

| Patch           | Stash commit | Subject at stash time                        | Diff               |
| --------------- | ------------ | -------------------------------------------- | ------------------ |
| `stash-0.patch` | `ceebdbfb`   | WIP on `milestone-m10-m13`                   | 1 file, +643/−48   |
| `stash-1.patch` | `e6aa00b4`   | lint-staged automatic backup (`c7ea7234`)    | 7 files, +914      |
| `stash-2.patch` | `2c137101`   | WIP on `codex/core-211-support-bundle`       | 9 files, +387/−378 |
| `stash-3.patch` | `0d2d224e`   | lint-staged automatic backup (`1df9a237`)    | 4 files, +19/−12   |
| `stash-4.patch` | `e540a454`   | WIP on `enhancement/wave-1-product-upgrades` | 4 files, +50/−5    |

## Disposition

### `stash-0.patch` — superseded, not lost

`tests/milestone-10.spec.ts` here is the **pre-split draft** of the monorepo and
incremental gates. It was written against an older `tests/milestone-10.spec.ts`
that held a different M10 (cross-file analysis), which is why the diff looks like
691 rewritten lines. The coverage it carried now lives in four committed specs:

- `tests/engine/monorepo-analysis.spec.ts`
- `tests/engine/incremental-analysis.spec.ts`
- `tests/engine/standalone-integration.spec.ts`
- `tests/contract/incremental-equivalence.spec.ts`

All four are on `main`. Applying this patch would **overwrite** a different
milestone's tests with a stale copy. Do not apply.

### `stash-1.patch` — duplicate

`src/engine/framework-maturity.ts`, `src/engine/suppression-governance.ts` and
`src/engine/verification-intelligence.ts` all already exist in `main`. This is a
`lint-staged` backup taken mid-commit, so `git stash` captured the staged copies
as "new" files. `tests/milestone-4.spec.ts`, `-5` and `-6` are new-file
artifacts of that interrupted run and have no counterpart in `main`; they are the
only content here that was never committed. Nothing was needed from them.

### `stash-2.patch` — obsolete

Base is 35 commits behind `main`, and every file it touches has since been
rewritten. It also modifies `assets/video/script.demo.json` and
`assets/video/script.tour.json`, which `tests/contract/video-script.spec.ts`
locks byte-for-byte; `scripts/generate-video-scripts` would reject the result.
Applying it reverts newer work.

### `stash-3.patch` — obsolete

`src/reporter/terminal.ts` and `scripts/generate-readme-hero.ts` have both been
rewritten since. Same `lint-staged`-backup provenance as `stash-1`.

### `stash-4.patch` — obsolete

Base is 499 files / +68,101 lines behind `main`. The four files it touches
(`src/cli.ts`, `src/commands/help.ts`, `tests/cli/help.spec.ts`,
`docs/BLAST-RADIUS-AUDIT.md`) all changed substantially since. Its `cli.ts` edit
is the double-subcommand invocation (`npx mjolnir mjolnir`) that
`backup-before-split` also fixed and which is now gone from `main` — re-applying
this patch would reintroduce that bug.

## Also in this directory

`pre-cleanup-branches.txt` — every local branch tip, every remote head SHA and
every linked worktree, captured at Phase 0 step 4. Any branch deleted in Phase 9
can be restored from this file:

```
git branch <name> <sha-from-pre-cleanup-branches.txt>
```

## Retention

This directory is deliberately not listed in `.gitignore`. Deleting a stash is
irreversible, and this is the only copy of its content. It is excluded from the
npm tarball by the `files` allowlist in `package.json`, so it cannot reach a
consumer.
