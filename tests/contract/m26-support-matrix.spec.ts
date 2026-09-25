import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

type MatrixCell = {
  schemaVersion: number;
  cell_id: string;
  axis: string;
  cell: string;
  disposition: "TESTED" | "NOT_APPLICABLE" | "BLOCKED";
  owner: string;
  evidence: string[];
  command?: string;
  fixture?: string;
  observed_result: string;
  resource_budget: string | Record<string, unknown>;
  last_candidate: string;
  not_applicable_rationale?: string | null;
  blocked_reason?: string | null;
  revisit_trigger?: string | null;
  source_issue_ids?: string[];
};

type SupportMatrix = {
  schemaVersion: number;
  status: string;
  counts: {
    tested: number;
    not_applicable: number;
    blocked: number;
  };
  promotion: {
    status: string;
    note: string;
  };
  cells: MatrixCell[];
};

const ROOT = resolve(import.meta.dirname, "..", "..");
const matrix = JSON.parse(
  readFileSync(resolve(ROOT, "docs", "M26-SUPPORT-MATRIX.json"), "utf8"),
) as SupportMatrix;

const EXPECTED_AXES = [
  "surface",
  "input-state",
  "lifecycle",
  "outcome",
  "language-framework",
  "ci-release",
  "platform",
  "permissions-network",
  "security-privacy",
  "qa-sdet-domain",
  "ux",
  "governance",
] as const;

const EXPECTED_CELL_IDS = [
  "MATRIX-SURFACE-CLI",
  "MATRIX-SURFACE-JSON",
  "MATRIX-SURFACE-SARIF",
  "MATRIX-SURFACE-TRUST-ARTIFACT",
  "MATRIX-SURFACE-GITHUB-ACTION",
  "MATRIX-SURFACE-MCP",
  "MATRIX-SURFACE-SITE-DOCS",
  "MATRIX-SURFACE-PR-COMMENTS",
  "MATRIX-SURFACE-CONFIG",
  "MATRIX-SURFACE-PLUGIN",
  "MATRIX-SURFACE-CI-TEMPLATES",
  "MATRIX-SURFACE-OPTIONAL-CONTROL-PLANE",
  "MATRIX-SURFACE-FUTURE-RUNNER",
  "MATRIX-INPUT-CLEAN",
  "MATRIX-INPUT-EMPTY",
  "MATRIX-INPUT-MALFORMED",
  "MATRIX-INPUT-HOSTILE",
  "MATRIX-INPUT-STALE",
  "MATRIX-INPUT-FOREIGN",
  "MATRIX-INPUT-TRUNCATED",
  "MATRIX-INPUT-DUPLICATE",
  "MATRIX-INPUT-CONFLICTING",
  "MATRIX-INPUT-PARTIAL",
  "MATRIX-INPUT-HUGE",
  "MATRIX-INPUT-BINARY",
  "MATRIX-INPUT-UNICODE",
  "MATRIX-INPUT-PATH-SYMLINK",
  "MATRIX-INPUT-ARCHIVE",
  "MATRIX-INPUT-GENERATED-VENDOR",
  "MATRIX-INPUT-MONOREPO-MULTI-ROOT",
  "MATRIX-LIFECYCLE-INSTALL",
  "MATRIX-LIFECYCLE-FIRST-RUN",
  "MATRIX-LIFECYCLE-SCAN",
  "MATRIX-LIFECYCLE-BASELINE",
  "MATRIX-LIFECYCLE-INCREMENTAL",
  "MATRIX-LIFECYCLE-CACHE",
  "MATRIX-LIFECYCLE-SUPPRESSION",
  "MATRIX-LIFECYCLE-CANCELLATION",
  "MATRIX-LIFECYCLE-CRASH",
  "MATRIX-LIFECYCLE-RECOVERY",
  "MATRIX-LIFECYCLE-UPDATE",
  "MATRIX-LIFECYCLE-DOWNGRADE",
  "MATRIX-LIFECYCLE-DEPRECATION",
  "MATRIX-LIFECYCLE-REMOVAL",
  "MATRIX-OUTCOME-PASS",
  "MATRIX-OUTCOME-FINDING",
  "MATRIX-OUTCOME-PARTIAL",
  "MATRIX-OUTCOME-INCONCLUSIVE",
  "MATRIX-OUTCOME-UNKNOWN",
  "MATRIX-OUTCOME-UNSUPPORTED",
  "MATRIX-OUTCOME-ERROR",
  "MATRIX-OUTCOME-TIMEOUT",
  "MATRIX-OUTCOME-PERMISSION-DENIED",
  "MATRIX-OUTCOME-ROLLBACK-CANARY",
  "MATRIX-OUTCOME-CLEAN-CONSUMER",
  "MATRIX-LANGUAGE-CURRENT-BEACHHEAD",
  "MATRIX-LANGUAGE-FUTURE-CANDIDATES",
  "MATRIX-FRAMEWORK-REGISTERED",
  "MATRIX-FRAMEWORK-FUTURE-CANDIDATES",
  "MATRIX-CAPABILITY-STATE-CONTRACT",
  "MATRIX-CAPABILITY-EXTERNAL-CERTIFICATION",
  "MATRIX-CI-GITHUB-ACTIONS",
  "MATRIX-CI-AZURE-DEVOPS",
  "MATRIX-CI-JENKINS",
  "MATRIX-CI-GITLAB-CANDIDATE",
  "MATRIX-RELEASE-RC-CONTRACT",
  "MATRIX-RELEASE-STABLE-CONTRACT",
  "MATRIX-RELEASE-DRY-RUN",
  "MATRIX-RELEASE-RESUME-CONTRACT",
  "MATRIX-RELEASE-PROPAGATION-DELAY",
  "MATRIX-RELEASE-IMMUTABLE-TAG",
  "MATRIX-RELEASE-ROLLBACK-CANARY",
  "MATRIX-PLATFORM-NODE22-UBUNTU",
  "MATRIX-PLATFORM-NODE22-WINDOWS",
  "MATRIX-PLATFORM-NODE22-MACOS",
  "MATRIX-PLATFORM-NODE24-UBUNTU",
  "MATRIX-PLATFORM-NODE24-WINDOWS",
  "MATRIX-PLATFORM-NODE24-MACOS",
  "MATRIX-PLATFORM-SHELLS",
  "MATRIX-PLATFORM-LOCALE-TZ",
  "MATRIX-PLATFORM-PATH-SEPARATORS",
  "MATRIX-PLATFORM-FILESYSTEM-EDGES",
  "MATRIX-PERMISSION-LOCAL-ZERO-NETWORK",
  "MATRIX-PERMISSION-READ-ONLY-TOKEN",
  "MATRIX-PERMISSION-FORK-PR",
  "MATRIX-PERMISSION-OPTIONAL-TELEMETRY",
  "MATRIX-PERMISSION-OPTIONAL-HOSTED-SYNC",
  "MATRIX-PERMISSION-AGENT-TOOL",
  "MATRIX-PERMISSION-SELF-HOSTED-AIR-GAPPED",
  "MATRIX-SECURITY-PROMPT-INJECTION",
  "MATRIX-SECURITY-TOOL-POISONING",
  "MATRIX-SECURITY-EXFILTRATION",
  "MATRIX-SECURITY-TRAVERSAL",
  "MATRIX-SECURITY-SYMLINK",
  "MATRIX-SECURITY-REDOS",
  "MATRIX-SECURITY-RESOURCE-EXHAUSTION",
  "MATRIX-SECURITY-SANDBOX-ESCAPE",
  "MATRIX-SECURITY-SECRET-CANARY",
  "MATRIX-SECURITY-UNTRUSTED-ARTIFACT",
  "MATRIX-SECURITY-SUPPLY-CHAIN-SUBSTITUTION",
  "MATRIX-DOMAIN-REQUIREMENTS",
  "MATRIX-DOMAIN-RISK",
  "MATRIX-DOMAIN-TEST-DESIGN",
  "MATRIX-DOMAIN-UNIT",
  "MATRIX-DOMAIN-INTEGRATION",
  "MATRIX-DOMAIN-API",
  "MATRIX-DOMAIN-BROWSER",
  "MATRIX-DOMAIN-MOBILE",
  "MATRIX-DOMAIN-ACCESSIBILITY",
  "MATRIX-DOMAIN-PERFORMANCE",
  "MATRIX-DOMAIN-SECURITY",
  "MATRIX-DOMAIN-EXPLORATORY-OBSERVABILITY",
  "MATRIX-DOMAIN-RELEASE-EVIDENCE",
  "MATRIX-UX-BEGINNER",
  "MATRIX-UX-EXPERT",
  "MATRIX-UX-KEYBOARD-SCREEN-READER-AUTOMATED",
  "MATRIX-UX-KEYBOARD-SCREEN-READER-SESSION",
  "MATRIX-UX-ERROR-RECOVERY",
  "MATRIX-UX-LOCALIZATION",
  "MATRIX-UX-NO-FINDINGS",
  "MATRIX-UX-PARTIAL",
  "MATRIX-UX-HIGH-NOISE",
  "MATRIX-UX-ACCESSIBLE-PR",
  "MATRIX-UX-MOBILE-OUTPUT",
  "MATRIX-GOV-OWNER",
  "MATRIX-GOV-EXPIRY",
  "MATRIX-GOV-REVIEW",
  "MATRIX-GOV-EXCEPTION",
  "MATRIX-GOV-POLICY-INHERITANCE",
  "MATRIX-GOV-CODEOWNERS",
  "MATRIX-GOV-AUDIT",
  "MATRIX-GOV-DELETION",
  "MATRIX-GOV-EXPORT",
  "MATRIX-GOV-RETENTION",
  "MATRIX-GOV-CONSENT",
  "MATRIX-GOV-SUPPORT",
] as const;

const EXPECTED_SOURCE_ISSUE_IDS: Record<string, readonly string[]> = {
  "MATRIX-SURFACE-OPTIONAL-CONTROL-PLANE": ["GAP-M26-013"],
  "MATRIX-OUTCOME-ROLLBACK-CANARY": ["GAP-M26-012"],
  "MATRIX-PERMISSION-OPTIONAL-TELEMETRY": ["GAP-M26-014"],
  "MATRIX-PERMISSION-OPTIONAL-HOSTED-SYNC": ["GAP-M26-016"],
  "MATRIX-PERMISSION-SELF-HOSTED-AIR-GAPPED": ["GAP-M26-015"],
  "MATRIX-DOMAIN-REQUIREMENTS": ["GAP-M26-006"],
  "MATRIX-DOMAIN-RISK": ["GAP-M26-006"],
  "MATRIX-DOMAIN-TEST-DESIGN": ["GAP-M26-007"],
  "MATRIX-DOMAIN-API": ["GAP-M26-008"],
  "MATRIX-DOMAIN-ACCESSIBILITY": ["GAP-M26-009"],
  "MATRIX-DOMAIN-PERFORMANCE": ["GAP-M26-010"],
  "MATRIX-DOMAIN-SECURITY": ["GAP-M26-011"],
  "MATRIX-GOV-SUPPORT": ["GAP-M26-017"],
};

describe("M26 support matrix contract", () => {
  it("binds the reconciled matrix to the complete finite cell set", () => {
    const ids = new Set(matrix.cells.map((cell) => cell.cell_id));
    const axes = new Set(matrix.cells.map((cell) => cell.axis));

    expect(matrix.schemaVersion).toBe(1);
    expect(matrix.status).toBe("RECONCILED");
    expect(matrix.promotion.status).toBe("NOT_PROMOTED");
    expect(matrix.promotion.note).toMatch(
      /not release authorization|not.*promot/i,
    );
    expect(matrix.cells).toHaveLength(136);
    expect(ids.size).toBe(136);
    expect([...ids]).toEqual([...EXPECTED_CELL_IDS]);
    expect(axes).toEqual(new Set(EXPECTED_AXES));
  });

  it("binds every source issue to a real gap-ledger record", () => {
    const gapIds = new Set(
      readFileSync(resolve(ROOT, "docs", "M26-GAP-LEDGER.jsonl"), "utf8")
        .split(/\r?\n/)
        .filter(Boolean)
        .map((line) => (JSON.parse(line) as { gap_id: string }).gap_id),
    );
    for (const cell of matrix.cells) {
      for (const sourceIssueId of cell.source_issue_ids ?? []) {
        expect(gapIds, `${cell.cell_id}: ${sourceIssueId}`).toContain(
          sourceIssueId,
        );
      }
    }
  });

  it("matches the declared disposition counts and preserves blocker metadata", () => {
    const counts = {
      tested: matrix.cells.filter((cell) => cell.disposition === "TESTED")
        .length,
      not_applicable: matrix.cells.filter(
        (cell) => cell.disposition === "NOT_APPLICABLE",
      ).length,
      blocked: matrix.cells.filter((cell) => cell.disposition === "BLOCKED")
        .length,
    };

    expect(counts).toEqual(matrix.counts);
    expect(counts).toEqual({ tested: 90, not_applicable: 2, blocked: 44 });

    for (const cell of matrix.cells) {
      expect(cell.schemaVersion).toBe(1);
      expect(cell.owner).toBe("qa-owner");
      expect(cell.last_candidate).toBe("mjolnir-working-candidate-001");
      expect(cell.source_issue_ids ?? []).toEqual(
        EXPECTED_SOURCE_ISSUE_IDS[cell.cell_id] ?? [],
      );
      if (cell.disposition === "BLOCKED") {
        expect(cell.blocked_reason).toBeTruthy();
        expect(cell.revisit_trigger).toBeTruthy();
        expect(cell.observed_result).not.toBe("PASS");
      }
      if (cell.disposition === "NOT_APPLICABLE") {
        expect(cell.not_applicable_rationale).toBeTruthy();
        expect(cell.observed_result).not.toBe("PASS");
      }
    }
  });

  it("keeps every evidence reference relative and present", () => {
    const evidence = matrix.cells.flatMap((cell) => cell.evidence);

    expect(evidence.length).toBeGreaterThan(0);
    for (const path of evidence) {
      expect(path).not.toMatch(/^(?:[a-z]:[\\/]|[/\\]{2})/i);
      expect(path).not.toContain("..");
      expect(existsSync(resolve(ROOT, path))).toBe(true);
    }
    expect(JSON.stringify(matrix)).not.toMatch(
      /[a-z]:[\\/]vs-code-projects[\\/]github[\\/]qa-doctor/i,
    );
  });

  it("does not forge TESTED/PASS from blocked or external-only evidence", () => {
    for (const cell of matrix.cells) {
      if (cell.disposition !== "TESTED") {
        expect(cell.observed_result).not.toBe("PASS");
        continue;
      }

      expect(cell.observed_result).toBe("PASS");
      expect(cell.command).toMatch(/^npx vitest run /);
      expect(cell.evidence.some((path) => path.startsWith("tests/"))).toBe(
        true,
      );
      expect(cell.evidence).not.toContain("docs/M26-EXTERNAL-VALIDATION.json");

      const commandPaths =
        cell.command
          ?.split(" ")
          .slice(3)
          .filter((token) => token.startsWith("tests/")) ?? [];
      expect(commandPaths.length).toBeGreaterThan(0);
      for (const path of commandPaths) {
        expect(existsSync(resolve(ROOT, path))).toBe(true);
      }
    }
  });
});
