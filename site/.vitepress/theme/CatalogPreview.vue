<script setup lang="ts">
/**
 * A window onto the rule catalog, on the landing page.
 *
 * The catalog is the best-built thing on the site — URL-synced filters,
 * real search, every rule's measured false-positive rate — and it was
 * reachable only from the nav (`.planning/SITE-REDESIGN-PLAN.md` §4,
 * Phase 5). This puts real rules, with their real measured rates, in
 * front of someone who has not clicked anything yet.
 *
 * The rows are SELECTED, never written: one rule per family, highest
 * evidence and severity first, and only rules whose FP rate has actually
 * been measured — a preview that showed an unmeasured rule as a
 * representative would be exactly the unearned claim the site law
 * forbids. Change the registry and these rows change with it.
 */
import { computed } from "vue";
import { withBase } from "vitepress";
import rules from "../../rules/rules.data.json";

interface Rule {
  id: string;
  title: string;
  familyLabel: string;
  severity: string;
  tier: string;
  measured: boolean;
  measuredFp?: string;
  evidence?: string;
}

const all = rules as Rule[];

const SEVERITY_RANK: Record<string, number> = { error: 0, warning: 1, info: 2 };
const TIER_RANK: Record<string, number> = {
  core: 0,
  extended: 1,
  quarantine: 2,
};
const EVIDENCE_RANK: Record<string, number> = { E2: 0, E1: 1, E0: 2 };
const ROWS = 5;

/** Lower sorts first: measured, core, deterministic, error, then by id. */
function rank(r: Rule): number[] {
  return [
    TIER_RANK[r.tier] ?? 9,
    EVIDENCE_RANK[r.evidence ?? ""] ?? 9,
    SEVERITY_RANK[r.severity] ?? 9,
  ];
}

const shown = computed(() => {
  const measured = all
    .filter((r) => r.measured && r.measuredFp)
    .sort((a, b) => {
      const [ra, rb] = [rank(a), rank(b)];
      for (let i = 0; i < ra.length; i++)
        if (ra[i] !== rb[i]) return ra[i] - rb[i];
      return a.id.localeCompare(b.id);
    });

  // One per family, so the preview shows the spread rather than five
  // near-identical CI rules.
  const seen = new Set<string>();
  const picked: Rule[] = [];
  for (const r of measured) {
    if (seen.has(r.familyLabel)) continue;
    seen.add(r.familyLabel);
    picked.push(r);
    if (picked.length === ROWS) break;
  }
  return picked;
});

const measuredCount = computed(() => all.filter((r) => r.measured).length);
</script>

<template>
  <section class="cprev">
    <div class="cp-head" data-reveal>
      <h2 class="sect-title">Every rule, with its receipts</h2>
      <p>
        {{ measuredCount }} of {{ all.length }} rules carry a false-positive
        rate measured against real open-source code. Here are five of them — one
        per family, highest evidence first.
      </p>
    </div>

    <div class="cp-table" data-reveal>
      <table>
        <thead>
          <tr>
            <th>Rule</th>
            <th>Family</th>
            <th class="c">Evidence</th>
            <th class="c">Measured FP</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="r in shown" :key="r.id">
            <td>
              <a :href="withBase(`/rules/${r.id}`)"
                ><code>{{ r.id }}</code></a
              >
              <span class="t">{{ r.title }}</span>
            </td>
            <td class="fam">{{ r.familyLabel }}</td>
            <td class="c">
              <EvidenceBadge :level="r.evidence || ''" />
            </td>
            <td class="c fp">{{ r.measuredFp }}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <p class="cp-more" data-reveal>
      <a :href="withBase('/rules/')">Browse all {{ all.length }} rules →</a>
    </p>
  </section>
</template>

<style scoped>
.cprev {
  max-width: 1000px;
  margin: 0 auto;
  padding: 0 var(--edge, 1.5rem);
}
.cp-head {
  text-align: center;
  margin-bottom: 1.8rem;
}
.cp-head p {
  max-width: 62ch;
  margin: 0.9rem auto 0;
  color: var(--vp-c-text-2);
  line-height: 1.7;
}

.cp-table {
  overflow-x: auto;
  border: 1px solid var(--vp-c-border);
  border-radius: 12px;
  background: var(--vp-c-bg-alt);
}
table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.9rem;
}
th,
td {
  text-align: left;
  padding: 0.7rem 0.9rem;
  border-bottom: 1px solid var(--vp-c-divider);
  vertical-align: baseline;
}
thead th {
  font-family: var(--vp-font-family-mono);
  font-size: 0.68rem;
  letter-spacing: 0.11em;
  text-transform: uppercase;
  color: var(--vp-c-text-3);
  font-weight: 500;
  white-space: nowrap;
}
tbody tr:last-child td {
  border-bottom: 0;
}
td code {
  font-size: 0.82rem;
  white-space: nowrap;
}
.t {
  display: block;
  color: var(--vp-c-text-2);
  margin-top: 0.15rem;
  line-height: 1.5;
}
.fam {
  color: var(--vp-c-text-3);
  white-space: nowrap;
}
.c {
  text-align: center;
}
.fp {
  font-family: var(--vp-font-family-mono);
  font-size: 0.82rem;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}
.cp-more {
  text-align: center;
  margin: 1.4rem 0 0;
}

@media (max-width: 640px) {
  .fam {
    display: none;
  }
  thead th:nth-child(2) {
    display: none;
  }
}
</style>
