/**
 * Pure filter + URL-state helpers for the rule catalog. Kept framework-
 * free so scripts/catalog-filter.test.mjs can exercise them directly.
 */

export const SEVERITIES = ["error", "warning", "info"];
export const TIERS = ["core", "extended", "quarantine"];

/** @typedef {{ q: string, severity: string, tier: string, family: string, measuredOnly: boolean }} FilterState */

/** @returns {FilterState} */
export function emptyState() {
  return {
    q: "",
    severity: "all",
    tier: "all",
    family: "all",
    measuredOnly: false,
  };
}

/** Apply a FilterState to the rule list. */
export function filterRules(rules, state) {
  const needle = state.q.trim().toLowerCase();
  return rules.filter((r) => {
    if (state.severity !== "all" && r.severity !== state.severity) return false;
    if (state.tier !== "all" && r.tier !== state.tier) return false;
    if (state.family !== "all" && r.familyLabel !== state.family) return false;
    if (state.measuredOnly && !r.measured) return false;
    if (!needle) return true;
    return (
      r.id.toLowerCase().includes(needle) ||
      (r.title ?? "").toLowerCase().includes(needle) ||
      (r.languages ?? "").toLowerCase().includes(needle)
    );
  });
}

/**
 * Parse a `?q=&severity=&tier=&family=&measured=1` query string into a
 * FilterState. `family` accepts the full label ("CI integrity") or the
 * rule prefix ("CI"). Unknown values are ignored, not applied.
 */
export function stateFromQuery(search, rules) {
  const p = new URLSearchParams(search || "");
  const state = emptyState();

  state.q = p.get("q") ?? "";

  const sev = p.get("severity");
  if (sev && SEVERITIES.includes(sev)) state.severity = sev;

  const tier = p.get("tier");
  if (tier && TIERS.includes(tier)) state.tier = tier;

  const fam = p.get("family");
  if (fam) {
    const hit = rules.find(
      (r) =>
        r.familyLabel.toLowerCase() === fam.toLowerCase() ||
        r.family.toLowerCase() === fam.toLowerCase(),
    );
    if (hit) state.family = hit.familyLabel;
  }

  if (p.get("measured") === "1") state.measuredOnly = true;

  return state;
}

/** Serialize a FilterState back to a query string (no leading `?`). */
export function queryFromState(state) {
  const p = new URLSearchParams();
  if (state.q.trim()) p.set("q", state.q.trim());
  if (state.severity !== "all") p.set("severity", state.severity);
  if (state.tier !== "all") p.set("tier", state.tier);
  if (state.family !== "all") p.set("family", state.family);
  if (state.measuredOnly) p.set("measured", "1");
  return p.toString();
}
