<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from "vue";

const canvas = ref<HTMLCanvasElement>();
let frame = 0;
let width = 1;
let height = 1;
let scale = 1;
let color = "";
let visible = true;
let still = false;
let resizeObserver: ResizeObserver | undefined;
let visibilityObserver: IntersectionObserver | undefined;

type Particle = {
  x: number;
  lane: number;
  phase: number;
  speed: number;
  size: number;
};
let particles: Particle[] = [];

function resize() {
  const el = canvas.value;
  if (!el) return;
  const rect = el.getBoundingClientRect();
  scale = Math.min(window.devicePixelRatio || 1, 2);
  width = Math.max(1, Math.floor(rect.width * scale));
  height = Math.max(1, Math.floor(rect.height * scale));
  color = getComputedStyle(el).getPropertyValue("--qa-info").trim();
  if (el.width !== width || el.height !== height) {
    el.width = width;
    el.height = height;
    particles = Array.from(
      { length: Math.max(220, Math.floor(rect.width / 3.2)) },
      (_, i) => ({
        x: (i * 71) % width,
        lane: i % 4,
        phase: ((i * 137) % 628) / 100,
        speed: 12 + ((i * 23) % 42),
        size: i % 11 === 0 ? 1.5 : 0.65,
      }),
    );
  }
  if (still) render(0);
}

function render(time: number) {
  frame = 0;
  const el = canvas.value;
  if (!el || !color) return;
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
    ctx.strokeStyle = color;
    ctx.globalAlpha = 0.025 + lane * 0.008;
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
    ctx.fillStyle = color;
    ctx.globalAlpha = 0.07 + (Math.sin(t * 0.9 + particle.phase) + 1) * 0.065;
    ctx.fillRect(x, y, particle.size * scale, particle.size * scale);
  }
  ctx.globalAlpha = 1;
  if (!still && visible && !document.hidden)
    frame = requestAnimationFrame(render);
}

function start() {
  if (!still && visible && !document.hidden && !frame)
    frame = requestAnimationFrame(render);
}

function stop() {
  cancelAnimationFrame(frame);
  frame = 0;
}

onMounted(() => {
  still = matchMedia("(prefers-reduced-motion: reduce)").matches;
  resizeObserver = new ResizeObserver(resize);
  if (canvas.value) resizeObserver.observe(canvas.value);
  resize();
  if (still) {
    render(0);
    return;
  }
  visibilityObserver = new IntersectionObserver((entries) => {
    visible = entries.some((entry) => entry.isIntersecting);
    if (visible) start();
    else stop();
  });
  const field = canvas.value?.parentElement;
  if (field) visibilityObserver.observe(field);
  document.addEventListener("visibilitychange", start);
  start();
});

onBeforeUnmount(() => {
  stop();
  resizeObserver?.disconnect();
  visibilityObserver?.disconnect();
  document.removeEventListener("visibilitychange", start);
});
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
  opacity: 0.68;
}
canvas {
  display: block;
  width: 100%;
  height: 100%;
}
</style>
