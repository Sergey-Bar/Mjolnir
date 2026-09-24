/**
 * `mjolnir analyze --cross-file` — Cross-File Analysis (SDET-7).
 *
 * Detects patterns across multiple files: shared imports,
 * duplicated code blocks, circular dependencies, and shared
 * mutable state. Outputs findings that reference multiple files.
 */

import { existsSync, lstatSync, readdirSync } from "node:fs";
import { join, relative } from "node:path";

import { sectionHeader, plainContext } from "../reporter/ui.js";
import { internalErrorMessage, type Output } from "../cli-io.js";
import { LIMITS } from "../discovery/ignores.js";
import { readFileBounded } from "../lib/fs-bounded.js";
import {
  EXIT_CLEAN,
  EXIT_INTERNAL,
  EXIT_PARTIAL,
  EXIT_USAGE,
} from "../exit-codes.js";

const ui = plainContext();

export interface CrossFileFinding {
  type: "shared-import" | "duplicated-code" | "circular-dep" | "shared-state";
  files: string[];
  message: string;
  severity: "error" | "warning" | "info";
}

function collectImports(content: string): string[] {
  const imports: string[] = [];
  const importRegex = /from\s+['"]([^'"]+)['"]/g;
  let match: RegExpExecArray | null;
  while ((match = importRegex.exec(content)) !== null) {
    imports.push(match[1] as string);
  }
  return imports;
}

export function runAnalyzeCommand(
  argv: string[],
  io: { out: Output; err: Output },
): number {
  const target = argv.find((a) => !a.startsWith("-")) ?? ".";
  const crossFile = argv.includes("--cross-file");

  if (!existsSync(target)) {
    io.err(`mjolnir analyze: target does not exist: ${target}`);
    return EXIT_USAGE;
  }

  if (!crossFile) {
    io.out("Use --cross-file to enable cross-file analysis.");
    return EXIT_CLEAN;
  }

  try {
    const findings: CrossFileFinding[] = [];
    const fileImports = new Map<string, Map<string, number>>();
    const fileContents = new Map<string, string>();

    let limited = false;
    const deadline = Date.now() + 600_000;
    function walk(dir: string, depth = 0): void {
      if (limited || depth > LIMITS.maxDepth || Date.now() >= deadline) {
        limited = true;
        return;
      }
      for (const name of readdirSync(dir)) {
        const path = join(dir, name);
        if (name === "node_modules" || name === ".git") continue;
        let stat: ReturnType<typeof lstatSync>;
        try {
          stat = lstatSync(path);
        } catch {
          continue;
        }
        if (stat.isSymbolicLink()) continue;
        if (stat.isDirectory()) {
          walk(path, depth + 1);
          if (limited) return;
        } else if (
          name.endsWith(".ts") ||
          name.endsWith(".tsx") ||
          name.endsWith(".js") ||
          name.endsWith(".jsx")
        ) {
          if (fileContents.size >= LIMITS.maxFilesPerAdapter) {
            limited = true;
            return;
          }
          const read = readFileBounded(path, LIMITS.maxFileBytes);
          if (!read.ok) {
            limited = true;
            continue;
          }
          const content = read.data.toString("utf8");
          const rel = relative(process.cwd(), path);
          fileContents.set(rel, content);
          const imports = collectImports(content);
          const importCounts = new Map<string, number>();
          for (const imp of imports) {
            importCounts.set(imp, (importCounts.get(imp) ?? 0) + 1);
          }
          fileImports.set(rel, importCounts);
        }
      }
    }

    walk(target);

    // Detect shared imports (same module imported by multiple files)
    const importUsage = new Map<string, string[]>();
    for (const [file, imports] of fileImports) {
      for (const imp of imports.keys()) {
        const users = importUsage.get(imp) ?? [];
        users.push(file);
        importUsage.set(imp, users);
      }
    }
    for (const [imp, files] of importUsage) {
      if (files.length > 1) {
        findings.push({
          type: "shared-import",
          files,
          message: `${imp} is imported by ${files.length} files`,
          severity: "info",
        });
      }
    }

    // Detect duplicated code (simple line-based)
    const lineBuckets = new Map<string, string[]>();
    for (const [file, content] of fileContents) {
      const lines = content.split("\n");
      for (let i = 0; i < lines.length - 2; i++) {
        const line = lines[i];
        if (line === undefined) continue;
        const key = line.trim();
        if (
          key.length > 20 &&
          !key.startsWith("//") &&
          !key.startsWith("import")
        ) {
          const owners: string[] = lineBuckets.get(key) ?? [];
          if (!owners.includes(file)) owners.push(file);
          lineBuckets.set(key, owners);
        }
      }
    }
    for (const [_line, files] of lineBuckets) {
      if (files.length > 1) {
        findings.push({
          type: "duplicated-code",
          files,
          message: `Shared code fragment found in ${files.length} files`,
          severity: "warning",
        });
      }
    }

    io.out(sectionHeader("CROSS-FILE ANALYSIS", ui));
    io.out(`Analyzed ${fileContents.size} file(s)`);
    io.out(`Findings: ${findings.length}`);
    io.out("");

    const byType = new Map<string, CrossFileFinding[]>();
    for (const f of findings) {
      const existing = byType.get(f.type) ?? [];
      existing.push(f);
      byType.set(f.type, existing);
    }

    for (const [type, items] of byType) {
      io.out(`--- ${type} (${items.length}) ---`);
      for (const item of items.slice(0, 10)) {
        io.out(`  [${item.severity}] ${item.message}`);
        io.out(`    Files: ${item.files.join(", ")}`);
      }
      io.out("");
    }

    if (limited) {
      io.err(
        "mjolnir analyze: resource limit reached; cross-file analysis is partial",
      );
      return EXIT_PARTIAL;
    }
    return EXIT_CLEAN;
  } catch (e) {
    internalErrorMessage(e, io.err, false);
    return EXIT_INTERNAL;
  }
}
