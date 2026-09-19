# qa-doctor-playwright-reporter

Official Playwright reporter for [QA Doctor](https://github.com/Sergey-Bar/qa-doctor) —
emits the JSON report that `qa-doctor forensics`, `triage`, and `pw-report`
ingest for flake detection, retry analysis, and runtime evidence.

## Install

> **This package is source-only.** It is _not_ published to npm —
> `npm install qa-doctor-playwright-reporter` and
> `npm view qa-doctor-playwright-reporter` both fail by design. It ships
> as a workspace member of the QA Doctor repo, and this repo is its only
> distribution channel. To use it, build from source:
>
> ```bash
> git clone https://github.com/Sergey-Bar/qa-doctor
> cd qa-doctor/packages/playwright-reporter
> npm install && npm run build
> ```
>
> Then reference it from your project via a local file path
> (`"qa-doctor-playwright-reporter": "file:../qa-doctor/packages/playwright-reporter"`)
> or `npm link`. The `qa-doctor-playwright-reporter` import in the
> snippet below resolves through that path or link, not through npm.

## Use

```ts
// playwright.config.ts
import { defineConfig } from "@playwright/test";
import { qaDoctorReporter } from "qa-doctor-playwright-reporter";

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
qa-doctor triage .                        # TRIAGE.md + quarantine proposal
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
