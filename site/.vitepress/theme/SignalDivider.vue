<script setup lang="ts">
/**
 * The section rule.
 *
 * A quiet divider separates sections without borrowing any score or brand
 * symbol. The small neutral diamond gives the page rhythm without making a
 * claim about the state of a scan.
 */
</script>

<template>
  <div class="signal-divider" aria-hidden="true">
    <span class="line" />
    <span class="mark" />
    <span class="line" />
  </div>
</template>

<style scoped>
.signal-divider {
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
.mark {
  width: 6px;
  height: 6px;
  flex: none;
  transform: rotate(45deg);
  background: var(--qa-steel-dim);
  opacity: 0.7;
}
</style>
