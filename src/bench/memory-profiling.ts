/**
 * Memory Profiling (ECO-010).
 *
 * Measures memory consumption of an async function execution.
 * Returns a structured profile with RSS, heap, and ArrayBuffer stats.
 * Regression check is advisory — never gates CI.
 */

export interface MemoryProfile {
  peakRss: number;
  heapUsed: number;
  heapTotal: number;
  external: number;
  arrayBuffers: number;
}

/**
 * Measure memory usage during function execution. Takes a snapshot before
 * and after, and monitors peak heap at 50ms intervals.
 */
export async function profileMemory(
  fn: () => Promise<void> | void,
): Promise<MemoryProfile> {
  const before = process.memoryUsage();
  let peakHeapUsed = before.heapUsed;
  let peakRss = before.rss;

  const interval = setInterval(() => {
    const usage = process.memoryUsage();
    peakHeapUsed = Math.max(peakHeapUsed, usage.heapUsed);
    peakRss = Math.max(peakRss, usage.rss);
  }, 50);

  try {
    await fn();
  } finally {
    clearInterval(interval);
  }

  const after = process.memoryUsage();
  peakHeapUsed = Math.max(peakHeapUsed, after.heapUsed);
  peakRss = Math.max(peakRss, after.rss);

  return {
    peakRss,
    heapUsed: after.heapUsed,
    heapTotal: after.heapTotal,
    external: after.external,
    arrayBuffers: after.arrayBuffers,
  };
}

export interface MemoryRegressionResult {
  ok: boolean;
  warnings: string[];
}

/**
 * Advisory memory regression check. Compares a current profile against
 * a baseline with a configurable threshold (default 25%). Returns
 * warnings for any metric that exceeds the threshold — the caller
 * decides whether to surface them; this never gates CI.
 */
export function checkMemoryRegression(
  current: MemoryProfile,
  baseline: MemoryProfile,
  threshold = 0.25,
): MemoryRegressionResult {
  const warnings: string[] = [];

  const metrics: Array<{
    name: keyof MemoryProfile;
    current: number;
    baseline: number;
  }> = [
    { name: "peakRss", current: current.peakRss, baseline: baseline.peakRss },
    {
      name: "heapUsed",
      current: current.heapUsed,
      baseline: baseline.heapUsed,
    },
    {
      name: "heapTotal",
      current: current.heapTotal,
      baseline: baseline.heapTotal,
    },
    {
      name: "external",
      current: current.external,
      baseline: baseline.external,
    },
    {
      name: "arrayBuffers",
      current: current.arrayBuffers,
      baseline: baseline.arrayBuffers,
    },
  ];

  for (const m of metrics) {
    if (m.baseline > 0 && m.current > m.baseline * (1 + threshold)) {
      const pct = Math.round(((m.current - m.baseline) / m.baseline) * 100);
      warnings.push(
        `${m.name}: ${formatBytes(m.current)} vs baseline ${formatBytes(m.baseline)} (+${pct}%)`,
      );
    }
  }

  return { ok: warnings.length === 0, warnings };
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}
