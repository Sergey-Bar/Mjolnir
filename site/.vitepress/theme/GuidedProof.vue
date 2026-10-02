<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import { withBase } from "vitepress";
import { useReadingMotion } from "./useReadingMotion";

const steps = [
  {
    label: "The green check",
    title: "The tests fail. CI still passes.",
    body: "A workflow can hide a failure after the test runner has reported it. Follow one command from the failing test to the misleading green step.",
    detail:
      "Illustrative shell outcome: npm test exits 1; the fallback true exits 0. The step returns the final success.",
    command: "npm test || true",
    outcome: "Step reports success",
    tone: "masked",
  },
  {
    label: "The mechanism",
    title: "Two characters change the meaning.",
    body: "The || operator runs the fallback when the test command fails. Because true succeeds, the failing test no longer controls the step’s exit code.",
    detail:
      "This is the pattern under review. Whether a step should block is a policy decision: inspect its purpose before editing.",
    command: "npm test || true",
    outcome: "Failure is swallowed",
    tone: "risk",
  },
  {
    label: "The evidence",
    title: "A finding you can inspect.",
    body: "QA-CI-002 identifies an ignored exit code. Its explanation connects the source pattern to a suggested fix and documents the rule’s limitations.",
    detail:
      "Rule: QA-CI-002 · Extended tier · E2 evidence. Read the rule’s current false-positive audit before generalizing from this example.",
    command: "npx mjolnir-qa@5.0.0 explain QA-CI-002",
    outcome: "Inspect QA-CI-002",
    tone: "evidence",
  },
  {
    label: "The edit",
    title: "Let the test runner decide.",
    body: "For a required test step, remove the fallback. A failed test can now make this command fail. Other workflow settings still need review.",
    detail:
      "Suggested edit, not an automatic fix. Mjölnir does not execute the test suite or prove the rest of the workflow is correct.",
    command: "npm test",
    outcome: "Failure can propagate",
    tone: "evidence",
  },
  {
    label: "The verification",
    title: "Verify the change, then state the limits.",
    body: "Capture a baseline before editing. After the fix, run the affected tests with your runner and compare the current scan with that baseline.",
    detail:
      "Read resolved, new and unchanged findings. Missing baselines or incomplete scans remain inconclusive. A clean scan is not proof of application correctness.",
    command: "npx mjolnir-qa@5.0.0 ci verify",
    outcome: "Compare the evidence",
    tone: "evidence",
  },
];
const current = ref(0);
const region = ref<HTMLElement>();
const { paused, pinned } = useReadingMotion(region);
const playing = ref(false);
const step = computed(() => steps[current.value]);
let timer: ReturnType<typeof setInterval> | undefined;
let reduced = false;
function schedule() {
  clearInterval(timer);
  if (reduced) return;
  playing.value = true;
  timer = setInterval(() => {
    if (!document.hidden && !paused.value)
      current.value = (current.value + 1) % steps.length;
  }, 9000);
}
function select(index: number) {
  current.value = index;
  pinned.value = true;
}
onMounted(() => {
  reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  schedule();
});
onBeforeUnmount(() => clearInterval(timer));
</script>

<template>
  <section
    ref="region"
    id="guided-proof"
    class="guided-proof"
    aria-labelledby="proof-title"
  >
    <div class="proof-heading">
      <div>
        <h2 id="proof-title">
          Follow a false green.<br />Find where trust breaks.
        </h2>
        <p>
          See the failure, the misleading result, and the repair in one view.
          Select any node for the practical next step.
        </p>
      </div>
    </div>
    <div
      class="proof-map"
      aria-label="False green overview"
      :class="{ running: playing && !paused }"
    >
      <div class="map-lane">
        <h3>01 / What the workflow does</h3>
        <div class="map-route">
          <button
            class="map-node risk"
            :aria-pressed="current === 0"
            @click="select(0)"
          >
            <span class="node-kicker">TEST RUNNER</span
            ><strong>Tests fail</strong><code>npm test → exit 1</code
            ><small>The test command reports a failure.</small>
          </button>
          <span class="map-arrow" aria-hidden="true">→</span>
          <button
            class="map-node"
            :aria-pressed="current === 1"
            @click="select(1)"
          >
            <span class="node-kicker">FAILURE IS MASKED</span
            ><strong>Fallback succeeds</strong><code>|| true → exit 0</code
            ><small>The shell runs true after the failure.</small>
          </button>
          <span class="map-arrow" aria-hidden="true">→</span>
          <button
            class="map-node masked"
            :aria-pressed="current === 1"
            @click="select(1)"
          >
            <span class="node-kicker">MISLEADING RESULT</span
            ><strong>CI reports success</strong><code>step → exit 0</code
            ><small>A green check hides the failed test.</small>
          </button>
        </div>
      </div>
      <div class="map-lane">
        <h3>02 / What you do next</h3>
        <div class="map-route">
          <button
            class="map-node"
            :aria-pressed="current === 2"
            @click="select(2)"
          >
            <span class="node-kicker">INSPECT</span
            ><strong>Find the ignored exit</strong><code>QA-CI-002</code
            ><small>Read the finding. Save a baseline before editing.</small>
          </button>
          <span class="map-arrow" aria-hidden="true">→</span>
          <button
            class="map-node"
            :aria-pressed="current === 3"
            @click="select(3)"
          >
            <span class="node-kicker">EDIT</span
            ><strong>Remove the fallback</strong><code>npm test</code
            ><small>For a required test step, let failure propagate.</small>
          </button>
          <span class="map-arrow" aria-hidden="true">→</span>
          <button
            class="map-node"
            :aria-pressed="current === 4"
            @click="select(4)"
          >
            <span class="node-kicker">VERIFY</span
            ><strong>Run tests. Compare scans.</strong
            ><code>mjolnir ci verify</code
            ><small
              >Check resolved and new findings against the baseline.</small
            >
          </button>
        </div>
      </div>
      <p class="map-note">
        Example: the test command exits 1. Mjölnir reads the workflow; it does
        not run or automatically repair your tests.
      </p>
    </div>
    <div class="proof-explanation map-detail">
      <div>
        <h3>{{ step.title }}</h3>
        <p>{{ step.body }}</p>
        <p class="proof-detail">{{ step.detail }}</p>
        <a :href="withBase('/rules/QA-CI-002')"
          >Read the rule and its evidence</a
        >
      </div>
      <div class="detail-command">
        <span class="node-kicker">{{
          current === 3 ? "REQUIRED TEST COMMAND" : "EXAMPLE / NEXT COMMAND"
        }}</span
        ><code>{{ step.command }}</code>
      </div>
    </div>
    <p class="proof-progress">
      {{ current + 1 }} / {{ steps.length }} ·
      {{
        pinned
          ? "Selected step · held for reading"
          : "Autoplay pauses while you read or focus this guide"
      }}
      <button v-if="pinned" class="resume-guide" @click="pinned = false">
        Resume automatic guide
      </button>
    </p>
    <div class="repair-proof">
      <h3>One change. Two saved scans.</h3>
      <p>
        A minimal workflow scanned with Mjölnir 5.0.0. The ignored-exit finding
        disappears after removing the fallback.
      </p>
      <div class="repair-pair">
        <div>
          <span class="node-kicker">BEFORE</span
          ><code>npm test <mark>|| true</mark></code
          ><strong>1 finding · QA-CI-002</strong
          ><a :href="withBase('/evidence/example-before.json')"
            >Read the original scan ↗</a
          >
        </div>
        <div>
          <span class="node-kicker">AFTER</span><code>npm test</code
          ><strong>0 findings in this scan</strong
          ><a :href="withBase('/evidence/example-after.json')"
            >Read the follow-up scan ↗</a
          >
        </div>
      </div>
      <p class="proof-detail">
        These are static scan results. Run the affected tests separately: this
        comparison does not establish that the tests pass.
      </p>
    </div>
  </section>
</template>

<style scoped>
.guided-proof {
  max-width: 1160px;
  margin: 0 auto;
  padding: 72px 32px;
  color: var(--vp-c-text-1);
  scroll-margin-top: 80px;
}
.proof-heading {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 24px;
  margin-bottom: 30px;
}
.proof-heading h2 {
  font-family: var(--mj-display);
  font-size: clamp(30px, 4vw, 48px);
  line-height: 1.12;
  font-weight: 500;
  letter-spacing: -0.035em;
  margin: 0;
}
.proof-heading p {
  color: var(--vp-c-text-2);
  margin: 18px 0 0;
  font-size: 16px;
}
.guided-proof button {
  min-height: 44px;
  padding: 10px 16px;
  font: inherit;
  border-radius: 6px;
  border: 1px solid var(--vp-c-divider);
  background: transparent;
  color: var(--vp-c-text-1);
  cursor: pointer;
  transition: background 0.18s ease;
}
.guided-proof button:hover:not(:disabled) {
  background: var(--vp-c-bg-soft);
}
.guided-proof button:disabled {
  opacity: 0.45;
  cursor: default;
}
.guided-proof .play {
  white-space: nowrap;
  color: var(--vp-c-brand-1);
  border-color: var(--vp-c-brand-1);
}
.proof-steps {
  list-style: none;
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  padding: 0;
  margin: 0 0 30px;
  gap: 8px;
}
.proof-steps button {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  gap: 10px;
  text-align: left;
  font-size: 13px;
  border: 0;
  border-bottom: 2px solid var(--vp-c-divider);
  border-radius: 0;
  padding: 12px 6px;
}
.proof-steps button[aria-current="step"] {
  border-bottom-color: var(--vp-c-brand-1);
  color: var(--vp-c-brand-1);
}
.step-number {
  font-family: var(--vp-font-family-mono);
  font-size: 12px;
  color: var(--vp-c-text-2);
}
.proof-stage {
  display: grid;
  grid-template-columns: 0.9fr 1.1fr;
  gap: 44px;
  align-items: center;
  min-height: 335px;
}
.proof-explanation h3 {
  font-size: 28px;
  line-height: 1.2;
  letter-spacing: -0.025em;
  font-weight: 500;
  margin: 0 0 18px;
}
.proof-explanation p {
  font-size: 16px;
  line-height: 1.75;
  color: var(--vp-c-text-2);
  margin: 0 0 18px;
}
.proof-explanation .proof-detail {
  font-size: 13px;
}
.proof-explanation a {
  color: var(--vp-c-brand-1);
  font-size: 13px;
  text-decoration: underline;
  text-underline-offset: 5px;
}
.proof-window {
  border: 1px solid var(--vp-c-divider);
  border-radius: 12px;
  overflow: hidden;
  background: var(--vp-c-bg-alt);
}
.proof-window-head {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  padding: 16px 22px;
  font-size: 12px;
  border-bottom: 1px solid var(--vp-c-divider);
  color: var(--vp-c-text-2);
}
.proof-code {
  padding: 27px 24px;
  min-height: 120px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.code-label {
  font-size: 11px;
  letter-spacing: 0.08em;
  color: var(--vp-c-text-2);
}
.proof-code code {
  font-family: var(--vp-font-family-mono);
  font-size: 15px;
  overflow-wrap: anywhere;
  color: var(--vp-c-text-1);
}
.proof-flow {
  display: flex;
  align-items: center;
  gap: 18px;
  padding: 20px 24px 28px;
}
.proof-flow > div {
  display: flex;
  flex-direction: column;
  gap: 7px;
  flex: 1;
  min-width: 0;
}
.proof-flow span,
.proof-flow small {
  font-size: 12px;
  color: var(--vp-c-text-2);
}
.proof-flow strong {
  font-family: var(--vp-font-family-mono);
  font-size: 24px;
  font-weight: 500;
  color: var(--mj-unworthy);
}
.proof-flow .false-green {
  color: var(--mj-aurora-green);
}
.flow-line {
  height: 1px;
  flex: 0.45;
  background: var(--vp-c-divider);
  position: relative;
  overflow: hidden;
}
.flow-line:after {
  content: "";
  position: absolute;
  inset: 0;
  background: var(--vp-c-brand-1);
  transform: translateX(-100%);
}
.flow-line.active:after {
  animation: proof-travel 1.7s ease-in-out infinite;
}
.proof-outcome {
  padding: 15px 24px;
  border-top: 1px solid var(--vp-c-divider);
  font-size: 14px;
  color: var(--vp-c-brand-1);
}
.proof-outcome[data-tone="risk"],
.proof-outcome[data-tone="masked"] {
  color: var(--mj-needswork);
}
.proof-controls {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  padding-top: 28px;
  margin-top: 25px;
  border-top: 1px solid var(--vp-c-divider);
  font-size: 12px;
  color: var(--vp-c-text-2);
}
.proof-controls > div {
  display: flex;
  gap: 8px;
}
.proof-controls button {
  font-size: 13px;
}
.proof-reveal-enter-active,
.proof-reveal-leave-active,
.proof-code-change-enter-active,
.proof-code-change-leave-active {
  transition:
    opacity 0.2s ease,
    transform 0.25s cubic-bezier(0.16, 1, 0.3, 1);
}
.proof-reveal-enter-from,
.proof-code-change-enter-from {
  opacity: 0;
  transform: translateY(9px);
}
.proof-reveal-leave-to,
.proof-code-change-leave-to {
  opacity: 0;
  transform: translateY(-5px);
}
@keyframes proof-travel {
  to {
    transform: translateX(100%);
  }
}
@media (max-width: 760px) {
  .guided-proof {
    padding: 45px 24px;
  }
  .proof-heading {
    align-items: flex-start;
    flex-direction: column;
  }
  .proof-stage {
    grid-template-columns: 1fr;
    gap: 25px;
  }
  .proof-steps {
    grid-template-columns: repeat(3, 1fr);
  }
  .proof-explanation {
    min-height: 255px;
  }
  .proof-controls {
    flex-wrap: wrap;
  }
}
@media (max-width: 400px) {
  .guided-proof {
    padding: 35px 18px;
  }
  .proof-steps {
    grid-template-columns: 1fr 1fr;
  }
  .proof-window-head {
    padding: 14px;
  }
  .proof-code,
  .proof-flow {
    padding-left: 16px;
    padding-right: 16px;
  }
  .proof-flow {
    gap: 10px;
  }
  .proof-heading h2 {
    font-size: 31px;
  }
}
@media (prefers-reduced-motion: reduce) {
  .guided-proof * {
    animation: none !important;
    transition: none !important;
  }
}

.proof-map {
  padding: 26px;
  position: relative;
  border: 1px solid var(--vp-c-border);
  border-radius: 12px;
  background: var(--vp-c-bg-alt);
}
.map-lane + .map-lane {
  margin-top: 28px;
  padding-top: 24px;
  border-top: 1px solid var(--vp-c-divider);
}
.map-lane h3 {
  font-size: 14px !important;
  margin-bottom: 16px !important;
  color: var(--vp-c-text-2);
  font-weight: 500;
  letter-spacing: 0.03em;
}
.map-route {
  display: grid;
  grid-template-columns: 1fr 24px 1fr 24px 1fr;
  gap: 12px;
  align-items: stretch;
}
.guided-proof .map-node {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  text-align: left;
  padding: 20px;
  gap: 10px;
  border: 1px solid var(--vp-c-border);
  border-radius: 10px;
  min-width: 0;
  background: rgba(12, 20, 32, 0.65);
}
.map-node strong {
  font-size: 19px;
  line-height: 1.3;
  font-weight: 500;
}
.map-node small {
  color: var(--vp-c-text-2);
  font-size: 13px;
  line-height: 1.6;
}
.map-node code,
.detail-command code {
  font-family: var(--vp-font-family-mono);
  font-size: 13px;
  overflow-wrap: anywhere;
  color: var(--vp-c-text-1);
}
.node-kicker {
  font-size: 10px;
  letter-spacing: 0.1em;
  color: var(--vp-c-brand-1);
}
.map-node.risk .node-kicker {
  color: var(--mj-unworthy);
}
.map-node.masked .node-kicker {
  color: var(--mj-needswork);
}
.guided-proof .map-node[aria-pressed="true"] {
  border-color: var(--vp-c-brand-1);
  box-shadow: 0 0 22px rgba(92, 189, 224, 0.1);
}
.map-arrow {
  align-self: center;
  text-align: center;
  color: var(--vp-c-brand-1);
  font-size: 23px;
}
.running .map-arrow {
  animation: map-pulse 1.6s ease-in-out infinite;
}
.map-note {
  font-size: 13px;
  color: var(--vp-c-text-2);
  margin-top: 22px !important;
}
.map-detail {
  display: grid;
  grid-template-columns: 1.5fr 1fr;
  gap: 30px;
  padding-top: 30px;
}
.detail-command {
  align-self: start;
  display: grid;
  gap: 14px;
  padding: 24px;
  border: 1px solid var(--vp-c-border);
  border-radius: 10px;
}
@keyframes map-pulse {
  50% {
    opacity: 0.35;
  }
}
@media (max-width: 760px) {
  .map-route {
    grid-template-columns: 1fr;
    gap: 9px;
  }
  .map-arrow {
    transform: rotate(90deg);
  }
  .proof-map {
    padding: 18px;
  }
  .map-detail {
    grid-template-columns: 1fr;
  }
  .map-node strong {
    font-size: 18px;
  }
}
@media (prefers-reduced-motion: reduce) {
  .running .map-arrow {
    animation: none;
  }
}

.proof-progress {
  margin-top: 20px;
  font: 12px var(--vp-font-family-mono);
  color: var(--vp-c-text-3);
}
.map-detail {
  min-height: 310px;
}
.map-node:focus-visible {
  outline: 2px solid var(--vp-c-brand-1);
  outline-offset: 3px;
}
.repair-proof {
  margin-top: 40px;
  border-top: 1px solid var(--vp-c-divider);
  padding-top: 30px;
}
.repair-proof h3 {
  font-size: 24px;
  margin: 0 0 12px;
}
.repair-proof p {
  color: var(--vp-c-text-2);
  line-height: 1.7;
}
.repair-pair {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 18px;
  margin: 20px 0;
}
.repair-pair > div {
  display: grid;
  gap: 16px;
  padding: 24px;
  border: 1px solid var(--mj-glass-line);
  border-top: 2px solid var(--mj-unworthy);
  border-radius: 12px;
  background: var(--mj-glass);
}
.repair-pair > div + div {
  border-top-color: var(--mj-aurora-green);
}
.repair-pair code {
  font: 14px var(--vp-font-family-mono);
  overflow-wrap: anywhere;
}
.repair-pair mark {
  background: rgba(238, 100, 100, 0.15);
  color: var(--mj-unworthy);
}
.repair-pair strong {
  font-size: 14px;
  font-weight: 500;
}
.repair-pair a {
  font-size: 13px;
  color: var(--vp-c-brand-1);
  text-decoration: underline;
  text-underline-offset: 4px;
}
@media (max-width: 760px) {
  .repair-pair {
    grid-template-columns: 1fr;
  }
  .map-detail {
    min-height: 460px;
  }
}
</style>
