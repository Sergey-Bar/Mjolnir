<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from "vue";

const emit = defineEmits<{ ready: [] }>();
const canvas = ref<HTMLCanvasElement>();
const on = ref(false);
let stop = () => {};
let idleId = 0;

const VS = "attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}";
// Three curtains, one per aurora token, each a bright lower edge that
// fades upward and is streaked by noise. Tone-mapped so overlaps never
// clip to white.
const FS = `precision mediump float;
uniform vec2 r;uniform float t;uniform vec2 m;uniform vec3 c0;uniform vec3 c1;uniform vec3 c2;
float h(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float n(vec2 p){vec2 i=floor(p),f=fract(p);vec2 u=f*f*(3.-2.*f);
return mix(mix(h(i),h(i+vec2(1.,0.)),u.x),mix(h(i+vec2(0.,1.)),h(i+vec2(1.,1.)),u.x),u.y);}
float fbm(vec2 p){float v=0.,a=.5;for(int i=0;i<5;i++){v+=a*n(p);p*=2.03;a*=.5;}return v;}
void main(){
 vec2 uv=gl_FragCoord.xy/r;float asp=r.x/r.y;float tt=t*.045;vec3 col=vec3(0.);
 for(int i=0;i<3;i++){
  float fi=float(i);
  vec3 c=i==0?c0:(i==1?c1:c2);
  float q=(uv.x-(.16+fi*.34+m.x*.05))/.36;float wx=exp(-q*q);
  float wave=fbm(vec2(uv.x*asp*1.1+fi*4.7+tt,tt*.7+fi*1.3));
  float edge=.48+fi*.06+(wave-.5)*.45+m.y*.03;
  float d=uv.y-edge;
  float curtain=smoothstep(-.02,.025,d)*exp(-max(d,0.)*3.4);
  float rays=fbm(vec2(uv.x*asp*7.+fi*9.+wave*3.,uv.y*.55-tt*1.7));
  rays=pow(rays,1.7)*2.3;
  col+=c*curtain*rays*wx*(.55-fi*.07);
 }
 col*=smoothstep(.04,.42,uv.y);
 col=1.-exp(-col*1.3);
 gl_FragColor=vec4(col,1.);
}`;

/** A token's hex value as 0-1 RGB, read from the live stylesheet. */
function token(name: string): [number, number, number] | null {
  const v = getComputedStyle(document.documentElement)
    .getPropertyValue(name)
    .trim();
  const m = /^#([0-9a-f]{6})$/i.exec(v);
  if (!m) return null;
  const x = Number.parseInt(m[1], 16);
  return [((x >> 16) & 255) / 255, ((x >> 8) & 255) / 255, (x & 255) / 255];
}

/** Starts the sky; null when this browser cannot draw it. */
function start(cv: HTMLCanvasElement, still: boolean): (() => void) | null {
  const host = cv.parentElement;
  const gl = cv.getContext("webgl", {
    antialias: false,
    alpha: false,
    premultipliedAlpha: false,
    powerPreference: "low-power",
  });
  const colors = [
    "--mj-aurora-green",
    "--mj-aurora-cyan",
    "--mj-aurora-violet",
  ].map(token);
  if (!gl || !host || colors.some((c) => !c)) {
    if (gl) gl.getExtension("WEBGL_lose_context")?.loseContext();
    return null;
  }

  const loseCtx = () => gl.getExtension("WEBGL_lose_context")?.loseContext();

  const shader = (type: number, src: string) => {
    const s = gl.createShader(type);
    if (!s) return null;
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
      gl.deleteShader(s);
      return null;
    }
    return s;
  };
  const v = shader(gl.VERTEX_SHADER, VS);
  const f = shader(gl.FRAGMENT_SHADER, FS);
  const prog = gl.createProgram();
  if (!v || !f || !prog) {
    if (v) gl.deleteShader(v);
    if (f) gl.deleteShader(f);
    if (prog) gl.deleteProgram(prog);
    loseCtx();
    return null;
  }
  gl.attachShader(prog, v);
  gl.attachShader(prog, f);
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
    gl.deleteShader(v);
    gl.deleteShader(f);
    gl.deleteProgram(prog);
    loseCtx();
    return null;
  }
  gl.useProgram(prog);

  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(
    gl.ARRAY_BUFFER,
    new Float32Array([-1, -1, 3, -1, -1, 3]),
    gl.STATIC_DRAW,
  );
  const loc = gl.getAttribLocation(prog, "p");
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  const u = (name: string) => gl.getUniformLocation(prog, name);
  const [uR, uT, uM] = [u("r"), u("t"), u("m")];
  (["c0", "c1", "c2"] as const).forEach((k, i) =>
    gl.uniform3fv(u(k), colors[i] as [number, number, number]),
  );

  const t0 = performance.now();
  const elapsed = () => 20 + (performance.now() - t0) / 1000;
  let raf = 0;
  let visible = true;
  let [mx, my, tmx, tmy] = [0, 0, 0, 0];

  // Soft by nature, so half resolution costs nothing visible and a
  // quarter of the fill work; smaller again on a phone.
  const draw = (time: number) => {
    const scale = innerWidth < 700 ? 0.4 : 0.5;
    const w = Math.max(1, Math.round(cv.clientWidth * scale));
    const h = Math.max(1, Math.round(cv.clientHeight * scale));
    if (cv.width !== w || cv.height !== h) {
      cv.width = w;
      cv.height = h;
      gl.viewport(0, 0, w, h);
    }
    mx += (tmx - mx) * 0.035;
    my += (tmy - my) * 0.035;
    gl.uniform2f(uR, w, h);
    gl.uniform1f(uT, time);
    gl.uniform2f(uM, mx, my);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  };
  const loop = () => {
    raf = 0;
    if (!visible || document.hidden) return;
    draw(elapsed());
    raf = requestAnimationFrame(loop);
  };
  const kick = () => {
    if (!still && !raf && visible && !document.hidden)
      raf = requestAnimationFrame(loop);
  };
  const move = (e: PointerEvent) => {
    const b = host.getBoundingClientRect();
    tmx = (e.clientX - b.left) / b.width - 0.5;
    tmy = 0.5 - (e.clientY - b.top) / b.height;
  };
  const resize = () => {
    if (!raf) draw(elapsed());
  };
  const io = new IntersectionObserver((es) => {
    visible = es.some((e) => e.isIntersecting);
    kick();
  });

  draw(20);
  io.observe(host);
  host.addEventListener("pointermove", move);
  document.addEventListener("visibilitychange", kick);
  addEventListener("resize", resize);
  kick();

  return () => {
    cancelAnimationFrame(raf);
    io.disconnect();
    host.removeEventListener("pointermove", move);
    document.removeEventListener("visibilitychange", kick);
    removeEventListener("resize", resize);
    gl.getExtension("WEBGL_lose_context")?.loseContext();
  };
}

onMounted(() => {
  const cv = canvas.value;
  if (!cv) return;
  const still = matchMedia("(prefers-reduced-motion: reduce)").matches;
  // Never on the critical path: the headline and the terminal paint
  // first, the sky arrives when the main thread is idle.
  // With no WebGL the CSS sky stays at full strength: "ready" is only
  // ever sent once the canvas has actually drawn.
  const begin = () => {
    idleId = 0;
    const running = start(cv, still);
    if (!running) return;
    stop = running;
    requestAnimationFrame(() => {
      on.value = true;
      emit("ready");
    });
  };
  if ("requestIdleCallback" in window)
    idleId = requestIdleCallback(begin, { timeout: 1500 }) as unknown as number;
  else idleId = window.setTimeout(begin, 300) as unknown as number;
});

onBeforeUnmount(() => {
  if (idleId) {
    if ("cancelIdleCallback" in window) cancelIdleCallback(idleId);
    else clearTimeout(idleId);
    idleId = 0;
  }
  stop();
});
</script>

<template>
  <canvas ref="canvas" class="aurora" :class="{ on }" aria-hidden="true" />
</template>

<style scoped>
.aurora {
  position: absolute;
  inset: 0;
  z-index: -1;
  width: 100%;
  height: 100%;
  mix-blend-mode: screen;
  pointer-events: none;
  opacity: 0;
  transition: opacity 2s cubic-bezier(0.2, 0, 0, 1);
}
.aurora.on {
  opacity: 0.95;
}
@media (prefers-reduced-motion: reduce) {
  .aurora {
    transition: none;
  }
}
</style>
