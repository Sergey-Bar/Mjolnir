<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref } from "vue";
import type { TermLine } from "./home.data";

const props = defineProps<{
  command: string;
  lines: TermLine[];
  title?: string;
}>();

// Server-rendered complete, so the output reads with no script at all;
// the replay only starts once a client is there to run it.
const isBar = (t: string) => /^[█▓]+$/.test(t);
const verdictTone = (line: TermLine[]) => {
  const text = line.map((span) => span.t).join("");
  return text.includes("TEST HEALTH") ||
    text.includes("Healthy test health") ||
    /^\s*[█▓]/.test(text)
    ? "health"
    : "";
};
const typed = ref(props.command.length);
const shown = ref(props.lines.length);
const playing = ref(false);
const body = ref<HTMLElement>();
let timer = 0;
let io: IntersectionObserver | undefined;

function follow() {
  nextTick(() => {
    if (body.value) body.value.scrollTop = body.value.scrollHeight;
  });
}

function play() {
  clearTimeout(timer);
  typed.value = 0;
  shown.value = 0;
  playing.value = true;
  if (body.value) body.value.scrollTop = 0;
  const step = () => {
    if (typed.value < props.command.length) {
      typed.value++;
      timer = window.setTimeout(step, 45);
    } else if (shown.value < props.lines.length) {
      shown.value++;
      follow();
      timer = window.setTimeout(step, shown.value === 1 ? 480 : 45);
    } else {
      playing.value = false;
    }
  };
  timer = window.setTimeout(step, 350);
}

onMounted(() => {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  typed.value = 0;
  shown.value = 0;
  io = new IntersectionObserver(
    ([entry]) => {
      if (!entry?.isIntersecting) return;
      io?.disconnect();
      play();
    },
    { threshold: 0.35 },
  );
  if (body.value) io.observe(body.value);
});

onBeforeUnmount(() => {
  clearTimeout(timer);
  io?.disconnect();
});
</script>

<template>
  <figure class="st">
    <figcaption class="st-bar">
      <span class="st-dots" aria-hidden="true"><i /><i /><i /></span>
      <span class="st-title">{{ title }}</span>
      <button type="button" class="st-replay" :disabled="playing" @click="play">
        Replay
      </button>
    </figcaption>
    <pre
      ref="body"
      class="st-body"
      tabindex="0"
    ><span class="tl"><span class="st-prompt">$ </span>{{ command.slice(0, typed) }}<span v-if="typed < command.length" class="st-caret" aria-hidden="true" /></span><span v-for="(l, i) in lines.slice(0, shown)" :key="i" :class="['tl', verdictTone(l)]"><span v-for="(s, j) in l" :key="j" :class="{ tb: s.b, bar: isBar(s.t) }" :style="s.c ? { color: s.c } : undefined">{{ s.t }}</span></span></pre>
  </figure>
</template>

<style scoped>
.st {
  position: relative;
  margin: 0;
  min-width: 0;
  border: 1px solid var(--vp-c-border);
  border-radius: 10px;
  background: var(--qa-ink-950);
  overflow: hidden;
}
.st::before {
  content: "";
  position: absolute;
  inset: 0 0 auto;
  height: 2px;
  background: var(--qa-steel);
}
.st-bar {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 8px 10px 8px 16px;
  border-bottom: 1px solid var(--vp-c-divider);
}
.st-dots {
  display: flex;
  gap: 7px;
}
.st-dots i {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: var(--qa-ink-800);
}
.st-title {
  flex: 1;
  min-width: 0;
  font-family: var(--vp-font-family-mono);
  font-size: 12.5px;
  color: var(--vp-c-text-3);
  text-align: center;
}
.st-replay {
  min-height: 30px;
  padding: 0 12px;
  border: 1px solid var(--vp-c-border);
  border-radius: 6px;
  font-size: 12.5px;
  font-weight: 500;
  color: var(--vp-c-text-2);
  cursor: pointer;
  transition: color 120ms cubic-bezier(0.2, 0, 0, 1);
}
.st-replay:hover:not(:disabled) {
  color: var(--vp-c-text-1);
}
.st-replay:disabled {
  opacity: 0.45;
  cursor: default;
}
/* A system monospace on purpose: the Geist Mono web subset has no
   box-drawing or block glyphs, and mixing faces breaks the columns. */
.st-body {
  height: 400px;
  margin: 0;
  padding: 18px 20px;
  font-family:
    ui-monospace, "SF Mono", "Cascadia Code", "Cascadia Mono", Consolas,
    "DejaVu Sans Mono", Menlo, monospace;
  font-size: clamp(10px, 2.6vw, 13px);
  line-height: 1.55;
  color: var(--vp-c-text-2);
  white-space: pre;
  overflow: auto;
}
.tl {
  display: block;
  min-height: 1.55em;
  animation: line-in 260ms cubic-bezier(0.2, 0, 0, 1) both;
}
.bar {
  display: inline-block;
  animation: wipe 700ms cubic-bezier(0.2, 0, 0, 1) both;
}
@keyframes line-in {
  from {
    opacity: 0;
    transform: translateY(4px);
  }
}
@keyframes wipe {
  from {
    clip-path: inset(0 100% 0 0);
  }
}
.tb {
  font-weight: 700;
}
.health > span {
  color: var(--qa-healthy) !important;
}
.st-prompt {
  color: var(--vp-c-text-3);
}
.st-caret {
  display: inline-block;
  width: 0.6em;
  height: 1.1em;
  margin-left: 1px;
  vertical-align: -0.15em;
  background: var(--vp-c-text-2);
}
@media (max-width: 560px) {
  .st-body {
    height: 340px;
  }
}
@media (prefers-reduced-motion: reduce) {
  .st-replay {
    transition: none;
  }
  .tl,
  .bar {
    animation: none;
  }
}
</style>
