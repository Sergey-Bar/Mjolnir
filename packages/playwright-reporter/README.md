# @sergey-bar/qa-doctor-playwright-reporter

Official Playwright reporter for [QA Doctor](https://github.com/Sergey-Bar/QA-Doctor) —
emits the JSON report that `qa-doctor forensics`, `triage`, and `pw-report`
ingest for flake detection, retry analysis, and runtime evidence.

## Install

> **Not yet published to npm.** This package is not on the npm registry
> yet (see the root project's parked npm-name decision). Install from
> source until a release ships:
>
> ```bash
> git clone https://github.com/Sergey-Bar/QA-Doctor
> cd QA-Doctor/qa-doctor/packages/playwright-reporter
> npm install && npm run build
> ```
>
> Then reference it from your project via a local path or `npm link`.

## Use

```ts
// playwright.config.ts
import { defineConfig } from "@playwright/test";
import { qaDoctorReporter } from "@sergey-bar/qa-doctor-playwright-reporter";

export default defineConfig({
  reporter: [qaDoctorReporter()],
});
```

By default the report is written to `qa-doctor.report.json`. Pass a custom
path with `qaDoctorReporter({ outputFile: "my-report.json" })`.

## Run forensics

```bash
npx playwright test
qa-doctor forensics qa-doctor.report.json   # flake verdicts + FLAKY.md
qa-doctor triage .                          # TRIAGE.md + quarantine proposal
qa-doctor pw-report qa-doctor.report.json   # quick run summary
```

## Why not just `[['json', ...]]`?

You can — this package is a thin, documented wrapper that:

- pins the output contract QA Doctor parses (so Playwright shape changes
  are absorbed here, not in your config),
- establishes the default filename the CLI auto-discovers,
- gives the integration a versioned home.

## License

MIT
