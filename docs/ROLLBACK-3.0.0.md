# Rollback and Corrective Release

Use this procedure when a published version is defective or fails a consumer
smoke test.

## Non-negotiable rules

- Do not move, delete, force-update, or recreate a release tag.
- Do not unpublish an npm package.
- Do not overwrite a GitHub asset whose digest does not match.
- Publish a corrective version with a new owner-approved SemVer.

## 1. Freeze the incident

Record:

- defective version and tag;
- package integrity and tarball SHA-256;
- registry provenance URL;
- GitHub Release URL and assets;
- triggering command and evidence.

## 2. Verify the last known-good version

```bash
npm view mjolnir-qa@<PRIOR_VERSION> version
npm view mjolnir-qa@<PRIOR_VERSION> dist.integrity
npm view mjolnir-qa dist-tags
gh release view <PRIOR_TAG>
```

## 3. Roll back consumers

CLI:

```bash
npm install --global mjolnir-qa@<PRIOR_VERSION>
npx --yes mjolnir-qa@<PRIOR_VERSION> --version
```

Action:

```yaml
- uses: Sergey-Bar/Mjolnir@<PRIOR_TAG_OR_SHA>
  with:
    version: <PRIOR_VERSION>
    fail-on: <PRIOR_POLICY>
```

MCP:

```json
{
  "mcpServers": {
    "mjolnir": {
      "command": "npx",
      "args": ["-y", "mjolnir-qa@<PRIOR_VERSION>", "mcp"]
    }
  }
}
```

Restore the last known-good generated workflow from its original commit; do
not regenerate during the incident.

## 4. Deprecate and publish a corrective version

```bash
npm deprecate mjolnir-qa@<DEFECTIVE_VERSION> "defective; use <CORRECTIVE_VERSION>"
```

The corrective release must use a new version, immutable candidate SHA,
candidate readiness, SBOM/provenance, and a fresh clean-room install.

## 5. Verify the corrective release

- Compare npm integrity and provenance with the release artifact.
- Verify GitHub asset digests without clobbering.
- Install the exact registry version on every supported platform.
- Re-run CLI, Action, MCP, SARIF, and report-consumer smoke tests.
- Record the immutable candidate and final human decision.
