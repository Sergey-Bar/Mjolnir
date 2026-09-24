import { closeSync, fstatSync, lstatSync, openSync, readSync } from "node:fs";

export type BoundedReadResult =
  | { ok: true; data: Buffer }
  | { ok: false; reason: "too-large" | "symlink" | "unreadable" };

function closeQuiet(fd: number): void {
  try {
    closeSync(fd);
  } catch {
    return;
  }
}

export function readFileBounded(
  path: string,
  maxBytes: number,
): BoundedReadResult {
  let fd: number | undefined;
  try {
    const pathStat = lstatSync(path);
    if (pathStat.isSymbolicLink()) return { ok: false, reason: "symlink" };
    if (!pathStat.isFile()) return { ok: false, reason: "unreadable" };
    fd = openSync(path, 0);
    const fdStat = fstatSync(fd);
    if (!fdStat.isFile() || fdStat.size > maxBytes) {
      return {
        ok: false,
        reason: fdStat.size > maxBytes ? "too-large" : "unreadable",
      };
    }
    const chunks: Buffer[] = [];
    let total = 0;
    const buffer = Buffer.allocUnsafe(Math.min(64 * 1024, maxBytes));
    while (true) {
      const read = readSync(fd, buffer, 0, buffer.length, null);
      if (read === 0) break;
      total += read;
      if (total > maxBytes) return { ok: false, reason: "too-large" };
      chunks.push(Buffer.from(buffer.subarray(0, read)));
    }
    return { ok: true, data: Buffer.concat(chunks) };
  } catch {
    return { ok: false, reason: "unreadable" };
  } finally {
    if (fd !== undefined) closeQuiet(fd);
  }
}
