<script setup lang="ts">
import { useData } from "vitepress";
import NpmDownloads from "./NpmDownloads.vue";
const { frontmatter } = useData();
</script>

<template>
  <footer v-if="frontmatter.pageClass === 'mj-landing'" class="landing-footer">
    <p>Released under the MIT License.</p>
    <NpmDownloads />
    <p class="credit">
      Built by
      <a
        href="https://www.linkedin.com/in/sergeybar/"
        target="_blank"
        rel="noreferrer"
        >Sergey Bar</a
      >
    </p>
  </footer>
</template>

<style scoped>
.landing-footer {
  padding: 32px 24px;
  border-top: 1px solid var(--vp-c-gutter);
  background: var(--vp-c-bg);
  text-align: center;
  color: var(--vp-c-text-2);
  font-size: 13px;
  line-height: 1.7;
}
.credit {
  margin-top: 12px;
  font-size: 12px;
}
a {
  text-decoration: underline;
  text-underline-offset: 3px;
}
a:hover {
  color: var(--vp-c-text-1);
}
a:focus-visible {
  outline: 2px solid var(--mj-aurora-cyan);
  outline-offset: 4px;
}
</style>
