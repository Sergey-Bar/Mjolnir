# Security Policy

## Supported Versions

| Version | Supported |
| ------- | --------- |
| latest  | ✅        |

## Reporting a Vulnerability

**Do NOT open a public issue for security vulnerabilities.**

Use GitHub's private vulnerability reporting:
https://github.com/qa-doctor/qa-doctor/security/advisories/new

We commit to:

- Acknowledgment within 48 hours
- Fix or mitigation within 14 days for critical issues
- Public disclosure coordinated with the reporter

## Scope

QA Doctor parses untrusted repository content. Areas of special interest:

- Path traversal via crafted filenames or symlinks
- YAML bombs / alias expansion in workflow parsing
- Prototype pollution through parsed JSON/YAML objects
- Injection via user-controlled content into generated CI workflows
