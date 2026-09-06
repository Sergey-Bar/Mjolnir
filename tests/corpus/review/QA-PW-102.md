# QA-PW-102 — Sample Findings for Classification

Total sampled: 1 (max 20 per rule)

Classify each finding as:

- **TP** (True Positive) — the finding is correct, this IS the anti-pattern
- **FP** (False Positive) — the finding is wrong, this is legitimate code
- **UNSURE** — cannot determine without more context

---

## 1. playwright-community-eslint-plugin-playwright — src/rules/no-wait-for-navigation.test.ts:285

**Message:** `waitForLoadState("load"` instead of a web-first assertion.

```
     280|     'page.waitForTimeout(2000);',
     281|     'page["waitForTimeout"](2000);',
     282|     'rampage.waitForNavigation();',
     283|     'myPage2.waitForNavigation();',
     284|     'table.nextPage.waitForNavigation();',
>>>  285|     'page.waitForLoadState("load");',
     286|     'page.waitForLoadState("domcontentloaded");',
     287|     'page.waitForLoadState("networkidle");',
     288|   ],
     289| })
     290|
```

**verdict:**

---
