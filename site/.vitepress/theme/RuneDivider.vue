<script setup lang="ts">
withDefaults(defineProps<{ rune?: string }>(), { rune: "ᛏ" });
</script>

<template>
  <div class="rune-divider" aria-hidden="true">
    <span class="line" />
    <span class="glyph">{{ rune }}</span>
    <span class="line" />
  </div>
</template>

<style scoped>
.rune-divider {
  display: flex;
  align-items: center;
  gap: 1.1rem;
  width: min(680px, 82%);
  margin: 2.4rem auto;
  color: var(--vp-c-text-3);
}
.line {
  flex: 1;
  height: 1px;
  background: linear-gradient(
    to var(--dir, right),
    transparent,
    var(--vp-c-divider) 30%,
    var(--vp-c-divider)
  );
}
.line:last-child {
  --dir: left;
}
.glyph {
  font-family: var(--mj-display);
  font-size: 1.15rem;
  color: var(--vp-c-brand-1);
  text-shadow: 0 0 14px rgba(224, 180, 67, 0.4);
  letter-spacing: 0.1em;
}
</style>
