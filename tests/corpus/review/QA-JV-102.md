# QA-JV-102 — Sample Findings for Classification

Total sampled: 1 (max 20 per rule)

Classify each finding as:

- **TP** (True Positive) — the finding is correct, this IS the anti-pattern
- **FP** (False Positive) — the finding is wrong, this is legitimate code
- **UNSURE** — cannot determine without more context

---

## 1. microsoft-playwright-java — playwright/src/test/java/com/microsoft/playwright/TestBrowserContextFetch.java:465

**Message:** `Thread.sleep()` used to wait for state.

```
     460|   void shouldSupportATimeoutOf0() {
     461|     server.setRoute("/slow", exchange -> {
     462|       exchange.getResponseHeaders().add("content-type", "text/html");
     463|       exchange.sendResponseHeaders(200, 4);
     464|       try {
>>>  465|         Thread.sleep(100);
     466|       } catch (InterruptedException e) {
     467|         e.printStackTrace();
     468|       }
     469|       try (OutputStreamWriter writer = new OutputStreamWriter(exchange.getResponseBody())) {
     470|         writer.write("done");
```

**verdict:**

---
