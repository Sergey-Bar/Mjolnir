/**
 * tests/helpers/npm-pack-json.ts — npm pack --json shape tolerance.
 *
 * npm 12 (2026-09-05) changed `npm pack --json` from an array to an
 * object keyed by package name, breaking every `[0]`-style reader. The
 * release pipeline's fresh-install gate failed exactly that way: npm 12
 * landed via `npm install -g npm@latest`, the gate's `Array[0]` parsed
 * to undefined, and v0.5.1 could not publish. These tests pin the
 * parser against both shapes plus the stdout pollution npm adds around
 * the JSON (lifecycle chatter, notices with braces/brackets inside).
 */

import { describe, expect, it } from "vitest";
import { parseNpmPackJson } from "./npm-pack-json.js";

const NPM11_ARRAY = `[
  {
    "id": "mjolnir-qa@0.5.0",
    "name": "mjolnir-qa",
    "version": "0.5.0",
    "filename": "mjolnir-qa-0.5.0.tgz"
  }
]`;

const NPM12_OBJECT = `{
  "mjolnir-qa": {
    "id": "mjolnir-qa@0.5.1",
    "name": "mjolnir-qa",
    "version": "0.5.1",
    "filename": "mjolnir-qa-0.5.1.tgz"
  }
}`;

describe("parseNpmPackJson", () => {
  it("parses the npm ≤ 11 array shape", () => {
    expect(parseNpmPackJson(NPM11_ARRAY)?.filename).toBe(
      "mjolnir-qa-0.5.0.tgz",
    );
  });

  it("parses the npm ≥ 12 object-keyed shape", () => {
    expect(parseNpmPackJson(NPM12_OBJECT)?.filename).toBe(
      "mjolnir-qa-0.5.1.tgz",
    );
  });

  it("tolerates lifecycle chatter before the JSON (prepare > husky)", () => {
    const polluted = `npm notice run mjolnir-qa@0.5.1 prepare\nnpm notice run husky\n${NPM12_OBJECT}`;
    expect(parseNpmPackJson(polluted)?.filename).toBe("mjolnir-qa-0.5.1.tgz");
  });

  it("tolerates notice lines with braces/brackets inside strings", () => {
    const polluted = `npm warn config Use --json=false {weird} [0]\n${NPM11_ARRAY}\nnpm notice integrity sha512-abc[def]{ghi}`;
    expect(parseNpmPackJson(polluted)?.filename).toBe("mjolnir-qa-0.5.0.tgz");
  });

  it("skips unparseable candidates and keeps scanning", () => {
    const polluted = `notice: {not json at all\n${NPM12_OBJECT}`;
    expect(parseNpmPackJson(polluted)?.filename).toBe("mjolnir-qa-0.5.1.tgz");
  });

  it("returns undefined when no entry has a filename", () => {
    expect(parseNpmPackJson("{}")).toBeUndefined();
    expect(parseNpmPackJson("npm notice nothing here")).toBeUndefined();
    expect(
      parseNpmPackJson('[{"name": "mjolnir-qa", "version": "0.5.0"}]'),
    ).toBeUndefined();
  });
});
