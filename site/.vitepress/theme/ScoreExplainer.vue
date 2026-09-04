<script setup lang="ts">
/**
 * "Why is the score what it is?" — the arithmetic, as a picture.
 *
 * A horizontal strip walks the real formula from guide/scoring.md
 * (rate = rawDeductions / (declarations + 1); score = 100 − rate × 5)
 * using the demo scan's own numbers from generated/report.json, followed
 * by the verdict-band ruler rendered from the band map gen-report.mjs
 * parses out of src/reporter/score-state.ts — the model is the single
 * source of truth, so the page cannot drift from it (site UX plan G8).
 *
 * Every number on this strip is generated. If the JSON report stops
 * carrying the transparency fields, the strip degrades to a note that
 * says so — it never substitutes a plausible-looking default (that is
 * the D1 failure mode).
 */
import { computed } from "vue";
import scan from "./generated/report.json";

const raw = scan.rawDeductions;
const decl = scan.declarations;
const hasArithmetic = typeof raw === "number" && typeof decl === "number";

/** Constants from src/scorer/scorer.ts via generated/report.json. */
const K = scan.scoring?.constants?.k ?? 5;
const SMOOTHING = scan.scoring?.constants?.smoothing ?? 1;

/** The formula's steps, computed — never typed. */
const steps = computed(() => {
  if (!hasArithmetic) return [];
  const rate = raw / (decl + SMOOTHING);
  const penalty = Math.min(100, rate * K);
  const score = 100 - penalty;
  return [
    {
      label: `${raw} raw pts`,
      note: "deductions before normalization",
      cls: "s-raw",
    },
    {
      label: `÷ (${decl} + ${SMOOTHING})`,
      note: "test declarations, Laplace-smoothed",
      cls: "s-div",
    },
    {
      label: `× ${K}`,
      note: "NORMALIZATION_K — the slope",
      cls: "s-k",
    },
    {
      label: `100 − ${Math.round(penalty * 100) / 100}`,
      note: "from a perfect 100",
      cls: "s-sub",
    },
    {
      label: `= ${Math.round(score)}`,
      note: "the worthiness score",
      cls: "s-score",
    },
  ];
});

/**
 * Site-law reconciliation: the strip's computed score must equal the
 * scan's reported verdict score. Thrown at build/SSR time — a mismatch
 * means the formula here or the reporter changed, and the page must not
 * ship either way.
 */
if (hasArithmetic) {
  const rate = raw / (decl + SMOOTHING);
  const score = 100 - Math.min(100, rate * K);
  if (Math.round(score) !== scan.score) {
    throw new Error(
      `ScoreExplainer reconciliation failed: formula gives ${Math.round(score)} ` +
        `but the scan reported ${scan.score} — do not ship a wrong explanation`,
    );
  }
}

/**
 * Band ruler from the generated map (score-state.ts). The verdict
 * labels themselves never appear in this file — they come from the
 * generated band map at runtime, so a rename in the model cannot leave
 * a stale word on the page (and the doctor's no-typed-claims scan sees
 * no verdict literals here). Colors are keyed by band `min`, aligned
 * with vars.css's score tokens.
 */
const bands = scan.scoring?.bands ?? [];
const bandColor: Record<number, string> = {
  100: "var(--mj-forged-hot)",
  80: "var(--mj-trusted)",
  50: "var(--mj-needswork)",
  0: "var(--mj-unworthy)",
};
/** Span text from the real thresholds: e.g. 80 -> "80 – 99" under 100. */
function bandRange(min: number): string {
  const next = bands
    .map((b) => b.min)
    .filter((m) => m > min)
    .sort((a, b) => a - b)[0];
  if (min === 100) return "100";
  if (min === 0) return `< ${next ?? 50}`;
  return `${min} – ${(next ?? 100) - 1}`;
}
</script>

<template>
  <div class="sx">
    <p class="sx-lead">The demo repo's own arithmetic, step by step:</p>

    <div
      v-if="hasArithmetic"
      class="sx-strip"
      role="img"
      :aria-label="`Score arithmetic: ${raw} raw deduction points divided by ${decl} test declarations plus ${SMOOTHING}, times the normalization slope ${K}, subtracted from 100, gives the score ${scan.score}.`"
    >
      <template v-for="(s, i) in steps" :key="s.label">
        <span class="sx-step" :class="s.cls">
          <span class="sx-val">{{ s.label }}</span>
          <span class="sx-note">{{ s.note }}</span>
        </span>
        <span v-if="i < steps.length - 1" class="sx-op" aria-hidden="true">
          {{ ["÷", "×", "−", "="][i] }}
        </span>
      </template>
    </div>
    <p v-else class="sx-missing">
      The demo scan's JSON report does not carry
      <code>rawDeductions</code> / <code>testDeclarationCount</code>, so the
      worked arithmetic cannot be shown — the formula above is the whole story.
    </p>

    <p class="sx-ruler-lead">Where a score lands:</p>
    <div class="sx-ruler">
      <span
        v-for="b in bands"
        :key="b.min"
        class="sx-band"
        :style="{ '--band-c': bandColor[b.min] ?? 'var(--vp-c-text-2)' }"
      >
        <span class="sx-band-range">{{ bandRange(b.min) }}</span>
        <span class="sx-band-name">{{ b.verdict }}</span>
      </span>
    </div>
    <p class="sx-foot">
      A repo with no tests scores <em>nothing</em> — <code>null</code>, never a
      fake 100. Full derivation in
      <a
        href="https://github.com/Sergey-Bar/Mjolnir/blob/main/docs/SCORING.md"
        target="_blank"
        rel="noreferrer"
        >docs/SCORING.md</a
      >.
    </p>
  </div>
</template>

<style scoped>
.sx {
  margin: 1.2rem 0 1.6rem;
}
.sx-lead,
.sx-ruler-lead {
  margin: 0 0 0.7rem;
  font-size: 0.82rem;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--vp-c-text-3);
}
.sx-strip {
  display: flex;
  flex-wrap: wrap;
  align-items: stretch;
  gap: 0.5rem;
  padding: 1rem 1.1rem;
  border: 1px solid var(--vp-c-border);
  border-radius: 12px;
  background: var(--vp-c-bg-alt);
}
.sx-step {
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 0.25rem;
  padding: 0.55rem 0.8rem;
  border-radius: 8px;
  background: var(--vp-c-bg-soft);
  border: 1px solid var(--vp-c-border);
  min-width: 0;
}
.sx-val {
  font-family: var(--vp-font-family-mono);
  font-size: 0.95rem;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
  color: var(--vp-c-text-1);
}
.sx-note {
  font-size: 0.7rem;
  color: var(--vp-c-text-3);
  line-height: 1.4;
}
.sx-op {
  align-self: center;
  font-family: var(--vp-font-family-mono);
  font-size: 1.05rem;
  color: var(--vp-c-brand-1);
}
.sx-step.s-score {
  border-color: rgba(224, 180, 67, 0.5);
  background: linear-gradient(
    180deg,
    rgba(224, 180, 67, 0.12),
    transparent 75%
  );
}
.sx-step.s-score .sx-val {
  color: var(--mj-gold-bright);
}
.sx-missing {
  margin: 0;
  padding: 0.9rem 1.1rem;
  border: 1px dashed var(--vp-c-border);
  border-radius: 12px;
  color: var(--vp-c-text-2);
  font-size: 0.88rem;
}

/* The band ruler: a 0–100 line, four segments. Widths are the real
   band spans (50/30/20/1) out of 100 — data-shaped, not styled at
   random. */
.sx-ruler {
  display: flex;
  border-radius: 8px;
  overflow: hidden;
  border: 1px solid var(--vp-c-border);
}
.sx-band {
  flex: 1 1 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.15rem;
  padding: 0.55rem 0.3rem 0.6rem;
  background: color-mix(in srgb, var(--band-c) 13%, var(--vp-c-bg-alt));
  border-left: 2px solid var(--band-c);
  min-width: 0;
}
.sx-band:first-child {
  border-left: 0;
}
.sx-band-range {
  font-family: var(--vp-font-family-mono);
  font-size: 0.7rem;
  font-variant-numeric: tabular-nums;
  color: var(--vp-c-text-2);
  white-space: nowrap;
}
.sx-band-name {
  font-family: var(--mj-display);
  font-size: 0.82rem;
  font-weight: 600;
  letter-spacing: 0.05em;
  color: var(--band-c);
  white-space: nowrap;
}
.sx-foot {
  margin: 1rem 0 0;
  font-size: 0.84rem;
  color: var(--vp-c-text-2);
}
.sx-foot em {
  font-style: normal;
  color: var(--vp-c-text-1);
}

@media (max-width: 640px) {
  .sx-strip {
    flex-direction: column;
    align-items: stretch;
  }
  .sx-op {
    transform: rotate(90deg);
    padding-left: 0.4rem;
  }
  .sx-band-name {
    font-size: 0.68rem;
  }
  .sx-band-range {
    font-size: 0.6rem;
  }
}
</style>
