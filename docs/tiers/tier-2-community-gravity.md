# LEGENDARY ROADMAP — TIER 2 COMMUNITY GRAVITY

> Extracted from Legendary-Roadmap.txt (source of truth). See docs/plans/ for full context.

# TIER 2 — COMMUNITY GRAVITY (how open-source legends are made)

## 6. Plugin API from Day One of v2 🔥🔥 ⬜ NOT BUILT — no plugin-loading mechanism in `src/`

knip's ecosystem (182 plugins) is why it wins. Design now:

```ts
// mjolnir.plugin.ts — userland rules in 20 lines
export default defineRule({
  id: "ACME-001",
  appliesTo: ["typescript"],
  run(ctx) {
    /* ... */
  },
});
```

- Rules loadable from local file, npm package, or org monorepo
- Namespaced: community rules get `QA-COMM-*`, orgs get their prefix
- **Rule marketplace page** in docs (even a static list drives contributions)

## 7. Radical Transparency Repo Setup 🔥 ⬜ NOT BUILT — no FP-bounty/telemetry-dashboard code found

- Public roadmap (GitHub Projects) with voting
- Every rule has an RFC issue before implementation
- "False positive bounty": credited contributors for reproducible FP reports
- Public FP-rate dashboard (from opt-in telemetry) — _we publish our own
  accuracy metrics_. Nobody does this. It's the ultimate trust move for a
  tool whose brand is honesty.

## 8. The Mjölnir Challenge 🎯 ⬜ NOT BUILT — marketing stunt, no code involved, not launched

Launch stunt: "Run it on your repo. If it finds nothing real, we donate
$50 to OSS in your name." Screenshot culture does the marketing.
Cheaper than ads, generates proof-of-value artifacts publicly.

## 9. Integrations Where QAs Already Live ⬜ NOT BUILT — `src/integrations/` has only `ci-install.ts`; no VS Code/JetBrains/PW-reporter/Allure/Slack integration

| Integration                                               | Effort | Impact                                |
| --------------------------------------------------------- | ------ | ------------------------------------- |
| **VS Code extension** (inline findings via JSON contract) | 2 wk   | Massive                               |
| **JetBrains plugin**                                      | 3 wk   | Enterprise QA                         |
| **Playwright test reporter** (`reporter: [['mjolnir']]`)  | 1 wk   | Genius wedge — rides inside PW itself |
| Allure/ReportPortal export                                | 1 wk   | Test-management shops                 |
| Slack/Teams PR digest bot                                 | 1 wk   | Lead visibility                       |

The Playwright reporter integration deserves emphasis: it puts Mjölnir
INSIDE every Playwright run without changing any workflow.

## 10. `mjolnir init --interactive` Onboarding Wizard ✅ DONE — `src/commands/init.ts`

Walks through: framework detection results → confirm critical paths →
choose gate levels → generates config + CI + agent instructions + badge.
First-run experience decides word-of-mouth; make it delightful.

---
