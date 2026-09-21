<!--
The repo's one law: never claim more than you verified. This template
exists so the reviewer (and future you) can see the evidence, not the
intent. Delete nothing — mark honestly.
-->

## What & why

<!-- One paragraph: the problem, and the smallest honest fix. Link the
issue/plan item if one exists. -->

## Gates

Every PR runs CI; these are what it gates on. Tick after running locally:

- [ ] `npm run typecheck`
- [ ] `npm run lint`
- [ ] `npm test`
- [ ] `npm run test:coverage` (floors enforced)
- [ ] `npm run self-scan` (zero NEW error-severity findings)

## Attestations — only for the surfaces this PR touches

- [ ] **Rules / fixtures / corpus / detector data**: `npm run docs:regen` runs
      clean (byte-identical); no generated file is hand-edited.
- [ ] **Docs / site**: `npm run docs:regen` and `npm --prefix site run doctor`
      green (includes emitted-HTML link integrity).
- [ ] **Brand-renderable surfaces**: `npm run brand:doctor` green.

## Trust relevance

<!-- Does this change touch scan semantics, exit codes, machine contracts,
SARIF structure, the evidence vocabulary, or a material public claim?
If yes: name the frozen contract and why the change is additive-safe.
If no: write "none". -->

## Release label

<!-- `release:major` / `release:minor` / `release:skip` — no label means
patch. The release-trust verdict, not a date, decides when it publishes. -->
