/**
 * Historical trust tracking (M12 — issue #489).
 *
 * Maintains a rolling ledger of trust scores across scan runs,
 * enabling trend analysis and historical comparison. Each entry
 * records a run identity, its trust score, and a timestamp.
 */

export interface TrustLedgerEntry {
  readonly runId: string;
  readonly trustScore: number;
  readonly timestamp: number;
  readonly verdict: string;
}

export interface TrustTrend {
  readonly runId: string;
  readonly trustScore: number;
  readonly delta: number;
  readonly trend: "improving" | "declining" | "stable";
}

const MAX_LEDGER_ENTRIES = 1000;

export class TrustTracker {
  private ledger: TrustLedgerEntry[] = [];

  addEntry(entry: Omit<TrustLedgerEntry, "timestamp">): void {
    const fullEntry: TrustLedgerEntry = {
      ...entry,
      timestamp: Date.now(),
    };
    this.ledger.push(fullEntry);
    if (this.ledger.length > MAX_LEDGER_ENTRIES) {
      this.ledger = this.ledger.slice(-MAX_LEDGER_ENTRIES);
    }
  }

  getTrend(runId: string): TrustTrend | undefined {
    const idx = this.ledger.findIndex((e) => e.runId === runId);
    if (idx <= 0) return undefined;
    const current = this.ledger[idx]!;
    const previous = this.ledger[idx - 1]!;
    const delta = current.trustScore - previous.trustScore;
    let trend: TrustTrend["trend"];
    if (delta > 0) trend = "improving";
    else if (delta < 0) trend = "declining";
    else trend = "stable";
    return {
      runId: current.runId,
      trustScore: current.trustScore,
      delta,
      trend,
    };
  }

  getAverageScore(): number {
    if (this.ledger.length === 0) return 0;
    const sum = this.ledger.reduce((acc, e) => acc + e.trustScore, 0);
    return Math.round((sum / this.ledger.length) * 100) / 100;
  }

  getEntries(): readonly TrustLedgerEntry[] {
    return this.ledger;
  }

  getEntryCount(): number {
    return this.ledger.length;
  }

  clear(): void {
    this.ledger = [];
  }
}

export function computeTrustScore(
  findings: number,
  totalRules: number,
): number {
  if (totalRules === 0) return 100;
  const passRate = (totalRules - findings) / totalRules;
  return Math.round(Math.max(0, Math.min(100, passRate * 100)) * 100) / 100;
}
