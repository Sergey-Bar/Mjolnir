<script setup lang="ts">
defineProps<{
  findings: Array<{ rule: string; severity: string }>;
  score: number;
}>();
</script>

<template>
  <div class="diagnostic-grid" aria-hidden="true">
    <div class="grid-lines">
      <i v-for="n in 12" :key="`v-${n}`" class="v" :style="{ '--pos': n }" />
      <i v-for="n in 7" :key="`h-${n}`" class="h" :style="{ '--pos': n }" />
    </div>
    <div class="scan-line" />
    <div class="readout score-readout">
      <span>TEST HEALTH</span>
      <strong>{{ score }}/100</strong>
    </div>
    <div
      v-for="(finding, index) in findings.slice(0, 3)"
      :key="finding.rule"
      class="finding-node"
      :class="finding.severity"
      :style="{ '--node': index }"
    >
      <span class="node-dot" />
      <span>{{ finding.rule }}</span>
    </div>
    <div class="readout scan-readout">
      <span>SCAN STATUS</span>
      <strong>COMPLETE</strong>
    </div>
  </div>
</template>

<style scoped>
.diagnostic-grid {
  position: absolute;
  inset: 0;
  z-index: -1;
  overflow: hidden;
  pointer-events: none;
  color: var(--qa-info);
  opacity: 0.72;
}
.grid-lines,
.grid-lines i {
  position: absolute;
  inset: 0;
}
.grid-lines i {
  display: block;
  opacity: 0.28;
}
.grid-lines .v {
  left: calc((100% / 13) * var(--pos));
  right: auto;
  width: 1px;
  background: currentColor;
}
.grid-lines .h {
  top: calc((100% / 8) * var(--pos));
  bottom: auto;
  height: 1px;
  background: currentColor;
}
.scan-line {
  position: absolute;
  top: 34%;
  left: 0;
  width: 100%;
  height: 1px;
  background: var(--qa-healthy);
  box-shadow: 0 0 10px color-mix(in srgb, var(--qa-healthy) 42%, transparent);
  animation: scan 7s linear infinite;
}
.readout,
.finding-node {
  position: absolute;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 7px 9px;
  border: 1px solid color-mix(in srgb, currentColor 38%, transparent);
  background: color-mix(in srgb, var(--qa-ink-950) 88%, transparent);
  font-family: var(--vp-font-family-mono);
  font-size: 10px;
  letter-spacing: 0.06em;
  line-height: 1;
  color: var(--qa-info);
}
.readout span {
  color: var(--qa-steel-dim);
}
.readout strong {
  font-weight: 600;
}
.score-readout {
  top: 18%;
  right: 13%;
  color: var(--qa-healthy);
}
.scan-readout {
  right: 7%;
  bottom: 16%;
  color: var(--qa-healthy);
}
.finding-node {
  top: calc(48% + var(--node) * 13%);
  left: calc(10% + var(--node) * 19%);
}
.finding-node.error {
  color: var(--qa-critical);
}
.finding-node.warning {
  color: var(--qa-attention);
}
.finding-node.info {
  color: var(--qa-info);
}
.node-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: currentColor;
}
@keyframes scan {
  0%,
  100% {
    transform: translateY(-20px);
    opacity: 0.3;
  }
  50% {
    transform: translateY(110px);
    opacity: 0.9;
  }
}
@media (max-width: 720px) {
  .finding-node:nth-of-type(n + 2),
  .score-readout {
    display: none;
  }
}
@media (prefers-reduced-motion: reduce) {
  .scan-line {
    animation: none;
  }
}
</style>
