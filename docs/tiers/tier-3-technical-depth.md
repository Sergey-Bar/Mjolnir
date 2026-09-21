# LEGENDARY ROADMAP — TIER 3 TECHNICAL DEPTH

> Extracted from Legendary-Roadmap.txt (source of truth). See docs/plans/ for full context.

# TIER 3 — TECHNICAL DEPTH (moats that compound)

## 11. Cross-File & Cross-Language Analysis ⬜ NOT BUILT — rules remain single-file

Current rules are single-file. Add:

- **Test↔source coupling graph**: which source modules have zero importing
  tests (Behavior Coverage from Upgrade-Plan — promote)
- **Duplicate test detection across files** (AST similarity, not text)
- **Orphan fixtures/utilities**: helpers no test imports (knip-style)
- **Coverage gap correlation**: combine Istanbul/V8 output with test graph
  → "these 12 exported functions have zero behavioral assertions anywhere"

## 12. Performance as a Feature ⬜ NOT BUILT — no `--cache` flag or benchmark suite found

Biome won on speed. Targets:

- Native-speed parsing via tree-sitter (already planned)
- `--cache`: incremental scans keyed by file hash (target: <1s warm scan)
- Benchmark suite published per release — speed regressions block merges
- "Scans 100k files in under 30s" as a headline claim

## 13. SARIF + Code Scanning Integration ✅ DONE — `src/reporter/sarif.ts`, `--format sarif`

Promote from deferred ledger NOW. One transform over existing JSON:

- Findings appear natively in GitHub's Security tab
- Free distribution inside every org's existing workflow
- Enterprise buyers see findings where their governance already lives

## 14. Deterministic Replay & Attestations (from Product.txt vision) ⬜ NOT BUILT — no `attest` command

Lightweight version now, full Evidence Graph later:

```text
mjolnir attest   # signed, commit-bound report artifact
```

Commit-bound, tool-version-bound, timestamped. Foundation for the
future "release confidence" story — and enterprises LOVE audit trails.

## 15. AI Copilot Layer — With the Brand's Honesty Rules ⬜ NOT BUILT — no `suggest`/`explain`/`generate` commands

The tool whose identity is "no false claims" can win AI-assisted QA:

```text
mjolnir suggest tests        # P0 test plan from evidence gaps (planned)
mjolnir explain              # natural-language finding explanations
mjolnir generate --spec x    # draft tests marked GENERATED-NOT-EVIDENCE
```

Iron rule from Product.txt §49 stays: AI output is never evidence until
executed. This positioning is unique — every other AI-QA tool oversells.

---
