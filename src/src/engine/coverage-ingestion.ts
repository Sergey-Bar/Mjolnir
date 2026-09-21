/**
 * Coverage Evidence Ingestion (CI-007).
 *
 * Parses Istanbul and LCOV coverage reports into a normalized
 * structure. Coverage is CONTEXTUAL ONLY — it provides provenance
 * information about what was exercised but does NOT automatically
 * upgrade trust levels or evidence levels.
 */

export type CoverageFormat = "istanbul" | "lcov";

export interface CoverageFileEntry {
  path: string;
  lines: {
    total: number;
    covered: number;
    pct: number;
  };
  branches: {
    total: number;
    covered: number;
    pct: number;
  };
  functions: {
    total: number;
    covered: number;
    pct: number;
  };
}

export interface CoverageReport {
  format: CoverageFormat;
  files: CoverageFileEntry[];
  summary: {
    linesPct: number;
    branchesPct: number;
    functionsPct: number;
  };
}

interface IstanbulFileData {
  s?: Record<string, number>;
  b?: Record<string, number[]>;
  f?: Record<string, number>;
  statementMap?: Record<string, unknown>;
  branchMap?: Record<string, unknown>;
  fnMap?: Record<string, unknown>;
}

interface IstanbulCoverageJson {
  total?: boolean;
  [filePath: string]: IstanbulFileData | boolean | undefined;
}

function pct(covered: number, total: number): number {
  return total === 0 ? 100 : Math.round((covered / total) * 10000) / 100;
}

export function parseIstanbul(json: string): CoverageReport {
  const parsed: unknown = JSON.parse(json);
  if (typeof parsed !== "object" || parsed === null) {
    throw new Error("Istanbul coverage report is not a valid JSON object.");
  }

  const data = parsed as IstanbulCoverageJson;
  const files: CoverageFileEntry[] = [];

  for (const [filePath, fileData] of Object.entries(data)) {
    if (
      filePath === "total" ||
      typeof fileData !== "object" ||
      fileData === null
    )
      continue;
    const fd: IstanbulFileData = fileData;

    const statements = fd.s ?? {};
    const statementValues = Object.values(statements);
    const stmtCovered = statementValues.filter((v) => v > 0).length;
    const stmtTotal = statementValues.length;

    const branches = fd.b ?? {};
    let branchCovered = 0;
    let branchTotal = 0;
    for (const counts of Object.values(branches)) {
      for (const c of counts) {
        branchTotal++;
        if (c > 0) branchCovered++;
      }
    }

    const functions = fd.f ?? {};
    const fnValues = Object.values(functions);
    const fnCovered = fnValues.filter((v) => v > 0).length;
    const fnTotal = fnValues.length;

    files.push({
      path: filePath,
      lines: {
        total: stmtTotal,
        covered: stmtCovered,
        pct: pct(stmtCovered, stmtTotal),
      },
      branches: {
        total: branchTotal,
        covered: branchCovered,
        pct: pct(branchCovered, branchTotal),
      },
      functions: {
        total: fnTotal,
        covered: fnCovered,
        pct: pct(fnCovered, fnTotal),
      },
    });
  }

  const totalLines = files.reduce((s, f) => s + f.lines.covered, 0);
  const totalLinesMax = files.reduce((s, f) => s + f.lines.total, 0);
  const totalBranches = files.reduce((s, f) => s + f.branches.covered, 0);
  const totalBranchesMax = files.reduce((s, f) => s + f.branches.total, 0);
  const totalFns = files.reduce((s, f) => s + f.functions.covered, 0);
  const totalFnsMax = files.reduce((s, f) => s + f.functions.total, 0);

  return {
    format: "istanbul",
    files,
    summary: {
      linesPct: pct(totalLines, totalLinesMax),
      branchesPct: pct(totalBranches, totalBranchesMax),
      functionsPct: pct(totalFns, totalFnsMax),
    },
  };
}

interface LcovEntry {
  path: string;
  linesHit: number;
  linesFound: number;
  branchesHit: number;
  branchesFound: number;
  functionsHit: number;
  functionsFound: number;
}

function parseLcovEntries(text: string): LcovEntry[] {
  const entries: LcovEntry[] = [];
  let current: Partial<LcovEntry> | null = null;

  for (const rawLine of text.split("\n")) {
    const line = rawLine.trim();
    if (line.startsWith("SF:")) {
      current = { path: line.slice(3) };
    } else if (line.startsWith("LF:")) {
      if (current) current.linesFound = parseInt(line.slice(3), 10);
    } else if (line.startsWith("LH:")) {
      if (current) current.linesHit = parseInt(line.slice(3), 10);
    } else if (line.startsWith("BRF:")) {
      if (current) current.branchesFound = parseInt(line.slice(4), 10);
    } else if (line.startsWith("BRH:")) {
      if (current) current.branchesHit = parseInt(line.slice(4), 10);
    } else if (line.startsWith("FNF:")) {
      if (current) current.functionsFound = parseInt(line.slice(4), 10);
    } else if (line.startsWith("FNH:")) {
      if (current) current.functionsHit = parseInt(line.slice(4), 10);
    } else if (line === "end_of_record") {
      if (current?.path) {
        entries.push({
          path: current.path,
          linesHit: current.linesHit ?? 0,
          linesFound: current.linesFound ?? 0,
          branchesHit: current.branchesHit ?? 0,
          branchesFound: current.branchesFound ?? 0,
          functionsHit: current.functionsHit ?? 0,
          functionsFound: current.functionsFound ?? 0,
        });
      }
      current = null;
    }
  }

  return entries;
}

export function parseLcov(text: string): CoverageReport {
  const entries = parseLcovEntries(text);
  const files: CoverageFileEntry[] = entries.map((e) => ({
    path: e.path,
    lines: {
      total: e.linesFound,
      covered: e.linesHit,
      pct: pct(e.linesHit, e.linesFound),
    },
    branches: {
      total: e.branchesFound,
      covered: e.branchesHit,
      pct: pct(e.branchesHit, e.branchesFound),
    },
    functions: {
      total: e.functionsFound,
      covered: e.functionsHit,
      pct: pct(e.functionsHit, e.functionsFound),
    },
  }));

  const totalLines = files.reduce((s, f) => s + f.lines.covered, 0);
  const totalLinesMax = files.reduce((s, f) => s + f.lines.total, 0);
  const totalBranches = files.reduce((s, f) => s + f.branches.covered, 0);
  const totalBranchesMax = files.reduce((s, f) => s + f.branches.total, 0);
  const totalFns = files.reduce((s, f) => s + f.functions.covered, 0);
  const totalFnsMax = files.reduce((s, f) => s + f.functions.total, 0);

  return {
    format: "lcov",
    files,
    summary: {
      linesPct: pct(totalLines, totalLinesMax),
      branchesPct: pct(totalBranches, totalBranchesMax),
      functionsPct: pct(totalFns, totalFnsMax),
    },
  };
}
