# mjolnir-qa-playwright-reporter

Official Playwright reporter for [Mjölnir](https://github.com/Sergey-Bar/Mjolnir) —
emits the JSON report that `mjolnir forensics`, `triage`, and `pw-report`
ingest for flake detection, retry analysis, and runtime evidence.

## Install

> **This package is source-only.** It is _not_ published to npm —
> `npm install mjolnir-qa-playwright-reporter` and
> `npm view mjolnir-qa-playwright-reporter` both fail by design. It ships
> as a workspace member of the Mjölnir repo, and this repo is its only
> distribution channel. To use it, build from source:
>
> ```bash
> git clone https://github.com/Sergey-Bar/Mjolnir
> cd Mjolnir/packages/playwright-reporter
> npm install && npm run build
> ```
>
> Then reference it from your project via a local file path
> (`"mjolnir-qa-playwright-reporter": "file:../Mjolnir/packages/playwright-reporter"`)
> or `npm link`. The `mjolnir-qa-playwright-reporter` import in the
> snippet below resolves through that path or link, not through npm.

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
