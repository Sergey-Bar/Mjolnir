/**
 * `scripts/complete-lockfile.mjs` restores platform entries, and nothing else.
 *
 * It is the documented recovery for a lockfile regenerated on one platform
 * (Windows drops the linux and darwin variants of optional native packages).
 * The first version restored EVERY key the known-good lockfile had and the
 * current one lacked. A key a dependency change removed on purpose is such a
 * key too, so the tool brought it back: `siginfo` and `stackback`, dependencies
 * of a `why-is-node-running` vitest no longer installs, sat in the committed
 * lockfile with nothing depending on them.
 */

import { describe, expect, it } from "vitest";

import { completeLockfile } from "../../scripts/complete-lockfile.mjs";

type Entry = Record<string, unknown>;

function lock(packages: Record<string, Entry>): {
  packages: Record<string, Entry>;
} {
  return { packages: { "": { name: "root" }, ...packages } };
}

const PARENT = {
  version: "1.0.0",
  optionalDependencies: { "native-linux-x64": "1.0.0", fsevents: "~2.3.3" },
};
const LINUX = { version: "1.0.0", os: ["linux"], cpu: ["x64"], optional: true };

const noRegistry = (): never => {
  throw new Error("no registry in this test");
};

describe("completeLockfile", () => {
  it("restores a platform entry the tree still wants at that version", () => {
    const { lock: out, restored } = completeLockfile(
      lock({ "node_modules/native": PARENT }),
      lock({
        "node_modules/native": PARENT,
        "node_modules/native-linux-x64": LINUX,
      }),
      noRegistry,
    );
    expect(restored).toEqual(["node_modules/native-linux-x64"]);
    expect(out.packages["node_modules/native-linux-x64"]).toEqual(LINUX);
  });

  it("does not resurrect a non-platform entry the dependency change removed", () => {
    const { lock: out, restored } = completeLockfile(
      lock({ "node_modules/native": PARENT }),
      lock({
        "node_modules/native": PARENT,
        "node_modules/siginfo": { version: "2.0.0", dev: true },
      }),
      noRegistry,
    );
    expect(restored).toEqual([]);
    expect(out.packages["node_modules/siginfo"]).toBeUndefined();
  });

  it("does not restore a platform entry at a version the tree no longer wants", () => {
    const bumped = {
      ...PARENT,
      version: "2.0.0",
      optionalDependencies: { "native-linux-x64": "2.0.0" },
    };
    const { restored } = completeLockfile(
      lock({ "node_modules/native": bumped }),
      lock({
        "node_modules/native": PARENT,
        "node_modules/native-linux-x64": LINUX,
      }),
      noRegistry,
    );
    expect(restored).toEqual([]);
  });

  it("resolves a still-missing wanted entry from the registry, ranges included", () => {
    const views: string[] = [];
    const { lock: out, fetched } = completeLockfile(
      lock({ "node_modules/native": PARENT }),
      lock({}),
      (spec) => {
        views.push(spec);
        const [name] = spec.split(/@(?=[^@]*$)/);
        return {
          version: name === "fsevents" ? "2.3.3" : "1.0.0",
          dist: { tarball: `https://r/${name}.tgz`, integrity: "sha512-x" },
          os: name === "fsevents" ? ["darwin"] : ["linux"],
        };
      },
    );
    expect(views.sort()).toEqual(["fsevents@~2.3.3", "native-linux-x64@1.0.0"]);
    expect(fetched.sort()).toEqual([
      "fsevents@2.3.3",
      "native-linux-x64@1.0.0",
    ]);
    expect(out.packages["node_modules/fsevents"]).toMatchObject({
      version: "2.3.3",
      os: ["darwin"],
      optional: true,
    });
  });

  it("refuses to restore a platform entry that has dependencies of its own", () => {
    expect(() =>
      completeLockfile(
        lock({ "node_modules/native": PARENT }),
        lock({
          "node_modules/native": PARENT,
          "node_modules/native-linux-x64": {
            ...LINUX,
            dependencies: { helper: "1.0.0" },
          },
        }),
        noRegistry,
      ),
    ).toThrow(/has dependencies/);
  });
});
