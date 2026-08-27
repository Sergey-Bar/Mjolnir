# QA-PW-003 — Sample Findings for Classification

Total sampled: 2 (max 20 per rule)

Classify each finding as:

- **TP** (True Positive) — the finding is correct, this IS the anti-pattern
- **FP** (False Positive) — the finding is wrong, this is legitimate code
- **UNSURE** — cannot determine without more context

---

## 1. microsoft-playwright-java — playwright/src/test/java/com/microsoft/playwright/TestDebugger.java:98

**Message:** `page.pause()` committed in an e2e spec.

```
      93|         assertTrue(details.title.contains("Pause"), "title: " + details.title);
      94|         dbg.resume();
      95|       }
      96|     });
      97|
>>>   98|     page.pause(); // blocks until dbg.resume() is called from event handler
      99|     assertNull(dbg.pausedDetails());
     100|   }
     101| }
     102|
```

**verdict:**

---

## 2. microsoft-playwright-java — playwright/src/test/java/com/microsoft/playwright/TestPageBasic.java:364

**Message:** `page.pause()` committed in an e2e spec.

```
     359|     assertTrue(e.getMessage().contains("Can't add a null listener"));
     360|   }
     361|
     362|   @Test
     363|   void pagePauseShouldNotThrow() {
>>>  364|     page.pause();
     365|   }
     366|
     367| }
     368|
```

**verdict:**

---
