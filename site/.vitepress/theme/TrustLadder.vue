<script setup lang="ts">
/**
 * The trust ladder, L0 to L5 — and the boundary that is the whole point.
 *
 * Before this component the ladder existed in `src/types.ts`, in the
 * terminal reporter, in SARIF, in TERMINOLOGY.md, and inside the
 * architecture SVG's alt text. On the website it was ONE LINE OF PROSE
 * in reference/cli.md. The single idea that separates this product from
 * a linter — that a static scan cannot claim it watched anything run —
 * had no visual form on the page arguing for it.
 *
 * Rungs and colours come from `src/brand/symbols.ts`, the same source
 * the architecture diagram draws from, so the ladder in the README and
 * the ladder here are the same ladder.
 *
 * THE BREAK IS NOT DECORATION. L0-L2 are the neutral steel ramp: static
 * evidence, brightening to the static ceiling. L3-L5 are aurora: they
 * require a real run report. Between them sits a gap and a rule, because
 * this is a change of KIND, not of degree — a gradient would say "more
 * of the same", and the honest statement is that a static-only finding
 * cannot reach L3 however confident it is.
 *
 * Not colour-only: each rung is labelled, the runtime half is marked in
 * text, and the boundary carries its own caption. It reads in
 * monochrome and to a screen reader.
 */
import { RUNTIME_BOUNDARY, TRUST_RUNGS } from "../../../src/brand/symbols";

const rungs = TRUST_RUNGS;
const boundary = RUNTIME_BOUNDARY;
</script>

<template>
  <figure class="mj-ladder">
    <figcaption class="mj-ladder-cap">
      Trust level — how far a finding can climb
    </figcaption>

    <ol class="mj-ladder-rungs">
      <li
        v-for="(r, i) in rungs"
        :key="r.level"
        class="mj-rung"
        :class="{ 'is-runtime': r.runtime, 'is-first-runtime': i === boundary }"
      >
        <span
          class="mj-rung-bar"
          :style="{
            height: 12 + i * 9 + 'px',
            background: r.color,
          }"
          aria-hidden="true"
        />
        <span class="mj-rung-level">{{ r.level }}</span>
        <span class="mj-rung-meaning">{{ r.meaning }}</span>
        <span class="mj-rung-kind">{{
          r.runtime ? "needs a real run" : "static"
        }}</span>
      </li>
    </ol>

    <p class="mj-ladder-note">
      <strong>L3 and above require runtime evidence.</strong> Static analysis
      can never claim them, however certain it is — that is what the gap in the
      ladder is.
    </p>
  </figure>
</template>

<style scoped>
.mj-ladder {
  margin: 2rem 0;
  padding: 1.4rem 1.5rem 1.2rem;
  border: 1px solid var(--vp-c-border);
  border-radius: 12px;
  background: var(--vp-c-bg-alt);
}
.mj-ladder-cap {
  font-family: var(--mj-display);
  font-size: 0.76rem;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--vp-c-text-3);
  margin-bottom: 1.1rem;
}
.mj-ladder-rungs {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: 0.5rem;
  align-items: end;
  margin: 0;
  padding: 0;
  list-style: none;
}
.mj-rung {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  min-width: 0;
}
/* The break. A whole empty column would cost too much width on a phone,
   so it is a real gap plus a rule — never a colour change alone. */
.mj-rung.is-first-runtime {
  margin-left: 0.9rem;
  border-left: 1px dashed var(--vp-c-border);
  padding-left: 0.9rem;
}
.mj-rung-bar {
  display: block;
  width: 100%;
  border-radius: 3px;
}
.mj-rung-level {
  font-family: var(--vp-font-family-mono);
  font-size: 0.85rem;
  color: var(--vp-c-text-1);
}
.mj-rung-meaning {
  font-size: 0.76rem;
  line-height: 1.35;
  color: var(--vp-c-text-2);
}
.mj-rung-kind {
  font-size: 0.7rem;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--vp-c-text-3);
}
.mj-rung.is-runtime .mj-rung-kind {
  color: var(--mj-aurora-bright);
}
.mj-ladder-note {
  margin: 1.2rem 0 0;
  font-size: 0.86rem;
  line-height: 1.6;
  color: var(--vp-c-text-2);
}
.mj-ladder-note strong {
  color: var(--vp-c-text-1);
}

@media (max-width: 720px) {
  .mj-ladder-rungs {
    grid-template-columns: repeat(3, 1fr);
    row-gap: 1.1rem;
  }
  /* At three columns the boundary falls at the start of a row, where a
     left rule would read as a margin. Move it to the top edge so the
     break stays visible instead of quietly disappearing. */
  .mj-rung.is-first-runtime {
    margin-left: 0;
    padding-left: 0;
    border-left: 0;
    border-top: 1px dashed var(--vp-c-border);
    padding-top: 0.6rem;
  }
}
</style>
