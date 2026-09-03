<script setup lang="ts">
/**
 * A 404 that helps instead of apologising.
 *
 * The most common way to land here is a rule ID that has been retired or
 * mistyped — rule pages are the site's deepest, most linkable surface —
 * so the page points at the catalog and the guide rather than just
 * saying the page is gone (plan §4, Phase 6).
 */
import { withBase } from "vitepress";
import rules from "../../rules/rules.data.json";

const ruleCount = (rules as unknown[]).length;
</script>

<template>
  <div class="nf">
    <p class="code">404</p>
    <h1>That page isn't here.</h1>
    <p class="lede">
      If you followed a rule ID, it may have been retired or renamed — rule IDs
      are never reused, so a retired one keeps its page until it is removed.
    </p>
    <div class="links">
      <a class="primary" :href="withBase('/rules/')"
        >Search all {{ ruleCount }} rules</a
      >
      <a :href="withBase('/guide/getting-started')">Getting started</a>
      <a :href="withBase('/reference/rule-lifecycle')">Rule lifecycle</a>
    </div>
  </div>
</template>

<style scoped>
.nf {
  max-width: 40rem;
  margin: 0 auto;
  padding: 6rem 1.5rem 8rem;
  text-align: center;
}
.code {
  font-family: var(--vp-font-family-mono);
  font-size: 0.8rem;
  letter-spacing: 0.22em;
  color: var(--vp-c-brand-1);
  margin: 0;
}
h1 {
  font-family: var(--mj-display);
  font-weight: 600;
  font-size: clamp(1.6rem, 5vw, 2.2rem);
  line-height: 1.2;
  margin: 0.7rem 0 0;
  text-wrap: balance;
}
.lede {
  margin: 1rem auto 0;
  max-width: 46ch;
  color: var(--vp-c-text-2);
  line-height: 1.7;
}
.links {
  display: flex;
  flex-wrap: wrap;
  gap: 0.7rem;
  justify-content: center;
  margin-top: 2rem;
}
.links a {
  border: 1px solid var(--vp-c-border);
  border-radius: 8px;
  padding: 0.5rem 0.95rem;
  font-size: 0.9rem;
  text-decoration: none;
  color: var(--vp-c-text-1);
}
.links a:hover {
  border-color: var(--vp-c-brand-1);
}
.links a.primary {
  background: var(--vp-c-brand-1);
  border-color: var(--vp-c-brand-1);
  color: var(--vp-c-bg);
}
</style>
