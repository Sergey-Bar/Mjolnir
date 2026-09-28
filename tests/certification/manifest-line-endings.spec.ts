/**
 * `workingTreeSha256` must be a property of the REPOSITORY, not of the
 * checkout.
 *
 * It hashed the working-tree bytes directly, so git's `core.autocrlf` gave a
 * Windows working tree CRLF and a Linux one LF for the same commit, and a
 * manifest stamped on one platform failed `check-candidate-manifest` on the
 * other. It went unnoticed for as long as it did because the stamp and the
 * check both ran on the author's machine; CI — which runs Linux — is the
 * first place the two could ever have disagreed, and that is where it
 * surfaced.
 *
 * A "working tree hash" that changes when the file content does not is not a
 * working tree hash.
 *
 * The first version of this suite proved the property by REWRITING a tracked
 * file and re-inspecting, which is the obvious way to do it and the wrong one:
 * vitest runs specs in parallel workers, so the window where a tracked file
 * differs from HEAD is a window in which every other worker that hashes the
 * tree sees a dirty repository. It made `candidate-manifest.spec.ts` fail
 * intermittently, three suites away from the cause.
 *
 * So the property is asserted on the normaliser directly. That is the unit
 * the hash is built from, it needs no working-tree mutation, and it cannot
 * interfere with anything.
 */

import { createHash } from "node:crypto";

import { describe, expect, it } from "vitest";

import { normalizeForHash } from "../../scripts/candidate-manifest.mjs";

/** What the tree hash does with one file: path, NUL, normalised content. */
const treeDigest = (path: string, content: Buffer | string): string =>
  createHash("sha256")
    .update(
      Buffer.concat([
        Buffer.from(`${path}\0`),
        normalizeForHash(Buffer.from(content)),
      ]),
    )
    .digest("hex");

describe("the working tree hash is line-ending independent", () => {
  it("LF and CRLF versions of the same content hash identically", () => {
    const lf = "const a = 1;\nconst b = 2;\n";
    const crlf = "const a = 1;\r\nconst b = 2;\r\n";
    expect(
      treeDigest("src/a.ts", crlf),
      "a CRLF checkout hashed differently from an LF one for identical " +
        "content — the hash is a property of the checkout, not of the repository",
    ).toBe(treeDigest("src/a.ts", lf));
  });

  it("a real content edit changes the hash", () => {
    // The other half. Normalising must not cost the property the hash exists
    // for: an unstaged edit has to be visible, or the manifest cannot detect
    // a dirty tree at all.
    expect(treeDigest("src/a.ts", "const a = 99;\n")).not.toBe(
      treeDigest("src/a.ts", "const a = 1;\n"),
    );
  });

  it("a CRLF-only edit is not mistaken for a content edit", () => {
    // Which is the honest reading: switching a file's line endings changes no
    // line of code, so the manifest should not call the tree dirty for it. A
    // `.gitattributes` normalisation does exactly this, and treating it as
    // tampering would make the check fail on checkout rather than on change.
    expect(treeDigest("src/a.ts", "const a = 1;\r\n")).toBe(
      treeDigest("src/a.ts", "const a = 1;\n"),
    );
  });

  it("a lone CR is left alone — it is content, not a line ending", () => {
    // A lone `0D` is a line ending in old-Mac Python source, but it is also a
    // legitimate byte inside a string literal, and normalising it would change
    // the meaning of the file the hash claims to describe.
    //
    // Buffers, not strings: `normalizeForHash` takes and returns a Buffer, and
    // a string argument makes `buffer[i]` yield a CHARACTER and
    // `buffer.includes(0x0d)` search for the substring "13". Passing a string
    // produced a green-looking failure in a direction the function does not
    // claim to support, which is worth being explicit about rather than
    // leaving to chance.
    //
    // Hex comparison because the return is untyped `any` from a `.mjs` module,
    // and a method call on `any` is an unsafe call.
    const hex = (value: string): string =>
      Buffer.from(value, "utf8").toString("hex");
    const lone = Buffer.from("a\rb", "utf8");
    const pair = Buffer.from("a\r\nb", "utf8");
    expect(hex((normalizeForHash(lone) as Buffer).toString("utf8"))).toBe(
      hex("a\rb"),
    );
    expect(hex((normalizeForHash(pair) as Buffer).toString("utf8"))).toBe(
      hex("a\nb"),
    );
  });

  it("binary content passes through unchanged when it has no CRLF pair", () => {
    // The normaliser must not decode. The first version did
    // `buffer.toString("utf8").replaceAll(...)`, and this assertion caught it
    // immediately: decoding invalid UTF-8 replaces every bad byte with
    // U+FFFD, so every binary asset in the tree — images, the WASM grammars,
    // the packed icon — would hash differently from a byte mangling nobody
    // chose. That is a worse cross-platform defect than the one the
    // normaliser replaced.
    //
    // Hex comparison again: the return is untyped `any` coming from a `.mjs`
    // module, so a method call on it is an unsafe call.
    const binary = Buffer.from([0x00, 0x01, 0x02, 0xff, 0xfe, 0x00]);
    const normalised = normalizeForHash(binary) as Buffer;
    expect(normalised.toString("hex")).toBe(binary.toString("hex"));
  });
});
