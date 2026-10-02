<script setup lang="ts">
import type { TermLine } from "./home.data";

defineProps<{ lines: TermLine[]; title?: string }>();
</script>

<template>
  <figure class="term">
    <figcaption v-if="title" class="term-title">{{ title }}</figcaption>
    <pre
      class="term-body"
      tabindex="0"
    ><span v-for="(l, i) in lines" :key="i" class="tl" :style="{ '--i': i }"><span v-for="(s, j) in l" :key="j" :class="{ tb: s.b }" :style="s.c ? { color: s.c } : undefined">{{ s.t }}</span></span></pre>
  </figure>
</template>

<style scoped>
.term {
  margin: 0;
  min-width: 0;
  border: 1px solid var(--vp-c-border);
  border-radius: 8px;
  background: var(--mj-ink-950);
  overflow: hidden;
}
.term-title {
  padding: 10px 18px;
  border-bottom: 1px solid var(--vp-c-divider);
  font-family: var(--vp-font-family-mono);
  font-size: 12.5px;
  line-height: 1.4;
  color: var(--vp-c-text-3);
  white-space: normal;
  overflow-wrap: anywhere;
}
.term-body {
  margin: 0;
  padding: 18px 20px;
  font-family: var(--vp-font-family-mono);
  font-size: var(--mj-code-size);
  line-height: 1.55;
  color: var(--vp-c-text-2);
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}
.tl {
  display: block;
  min-height: 1.55em;
}
.tb {
  font-weight: 700;
}
</style>
