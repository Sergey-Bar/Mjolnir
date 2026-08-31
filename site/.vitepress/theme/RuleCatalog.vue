<script setup lang="ts">
import { computed, ref, watch, onMounted, onBeforeUnmount } from "vue";
import { withBase } from "vitepress";
import rules from "../../rules/rules.data.json";
import {
  filterRules,
  stateFromQuery,
  queryFromState,
} from "./catalog-filter.mjs";

interface Rule {
  id: string;
  title: string;
  family: string;
  familyLabel: string;
  severity: string;
  tier: string;
  measured: boolean;
  measuredFp?: string;
  evidence?: string;
  languages?: string;
  autofix?: string;
}

const all = rules as Rule[];

const q = ref("");
const severity = ref("all");
const tier = ref("all");
const family = ref("all");
const measuredOnly = ref(false);

const families = [...new Set(all.map((r) => r.familyLabel))].sort();

const shown = computed(() =>
  filterRules(all, {
    q: q.value,
    severity: severity.value,
    tier: tier.value,
    family: family.value,
    measuredOnly: measuredOnly.value,
  }),
);

const measuredCount = computed(() => all.filter((r) => r.measured).length);

function apply(s: ReturnType<typeof stateFromQuery>) {
  q.value = s.q;
  severity.value = s.severity;
  tier.value = s.tier;
  family.value = s.family;
  measuredOnly.value = s.measuredOnly;
}

function reset() {
  apply(stateFromQuery("", all));
}

/* ---- shareable filter state: mirror it in the URL query ------------- */

function readUrl() {
  if (typeof window !== "undefined")
    apply(stateFromQuery(window.location.search, all));
}

function writeUrl() {
  if (typeof window === "undefined") return;
  const qs = queryFromState({
    q: q.value,
    severity: severity.value,
    tier: tier.value,
    family: family.value,
    measuredOnly: measuredOnly.value,
  });
  const url = window.location.pathname + (qs ? "?" + qs : "");
  window.history.replaceState(window.history.state, "", url);
}

onMounted(() => {
  readUrl();
  watch([q, severity, tier, family, measuredOnly], writeUrl);
  window.addEventListener("popstate", readUrl);
});
onBeforeUnmount(() => {
  if (typeof window !== "undefined")
    window.removeEventListener("popstate", readUrl);
});
</script>

<template>
  <div class="cat">
    <div class="stats">
      <div class="stat">
        <strong>{{ all.length }}</strong
        ><span>rules</span>
      </div>
      <div class="stat">
        <strong>{{ measuredCount }}</strong
        ><span>measured FP rate</span>
      </div>
      <div class="stat">
        <strong>{{ families.length }}</strong
        ><span>families</span>
      </div>
    </div>

    <div class="controls">
      <input
        v-model="q"
        class="search"
        type="search"
        placeholder="Search rule ID, title or language…"
        aria-label="Search rules"
      />
      <div class="selects">
        <label
          >Severity
          <select v-model="severity">
            <option value="all">any</option>
            <option value="error">error</option>
            <option value="warning">warning</option>
            <option value="info">info</option>
          </select>
        </label>
        <label
          >Tier
          <select v-model="tier">
            <option value="all">any</option>
            <option value="core">core</option>
            <option value="extended">extended</option>
            <option value="quarantine">quarantine</option>
          </select>
        </label>
        <label
          >Family
          <select v-model="family">
            <option value="all">any</option>
            <option v-for="f in families" :key="f" :value="f">{{ f }}</option>
          </select>
        </label>
        <label class="check">
          <input v-model="measuredOnly" type="checkbox" />
          Measured only
        </label>
      </div>
    </div>

    <p class="count">
      Showing <strong>{{ shown.length }}</strong> of {{ all.length }}
      <button v-if="shown.length !== all.length" class="reset" @click="reset">
        clear filters
      </button>
    </p>

    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Rule</th>
            <th>Family</th>
            <th>Severity</th>
            <th>Tier</th>
            <th>FP rate</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="r in shown" :key="r.id">
            <td>
              <a :href="withBase('/rules/' + r.id)" class="rid">{{ r.id }}</a>
              <span class="rtitle">{{ r.title }}</span>
            </td>
            <td class="dim">{{ r.familyLabel }}</td>
            <td>
              <span class="badge" :class="'sev-' + r.severity">{{
                r.severity
              }}</span>
            </td>
            <td>
              <span class="badge" :class="'tier-' + r.tier">{{ r.tier }}</span>
            </td>
            <td>
              <span v-if="r.measured" class="badge measured">{{
                r.measuredFp
              }}</span>
              <span v-else class="dim small">on assumption</span>
            </td>
          </tr>
        </tbody>
      </table>

      <p v-if="!shown.length" class="empty">
        <span class="rune" aria-hidden="true">ᛉ</span>
        No rule matches that filter.
        <button class="reset" @click="reset">Clear filters</button>
      </p>
    </div>
  </div>
</template>

<style scoped>
.cat {
  margin: 2rem 0 3rem;
}

/* ---- stat strip ---- */
.stats {
  display: flex;
  flex-wrap: wrap;
  gap: 0.8rem;
  margin-bottom: 1.6rem;
}
.stat {
  flex: 1 1 130px;
  padding: 0.9rem 1.1rem;
  border-radius: 12px;
  background: var(--vp-c-bg-alt);
  border: 1px solid var(--vp-c-border);
}
.stat strong {
  display: block;
  font-family: var(--mj-display);
  font-size: 1.9rem;
  line-height: 1.1;
  color: var(--mj-ember-bright);
}
.stat span {
  font-size: 0.78rem;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--vp-c-text-3);
}

/* ---- controls ---- */
.controls {
  display: flex;
  flex-direction: column;
  gap: 0.7rem;
  margin-bottom: 1rem;
}
.search {
  width: 100%;
  padding: 0.7rem 0.9rem;
  border-radius: 9px;
  border: 1px solid var(--vp-c-border);
  background: var(--vp-c-bg);
  color: var(--vp-c-text-1);
  font-size: 0.95rem;
}
.search:focus {
  outline: none;
  border-color: var(--mj-ember-bright);
  box-shadow: 0 0 0 3px var(--vp-c-brand-soft);
}
.selects {
  display: flex;
  flex-wrap: wrap;
  gap: 0.9rem;
  align-items: center;
}
.selects label {
  font-size: 0.82rem;
  color: var(--vp-c-text-3);
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
}
.selects select {
  padding: 0.35rem 0.5rem;
  border-radius: 7px;
  border: 1px solid var(--vp-c-border);
  background: var(--vp-c-bg);
  color: var(--vp-c-text-1);
  font-size: 0.85rem;
}
.selects .check {
  cursor: pointer;
}
.selects .check input {
  accent-color: var(--mj-ember);
}

.count {
  font-size: 0.85rem;
  color: var(--vp-c-text-3);
  margin: 0 0 0.8rem;
}
.count strong {
  color: var(--vp-c-text-1);
}
.reset {
  margin-left: 0.6rem;
  padding: 0.15rem 0.55rem;
  border-radius: 6px;
  border: 1px solid var(--vp-c-border);
  background: none;
  color: var(--mj-ember);
  font-size: 0.78rem;
  cursor: pointer;
}
.reset:hover {
  border-color: var(--mj-ember);
}

/* ---- table ---- */
.table-wrap {
  overflow-x: auto;
  border: 1px solid var(--vp-c-border);
  border-radius: 12px;
}
table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.88rem;
  margin: 0;
  display: table;
}
th {
  text-align: left;
  padding: 0.7rem 0.9rem;
  font-family: var(--mj-display);
  font-weight: 600;
  font-size: 0.8rem;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: var(--vp-c-text-3);
  background: var(--vp-c-bg-alt);
  border-bottom: 1px solid var(--vp-c-border);
  white-space: nowrap;
}
td {
  padding: 0.65rem 0.9rem;
  border-bottom: 1px solid var(--vp-c-gutter);
  vertical-align: top;
}
tbody tr:last-child td {
  border-bottom: 0;
}
tbody tr:hover {
  background: var(--vp-c-brand-soft);
}
.rid {
  display: block;
  font-family: var(--vp-font-family-mono);
  font-size: 0.82rem;
  font-weight: 600;
  color: var(--vp-c-brand-1);
}
.rtitle {
  display: block;
  color: var(--vp-c-text-2);
  font-size: 0.85rem;
  margin-top: 0.15rem;
}
.dim {
  color: var(--vp-c-text-3);
  white-space: nowrap;
}
.small {
  font-size: 0.8rem;
}

.badge {
  display: inline-block;
  padding: 0.15rem 0.5rem;
  border-radius: 999px;
  font-size: 0.74rem;
  font-weight: 600;
  letter-spacing: 0.02em;
  white-space: nowrap;
  border: 1px solid transparent;
}
.sev-error {
  color: #dc2626;
  background: rgba(220, 38, 38, 0.12);
  border-color: rgba(220, 38, 38, 0.3);
}
.sev-warning {
  color: #b45309;
  background: rgba(217, 119, 6, 0.14);
  border-color: rgba(217, 119, 6, 0.3);
}
.sev-info {
  color: #0e7490;
  background: rgba(14, 116, 144, 0.12);
  border-color: rgba(14, 116, 144, 0.3);
}
.dark .sev-error {
  color: #f87171;
}
.dark .sev-warning {
  color: #fbbf24;
}
.dark .sev-info {
  color: #22d3ee;
}

.tier-core {
  color: var(--vp-c-text-1);
  background: var(--vp-c-bg-soft);
  border-color: var(--vp-c-border);
}
.tier-extended {
  color: var(--vp-c-text-2);
  background: var(--vp-c-bg-soft);
  border-color: var(--vp-c-border);
}
.tier-quarantine {
  color: #b45309;
  background: repeating-linear-gradient(
    45deg,
    rgba(217, 119, 6, 0.1),
    rgba(217, 119, 6, 0.1) 5px,
    transparent 5px,
    transparent 10px
  );
  border-color: rgba(217, 119, 6, 0.35);
}
.dark .tier-quarantine {
  color: #fbbf24;
}
.measured {
  color: #15803d;
  background: rgba(21, 128, 61, 0.12);
  border-color: rgba(21, 128, 61, 0.3);
  font-family: var(--vp-font-family-mono);
}
.dark .measured {
  color: #4ade80;
}

.empty {
  padding: 2.5rem 1rem;
  text-align: center;
  color: var(--vp-c-text-3);
}
.empty .rune {
  display: block;
  font-family: var(--mj-display);
  font-size: 1.8rem;
  color: var(--mj-ember-bright);
  opacity: 0.6;
  margin-bottom: 0.5rem;
}

@media (max-width: 640px) {
  .selects {
    gap: 0.6rem;
  }
  .selects label {
    font-size: 0.78rem;
  }
}
</style>
