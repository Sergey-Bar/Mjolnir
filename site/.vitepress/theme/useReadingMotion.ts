import { computed, onBeforeUnmount, onMounted, ref, type Ref } from "vue";

/** Autoplay only while visible and not being read or operated. */
export function useReadingMotion(region: Ref<HTMLElement | undefined>) {
  const hovered = ref(false);
  const focused = ref(false);
  const visible = ref(false);
  const reduced = ref(true);
  const pinned = ref(false);
  const paused = computed(
    () =>
      hovered.value ||
      focused.value ||
      !visible.value ||
      reduced.value ||
      pinned.value,
  );
  const abort = new AbortController();
  let observer: IntersectionObserver | undefined;
  onMounted(() => {
    const el = region.value;
    if (!el) return;
    const media = matchMedia("(prefers-reduced-motion: reduce)");
    reduced.value = media.matches;
    media.addEventListener(
      "change",
      () => {
        reduced.value = media.matches;
      },
      { signal: abort.signal },
    );
    el.addEventListener(
      "pointerenter",
      (e) => {
        if (e.pointerType === "mouse") hovered.value = true;
      },
      { signal: abort.signal },
    );
    el.addEventListener(
      "pointerleave",
      () => {
        hovered.value = false;
      },
      { signal: abort.signal },
    );
    el.addEventListener(
      "focusin",
      () => {
        focused.value = true;
      },
      { signal: abort.signal },
    );
    el.addEventListener(
      "focusout",
      (e) => {
        focused.value = el.contains(e.relatedTarget as Node | null);
      },
      { signal: abort.signal },
    );
    observer = new IntersectionObserver((entries) => {
      visible.value = entries.some((e) => e.isIntersecting);
    });
    observer.observe(el);
  });
  onBeforeUnmount(() => {
    abort.abort();
    observer?.disconnect();
  });
  return { paused, pinned };
}
