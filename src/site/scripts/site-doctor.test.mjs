/**
 * Negative proof for the D-2 emitted-HTML link gate (master plan
 * 1789041108156, MR-6): the checker must be proven able to FIRE on a
 * broken internal link and able to STAY SILENT on legitimate ones —
 * a gate that is only ever green on the happy path is not evidence.
 *
 * Runs against the exported pure core (`linkFailures`), never the live
 * dist, so it needs no build. BASE is the GitHub Pages project path
 * ("/Mjolnir/") exactly as in site-doctor.mjs.
 */

import assert from "node:assert/strict";
import { test } from "node:test";

import { linkFailures } from "./site-doctor.mjs";

const BASE = "/Mjolnir/";
const HAVE = new Set([
  "index.html",
  "guide/ci.html",
  "guide/index.html",
  "reference/roadmap.html",
]);

test("a broken internal href FIRES", () => {
  const failures = linkFailures(
    [{ file: "index.html", html: `<a href="${BASE}no-such-page">x</a>` }],
    HAVE,
  );
  assert.equal(failures.length, 1);
  assert.match(failures[0], /no-such-page/);
});

test("a broken directory href FIRES through every clean-URL candidate", () => {
  const failures = linkFailures(
    [{ file: "index.html", html: `<a href="${BASE}gone/dir/">x</a>` }],
    HAVE,
  );
  assert.equal(failures.length, 1);
});

test("legitimate links stay SILENT", () => {
  const html =
    `<a href="${BASE}">home</a><a href="${BASE}guide/ci">ci</a>` +
    `<a href="${BASE}guide/">guide index</a>` +
    `<a href="${BASE}reference/roadmap#next">roadmap</a>` +
    '<a href="https://example.com">external</a><a href="mailto:a@b.c">mail</a>' +
    '<a href="#section">anchor</a>';
  const failures = linkFailures([{ file: "index.html", html }], HAVE);
  assert.deepEqual(failures, []);
});

test("non-site-relative hrefs are out of scope (silent)", () => {
  const failures = linkFailures(
    [{ file: "index.html", html: '<a href="/other-base/page">x</a>' }],
    HAVE,
  );
  assert.deepEqual(failures, []);
});
