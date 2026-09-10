import { readFileSync, writeFileSync } from "node:fs";

// Appends the 9 adjudicated rows from the 2026-09-09 harvest cycle to
// the two bindings verdict files. Adjudication basis: all 8 xpath
// samples are the SAME self-test shape already adjudicated FP in the
// rev-3 delta (the bindings testing their own xpath-locator support on
// self-owned set_content DOM); the networkidle sample is the binding
// testing the networkidle API itself (same class as the PageClock
// wait-is-the-test FPs).
const rows: Record<string, string[]> = {
  "tests/corpus/verdicts/microsoft-playwright-java.jsonl": [
    '{"ruleId":"QA-JV-106","file":"playwright/src/test/java/com/microsoft/playwright/TestLocatorElementHandle.java","line":74,"verdict":"FP","note":"xpath-support self-test on set_content self-owned DOM (asserts empty result for a non-existing element) — same shape as the rev-3 delta adjudications","classifiedBy":"ai-assisted (owner-authorized, subject to human review)","classifiedAt":"2026-09-09"}',
    '{"ruleId":"QA-JV-106","file":"playwright/src/test/java/com/microsoft/playwright/TestPageLocatorQuery.java","line":187,"verdict":"FP","note":"xpath-support self-test: has() filter on self-owned DOM comparing xpath and css locator counts — the binding testing its own locator support","classifiedBy":"ai-assisted (owner-authorized, subject to human review)","classifiedAt":"2026-09-09"}',
  ],
  "tests/corpus/verdicts/microsoft-playwright-dotnet.jsonl": [
    '{"ruleId":"QA-CS-106","file":"src/Playwright.Tests/Locator/LocatorElementHandleTests.cs","line":66,"verdict":"FP","note":"xpath-support self-test on set_content self-owned DOM — same shape as the Java rev-3 adjudications","classifiedBy":"ai-assisted (owner-authorized, subject to human review)","classifiedAt":"2026-09-09"}',
    '{"ruleId":"QA-CS-106","file":"src/Playwright.Tests/Locator/LocatorElementHandleTests.cs","line":77,"verdict":"FP","note":"xpath-support self-test: locator chaining on self-owned DOM comparing element handles","classifiedBy":"ai-assisted (owner-authorized, subject to human review)","classifiedAt":"2026-09-09"}',
    '{"ruleId":"QA-CS-107","file":"src/Playwright.Tests/PageNetworkIdleTests.cs","line":133,"verdict":"FP","note":"the suite tests the networkidle API itself (PageNetworkIdleTests) — the load-state call inside WaitForPopupAsync is the subject, same class as the PageClock wait-is-the-test FPs","classifiedBy":"ai-assisted (owner-authorized, subject to human review)","classifiedAt":"2026-09-09"}',
  ],
};

for (const [path, newRows] of Object.entries(rows)) {
  const existing = readFileSync(path, "utf8");
  const existingKeys = new Set(
    existing
      .split("\n")
      .filter((l) => l.trim())
      .map((l) => {
        const j = JSON.parse(l);
        return `${j.ruleId}:${j.file}:${j.line}`;
      }),
  );
  const toAdd = newRows.filter((row) => {
    const j = JSON.parse(row);
    return !existingKeys.has(`${j.ruleId}:${j.file}:${j.line}`);
  });
  if (toAdd.length === 0) {
    console.log(`${path}: no new rows`);
    continue;
  }
  const sep = existing.endsWith("\n") ? "" : "\n";
  writeFileSync(path, existing + sep + toAdd.join("\n") + "\n");
  console.log(`${path}: +${toAdd.length} rows`);
}
