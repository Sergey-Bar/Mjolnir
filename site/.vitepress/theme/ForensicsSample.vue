<script setup lang="ts">
/**
 * Renders a committed forensics sample as terminal text.
 *
 * The two samples are real tool output, committed by
 * `npm run docs:forensics-samples` and drift-locked by
 * tests/forensics-sample-reproducibility.spec.ts — this wrapper only
 * displays them. Before this component existed the same blocks were
 * hand-typed in guide/forensics.md, and they had drifted: the page
 * claimed 83/100 for checkout.spec.ts while the tool printed 86/100 and
 * omitted login.spec.ts entirely (site UX gap-closure plan, G5).
 *
 * No-JS safe: the text is in the HTML at build time; nothing is fetched
 * or hydrated. `?raw` keeps every byte of the tool's own rendering,
 * including the block bars, instead of re-flowing it as prose.
 */
import sample from "./generated/forensics-sample.txt?raw";
import selector from "./generated/selector-health-sample.txt?raw";

const props = defineProps<{ which: "forensics" | "selector-health" }>();

const text = props.which === "forensics" ? sample : selector;
</script>

<template>
  <pre class="mj-sample">{{ text }}</pre>
</template>

<style scoped>
.mj-sample {
  font-family: var(--vp-font-family-mono);
  font-size: 0.8rem;
  line-height: 1.55;
  padding: 0.9rem 1.1rem;
  margin: 0.8rem 0 1.4rem;
  overflow-x: auto;
  border: 1px solid var(--vp-c-border);
  border-radius: 10px;
  background: var(--mj-forge-950);
  color: var(--vp-c-text-1);
}
</style>
