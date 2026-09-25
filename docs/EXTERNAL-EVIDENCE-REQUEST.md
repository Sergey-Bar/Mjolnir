# External Evidence Request — Release Candidate

This document is the operational request used to close the external gates in
`docs/M26-EXTERNAL-VALIDATION.json`. It is a request, not evidence. No item may
be marked complete until a named observer records the result and artifacts.

## Candidate binding

- Repository: `Sergey-Bar/Mjolnir`
- Candidate SHA: `PENDING`
- Release authority: `Sergey-Bar`
- Evidence owner: `PENDING`
- Requested observation window: `PENDING`
- Support/retention contact: `PENDING`

## 1. Consented design-partner study

- [ ] Partner and repository owner identified
- [ ] Written task instructions and consent recorded
- [ ] Data classification and prohibited-data review completed
- [ ] Retention period and deletion date agreed
- [ ] At least three practitioner tasks completed on a clean checkout
- [ ] Time-to-first-value, false-positive feedback, and recovery time recorded
- [ ] Partner may withdraw and request deletion
- [ ] Evidence bundle is privacy-safe and content-addressed

Artifacts: consent record, task instructions, anonymized outputs, deletion
receipt. No source code or secrets may be copied into this repository.

## 2. Protected holdout

- [ ] Holdout corpus is sealed before detector promotion
- [ ] Detector code cannot read holdout paths
- [ ] Ten pinned projects or approved clean rooms are available
- [ ] Verdicts are independently adjudicated
- [ ] TP, FP, sensitivity, and uncertainty are reported
- [ ] Holdout access and release decision are logged

Artifacts: sealed manifest, adjudicated verdict set, aggregate metrics,
access log, deletion/tombstone record.

## 3. Supported platform matrix

Run the clean candidate on every supported cell:

- [ ] Node.js 22 LTS on Linux
- [ ] Node.js 24 LTS on Linux
- [ ] Node.js 22 LTS on macOS
- [ ] Node.js 24 LTS on macOS
- [ ] Node.js 22 LTS on Windows
- [ ] Node.js 24 LTS on Windows
- [ ] Supported Python 3.10–3.14 discovery/runtime cells
- [ ] GitHub Actions hosted runner
- [ ] Self-hosted/sovereign runner if claimed

Record OS, runtime, architecture, package digest, command, exit code, scan
digest, elapsed time, peak RSS, and recovery result.

## 4. Consumer install matrix

- [ ] Clean machine installs the exact tarball without repository access
- [ ] Global CLI invocation works
- [ ] `npx` invocation works
- [ ] Composite Action input defaults and explicit version work
- [ ] MCP tool discovery and read-only behavior work
- [ ] Smithery/MCP registry install uses the exact candidate
- [ ] Offline/air-gapped documentation bundle opens and restores
- [ ] Rollback installs the prior published version without moving tags

Artifacts: commands, stdout/stderr, exit codes, package checksums, screenshots
only when they contain no sensitive data.

## 5. Remote workflow and supply chain

- [ ] Protected-branch required checks match repository documentation
- [ ] Release environments require the named authority
- [ ] npm provenance and SBOM are generated for the candidate
- [ ] Action SHA pins match the release commit
- [ ] The Action moving tag moves only the current major
- [ ] RC publish uses `next` and never moves `latest`
- [ ] Stable publish uses `latest` only after every external gate passes
- [ ] Failed dry-runs leave no package, release, or dist-tag mutation

## 6. Final independent decision

The release authority must record:

```json
{
  "candidateSha": "PENDING",
  "decision": "NO_GO",
  "checkedAt": "PENDING",
  "authority": "PENDING",
  "blockingFindings": [],
  "evidenceBundle": [],
  "rollbackTarget": "PENDING"
}
```

`decision` may become `GO` only when every checklist item has evidence and the
candidate SHA matches `candidate-trust-manifest.json`.
