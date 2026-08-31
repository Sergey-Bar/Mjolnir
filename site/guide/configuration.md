# Configuration

Mjölnir is zero-config. An optional `mjolnir.config.json` (or
`.mjolnir.json`) at the repo root tunes severity, gating and scope — it
never changes detection semantics.

| Key | Type | Effect |
| --- | --- | --- |
| `exclude` | `string[]` | Extra ignore globs (gitignore subset), on top of the built-in defaults |
| `gate` | `"advisory" \| "error" \| "warning"` | Which severities exit non-zero (default `error`; `advisory` never blocks) |
| `severityOverrides` | `{ "<RULE-ID>": severity }` | Re-rank a rule's findings for your repo |
| `ignore` | `IgnoreEntry[]` | Suppress findings — `reason` is required; entries expire after 90 days |
| `plugins` | `string[]` | Third-party rule packages |

```json
{
  "gate": "error",
  "exclude": ["legacy/**"],
  "severityOverrides": { "QA-PW-118": "warning" },
  "ignore": [
    {
      "ruleId": "QA-TEST-004",
      "files": ["e2e/legacy-login.spec.ts"],
      "reason": "Third-party widget needs a settle delay; tracked in JIRA-4821",
      "expires": "2026-12-31"
    }
  ]
}
```

- **`.mjolnirignore`** — a plain gitignore-style file for path exclusions,
  same dialect as `exclude`.
- **CLI overrides** — `--strict` (include quarantine rules), `--width <cols>`
  and `--ascii` / `--no-ascii` (terminal rendering), `--tone blunt`
  (blunter messages), `--max-duration <sec>` (bounded partial scan).
- Rule suppression and deprecation lifecycle: [Rule lifecycle](/reference/rule-lifecycle).

`ignore` entries also power the standalone `mjolnir suppressions` command,
which lists what's currently suppressed and when each entry expires.
