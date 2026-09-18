<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from "vue";

const canvas = ref<HTMLCanvasElement>();
let frame = 0;

type Particle = {
  x: number;
  lane: number;
  phase: number;
  speed: number;
  size: number;
};
let particles: Particle[] = [];

function render(time: number) {
  const el = canvas.value;
  if (!el) return;
  const rect = el.getBoundingClientRect();
  const scale = Math.min(devicePixelRatio || 1, 2);
  const width = Math.max(1, Math.floor(rect.width * scale));
  const height = Math.max(1, Math.floor(rect.height * scale));
  if (el.width !== width || el.height !== height) {
    el.width = width;
    el.height = height;
    particles = Array.from(
      { length: Math.max(260, Math.floor(rect.width / 2.6)) },
      (_, i) => ({
        x: (i * 71) % width,
        lane: i % 4,
        phase: ((i * 137) % 628) / 100,
        speed: 12 + ((i * 23) % 42),
        size: i % 11 === 0 ? 1.6 : 0.7,
      }),
    );
  }
  const ctx = el.getContext("2d");
  if (!ctx) return;
  ctx.clearRect(0, 0, width, height);
  const t = time / 1000;

  for (let lane = 0; lane < 4; lane++) {
    ctx.beginPath();
    for (let x = -20; x <= width + 20; x += 20) {
      const p = x / width;
      const y =
        height * (0.17 + lane * 0.2) +
        Math.sin(p * 8 + t * (0.35 + lane * 0.08) + lane) * height * 0.065 +
        (p - 0.5) * height * 0.12;
      if (x === -20) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.strokeStyle = `rgba(91, 189, 224, ${0.025 + lane * 0.008})`;
    ctx.lineWidth = scale;
    ctx.stroke();
  }

  for (const particle of particles) {
    const x = (particle.x + t * particle.speed * scale) % width;
    const y =
      height * (0.17 + particle.lane * 0.2) +
      Math.sin(
        (x / width) * 8 + t * (0.35 + particle.lane * 0.08) + particle.phase,
      ) *
        height *
        0.065 +
      (x / width - 0.5) * height * 0.12;
    const alpha = 0.09 + (Math.sin(t * 0.9 + particle.phase) + 1) * 0.085;
    ctx.fillStyle = `rgba(91, 189, 224, ${alpha})`;
    ctx.fillRect(x, y, particle.size * scale, particle.size * scale);
  }
  frame = requestAnimationFrame(render);
}

onMounted(() => {
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) {
    render(0);
    cancelAnimationFrame(frame);
    return;
  }
  frame = requestAnimationFrame(render);
});

onBeforeUnmount(() => cancelAnimationFrame(frame));
</script>

<template>
  <div class="signal-field" aria-hidden="true">
    <canvas ref="canvas" />
  </div>
</template>

<style scoped>
.signal-field {
  position: absolute;
  inset: 0;
  z-index: -1;
  overflow: hidden;
  pointer-events: none;
  opacity: 0.9;
}
canvas {
  width: 100%;
  height: 100%;
  display: block;
}
</style>
