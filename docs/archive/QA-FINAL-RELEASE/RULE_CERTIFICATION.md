# RULE_CERTIFICATION.md — Cycle 0 · RC `151186b`

Per-rule (99) certification table. Generated from the live catalog captured at
the RC (`evidence/151186b/rules-catalog.json` — command: `mjolnir rules --json`),
cross-checked against `docs/RULE-CAPABILITY-MATRIX.md` (99 rows, drift-locked)
and doctor (0/19 core unmeasured; 54 quarantine capped info/E0).

Firewall status: ALL 99 rules have must-fire AND must-not-fire fixtures
(doctor fixture-integrity: 154 rule dirs, 415 fixture files, 21 justified
allowlist entries; fixture-firewall-completeness + fixture-harness specs green
at RC). Adversarial outcome: family-representative + hostile-input probes ran
at CLI level (see DEEP_VERIFICATION.md); the full per-core-rule adversarial
matrix repeats at Cycle N on the final RC (plan §14).

Final status: MEASURED = n≥10 classified verdicts in FP-AUDIT; UNMEASURED = the
21 open §19 rows (release-scope gap F7).

| ID           | Sev     | Category | Tier       | Strategy  | FP (n)      | Rev | Final status                                               |
| ------------ | ------- | -------- | ---------- | --------- | ----------- | --- | ---------------------------------------------------------- |
| QA-CI-001    | error   | QA-CI    | quarantine | FRAMEWORK | 11% (n=19)  | —   | MEASURED (firewall VERIFIED, tier-capped where quarantine) |
| QA-CI-002    | error   | QA-CI    | extended   | LEXICAL   | 11% (n=18)  | —   | MEASURED (firewall VERIFIED, tier-capped where quarantine) |
| QA-CI-005    | error   | QA-CI    | quarantine | LEXICAL   | 8% (n=13)   | —   | MEASURED (firewall VERIFIED, tier-capped where quarantine) |
| QA-CI-007    | warning | QA-CI    | extended   | LEXICAL   | 0% (n=11)   | —   | MEASURED (firewall VERIFIED, tier-capped where quarantine) |
| QA-CI-008    | error   | QA-CI    | quarantine | LEXICAL   | 10% (n=10)  | —   | MEASURED (firewall VERIFIED, tier-capped where quarantine) |
| QA-CI-009    | error   | QA-CI    | extended   | FRAMEWORK | 0% (n=10)   | —   | MEASURED (firewall VERIFIED, tier-capped where quarantine) |
| QA-CI-010    | error   | QA-CI    | quarantine | FRAMEWORK | 10% (n=10)  | —   | MEASURED (firewall VERIFIED, tier-capped where quarantine) |
| QA-CS-101    | warning | QA-PW    | core       | LEXICAL   | 0% (n=20)   | —   | MEASURED (firewall VERIFIED, tier-capped where quarantine) |
| QA-CS-102    | warning | QA-PW    | core       | AST       | 8% (n=24)   | —   | MEASURED (firewall VERIFIED, tier-capped where quarantine) |
| QA-CS-103    | error   | QA-PW    | core       | AST       | 0% (n=11)   | —   | MEASURED (firewall VERIFIED, tier-capped where quarantine) |
| QA-CS-104    | warning | QA-PW    | extended   | LEXICAL   | —           | —   | UNMEASURED (n<10)                                          |
| QA-CS-105    | warning | QA-PW    | extended   | QA_MODEL  | 25% (n=16)  | —   | MEASURED (firewall VERIFIED, tier-capped where quarantine) |
| QA-CS-106    | warning | QA-PW    | quarantine | LEXICAL   | —           | —   | UNMEASURED (n<10)                                          |
| QA-CS-107    | warning | QA-PW    | extended   | LEXICAL   | —           | —   | UNMEASURED (n<10)                                          |
| QA-CS-108    | info    | QA-PW    | quarantine | LEXICAL   | 87% (n=23)  | —   | MEASURED (firewall VERIFIED, tier-capped where quarantine) |
| QA-CS-109    | warning | QA-PW    | extended   | LEXICAL   | —           | —   | UNMEASURED (n<10)                                          |
| QA-CS-110    | info    | QA-PW    | quarantine | LEXICAL   | 77% (n=26)  | —   | MEASURED (firewall VERIFIED, tier-capped where quarantine) |
| QA-CS-111    | info    | QA-PW    | quarantine | LEXICAL   | 100% (n=20) | —   | MEASURED (firewall VERIFIED, tier-capped where quarantine) |
| QA-CYP-001   | warning | QA-PW    | extended   | LEXICAL   | 20% (n=15)  | —   | MEASURED (firewall VERIFIED, tier-capped where quarantine) |
| QA-CYP-002   | error   | QA-PW    | quarantine | LEXICAL   | —           | —   | UNMEASURED (n<10)                                          |
| QA-CYP-003   | error   | QA-PW    | quarantine | LEXICAL   | —           | —   | UNMEASURED (n<10)                                          |
| QA-ENV-001   | warning | QA-TQUAL | quarantine | LEXICAL   | 100% (n=20) | —   | MEASURED (firewall VERIFIED, tier-capped where quarantine) |
| QA-JV-101    | warning | QA-PW    | core       | LEXICAL   | 0% (n=23)   | —   | MEASURED (firewall VERIFIED, tier-capped where quarantine) |
| QA-JV-102    | warning | QA-PW    | extended   | LEXICAL   | 26% (n=23)  | —   | MEASURED (firewall VERIFIED, tier-capped where quarantine) |
| QA-JV-103    | error   | QA-PW    | extended   | AST       | 26% (n=58)  | —   | MEASURED (firewall VERIFIED, tier-capped where quarantine) |
| QA-JV-104    | warning | QA-PW    | extended   | LEXICAL   | 20% (n=10)  | —   | MEASURED (firewall VERIFIED, tier-capped where quarantine) |
| QA-JV-105    | warning | QA-PW    | core       | QA_MODEL  | 10% (n=20)  | —   | MEASURED (firewall VERIFIED, tier-capped where quarantine) |
| QA-JV-106    | warning | QA-PW    | quarantine | LEXICAL   | —           | —   | UNMEASURED (n<10)                                          |
| QA-JV-107    | warning | QA-PW    | extended   | LEXICAL   | —           | —   | UNMEASURED (n<10)                                          |
| QA-JV-108    | info    | QA-PW    | quarantine | LEXICAL   | 87% (n=23)  | —   | MEASURED (firewall VERIFIED, tier-capped where quarantine) |
| QA-JV-109    | warning | QA-PW    | core       | LEXICAL   | 0% (n=18)   | —   | MEASURED (firewall VERIFIED, tier-capped where quarantine) |
| QA-JV-110    | info    | QA-PW    | quarantine | LEXICAL   | 83% (n=24)  | —   | MEASURED (firewall VERIFIED, tier-capped where quarantine) |
| QA-JV-111    | info    | QA-PW    | quarantine | LEXICAL   | 100% (n=20) | —   | MEASURED (firewall VERIFIED, tier-capped where quarantine) |
| QA-PW-002    | error   | QA-PW    | core       | AST       | 0% (n=20)   | —   | MEASURED (firewall VERIFIED, tier-capped where quarantine) |
| QA-PW-003    | error   | QA-PW    | core       | LEXICAL   | 10% (n=10)  | —   | MEASURED (firewall VERIFIED, tier-capped where quarantine) |
| QA-PW-004    | warning | QA-PW    | quarantine | LEXICAL   | 43% (n=14)  | —   | MEASURED (firewall VERIFIED, tier-capped where quarantine) |
| QA-PW-005    | info    | QA-PW    | quarantine | AST       | 100% (n=17) | —   | MEASURED (firewall VERIFIED, tier-capped where quarantine) |
| QA-PW-101    | error   | QA-PW    | core       | LEXICAL   | 0% (n=20)   | —   | MEASURED (firewall VERIFIED, tier-capped where quarantine) |
| QA-PW-102    | warning | QA-PW    | quarantine | LEXICAL   | —           | —   | UNMEASURED (n<10)                                          |
| QA-PW-103    | info    | QA-PW    | quarantine | LEXICAL   | 29% (n=69)  | —   | MEASURED (firewall VERIFIED, tier-capped where quarantine) |
| QA-PW-104    | warning | QA-PW    | core       | LEXICAL   | 0% (n=10)   | —   | MEASURED (firewall VERIFIED, tier-capped where quarantine) |
| QA-PW-105    | info    | QA-PW    | quarantine | LEXICAL   | 100% (n=20) | —   | MEASURED (firewall VERIFIED, tier-capped where quarantine) |
| QA-PW-107    | info    | QA-PW    | quarantine | LEXICAL   | 95% (n=21)  | —   | MEASURED (firewall VERIFIED, tier-capped where quarantine) |
| QA-PW-108    | info    | QA-PW    | quarantine | LEXICAL   | 100% (n=20) | —   | MEASURED (firewall VERIFIED, tier-capped where quarantine) |
| QA-PW-112    | info    | QA-PW    | quarantine | LEXICAL   | 100% (n=20) | —   | MEASURED (firewall VERIFIED, tier-capped where quarantine) |
| QA-PW-113    | warning | QA-PW    | core       | LEXICAL   | 0% (n=11)   | —   | MEASURED (firewall VERIFIED, tier-capped where quarantine) |
| QA-PW-114    | info    | QA-PW    | quarantine | LEXICAL   | 100% (n=20) | —   | MEASURED (firewall VERIFIED, tier-capped where quarantine) |
| QA-PW-115    | warning | QA-PW    | quarantine | LEXICAL   | 56% (n=16)  | —   | MEASURED (firewall VERIFIED, tier-capped where quarantine) |
| QA-PW-116    | warning | QA-PW    | extended   | LEXICAL   | —           | —   | UNMEASURED (n<10)                                          |
| QA-PW-117    | warning | QA-PW    | core       | LEXICAL   | 0% (n=24)   | —   | MEASURED (firewall VERIFIED, tier-capped where quarantine) |
| QA-PW-118    | info    | QA-PW    | quarantine | LEXICAL   | 100% (n=20) | —   | MEASURED (firewall VERIFIED, tier-capped where quarantine) |
| QA-PW-119    | info    | QA-PW    | quarantine | LEXICAL   | 100% (n=24) | —   | MEASURED (firewall VERIFIED, tier-capped where quarantine) |
| QA-PW-120    | info    | QA-PW    | quarantine | LEXICAL   | 100% (n=20) | —   | MEASURED (firewall VERIFIED, tier-capped where quarantine) |
| QA-PW-121    | warning | QA-PW    | core       | LEXICAL   | 0% (n=12)   | —   | MEASURED (firewall VERIFIED, tier-capped where quarantine) |
| QA-PW-122    | warning | QA-PW    | extended   | LEXICAL   | 6% (n=80)   | —   | MEASURED (firewall VERIFIED, tier-capped where quarantine) |
| QA-PW-123    | warning | QA-PW    | quarantine | LEXICAL   | 46% (n=11)  | —   | MEASURED (firewall VERIFIED, tier-capped where quarantine) |
| QA-PW-124    | info    | QA-PW    | extended   | LEXICAL   | —           | —   | UNMEASURED (n<10)                                          |
| QA-PW-125    | warning | QA-PW    | extended   | LEXICAL   | —           | —   | UNMEASURED (n<10)                                          |
| QA-PW-140    | warning | QA-PW    | core       | LEXICAL   | 0% (n=10)   | —   | MEASURED (firewall VERIFIED, tier-capped where quarantine) |
| QA-PW-141    | warning | QA-PW    | extended   | LEXICAL   | 9% (n=33)   | —   | MEASURED (firewall VERIFIED, tier-capped where quarantine) |
| QA-PW-142    | warning | QA-PW    | extended   | LEXICAL   | 18% (n=11)  | —   | MEASURED (firewall VERIFIED, tier-capped where quarantine) |
| QA-PW-143    | info    | QA-PW    | extended   | LEXICAL   | 6% (n=80)   | —   | MEASURED (firewall VERIFIED, tier-capped where quarantine) |
| QA-PW-144    | info    | QA-PW    | extended   | LEXICAL   | 14% (n=21)  | —   | MEASURED (firewall VERIFIED, tier-capped where quarantine) |
| QA-PW-145    | info    | QA-PW    | quarantine | LEXICAL   | 50% (n=40)  | —   | MEASURED (firewall VERIFIED, tier-capped where quarantine) |
| QA-PW-146    | warning | QA-PW    | quarantine | LEXICAL   | 12% (n=17)  | —   | MEASURED (firewall VERIFIED, tier-capped where quarantine) |
| QA-PW-147    | info    | QA-PW    | quarantine | LEXICAL   | 100% (n=20) | —   | MEASURED (firewall VERIFIED, tier-capped where quarantine) |
| QA-PY-001    | error   | QA-TEST  | core       | LEXICAL   | 0% (n=12)   | —   | MEASURED (firewall VERIFIED, tier-capped where quarantine) |
| QA-PY-002    | warning | QA-TEST  | core       | LEXICAL   | 4% (n=23)   | —   | MEASURED (firewall VERIFIED, tier-capped where quarantine) |
| QA-PY-003    | error   | QA-TEST  | quarantine | LEXICAL   | 47% (n=30)  | —   | MEASURED (firewall VERIFIED, tier-capped where quarantine) |
| QA-PY-004    | warning | QA-TQUAL | quarantine | LEXICAL   | 53% (n=30)  | —   | MEASURED (firewall VERIFIED, tier-capped where quarantine) |
| QA-PY-005    | warning | QA-TEST  | extended   | LEXICAL   | 13% (n=23)  | —   | MEASURED (firewall VERIFIED, tier-capped where quarantine) |
| QA-PY-006    | info    | QA-TEST  | quarantine | LEXICAL   | 100% (n=20) | —   | MEASURED (firewall VERIFIED, tier-capped where quarantine) |
| QA-PY-007    | warning | QA-TQUAL | quarantine | LEXICAL   | 79% (n=34)  | —   | MEASURED (firewall VERIFIED, tier-capped where quarantine) |
| QA-PY-008    | info    | QA-TQUAL | quarantine | LEXICAL   | 100% (n=20) | —   | MEASURED (firewall VERIFIED, tier-capped where quarantine) |
| QA-PY-009    | warning | QA-TQUAL | core       | LEXICAL   | 6% (n=18)   | —   | MEASURED (firewall VERIFIED, tier-capped where quarantine) |
| QA-PY-010    | info    | QA-TQUAL | quarantine | LEXICAL   | 100% (n=10) | —   | MEASURED (firewall VERIFIED, tier-capped where quarantine) |
| QA-PY-011    | warning | QA-TQUAL | core       | LEXICAL   | 10% (n=10)  | —   | MEASURED (firewall VERIFIED, tier-capped where quarantine) |
| QA-PY-012    | error   | QA-TQUAL | quarantine | LEXICAL   | 40% (n=30)  | —   | MEASURED (firewall VERIFIED, tier-capped where quarantine) |
| QA-PY-101    | warning | QA-PW    | extended   | LEXICAL   | —           | —   | UNMEASURED (n<10)                                          |
| QA-PY-102    | warning | QA-PW    | quarantine | LEXICAL   | —           | —   | UNMEASURED (n<10)                                          |
| QA-PY-103    | warning | QA-PW    | core       | LEXICAL   | 8% (n=25)   | —   | MEASURED (firewall VERIFIED, tier-capped where quarantine) |
| QA-PY-104    | warning | QA-PW    | quarantine | LEXICAL   | —           | —   | UNMEASURED (n<10)                                          |
| QA-PY-105    | error   | QA-PW    | quarantine | LEXICAL   | 0% (n=12)   | —   | MEASURED (firewall VERIFIED, tier-capped where quarantine) |
| QA-PY-106    | warning | QA-PW    | extended   | LEXICAL   | —           | —   | UNMEASURED (n<10)                                          |
| QA-PY-107    | warning | QA-PW    | extended   | LEXICAL   | —           | —   | UNMEASURED (n<10)                                          |
| QA-PY-108    | warning | QA-PW    | quarantine | LEXICAL   | —           | —   | UNMEASURED (n<10)                                          |
| QA-SE-001    | warning | QA-PW    | quarantine | LEXICAL   | —           | —   | UNMEASURED (n<10)                                          |
| QA-SE-002    | warning | QA-PW    | quarantine | LEXICAL   | —           | —   | UNMEASURED (n<10)                                          |
| QA-SE-003    | warning | QA-PW    | quarantine | LEXICAL   | —           | —   | UNMEASURED (n<10)                                          |
| QA-TEST-001  | error   | QA-TEST  | quarantine | LEXICAL   | 60% (n=20)  | —   | MEASURED (firewall VERIFIED, tier-capped where quarantine) |
| QA-TEST-002  | warning | QA-TEST  | quarantine | LEXICAL   | 62% (n=21)  | —   | MEASURED (firewall VERIFIED, tier-capped where quarantine) |
| QA-TEST-003  | error   | QA-TEST  | quarantine | LEXICAL   | 22% (n=78)  | —   | MEASURED (firewall VERIFIED, tier-capped where quarantine) |
| QA-TEST-004  | warning | QA-TEST  | extended   | LEXICAL   | 30% (n=20)  | —   | MEASURED (firewall VERIFIED, tier-capped where quarantine) |
| QA-TEST-006  | warning | QA-TEST  | quarantine | LEXICAL   | 36% (n=11)  | —   | MEASURED (firewall VERIFIED, tier-capped where quarantine) |
| QA-TEST-010  | error   | QA-TEST  | quarantine | LEXICAL   | 58% (n=31)  | —   | MEASURED (firewall VERIFIED, tier-capped where quarantine) |
| QA-TQUAL-001 | info    | QA-TQUAL | quarantine | LEXICAL   | 100% (n=26) | —   | MEASURED (firewall VERIFIED, tier-capped where quarantine) |
| QA-TQUAL-002 | error   | QA-TQUAL | quarantine | LEXICAL   | 53% (n=32)  | —   | MEASURED (firewall VERIFIED, tier-capped where quarantine) |
| QA-TQUAL-009 | error   | QA-TQUAL | quarantine | LEXICAL   | 79% (n=14)  | —   | MEASURED (firewall VERIFIED, tier-capped where quarantine) |
| QA-TQUAL-011 | warning | QA-TQUAL | extended   | LEXICAL   | 24% (n=25)  | —   | MEASURED (firewall VERIFIED, tier-capped where quarantine) |
