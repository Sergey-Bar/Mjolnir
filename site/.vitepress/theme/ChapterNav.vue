<script setup lang="ts">
import { computed, onMounted, onBeforeUnmount, ref } from "vue";
const props = defineProps<{ chapters: { id: string; title: string }[] }>();
const active = ref("");
const currentTitle = computed(() =>
  active.value === "stack-section"
    ? "Your stack"
    : props.chapters.find((chapter) => chapter.id === active.value)?.title,
);
const expanded = ref(false);
const visible = ref(false);
let frame = 0;
const controller = new AbortController();
function update() {
  frame = 0;
  const hero = document.querySelector(".hero-band");
  visible.value = !!hero && hero.getBoundingClientRect().bottom < 80;
  const sections = document.querySelectorAll("main.mj section[id]");
  let current = "";
  for (const section of sections) {
    if (section.getBoundingClientRect().top <= 180) current = section.id;
  }
  active.value = current;
}
function schedule() {
  if (!frame) frame = requestAnimationFrame(update);
}
onMounted(() => {
  window.addEventListener("scroll", schedule, {
    passive: true,
    signal: controller.signal,
  });
  window.addEventListener("resize", schedule, {
    passive: true,
    signal: controller.signal,
  });
  update();
});
onBeforeUnmount(() => {
  controller.abort();
  cancelAnimationFrame(frame);
});
</script>

<template>
  <nav
    class="chapter-nav"
    :class="{ visible, expanded }"
    aria-label="On this page"
    :inert="!visible"
  >
    <button
      class="chapter-toggle"
      :aria-expanded="expanded"
      aria-controls="chapter-links"
      @click="expanded = !expanded"
    >
      <span
        >On this page<span v-if="currentTitle" class="current-title">
          · {{ currentTitle }}</span
        ></span
      ><span aria-hidden="true">{{ expanded ? "−" : "+" }}</span>
    </button>
    <div id="chapter-links" class="chapter-links">
      <a
        href="#stack-section"
        :aria-current="active === 'stack-section' ? 'location' : undefined"
        @click="expanded = false"
        >Your stack</a
      >
      <a
        v-for="chapter in chapters"
        :key="chapter.id"
        :href="'#' + chapter.id"
        :aria-current="active === chapter.id ? 'location' : undefined"
        @click="expanded = false"
        >{{ chapter.title }}</a
      >
    </div>
  </nav>
</template>

<style scoped>
.chapter-nav {
  position: fixed;
  top: var(--vp-nav-height);
  left: 0;
  right: 0;
  z-index: 25;
  padding: 10px 24px;
  background: var(--vp-c-bg);
  border-bottom: 1px solid var(--vp-c-divider);
  visibility: hidden;
}
.chapter-nav.visible {
  visibility: visible;
}
.chapter-links {
  display: flex;
  justify-content: center;
  gap: 8px 20px;
  flex-wrap: wrap;
}
.mj .chapter-links a {
  padding: 6px 0;
  font-size: 12px;
  color: var(--vp-c-text-2);
  text-decoration: none;
}
.mj .chapter-links a[aria-current] {
  color: var(--mj-aurora-cyan);
  box-shadow: 0 2px var(--mj-aurora-cyan);
}
.chapter-toggle {
  display: none;
}
.current-title {
  color: var(--mj-aurora-cyan);
}
@media (max-width: 959px) {
  .chapter-nav {
    padding: 6px 20px;
  }
  .chapter-toggle {
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: 100%;
    min-height: 40px;
    font-size: 13px;
  }
  .chapter-links {
    display: none;
    padding: 8px 0 16px;
    grid-template-columns: 1fr 1fr;
  }
  .expanded .chapter-links {
    display: grid;
  }
  .mj .chapter-links a {
    min-height: 40px;
    display: flex;
    align-items: center;
  }
}
</style>
