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
      <i
        v-for="n in 4"
        :key="`trace-${n}`"
        :style="{
          top: `${13 + n * 19}%`,
          right: `${-8 + n * 5}%`,
          opacity: `${0.08 + n * 0.035}`,
          transform: `rotate(${-9 + n * 4}deg)`,
        }"
      />
    </div>
    <div class="signal-ribbons">
      <i
        v-for="n in 3"
        :key="`ribbon-${n}`"
        :style="{
          top: `${18 + n * 24}%`,
          opacity: `${0.16 + n * 0.08}`,
          animationDuration: `${8 + n * 2}s`,
        }"
      />
    </div>
    <div class="signal-points">
      <i v-for="n in 14" :key="`point-${n}`" :style="{ '--point': n }" />
    </div>
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
.signal-ribbons,
.signal-points,
.signal-traces i,
.signal-ribbons i,
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
  bottom: auto;
  left: auto;
  width: clamp(180px, 30vw, 460px);
  height: 1px;
  background: linear-gradient(90deg, transparent, var(--qa-steel), transparent);
  transform-origin: right;
}
.signal-ribbons {
  inset: -12% -8%;
  opacity: 0.85;
  transform: rotate(-13deg);
}
.signal-ribbons i {
  left: -20%;
  right: auto;
  bottom: auto;
  width: 78%;
  height: clamp(36px, 6vw, 76px);
  border-top: 1px solid
    color-mix(in srgb, var(--qa-gold-bright) 48%, transparent);
  border-radius: 50%;
  background: linear-gradient(
    90deg,
    transparent 8%,
    color-mix(in oklch, var(--qa-gold) 6%, transparent) 46%,
    transparent 82%
  );
  filter: blur(0.1px);
  animation: ribbon-flow ease-in-out infinite;
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
@keyframes ribbon-flow {
  0%,
  100% {
    transform: translateX(-8%) scaleX(0.86);
  }
  50% {
    transform: translateX(72%) scaleX(1.08);
  }
}
@media (max-width: 720px) {
  .finding-node:nth-of-type(n + 2),
  .score-readout {
    display: none;
  }
}
@media (prefers-reduced-motion: reduce) {
  .signal-ribbons i {
    animation: none;
  }
}
</style>
