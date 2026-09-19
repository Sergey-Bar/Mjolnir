<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from "vue";

const canvas = ref<HTMLCanvasElement>();
let frame = 0;
let lastPaint = 0;
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
  scale = Math.min(window.devicePixelRatio || 1, 1.5);
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
        lane: i % 3,
        phase: ((i * 137) % 628) / 100,
        speed: 14 + ((i * 23) % 48),
        size: i % 13 === 0 ? 1.8 : 0.75,
      }),
    );
  }
  if (still) render(0);
}

function signalY(x: number, lane: number, t: number) {
  const p = x / width;
  const direction = lane % 2 === 0 ? 1 : -1;
  return (
    height * (0.12 + lane * 0.24) +
    Math.sin(p * (4.6 + lane * 0.35) + t * (0.14 + lane * 0.025) + lane) *
      height *
      (0.11 + lane * 0.012) +
    (p - 0.5) * height * 0.18 * direction
  );
}

function traceSignal(
  ctx: CanvasRenderingContext2D,
  lane: number,
  t: number,
  offset = 0,
  bandWidth = 0,
) {
  ctx.beginPath();
  for (let x = -40; x <= width + 40; x += 18 * scale) {
    const p = x / width;
    const breadth =
      bandWidth * (0.84 + Math.sin(p * 3.2 + t * 0.18 + lane) * 0.16);
    const y = signalY(x, lane, t) + offset * breadth;
    if (x === -40) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
}

function render(time: number) {
  frame = 0;
  if (!still && time - lastPaint < 1000 / 30) {
    frame = requestAnimationFrame(render);
    return;
  }
  lastPaint = time;
  const el = canvas.value;
  if (!el || !colors.length) return;
  const ctx = el.getContext("2d");
  if (!ctx) return;
  ctx.clearRect(0, 0, width, height);
  const t = time / 1000;

  ctx.globalCompositeOperation = "screen";
  for (let lane = 0; lane < 3; lane++) {
    const ribbon = ctx.createLinearGradient(0, 0, width, 0);
    ribbon.addColorStop(0, colors[(lane + 1) % colors.length]);
    ribbon.addColorStop(0.42, colors[lane % colors.length]);
    ribbon.addColorStop(0.72, colors[(lane + 2) % colors.length]);
    ribbon.addColorStop(1, colors[lane % colors.length]);

    const bandWidth = height * (0.24 - lane * 0.014);
    const stripeCount = 18;
    ctx.strokeStyle = ribbon;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.setLineDash([]);
    ctx.globalAlpha = 0.024 + lane * 0.003;
    ctx.lineWidth = bandWidth * 0.9;
    traceSignal(ctx, lane, t);
    ctx.stroke();

    ctx.lineWidth = (bandWidth / stripeCount) * 1.65;
    for (let stripe = 0; stripe < stripeCount; stripe++) {
      const u = (stripe / (stripeCount - 1)) * 2 - 1;
      const profile = Math.cos((u * Math.PI) / 2) ** 2;
      const sheen =
        0.34 + 0.66 * Math.cos((u * 1.55 - lane * 0.18) * Math.PI) ** 2;
      ctx.globalAlpha = 0.006 + profile * sheen * (0.058 + lane * 0.004);
      traceSignal(ctx, lane, t, u * 0.5, bandWidth);
      ctx.stroke();
    }

    traceSignal(ctx, lane, t);
    ctx.globalAlpha = 0.17;
    ctx.lineWidth = 1.1 * scale;
    ctx.setLineDash([1.5 * scale, 21 * scale]);
    ctx.lineDashOffset = -t * (8 + lane * 2.5) * scale;
    ctx.stroke();
  }
  ctx.setLineDash([]);
  ctx.globalCompositeOperation = "source-over";

  for (const particle of particles) {
    const x = (particle.x + t * particle.speed * scale) % width;
    const y =
      signalY(x, particle.lane, t) +
      Math.sin(t * 0.55 + particle.phase) * 5 * scale;
    ctx.fillStyle = colors[particle.lane % colors.length];
    ctx.globalAlpha = 0.08 + (Math.sin(t * 0.8 + particle.phase) + 1) * 0.06;
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
  opacity: 0.94;
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
