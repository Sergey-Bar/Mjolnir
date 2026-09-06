# Security Policy

## Supported Versions

| Version | Supported |
| ------- | --------- |
| latest  | ✅        |

## Reporting a Vulnerability

**Do NOT open a public issue for security vulnerabilities.**

Use GitHub's private vulnerability reporting:
https://github.com/Sergey-Bar/Mjolnir/security/advisories/new

We commit to:

- Acknowledgment within 48 hours
- Fix or mitigation within 14 days for critical issues
- Public disclosure coordinated with the reporter

## Scope

Mjölnir parses untrusted repository content. Areas of special interest:

- Path traversal via crafted filenames or symlinks
- YAML bombs / alias expansion in workflow parsing
- Prototype pollution through parsed JSON/YAML objects
- Injection via user-controlled content into generated CI workflows

## Trust model (audit-remediation close-out)

**Everything a scan reads is untrusted.** The scanned tree is DATA: it
must never execute, and it must never influence which code Mjölnir
itself runs. Concrete guarantees:

- **No code execution from scanned content.** Workflow YAML, test
  sources, config-looking files, and JSON rule manifests inside the scan
  target are parsed and pattern-matched only.
- **Plugin gate.** npm plugins and JS-module external rules execute only
  behind the explicit trust gate: `--enable-plugins` or
  `MJOLNIR_ENABLE_PLUGINS=1` (default OFF). Declared-but-gated sources
  are listed on stderr; they are never imported.
- **Git resolved from PATH only.** Mjölnir's git invocations use an
  absolute binary path resolved from PATH (never the scanned CWD), so a
  planted `git.exe`/`git.bat` cannot hijack the tool.
- **Bounded regex.** Ignore patterns and external JSON-rule regexes are
  length/wildcard-capped at compile time; the sync matchers stay
  interruptible-safe by construction.
- **Config anchored at the scan target.** `mjolnir.config.json`,
  `.mjolnirignore`, and `mjolnir-rules/` are read from the explicit scan
  target's project — never from an unrelated ancestor of the CWD.
