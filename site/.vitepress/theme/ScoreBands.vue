<script setup lang="ts">
import { onMounted, onBeforeUnmount, ref } from "vue";
import { useReadingMotion } from "./useReadingMotion";
const props = defineProps<{
  score: number;
  outOf: number;
  bands: { min: number; max: number; verdict: string; tone: string }[];
}>();
const active = ref(0);
const region = ref<HTMLElement>();
const { paused } = useReadingMotion(region);
let timer: ReturnType<typeof setInterval> | undefined;
onMounted(() => {
  timer = setInterval(() => {
    if (!document.hidden && !paused.value)
      active.value = (active.value + 1) % props.bands.length;
  }, 4000);
});
onBeforeUnmount(() => clearInterval(timer));

const descriptions: Record<string, string> = {
  critical: "Start with the highest-impact findings.",
  warning: "Review the findings and address the largest deductions.",
  trusted: "A strong score. Findings still need review.",
  forged: "Exactly 100. A clean scan does not prove the tests pass.",
};
</script>

<template>
  <figure
    ref="region"
    class="score-bands"
    data-reveal
    tabindex="0"
    aria-label="Scoring bands. Focus this table to pause the animated highlight."
  >
    <figcaption>
      <span>Four verdicts. What each one means.</span>
      <span class="score-deduction"
        >A guide to the scoring bands · not a live repository score</span
      >
    </figcaption>
    <table>
      <thead>
        <tr>
          <th scope="col">Score</th>
          <th scope="col">Verdict &amp; next step</th>
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="(band, index) in bands"
          :key="band.min"
          :class="[{ current: active === index }, `band-${band.tone}`]"
          :style="{ '--row': index }"
        >
          <th scope="row">
            <span class="band-range">{{
              band.min === band.max ? band.min : `${band.min}–${band.max}`
            }}</span>
          </th>
          <td>
            <div class="band-heading">
              <strong>{{ band.verdict }}</strong>
              <span
                class="current-score"
                :class="{ visible: active === index }"
                :aria-hidden="active !== index"
              >
                <svg viewBox="0 0 16 16" aria-hidden="true">
                  <path d="m3 8 3 3 7-7" />
                </svg>
                Score guide
              </span>
            </div>
            <p>{{ descriptions[band.tone] }}</p>
          </td>
        </tr>
      </tbody>
    </table>
  </figure>
</template>

<style scoped>
.score-bands {
  margin: 28px 0 0;
  border: 1px solid var(--mj-glass-line);
  border-top: 2px solid var(--mj-reading-accent);
  border-radius: 12px;
  background: var(--mj-glass);
  overflow: hidden;
}
figcaption {
  display: grid;
  gap: 6px;
  padding: 22px 24px;
  border-bottom: 1px solid var(--vp-c-divider);
  font-size: 16px;
  font-weight: 500;
}
.score-deduction {
  font-size: 13px;
  font-weight: 400;
  color: var(--vp-c-text-2);
}
.score-bands table {
  display: table;
  width: 100%;
  margin: 0;
  border-collapse: collapse;
}
.score-bands :is(tr, th, td) {
  border: 0;
  background: transparent;
  text-align: left;
}
.score-bands thead th {
  padding: 14px 24px;
  font-size: 12px;
  font-weight: 400;
  color: var(--vp-c-text-3);
}
.score-bands tbody tr {
  border-top: 1px solid var(--vp-c-divider);
}
.score-bands tbody th {
  width: 104px;
  padding: 22px 0 22px 24px;
  vertical-align: top;
}
.score-bands td {
  padding: 20px 24px;
}
.band-range {
  font: 14px/1.65 var(--vp-font-family-mono);
  white-space: nowrap;
  color: var(--vp-c-text-2);
}
.band-heading {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px 16px;
}
.band-heading strong {
  font-size: 14px;
  font-weight: 500;
  letter-spacing: 0.025em;
}
.score-bands td p {
  margin: 7px 0 0;
  font-size: 14px;
  line-height: 1.6;
  color: var(--vp-c-text-2);
}
.band-critical {
  --band-color: var(--mj-unworthy);
}
.band-warning {
  --band-color: var(--mj-needswork);
}
.band-trusted {
  --band-color: var(--mj-trusted);
}
.band-forged {
  --band-color: var(--mj-forged-hot);
}
.score-bands tbody tr {
  transition:
    background 450ms ease,
    box-shadow 450ms ease;
}
.band-heading strong,
.band-range {
  color: var(--band-color);
}
.score-bands tr.current {
  background: color-mix(in srgb, var(--band-color) 9%, transparent);
  box-shadow: inset 3px 0 var(--band-color);
}
.current-score {
  display: inline-flex;
  opacity: 0;
  align-items: center;
  gap: 6px;
  font: 12px/1.5 var(--vp-font-family-mono);
  color: var(--band-color);
  transition: opacity 400ms ease;
}
.current-score.visible {
  opacity: 1;
}
.current-score svg {
  width: 15px;
  height: 15px;
  fill: none;
  stroke: currentColor;
  stroke-width: 1.7;
  stroke-linecap: round;
  stroke-linejoin: round;
}
/* Reveal in reading order; once settled, the active row remains still. */
tbody :is(.band-range, .band-heading, p) {
  transition:
    opacity 420ms ease,
    transform 420ms ease;
  transition-delay: calc(var(--row) * 90ms);
}
.mj-anim .score-bands:not([data-in]) tbody :is(.band-range, .band-heading, p) {
  opacity: 0;
  transform: translateY(6px);
}
.band-range {
  display: inline-block;
}
@media (max-width: 600px) {
  figcaption {
    padding: 20px;
  }
  .score-bands thead th {
    padding: 12px 20px;
  }
  .score-bands tbody th {
    width: 84px;
    padding: 18px 0 18px 20px;
  }
  .score-bands td {
    padding: 18px 20px 18px 12px;
  }
  .score-bands thead th:last-child {
    padding-left: 12px;
  }
  .band-range {
    font-size: 13px;
  }
  .current-score {
    font-size: 11px;
  }
}
@media (prefers-reduced-motion: reduce) {
  tbody :is(.band-range, .band-heading, p) {
    transition: none;
  }
}
</style>
