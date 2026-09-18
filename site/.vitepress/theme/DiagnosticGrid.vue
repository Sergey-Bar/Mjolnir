<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from "vue";

const canvas = ref<HTMLCanvasElement>();
let frame = 0;

type Particle = {
  x: number;
  y: number;
  drift: number;
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
      { length: Math.max(150, Math.floor(rect.width / 4)) },
      (_, i) => ({
        x: (i * 71) % width,
        y: (i * 137) % height,
        drift: 0.3 + ((i * 17) % 70) / 100,
        speed: 10 + ((i * 23) % 36),
        size: i % 9 === 0 ? 1.5 : 0.75,
      }),
    );
  }
  const ctx = el.getContext("2d");
  if (!ctx) return;
  ctx.clearRect(0, 0, width, height);
  const t = time / 1000;
  for (const particle of particles) {
    const x = (particle.x + t * particle.speed * scale) % width;
    const y =
      particle.y +
      Math.sin(t * particle.drift + particle.x * 0.012) * height * 0.08;
    const alpha = 0.08 + (Math.sin(t * 0.8 + particle.y) + 1) * 0.09;
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
@media (max-width: 720px) {
}
</style>
