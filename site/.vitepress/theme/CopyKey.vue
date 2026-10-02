<script setup lang="ts">
import { onBeforeUnmount, ref } from "vue";

const props = defineProps<{ command: string }>();
const copied = ref(false);
const copyFailed = ref(false);
let timer = 0;

onBeforeUnmount(() => clearTimeout(timer));

async function copy() {
  copyFailed.value = false;
  try {
    let deadline = 0;
    try {
      await Promise.race([
        navigator.clipboard.writeText(props.command),
        new Promise<never>((_, reject) => {
          deadline = window.setTimeout(
            () => reject(new Error("Clipboard unavailable")),
            800,
          );
        }),
      ]);
    } finally {
      clearTimeout(deadline);
    }
  } catch {
    // Embedded browsers may not expose the async Clipboard API.
    const previousFocus = document.activeElement as HTMLElement | null;
    const field = document.createElement("textarea");
    field.value = props.command;
    field.setAttribute("readonly", "");
    field.style.cssText = "position:fixed;left:-9999px;top:0;opacity:0";
    document.body.appendChild(field);
    field.select();
    let success = false;
    try {
      success = document.execCommand("copy");
    } catch {
      /* Show manual fallback below. */
    }
    field.remove();
    previousFocus?.focus({ preventScroll: true });
    if (!success) {
      copyFailed.value = true;
      return;
    }
  }
  copied.value = true;
  clearTimeout(timer);
  timer = window.setTimeout(() => (copied.value = false), 1600);
}
</script>

<template>
  <div class="key">
    <code>{{ command }}</code>
    <button
      type="button"
      :class="{ done: copied }"
      :aria-label="copied ? 'Command copied' : `Copy ${command}`"
      :title="copied ? 'Copied' : 'Copy command'"
      @click="copy"
    >
      <svg v-if="copied" viewBox="0 0 16 16" aria-hidden="true">
        <path d="M3 8.5 6.5 12 13 4.5" />
      </svg>
      <svg v-else viewBox="0 0 24 24" aria-hidden="true">
        <rect x="9" y="9" width="11" height="11" rx="2" />
        <path d="M15 9V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h4" />
      </svg>
    </button>
    <span
      class="copy-status"
      :class="{ 'copy-error': copyFailed }"
      role="status"
      >{{
        copied
          ? "Command copied to clipboard"
          : copyFailed
            ? "Copy unavailable. Select the command and copy it manually."
            : ""
      }}</span
    >
  </div>
</template>

<style scoped>
.key {
  position: relative;
  display: inline-grid;
  grid-template-columns: minmax(0, 1fr) 48px;
  min-width: 0;
  max-width: 100%;
  border: 1px solid var(--vp-c-border);
  border-radius: 8px;
  background: var(--mj-ink-950);
  transition:
    transform 380ms cubic-bezier(0.2, 0, 0, 1),
    box-shadow 380ms cubic-bezier(0.2, 0, 0, 1),
    border-color 380ms cubic-bezier(0.2, 0, 0, 1);
}
.key:hover {
  border-color: color-mix(in srgb, var(--mj-aurora-cyan) 40%, transparent);
  box-shadow: 0 10px 40px -12px
    color-mix(in srgb, var(--mj-aurora-cyan) 45%, transparent);
}
.key code {
  padding: 13px 16px;
  font-family: var(--vp-font-family-mono);
  font-size: 14px;
  line-height: 20px;
  color: var(--vp-c-text-1);
  min-width: 0;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
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
  min-width: 48px;
  min-height: 46px;
  padding: 0 14px;
  border-left: 1px solid var(--vp-c-border);
  border-radius: 0 7px 7px 0;
  background: var(--vp-c-text-1);
  color: var(--mj-ink-950);
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
  background: var(--mj-aurora-green);
}
.key button svg {
  width: 19px;
  height: 19px;
  fill: none;
  stroke: currentColor;
  stroke-width: 2;
  stroke-linecap: round;
  stroke-linejoin: round;
}
.copy-status {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;
}
.copy-status.copy-error {
  position: static;
  grid-column: 1 / -1;
  width: auto;
  height: auto;
  padding: 8px 12px;
  clip-path: none;
  white-space: normal;
  color: var(--vp-c-text-1);
  font-size: 12px;
}
.key button:focus-visible {
  outline: 2px solid var(--vp-c-brand-1);
  outline-offset: 4px;
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
