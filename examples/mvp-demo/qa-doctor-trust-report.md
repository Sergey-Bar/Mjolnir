<!-- qa-doctor-trust-report:v1 -->

# QA Doctor Trust Report — C:\Work\QA Doctor-QA\QA Doctor\examples\mvp-demo

> Tests tell you what passed. QA Doctor tells you what you can trust.

## Trust verdict

- **Level**: L5
- **Headline**: Run evidence backs these findings — trust them.

## Confidence

| Metric              | Value        |
| ------------------- | ------------ |
| Confidence          | 100%         |
| Evidence coverage   | 29%          |
| Inconclusive        | 0%           |
| Measured FP (fired) | 0%           |
| Score               | 95           |
| Tests analyzed      | 7 in 4 files |

## Top trust risks

| Rule      | Location             | Evidence         | Message                        |
| --------- | -------------------- | ---------------- | ------------------------------ |
| QA-PW-101 | e2e/login.spec.ts:12 | run corroborated | `waitForTimeout()` hard sleep. |

## Findings summary

1 error(s) · 0 warning(s) · 0 info(s) · 0 advisory (E0, never gate).

## Next action

qa-doctor explain QA-PW-101 — then fix the top risk first

---

Generated locally by QA Doctor — no cloud, no telemetry. Semantics: `qa-doctor <target> --json` (machine contract `contractVersion: 1`).
