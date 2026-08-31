# QA-PY-103 — Sample Findings for Classification

Total sampled: 2 (max 20 per rule)

Classify each finding as:

- **TP** (True Positive) — the finding is correct, this IS the anti-pattern
- **FP** (False Positive) — the finding is wrong, this is legitimate code
- **UNSURE** — cannot determine without more context

---

## 1. reflex-dev-reflex — tests/integration/tests_playwright/test_client_error.py:162

**Message:** `wait_for_timeout()` used for synchronization.

```
     157|     )
     158|
     159|     # The mismatch is fatal: further clicks send no events and add no reports.
     160|     page.click("#break-btn")
     161|     page.click("#bump-btn")
>>>  162|     page.wait_for_timeout(500)
     163|     expect(page.locator("#counter")).to_have_text("0")
     164|     assert len(reports) == 1
     165|
```

**verdict:**

---

## 2. reflex-dev-reflex — tests/integration/tests_playwright/test_hmr.py:91

**Message:** `wait_for_timeout()` used for synchronization.

```
      86|         AssertionError: If the expected update is not received.
      87|     """
      88|     deadline = time.monotonic() + 10
      89|     scan_pos = start_index
      90|     while time.monotonic() < deadline:
>>>   91|         page.wait_for_timeout(100)
      92|         while scan_pos < len(frames):
      93|             frame = frames[scan_pos]
      94|             scan_pos += 1
      95|             if "react-router:hmr" not in frame:
      96|                 continue
```

**verdict:**

---
