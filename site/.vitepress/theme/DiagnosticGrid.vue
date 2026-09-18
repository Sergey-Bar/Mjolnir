<script setup lang="ts">
defineProps<{
  findings: Array<{ rule: string; severity: string }>;
  score: number;
}>();
</script>

<template>
  <div class="signal-field" aria-hidden="true">
    <div class="signal-noise" />
    <div class="signal-traces">
      <i v-for="n in 4" :key="`trace-${n}`" :style="{ '--trace': n }" />
    </div>
    <div class="signal-points">
      <i v-for="n in 14" :key="`point-${n}`" :style="{ '--point': n }" />
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
.signal-field {
  position: absolute;
  inset: 0;
  z-index: -1;
  overflow: hidden;
  pointer-events: none;
  color: var(--qa-steel);
  opacity: 0.84;
}
.signal-noise,
.signal-traces,
.signal-points,
.signal-traces i,
.signal-points i {
  position: absolute;
  inset: 0;
}
.signal-noise {
  opacity: 0.23;
  background-image: radial-gradient(
    circle,
    rgba(234, 238, 245, 0.46) 0 0.7px,
    transparent 0.9px
  );
  background-size: 19px 19px;
  mask-image: radial-gradient(ellipse at 78% 38%, #000, transparent 64%);
}
.signal-traces i {
  display: block;
  top: calc(13% + var(--trace) * 19%);
  right: calc(-8% + var(--trace) * 5%);
  bottom: auto;
  left: auto;
  width: clamp(180px, 30vw, 460px);
  height: 1px;
  opacity: calc(0.08 + var(--trace) * 0.035);
  background: linear-gradient(90deg, transparent, var(--qa-steel), transparent);
  transform: rotate(calc(-9deg + var(--trace) * 4deg));
  transform-origin: right;
}
.signal-points i {
  top: 16%;
  left: 63%;
  right: auto;
  bottom: auto;
  width: 3px;
  height: 3px;
  border-radius: 50%;
  background: var(--qa-steel);
  box-shadow: 0 0 9px color-mix(in srgb, var(--qa-steel) 42%, transparent);
  opacity: 0.34;
}
.signal-points i:nth-child(2n) {
  opacity: 0.52;
}
.signal-points i:nth-child(3n) {
  opacity: 0.2;
}
.signal-points i:nth-child(2) {
  top: 28%;
  left: 78%;
}
.signal-points i:nth-child(3) {
  top: 42%;
  left: 58%;
}
.signal-points i:nth-child(4) {
  top: 66%;
  left: 70%;
}
.signal-points i:nth-child(5) {
  top: 81%;
  left: 85%;
}
.signal-points i:nth-child(6) {
  top: 18%;
  left: 91%;
}
.signal-points i:nth-child(7) {
  top: 37%;
  left: 88%;
}
.signal-points i:nth-child(8) {
  top: 55%;
  left: 79%;
}
.signal-points i:nth-child(9) {
  top: 74%;
  left: 62%;
}
.signal-points i:nth-child(10) {
  top: 88%;
  left: 74%;
}
.signal-points i:nth-child(11) {
  top: 12%;
  left: 71%;
}
.signal-points i:nth-child(12) {
  top: 48%;
  left: 95%;
}
.signal-points i:nth-child(13) {
  top: 71%;
  left: 92%;
}
.signal-points i:nth-child(14) {
  top: 31%;
  left: 68%;
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
