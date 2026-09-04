<script setup lang="ts">
/**
 * The one evidence chip (site UX plan G6).
 *
 * Evidence level used to have a different visual treatment in every
 * place it appeared: a gold chip on the landing page, a plain grey span
 * in CatalogPreview, bare table text on rule pages. One semantic
 * concept, one primitive — this component. The weight text states what
 * the level costs the score, so severity is never color-only (the
 * wording mirrors guide/scoring.md's evidence table).
 *
 * Where a location needs only the chip with no behavior (generated rule
 * pages, which are static HTML from gen-rules.mjs), that generator
 * emits the plain-HTML form with the same `mj-ev` classes instead of
 * mounting Vue — the styles live globally in styles/custom.css for
 * exactly that reason, and the two forms must keep the same classes
 * and text.
 */
const props = defineProps<{ level: string }>();

const LEVELS: Record<string, { name: string; weight: string }> = {
  E2: {
    name: "Deterministic defect",
    weight: "E2 — deterministic: full deduction",
  },
  E1: {
    name: "Heuristic pattern",
    weight: "E1 — heuristic: half deduction (rounds down)",
  },
  E0: {
    name: "Observation",
    weight: "E0 — observation: zero deduction, never gates",
  },
};

const meta = LEVELS[props.level] ?? null;
</script>

<template>
  <span v-if="meta" class="mj-ev" :class="'mj-ev-' + level.toLowerCase()">
    <span class="mj-ev-lvl">{{ level }}</span>
    <span class="mj-ev-name">{{ meta.name }}</span>
    <span class="mj-ev-weight">{{ meta.weight }}</span>
  </span>
  <span v-else class="mj-ev mj-ev-e1">
    <span class="mj-ev-lvl">{{ level }}</span>
    <span class="mj-ev-name">evidence level</span>
  </span>
</template>
