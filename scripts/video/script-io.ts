/**
 * Reading and writing the committed video scripts — deliberately free of
 * side effects on import.
 *
 * Split out of write-scripts.ts after a real false-green: the contract
 * spec imported `serialize` from that module, whose top-level `await
 * main()` ran on import and REGENERATED the very files the spec was about
 * to compare against. The drift lock was rewriting its own expected
 * values and could not fail. Anything a test imports must not do work at
 * import time.
 */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import type { VideoScript } from "./script-types.js";

const HERE = dirname(fileURLToPath(import.meta.url));
export const SCRIPT_DIR = join(HERE, "..", "..", "assets", "video");

export function scriptPath(id: VideoScript["id"]): string {
  return join(SCRIPT_DIR, `script.${id}.json`);
}

/** Stable, diffable JSON — a re-capture with no change is a no-op diff. */
export function serialize(script: VideoScript): string {
  return `${JSON.stringify(script, null, 2)}\n`;
}

export function readScript(id: VideoScript["id"]): VideoScript {
  return JSON.parse(readFileSync(scriptPath(id), "utf8")) as VideoScript;
}
