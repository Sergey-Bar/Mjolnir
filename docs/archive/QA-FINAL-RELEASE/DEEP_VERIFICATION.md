# DEEP_VERIFICATION.md — Chain Traces per Adapter · Cycle 0 · RC `151186b`

Plan §8 Phase 3: for one real finding per adapter, the full chain
`input → discovery → parsing → rule evaluation → finding → evidence → scoring →
serialization → CLI/MCP output`.

## Method

Synthetic one-finding-per-language repos scanned live at the RC; SARIF/JSON
outputs captured; contract digest recomputed independently from the canonical
formula; MCP stdio session driven frame-by-frame and compared to CLI on an
identical fixture.

## TS/JS (tree-sitter)

- Input: `login.spec.ts` with `await new Promise(r => setTimeout(r, 3000))`.
- Chain verified: discovery found 1 test file → tree-sitter parse → QA-TEST-004
  fired at line 3 with message quoting the exact source text (evidence cites
  real line) → severity warning, E2, measuredFpRate 30% (n=20), detectorRevision 1
  → score 93 → SARIF results = 2 → JSON valid on both channels.
- Evidence: `deep-path/deep-tsjs.json`, `deep-tsjs.sarif.json`.

## Python (tree-sitter)

- Input: `test_pay.py` with `time.sleep(5)` + `assert True`.
- QA-PY-005 (line 4, warning) + QA-PY-004 (line 5) + QA-PY-012 (line 5) —
  lines cite real source lines; SARIF results = 3; exit 0 (no error-severity).
- Evidence: `deep-path/deep-python.json`.

## Java (regex adapter)

- Input: JUnit `RouteTest.java` with no assertions + `page.route("**", …)`.
- QA-JV-103 (line 3, **error**) + QA-JV-111 family factory (line 5, info) —
  exit 1 (error gating). SARIF = 2.
- Evidence: `deep-path/deep-java.json`.

## C# (regex adapter)

- Input: NUnit `RouteTests.cs` no assertions + `Page.RouteAsync("**", …)`.
- QA-CS-103 (error) + QA-CS-111 (info) — exit 1. SARIF = 2.
- Evidence: `deep-path/deep-csharp.json`.

## YAML / GitHub Actions

- Input: workflow with `npm test || true`.
- QA-CI-002 fired (error, exit 1) at line 7 — the `\|\| true` swallow is caught
  by default. SARIF = 1.
- Evidence: `deep-path/deep-yaml.json`, `false-green/fg-gh-true.out`.

## Cross-cutting chain invariants

- **Digest recompute (independent parser):** sha256 recomputed from
  `docs/machine-contract.md`'s stated canonical payload (implemented from the
  doc, not from source) matches the reported `contract.summary.digest` on the
  RC self-scan — `determinism/_digest-recompute.json`.
- **MCP ≡ CLI parity:** same fixture → 1 finding via CLI `--json`, 1 finding via
  MCP `tools/call scan` — `mcp/_mcp-parity.json`.
- **`why` evidence surface:** rule, line, why, fix, evidence level E2, measured
  FP 30%/n=20, suppression governance — `probe-why` capture.
- **SARIF honesty metadata:** severity/confidence/qaImpact/evidenceLevel travel
  per result (`sarif.ts:145–178`); SRCROOT base-id absent at CLI (F5).
