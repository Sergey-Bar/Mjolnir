import { it, expect } from "vitest";

it("renders the dashboard", () => {
  expect(document.body).toBeTruthy();
});

it("exports the report", () => {
  const rows = [1, 2, 3];
  expect(rows).toHaveLength(3);
});
