# QA Doctor

> **The linter-grade quality scanner for QA engineers.**
> Audits your test suites and CI pipelines. Reports a health score and
> prioritized findings — in seconds, with zero configuration.

```bash
npx qa-doctor@latest
```

```text
                 QA DOCTOR

             SCORE:  72 / 100

        ███████████████░░░░░░░

   14 issues found (3 errors, 11 warnings)

   TOP ISSUES

   ✗ ERROR    Job "security-scan" has continue-on-error: true.
              .github/workflows/ci.yml:12

   ⚠ WARNING  Hard sleep: page.waitForTimeout(3000).
              e2e/checkout.spec.ts:88
```

## Why

Green checkmarks lie. Tests get skipped, focused, emptied of assertions,
and CI pipelines learn to swallow failures. QA Doctor reads your test
files and workflow definitions and tells you exactly where the trust breaks.

## Quickstart

1. **Scan:** `npx qa-doctor@latest`
2. **Fix what you broke:** `npx qa-doctor --scope changed` *(coming W6)*
3. **Add to CI:** `qa-doctor ci install` *(coming W7)*

## Rules (v0.1)

| ID | Rule | Severity |
|---|---|---|
| QA-TEST-001 | Focused test committed | error |
| QA-TEST-002 | Skipped test | warning |
| QA-TEST-004 | Hard sleep in test | warning |
| QA-TEST-010 | Empty test body | error |
| QA-CI-001 | continue-on-error masks failures | error |

More every week. Every rule ships with must-fire/must-not-fire fixtures.

## Principles

- **Local-first** — zero network calls during scanning. Ever.
- **No false proof** — we'd rather say "unknown" than "verified".
- **Transparent scoring** — public deduction constants: error −8, warning −3, info −1.
- **Honest empty states** — no tests found? Score is `null`, not fake 100.

## Development

```bash
npm install
npm test          # unit + fixture harness
npm run dev .     # scan current repo from source
npm run build     # emit dist/
```

## License

MIT
