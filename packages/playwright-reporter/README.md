# mjolnir-qa-playwright-reporter

Official Playwright reporter for [Mjölnir](https://github.com/Sergey-Bar/Mjolnir) —
emits the JSON report that `mjolnir forensics`, `triage`, and `pw-report`
ingest for flake detection, retry analysis, and runtime evidence.

## Install

> **Not yet published to npm.** This package is not on the npm registry
> yet. Install from source until a release ships:
>
> ```bash
> git clone https://github.com/Sergey-Bar/Mjolnir
> cd Mjolnir/packages/playwright-reporter
> npm install && npm run build
> ```
>
> Then reference it from your project via a local path or `npm link`.

## Use

```ts
// playwright.config.ts
import { defineConfig } from "@playwright/test";
import { mjolnirReporter } from "mjolnir-qa-playwright-reporter";

export default defineConfig({
  reporter: [mjolnirReporter()],
});
```

By default the report is written to `mjolnir.report.json`. Pass a custom
path with `mjolnirReporter({ outputFile: "my-report.json" })`.

## Run forensics

```bash
npx playwright test
mjolnir forensics mjolnir.report.json   # flake verdicts + FLAKY.md
mjolnir triage .                        # TRIAGE.md + quarantine proposal
mjolnir pw-report mjolnir.report.json   # quick run summary
```

## Why not just `[['json', ...]]`?

You can — this package is a thin, documented wrapper that:

- pins the output contract Mjölnir parses (so Playwright shape changes
  are absorbed here, not in your config),
- establishes the default filename the CLI auto-discovers,
- gives the integration a versioned home.

## License

MIT
