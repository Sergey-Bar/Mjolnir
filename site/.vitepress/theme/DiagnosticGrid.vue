<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from "vue";

const canvas = ref<HTMLCanvasElement>();
let frame = 0;
let width = 1;
let height = 1;
let scale = 1;
let colors: string[] = [];
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
  const styles = getComputedStyle(el);
  colors = ["--qa-info", "--qa-steel", "--qa-healthy"].map((token) =>
    styles.getPropertyValue(token).trim(),
  );
  if (el.width !== width || el.height !== height) {
    el.width = width;
    el.height = height;
    particles = Array.from(
      { length: Math.max(260, Math.floor(rect.width / 2.7)) },
      (_, i) => ({
        x: (i * 71) % width,
        lane: i % 4,
        phase: ((i * 137) % 628) / 100,
        speed: 14 + ((i * 23) % 48),
        size: i % 13 === 0 ? 1.8 : 0.75,
      }),
    );
  }
  if (still) render(0);
}

function render(time: number) {
  frame = 0;
  const el = canvas.value;
  if (!el || !colors.length) return;
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
    ctx.strokeStyle = colors[lane % colors.length];
    ctx.globalAlpha = 0.045 + lane * 0.01;
    ctx.lineWidth = scale;
    ctx.setLineDash([]);
    ctx.stroke();

    ctx.globalAlpha = 0.11 + lane * 0.012;
    ctx.lineWidth = 1.25 * scale;
    ctx.setLineDash([1.5 * scale, 18 * scale]);
    ctx.lineDashOffset = -t * (10 + lane * 3) * scale;
    ctx.stroke();
  }
  ctx.setLineDash([]);

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
    ctx.fillStyle = colors[particle.lane % colors.length];
    ctx.globalAlpha = 0.1 + (Math.sin(t * 0.9 + particle.phase) + 1) * 0.075;
    ctx.fillRect(
      x,
      y,
      particle.size * scale * (particle.size > 1 ? 2.4 : 1),
      particle.size * scale,
    );
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
  opacity: 0.9;
  mask-image: linear-gradient(
    to bottom,
    rgba(0, 0, 0, 0.78),
    #000 42%,
    rgba(0, 0, 0, 0.5)
  );
}
canvas {
  display: block;
  width: 100%;
  height: 100%;
}
</style>
