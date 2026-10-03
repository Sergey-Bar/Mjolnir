# QA-JV-101 — Sample Findings for Classification

Total sampled: 1 (max 35 per rule)

Classify each finding as:

- **TP** (True Positive) — the finding is correct, this IS the anti-pattern
- **FP** (False Positive) — the finding is wrong, this is legitimate code
- **UNSURE** — cannot determine without more context

---

## 1. keycloak-keycloak — rest/admin-v2/tests/src/test/java/org/keycloak/tests/admin/client/v2/validation/PatchClientValidationTest.java:101

**Message:** Disabled test detected: `@Disabled`.

```
      96|         }
      97|     }
      98|
      99|     @Test
     100|     @Override
>>>  101|     @Disabled("Only for PUT/POST")
     102|     public void validSAMLClientSucceeds() {
     103|     }
     104|
     105|     @Test
     106|     @Override
```

**verdict:**

---
