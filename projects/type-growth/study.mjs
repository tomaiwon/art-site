/* global document, window, matchMedia, setTimeout, devicePixelRatio,
          requestAnimationFrame, cancelAnimationFrame, ResizeObserver, performance, console */
import {
  CORPUS,
  createComposition,
  cycleState,
  sampleParticle,
  stepOffset,
  viewportTransform,
} from "./growth-model.mjs?v=20260912";

const canvas = document.querySelector("#field");
const context = canvas.getContext("2d", { alpha: false });
const pause = document.querySelector("#pause");
const replay = document.querySelector("#replay");
const progress = document.querySelector("#time-fill");
const motion = matchMedia("(prefers-reduced-motion: reduce)");
const coarse = matchMedia("(pointer: coarse)");
const paper = "#f5f4ef";

if (!context) {
  document.querySelector("#fallback").hidden = false;
} else {
  start().catch((error) => {
    console.error("Type growth study could not start:", error);
    document.querySelector("#fallback").hidden = false;
  });
}

async function start() {
  // Font failure is recoverable; canvas redraws with system Song rather than staying blank.
  await Promise.race([
    document.fonts.load('32px "Print Study"', CORPUS).catch(() => []),
    new Promise((resolve) => setTimeout(resolve, 1800)),
  ]);
  const particles = createComposition();
  const offsets = particles.map(() => ({ x: 0, y: 0, vx: 0, vy: 0 }));
  const pointer = {
    x: 0,
    y: 0,
    active: false,
    radius: coarse.matches ? 58 : 84,
  };
  let width = 1,
    height = 1,
    ratio = 1,
    transform;
  let elapsed = motion.matches ? 15 : 1.8;
  let playing = !motion.matches;
  let last = 0,
    frame = 0,
    atlas,
    atlasMap;
  let touchReleaseAt = Infinity;
  const sampled = {};
  const point = { x: 0, y: 0 };

  function makeAtlas() {
    const chars = Array.from(new Set(CORPUS));
    atlasMap = new Map(chars.map((char, i) => [char, i]));
    atlas = document.createElement("canvas");
    atlas.width = chars.length * 48;
    atlas.height = 144;
    const ink = atlas.getContext("2d");
    ink.font = '34px "Print Study", "Songti SC", serif';
    ink.textAlign = "center";
    ink.textBaseline = "middle";
    ["#26251f", "#944c43", "#a87668"].forEach((color, row) => {
      ink.fillStyle = color;
      chars.forEach((char, i) =>
        ink.fillText(char, i * 48 + 24, row * 48 + 25),
      );
    });
  }

  function resize() {
    const bounds = canvas.getBoundingClientRect();
    width = bounds.width;
    height = bounds.height;
    ratio = Math.min(devicePixelRatio || 1, coarse.matches ? 1.5 : 2);
    canvas.width = Math.round(width * ratio);
    canvas.height = Math.round(height * ratio);
    transform = viewportTransform(width, height);
    pointer.active = false;
    offsets.forEach((o) => {
      o.x = 0;
      o.y = 0;
      o.vx = 0;
      o.vy = 0;
    });
    requestFrame();
  }

  function updateControls() {
    pause.textContent = playing ? "暫停" : "播放";
    pause.setAttribute("aria-label", playing ? "暫停動畫" : "播放動畫");
    pause.disabled = false;
    replay.disabled = false;
  }

  function render(now) {
    frame = 0;
    if (now >= touchReleaseAt) {
      pointer.active = false;
      touchReleaseAt = Infinity;
    }
    const dt = last ? Math.max((now - last) / 1000, 0) : 0;
    last = now;
    if (playing) elapsed += dt;
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    context.fillStyle = paper;
    context.fillRect(0, 0, width, height);
    const phase = cycleState(elapsed);
    const physicsTime = Math.min(dt, 0.05);
    const steps = Math.max(1, Math.ceil(physicsTime * 120));
    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];
      const state = sampleParticle(p, elapsed, sampled, phase);
      if (state.alpha < 0.005) {
        const hiddenOffset = offsets[i];
        hiddenOffset.x = 0;
        hiddenOffset.y = 0;
        hiddenOffset.vx = 0;
        hiddenOffset.vy = 0;
        continue;
      }
      const x = transform.x + state.x * transform.scale;
      const y = transform.y + state.y * transform.scale;
      const offset = offsets[i];
      const movement =
        Math.abs(offset.x) +
        Math.abs(offset.y) +
        Math.abs(offset.vx) +
        Math.abs(offset.vy);
      if (playing && !motion.matches && (pointer.active || movement > 0.01)) {
        point.x = x;
        point.y = y;
        for (let step = 0; step < steps; step++)
          stepOffset(offset, point, pointer, physicsTime / steps, p.scatter);
      }
      const size = Math.max(p.size * transform.scale * state.scale, 2.1);
      context.globalAlpha = state.alpha;
      // Atlas blits avoid thousands of font rasterisations and per-glyph allocations per frame.
      context.drawImage(
        atlas,
        atlasMap.get(p.char) * 48,
        p.kind * 48,
        48,
        48,
        x + offset.x - size * 0.7,
        y + offset.y - size * 0.7,
        size * 1.4,
        size * 1.4,
      );
    }
    context.globalAlpha = 1;
    progress.style.transform = `scaleX(${phase.progress})`;
    if (playing && !document.hidden) requestFrame();
  }

  function requestFrame() {
    if (!frame && !document.hidden) frame = requestAnimationFrame(render);
  }

  function setPointer(event) {
    const bounds = canvas.getBoundingClientRect();
    pointer.x = event.clientX - bounds.left;
    pointer.y = event.clientY - bounds.top;
    pointer.active = true;
    touchReleaseAt = Infinity;
  }

  canvas.addEventListener("pointermove", (event) => {
    if (event.isPrimary) setPointer(event);
  });
  canvas.addEventListener("pointerdown", (event) => {
    if (event.isPrimary) setPointer(event);
  });
  canvas.addEventListener("pointerleave", () => {
    pointer.active = false;
  });
  canvas.addEventListener("pointercancel", () => {
    pointer.active = false;
  });
  window.addEventListener("pointerup", (event) => {
    // Let a short tap reach a rendered frame without capturing or delaying native scrolling.
    if (event.pointerType !== "mouse" && pointer.active)
      touchReleaseAt = performance.now() + 160;
  });
  pause.addEventListener("click", () => {
    playing = !playing;
    pointer.active = false;
    last = 0;
    updateControls();
    requestFrame();
  });
  replay.addEventListener("click", () => {
    elapsed = motion.matches ? 15 : 0;
    playing = !motion.matches;
    pointer.active = false;
    offsets.forEach((o) => {
      o.x = 0;
      o.y = 0;
      o.vx = 0;
      o.vy = 0;
    });
    last = 0;
    updateControls();
    requestFrame();
  });
  motion.addEventListener("change", () => {
    playing = false;
    elapsed = 15;
    offsets.forEach((o) => {
      o.x = 0;
      o.y = 0;
      o.vx = 0;
      o.vy = 0;
    });
    pointer.active = false;
    last = 0;
    updateControls();
    requestFrame();
  });
  document.addEventListener("visibilitychange", () => {
    cancelAnimationFrame(frame);
    frame = 0;
    last = 0;
    pointer.active = false;
    if (!document.hidden) requestFrame();
  });
  window.addEventListener("blur", () => {
    pointer.active = false;
  });
  document.fonts.ready.then(() => {
    makeAtlas();
    requestFrame();
  });
  makeAtlas();
  new ResizeObserver(resize).observe(canvas);
  resize();
  updateControls();
}
