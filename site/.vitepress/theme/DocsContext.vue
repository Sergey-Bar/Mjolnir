<script setup lang="ts">
import { computed } from "vue";
import { useData, withBase } from "vitepress";
const { page } = useData();
const section = computed(() => {
  const path = page.value.relativePath;
  if (path.startsWith("rules/")) return "Rules";
  if (path.startsWith("reference/")) return "Reference";
  return "Guide";
});
</script>

<template>
  <nav class="docs-context" aria-label="Documentation context">
    <div class="docs-location">
      <a :href="withBase('/')">Mjölnir</a><span aria-hidden="true">/</span
      ><span>{{ section }}</span>
    </div>
    <div class="docs-shortcuts">
      <a :href="withBase('/guide/getting-started')">Quick start</a>
      <a :href="withBase('/guide/example-report')">Example report</a>
      <a :href="withBase('/reference/cli')">CLI reference</a>
    </div>
  </nav>
</template>

<style scoped>
.docs-context {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 12px 24px;
  padding-bottom: 20px;
  margin-bottom: 28px;
  border-bottom: 1px solid var(--vp-c-divider);
  font-size: 12px;
  line-height: 1.6;
}
.docs-location,
.docs-shortcuts {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  align-items: center;
}
.docs-location {
  color: var(--vp-c-text-2);
}
.docs-shortcuts a {
  color: var(--vp-c-brand-1);
}
a {
  padding-block: 6px;
  text-underline-offset: 4px;
}
a:hover {
  text-decoration: underline;
}
a:focus-visible {
  outline: 2px solid var(--vp-c-brand-1);
  outline-offset: 4px;
  border-radius: 2px;
}
@media (max-width: 640px) {
  .docs-context {
    margin-bottom: 24px;
  }
  .docs-shortcuts a {
    padding-block: 10px;
  }
}
</style>
