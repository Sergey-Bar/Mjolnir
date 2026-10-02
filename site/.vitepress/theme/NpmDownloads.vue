<script setup lang="ts">
import { onMounted, onBeforeUnmount, ref } from "vue";
// Verified snapshot; measurement dates remain in the accessible description.
const stats = ref({ downloads: 5600, start: "2026-08-29", end: "2026-09-27" });
const controller = new AbortController();
const displayed = ref(stats.value.downloads);
const counter = ref<HTMLElement>();
let observer: IntersectionObserver | undefined;
let revealed = false;
let frame = 0;
let reduced = false;
function animateCount(to: number) {
  cancelAnimationFrame(frame);
  if (reduced || matchMedia("(prefers-reduced-motion: reduce)").matches) {
    displayed.value = to;
    return;
  }
  const from = displayed.value;
  const start = performance.now();
  const tick = (now: number) => {
    const progress = Math.min(1, (now - start) / 1200);
    displayed.value = Math.round(
      from + (to - from) * (1 - Math.pow(1 - progress, 3)),
    );
    if (progress < 1) frame = requestAnimationFrame(tick);
  };
  frame = requestAnimationFrame(tick);
}
onMounted(async () => {
  reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (!reduced) displayed.value = 0;
  observer = new IntersectionObserver(
    ([entry]) => {
      if (!entry.isIntersecting) return;
      revealed = true;
      animateCount(stats.value.downloads);
      observer?.disconnect();
    },
    { threshold: 0.5 },
  );
  if (counter.value) observer.observe(counter.value);
  const timeout = setTimeout(() => controller.abort(), 5000);
  try {
    const response = await fetch(
      "https://api.npmjs.org/downloads/point/last-month/mjolnir-qa",
      { signal: controller.signal },
    );
    if (!response.ok) return;
    const value = await response.json();
    if (
      value.package === "mjolnir-qa" &&
      Number.isSafeInteger(value.downloads) &&
      value.downloads >= 0 &&
      /^\d{4}-\d{2}-\d{2}$/.test(value.start) &&
      /^\d{4}-\d{2}-\d{2}$/.test(value.end)
    ) {
      stats.value = value;
      if (revealed) animateCount(value.downloads);
    }
  } catch {
    /* Retain the explicitly dated snapshot. */
  } finally {
    clearTimeout(timeout);
  }
});
onBeforeUnmount(() => {
  controller.abort();
  cancelAnimationFrame(frame);
  observer?.disconnect();
});
</script>

<template>
  <a
    ref="counter"
    class="npm-downloads"
    href="https://www.npmjs.com/package/mjolnir-qa"
    :aria-label="`${stats.downloads.toLocaleString('en-US')} npm downloads over 30 days, ${stats.start} to ${stats.end}. View on npm.`"
    title="npm downloads · 30 days"
  >
    <span aria-hidden="true">Mjölnir ·</span>
    <span class="npm-value" aria-hidden="true">
      <svg viewBox="0 0 24 24">
        <path d="M12 3v12m-4-4 4 4 4-4M5 17v4h14v-4" />
      </svg>
      <span>{{ displayed.toLocaleString("en-US") }}</span>
    </span>
    <span class="npm-label" aria-hidden="true">npm downloads in 30 days</span>
  </a>
</template>

<style scoped>
.npm-downloads {
  display: flex;
  width: fit-content;
  max-width: 100%;
  margin: 6px auto 0;
  flex-wrap: wrap;
  justify-content: center;
  align-items: center;
  gap: 4px 7px;
  min-height: 32px;
  padding: 4px 0;
  color: var(--vp-c-text-2);
  border-radius: 6px;
  text-decoration: none;
  font-size: 12px;
}
.npm-value {
  display: flex;
  align-items: center;
  gap: 5px;
}
.npm-value span {
  min-width: 5ch;
  color: var(--mj-aurora-cyan);
  font: 500 13px/1.3 var(--vp-font-family-mono);
  font-variant-numeric: tabular-nums;
}
svg {
  width: 14px;
  height: 14px;
  fill: none;
  stroke: var(--mj-aurora-cyan);
  stroke-width: 1.7;
  stroke-linecap: round;
  stroke-linejoin: round;
}
.npm-label {
  line-height: 1.5;
}
.npm-downloads:hover {
  color: var(--mj-aurora-cyan);
}
.npm-downloads:focus-visible {
  outline: 2px solid var(--mj-aurora-cyan);
  outline-offset: 4px;
}
</style>
