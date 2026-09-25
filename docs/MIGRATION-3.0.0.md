# Mjölnir 3.0.0 Migration Guide

Mjölnir 3.0.0 is already published. Do not republish or retag it. This guide
describes behavior for consumers of the 3.0.0 line and for the next
owner-approved release.

## Requirements

- Node.js `>=22.18`.
- A pinned package for release-gated execution:
  `mjolnir-qa@3.0.0`.
- Review direct Action and generated-CI behavior separately.

## Upgrade checklist

1. Upgrade Node and verify the runtime:

   ```bash
   node --version
   npm install --global mjolnir-qa@3.0.0
   mjolnir --version
   ```

2. Replace floating release-gate references:

   ```bash
   npx --yes mjolnir-qa@3.0.0 --version
   ```

3. Save a baseline before changing CI:

   ```bash
   npx --yes mjolnir-qa@3.0.0 baseline
   ```

4. Run a changed-scope scan and review all output consumers:

   ```bash
   npx --yes mjolnir-qa@3.0.0 . --scope changed --json > mjolnir.json
   ```

5. Treat `partial`, `UNKNOWN`, `UNPROVEN`, `INCONCLUSIVE`, `BLOCKED`, and
   `UNSUPPORTED` as non-clean. Do not convert a null score into a pass.

6. Review CI policy:
   - generated `mjolnir ci install` workflows are advisory by default;
   - direct composite Actions are blocking by default;
   - set `fail-on` explicitly for direct consumers.

7. Review Action permissions:
   - `contents: read`;
   - `pull-requests: write` for PR comments;
   - `security-events: write` for SARIF upload.

8. Review plugin enablement. JavaScript/npm/local plugins execute with the
   Node process privileges only when explicitly enabled.

9. Audit suppressions. A missing `expires` field means no expiry. Only an
   explicit ISO date is bounded; `expires: false` is not supported.

10. Remove retired rule IDs from baselines, suppressions, and dashboards.

11. Run command-specific release checks:

```bash
npx --yes mjolnir-qa@3.0.0 release-report
npx --yes mjolnir-qa@3.0.0 release-trust --json
```

## Consumer acceptance

- [ ] Node meets the engine floor.
- [ ] Release gates use exact package/Action refs.
- [ ] JSON consumers understand completion and verdict fields.
- [ ] Partial or unknown results cannot be rendered as clean.
- [ ] Suppressions use the current schema.
- [ ] Plugin execution was explicitly reviewed.
- [ ] MCP/SARIF permissions were reviewed.
- [ ] `release-report` and `release-trust` were evaluated independently.

## Rollback

Pin the last known-good package and restore the last known-good workflow. Do
not move or delete an existing release tag. Follow `ROLLBACK-3.0.0.md`.
