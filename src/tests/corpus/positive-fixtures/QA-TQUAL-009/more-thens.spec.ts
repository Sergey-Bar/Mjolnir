import { it, expect } from "vitest";

it("variant A", () => {
  fetch("/api/a").then((res) => {
    expect(res.status).toBe(200);
  });
});

it("variant B", () => {
  const p = fetch("/api/b");
  p.then((res) => {
    expect(res.status).toBe(200);
  });
});

it("variant C", () => {
  fetch("/api/c")
    .then((res) => {
      expect(res.ok).toBe(true);
    });
});

it("variant D", () => {
  Promise.resolve(1).then((v) => {
    expect(v).toBe(1);
  });
});

it("variant E", async () => {
  getUser().then((u) => {
    expect(u.id).toBe(1);
  });
});

function getUser() { return Promise.resolve({id: 1}); }
