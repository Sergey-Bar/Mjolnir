<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from "vue";

const props = defineProps<{ command: string }>();
const copied = ref(false);
let timer = 0;
let still = true;

onMounted(() => {
  still = matchMedia("(prefers-reduced-motion: reduce)").matches;
});
onBeforeUnmount(() => clearTimeout(timer));

async function copy() {
  try {
    await navigator.clipboard.writeText(props.command);
  } catch {
    return;
  }
  copied.value = true;
  clearTimeout(timer);
  timer = window.setTimeout(() => (copied.value = false), 1600);
}

/** The key leans a few pixels toward a mouse pointer. Touch never moves it. */
function lean(e: PointerEvent) {
  if (still || e.pointerType !== "mouse") return;
  const k = e.currentTarget as HTMLElement;
  const b = k.getBoundingClientRect();
  const dx = (e.clientX - (b.left + b.width / 2)) / b.width;
  const dy = (e.clientY - (b.top + b.height / 2)) / b.height;
  k.style.transform = `translate(${(dx * 10).toFixed(1)}px, ${(dy * 8).toFixed(1)}px)`;
}
function rest(e: PointerEvent) {
  (e.currentTarget as HTMLElement).style.transform = "";
}
</script>

<template>
  <div class="key" @pointermove="lean" @pointerleave="rest">
    <code>{{ command }}</code>
    <button
      type="button"
      :class="{ done: copied }"
      :aria-label="`Copy ${command}`"
      aria-live="polite"
      @click="copy"
    >
      <svg v-if="copied" viewBox="0 0 16 16" aria-hidden="true">
        <path d="M3 8.5 6.5 12 13 4.5" />
      </svg>
      {{ copied ? "Copied" : "Copy" }}
    </button>
  </div>
</template>

<style scoped>
.key {
  display: inline-flex;
  max-width: 100%;
  border: 1px solid var(--vp-c-border);
  border-radius: 8px;
  background: var(--qa-ink-950);
  transition:
    transform 380ms cubic-bezier(0.2, 0, 0, 1),
    box-shadow 380ms cubic-bezier(0.2, 0, 0, 1),
    border-color 380ms cubic-bezier(0.2, 0, 0, 1);
}
.key:hover {
  border-color: color-mix(in srgb, var(--qa-aurora-cyan) 40%, transparent);
  box-shadow: 0 10px 40px -12px
    color-mix(in srgb, var(--qa-aurora-cyan) 45%, transparent);
}
.key code {
  padding: 13px 16px;
  font-family: var(--vp-font-family-mono);
  font-size: 14px;
  line-height: 20px;
  color: var(--vp-c-text-1);
  white-space: nowrap;
  overflow-x: auto;
  background: none;
  border-radius: 0;
}
.key code::before {
  content: "$ ";
  color: var(--vp-c-text-3);
}
.key button {
  flex: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  min-width: 96px;
  min-height: 46px;
  padding: 0 18px;
  border-left: 1px solid var(--vp-c-border);
  border-radius: 0 7px 7px 0;
  background: var(--vp-c-text-1);
  color: var(--qa-ink-950);
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition:
    background-color 200ms cubic-bezier(0.2, 0, 0, 1),
    transform 120ms cubic-bezier(0.2, 0, 0, 1);
}
.key button:active {
  transform: scale(0.97);
}
.key button.done {
  background: var(--qa-aurora-green);
}
.key button svg {
  width: 14px;
  height: 14px;
  fill: none;
  stroke: currentColor;
  stroke-width: 2;
  stroke-linecap: round;
  stroke-linejoin: round;
}
@media (max-width: 560px) {
  .key code {
    padding-inline: 12px;
    font-size: 12.5px;
  }
}
@media (prefers-reduced-motion: reduce) {
  .key,
  .key button {
    transition: none;
  }
}
</style>
