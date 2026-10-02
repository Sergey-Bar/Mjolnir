# External configuration — who reads it

**P0-13.** Two files at the repository root had no consumer in this tree and
no note saying who did: `sonar-project.properties` and `.coderabbit.yaml`.
A reader could reasonably have concluded either that SonarQube and CodeRabbit
analyse this repository in CI — they do not; neither appears in any workflow
under `.github/workflows/` — or that both were dead weight, which is what
invites deleting a curated file.

Both are real. Both are read by the hosted service the moment this repository
is imported into it, which is a consumer this repository cannot run and
therefore cannot prove by running it. That is the whole reason this file
exists: the fact is recorded here rather than left to be guessed at, and
`npm run config:consumers` fails if a new root-level configuration file
arrives without an entry.

## Declared — consumed outside this repository

| File                       | Consumer                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| -------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `sonar-project.properties` | SonarQube / SonarCloud — read by the Sonar scanner when the project is imported; there is no scanner step in `.github/workflows/`, and this file exists to tell it which trees are DATA (the fixture corpora) and which thresholds `certify` already enforces                                                                                                                                                                                                                                                                    |
| `.coderabbit.yaml`         | CodeRabbit — read by the CodeRabbit review app for this repository; the `path_instructions` state the three conventions (fixture corpora are exhibits, detector rules are unreachable until a re-sample, a detector header is the evidence for its own revision)                                                                                                                                                                                                                                                                 |
| `codecov.yml`              | Codecov — read server-side by the coverage upload in `.github/workflows/ci.yml`; no step in this repository parses it, and its `target: 98%` / `threshold: 0.5%` are the values the server compares each upload against                                                                                                                                                                                                                                                                                                          |
| `action.yml`               | GitHub Actions — the manifest for this repository AS an action. Read by GitHub when a workflow says `uses: Sergey-Bar/Mjolnir@<ref>`; nothing here parses it, and `claims:check` reads it to confirm the default pins the published stable version                                                                                                                                                                                                                                                                               |
| `action-pr.yml`            | GitHub Actions — the PR-check variant of the same manifest, installed the same way when a repository pins the PR variant. It carries the same marker and version assertions and is checked by the same gate                                                                                                                                                                                                                                                                                                                      |
| `kilo.json`                | Kilo — read by the Kilo VS Code extension when it opens this repository; it declares the `sentry` MCP server the agent connects to, and a `skills.paths` entry so the agent skills under `.claude/skills/` load. Kilo reads that directory on its own only when the user-level Claude Code Compatibility setting is on, so this entry is what makes the wiring tracked and shared rather than per-machine. The other machine-local agent configs beside it (`.mcp.json`, `opencode.json`) are gitignored for the opposite reason |

None of these is a gate. None claims to be. The claim each one _does_ make
is about how an external tool should read this repository, and that claim is
only checkable by the tool that reads it.

## Not in this table, and why

- **Tool-owned files** — `package.json`, `tsconfig*.json`, `vitest*.config.ts`,
  `eslint.config.js` and `mjolnir.config.json` are each read by a named tool
  from a conventional name. They are not in the table because nothing in this
  repository names them — they resolve through the gate's MENTION search, which
  finds the reference in whatever tool configures them (`tsconfig.fixtures.json`
  is named by `scripts/typecheck-fixtures.ts`; `package-lock.json` by `npm ci`).
  The gate reports them under `readInRepo` rather than skipping them, so a
  file that genuinely loses its reader shows up in the diff of that report.
- **Externally-read files** are read by a service that is not this repository,
  so they cannot be proved by running anything here. They are DECLARED above,
  and the gate holds the declaration to the tree.
- **Dotfiles** — `.gitignore`, `.prettierignore`, `.mjolnirignore`,
  `.gitattributes` and `.mcp.json` are ignore lists, attributes, and a
  gitignored machine-local MCP wiring, not configuration with a consumer to
  name. The set is `DOTFILES_NOT_CONFIG` in the checker: a dotfile with a
  config extension that is NOT in it is treated as configuration, which is
  why `.coderabbit.yaml` is gated.
- **Markdown and licence files** — not configuration.

## The shape of the gate

`scripts/check-config-consumers.mjs` enumerates TRACKED root-level files
with a configuration extension, drops the tool-owned name list, and fails on
anything left that this table does not declare. Tracked only, because several
machine-local agent configs are gitignored by design and gating on them would
fail on any checkout where a developer has an editor configured. It fails in one other direction too: a
row here for a file that is no longer in the tree is itself a failure, because
an exemption for a deleted file is a hole with a comment on it.

What it deliberately does not do is work out who reads what. Detecting "is
this file read by a tool" would mean reimplementing prettier's, git's,
Codecov's and the CLI's own config resolution, and a checker that guesses
wrong is worse than no checker — it would report a live file as orphaned. The
table is hand-maintained and reviewable, which is the same trade the rest of
this repository makes.
