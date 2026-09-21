<script setup lang="ts">
/**
 * The section rule.
 *
 * It used to centre a rune on the line — a different arbitrary glyph per
 * section (ᚦ ᛖ ᛗ ᛁ ᚨ ᛞ), set in the display face and glowing in the
 * brand's gold. Two rules broken at once: a rune belongs beside a
 * verdict or a state and never becomes ornament, and gold means forged,
 * certified, earned — not "here is a horizontal rule".
 *
 * What is left is the rule itself and one small lozenge, the pommel
 * shape from the foot of the mark, in the quiet neutral. It gives the
 * page its rhythm without claiming anything.
 *
 * The name stays: it is imported in a dozen places and renaming it would
 * be churn with no reader-visible benefit.
 */
</script>

<template>
  <div class="rune-divider" aria-hidden="true">
    <span class="line" />
    <span class="mark" />
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
.mark {
  width: 6px;
  height: 6px;
  flex: none;
  transform: rotate(45deg);
  background: var(--mj-steel-dim);
  opacity: 0.7;
}
</style>
