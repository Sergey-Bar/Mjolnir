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
 *
 * THE RING, AND WHY THE COLOURS CHANGED. The chip used to paint E2 in
 * the unworthy red, E1 in the needs-work gold and E0 in the trusted
 * blue, reasoning from what each level COSTS the score. Those are the
 * score-band colours, so the same blue meant "WORTHY" in the gauge and
 * "observation" here, and the same red meant "UNWORTHY" and
 * "deterministic proof" — one palette carrying two unrelated axes.
 *
 * Evidence level is a certainty axis, not a severity one. It now uses
 * the hue-free brightness ramp from src/brand/tokens.ts and the ring
 * from src/brand/symbols.ts: open, half-filled, sealed, where the fill
 * IS the deduction weight. E2 is a defect we are certain about, and
 * painting certainty red said something the model does not.
 */
import { EVIDENCE_MARKS } from "../../../src/brand/symbols";

const props = defineProps<{ level: string }>();

/** The ring from src/brand/symbols.ts — the same mark the architecture
 * diagram draws. `fill` is the scorer's weight, so the chip shows how
 * much the level can cost before the words say it. */
const mark = EVIDENCE_MARKS.find((m) => m.level === props.level) ?? null;

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
    <svg
      v-if="mark"
      class="mj-ev-mark"
      viewBox="0 0 16 16"
      width="10"
      height="10"
      aria-hidden="true"
    >
      <circle
        cx="8"
        cy="8"
        r="6"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
      />
      <circle v-if="mark.fill === 1" cx="8" cy="8" r="5" fill="currentColor" />
      <path
        v-else-if="mark.fill === 0.5"
        d="M 8 3 A 5 5 0 0 0 8 13 Z"
        fill="currentColor"
      />
    </svg>
    <span class="mj-ev-lvl">{{ level }}</span>
    <span class="mj-ev-name">{{ meta.name }}</span>
    <span class="mj-ev-weight">{{ meta.weight }}</span>
  </span>
  <span v-else class="mj-ev mj-ev-e1">
    <span class="mj-ev-lvl">{{ level }}</span>
    <span class="mj-ev-name">evidence level</span>
  </span>
</template>
