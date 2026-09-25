# Mjölnir 3.0.0 Installation

## CLI

Requirements: Node.js `>=22.18` and npm registry access for installation.

```bash
npm install --global mjolnir-qa@3.0.0
mjolnir --version
```

For one-shot, reproducible execution:

```bash
npx --yes mjolnir-qa@3.0.0 --version
```

`@latest` is exploratory only and must not be used in a release gate.

## Generated CI

```bash
npx --yes mjolnir-qa@3.0.0 ci install
```

The generated workflow is advisory by default. Review the diff and opt into a
blocking policy explicitly with `--gate error` or `--gate warning`.

## Direct GitHub Action

```yaml
permissions:
  contents: read
  pull-requests: write
  security-events: write

jobs:
  verify:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@<PINNED_SHA>
      - uses: Sergey-Bar/Mjolnir@v3
        with:
          version: 3.0.0
          scope: changed
          fail-on: error
          format: sarif
          upload-sarif: true
          pr-comment: true
```

The moving `v3` Action tag is maintained only after an authorized stable
release. Use an immutable tag or SHA for stricter reproducibility.

## MCP

```json
{
  "mcpServers": {
    "mjolnir": {
      "command": "npx",
      "args": ["-y", "mjolnir-qa@3.0.0", "mcp"]
    }
  }
}
```

## Verification

```bash
mjolnir --version
mjolnir . --scope changed --json > mjolnir.json
mjolnir doctor
mjolnir release-report
mjolnir release-trust --json
```

The MCP/Action/registry installation paths are separate from the local scan
zero-network guarantee.
