import { test, expect } from "vitest";

// Phase 2 retune (revision 2): loopback endpoints are the suite's OWN
// fixture containers (Azurite / DynamoDB Local / Mongo-on-localhost) —
// the entire measured FP cohort (docs/FP-AUDIT.md n=20). Must NOT fire.
test("uploads to the local Azurite fixture", async () => {
  const res = await fetch("http://localhost:10000/devstoreaccount1/cont");
  expect(res.status).toBeLessThan(500);
});

test("reads the local DynamoDB fixture", async () => {
  const res = await fetch("http://127.0.0.1:8000/");
  expect(res.ok).toBe(true);
});

// Docker-style single-label image refs are not host:port. Must NOT fire.
test("uses the postgres fixture image", () => {
  const image = "postgres:15";
  expect(image).toContain("postgres");
});
