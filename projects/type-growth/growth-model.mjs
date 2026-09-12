// This is a typographic motion study, not botanical or Atlas research data.
export const CORPUS =
  "東亞製造字墨生長山海川流枝葉花風雨石土木林春秋光影時間形跡虛實疏密點線面人間一二三十上下左右日月。，、：；";
export const CYCLE_SECONDS = 24;
export const MAX_DISPLACEMENT = 24;
const TAU = Math.PI * 2;
const clamp = (x, lo, hi) => Math.max(lo, Math.min(hi, x));
export const smooth = (x) => {
  const t = clamp(x, 0, 1);
  return t * t * (3 - 2 * t);
};
const lerp = (a, b, t) => a + (b - a) * t;

function randomSource(seed) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function along(points, t) {
  const lengths = points
    .slice(1)
    .map((p, i) => Math.hypot(p[0] - points[i][0], p[1] - points[i][1]));
  let distance = clamp(t, 0, 1) * lengths.reduce((a, b) => a + b, 0);
  for (let i = 0; i < lengths.length; i++) {
    if (distance <= lengths[i] || i === lengths.length - 1) {
      const ratio = clamp(distance / lengths[i], 0, 1);
      const [x, y] = points[i];
      const [nx, ny] = points[i + 1];
      return {
        x: lerp(x, nx, ratio),
        y: lerp(y, ny, ratio),
        angle: Math.atan2(ny - y, nx - x),
      };
    }
    distance -= lengths[i];
  }
}

export function createComposition(seed = 912) {
  const random = randomSource(seed);
  const glyphs = Array.from(CORPUS);
  const particles = [];
  // The trunk bends off-axis; its arms branch at unequal intervals and scales.
  const paths = [
    {
      points: [
        [80, 680],
        [153, 535],
        [255, 423],
        [342, 374],
        [426, 244],
        [565, 172],
        [640, 75],
      ],
      width: 30,
      count: 740,
      start: 0.025,
      end: 0.62,
    },
    {
      points: [
        [173, 513],
        [158, 379],
        [197, 269],
        [161, 162],
        [204, 95],
      ],
      width: 14,
      count: 220,
      start: 0.18,
      end: 0.65,
    },
    {
      points: [
        [258, 423],
        [391, 445],
        [488, 392],
        [638, 390],
        [730, 320],
      ],
      width: 16,
      count: 300,
      start: 0.29,
      end: 0.74,
    },
    {
      points: [
        [349, 364],
        [302, 274],
        [332, 177],
        [299, 99],
      ],
      width: 11,
      count: 170,
      start: 0.38,
      end: 0.76,
    },
    {
      points: [
        [433, 240],
        [547, 268],
        [645, 231],
        [707, 165],
      ],
      width: 9,
      count: 175,
      start: 0.46,
      end: 0.81,
    },
    {
      points: [
        [198, 270],
        [109, 240],
        [62, 168],
      ],
      width: 7,
      count: 90,
      start: 0.39,
      end: 0.72,
    },
    {
      points: [
        [486, 394],
        [518, 498],
        [603, 541],
      ],
      width: 8,
      count: 110,
      start: 0.51,
      end: 0.83,
    },
    {
      points: [
        [551, 180],
        [495, 117],
        [496, 51],
      ],
      width: 7,
      count: 90,
      start: 0.55,
      end: 0.82,
    },
    {
      points: [
        [631, 390],
        [640, 455],
        [715, 485],
      ],
      width: 6,
      count: 75,
      start: 0.59,
      end: 0.86,
    },
  ];
  function add(x, y, size, birth, kind = 0, angle = 0) {
    const index = particles.length;
    // Broken movable-type columns, not a uniform cloud of dots.
    const column = index % 39;
    const row = Math.floor(index / 39) % 44;
    const looseX = 24 + column * 19 + (random() - 0.5) * 6;
    const looseY = 22 + row * 15 + (random() - 0.5) * 5;
    particles.push({
      x,
      y,
      size,
      birth,
      kind,
      angle,
      char: glyphs[Math.floor(random() * glyphs.length)],
      looseX,
      looseY,
      drift: random() * TAU,
      opacity: kind === 2 ? 0.48 + random() * 0.35 : 0.63 + random() * 0.34,
      scatter: 0.65 + random() * 0.65,
    });
  }
  for (const path of paths) {
    for (let i = 0; i < path.count; i++) {
      const t = random();
      const p = along(path.points, t);
      const taper = path.width * (1 - 0.82 * t);
      const offset = (random() + random() - 1) * taper;
      const side = i % 7 === 0 ? (random() - 0.5) * 14 : 0;
      const size = 4 + random() * 4.5 + (1 - t) * 1.8;
      add(
        p.x - Math.sin(p.angle) * (offset + side),
        p.y + Math.cos(p.angle) * (offset + side),
        size,
        lerp(path.start, path.end, t) + random() * 0.035,
        0,
        (random() - 0.5) * 0.2,
      );
    }
  }
  // Petal clusters are also individual pieces of type, never raster cut-outs.
  const blooms = [
    [202, 101, 26, 0.73],
    [161, 168, 17, 0.7],
    [301, 108, 20, 0.8],
    [640, 80, 29, 0.83],
    [707, 168, 23, 0.86],
    [733, 321, 26, 0.85],
    [609, 542, 24, 0.9],
    [111, 241, 14, 0.75],
    [497, 54, 17, 0.88],
    [551, 267, 20, 0.81],
    [715, 485, 18, 0.9],
  ];
  for (const [x, y, radius, birth] of blooms) {
    const phase = random() * TAU;
    for (let i = 0; i < 58; i++) {
      const petalAngle = phase + ((i % 5) * TAU) / 5;
      const spreadAngle = random() * TAU;
      const spread = Math.sqrt(random()) * radius * 0.43;
      const px =
        x +
        Math.cos(petalAngle) * radius * 0.56 +
        Math.cos(spreadAngle) * spread;
      const py =
        y +
        Math.sin(petalAngle) * radius * 0.56 +
        Math.sin(spreadAngle) * spread;
      add(px, py, 3.8 + random() * 3, birth + random() * 0.06, 2);
    }
    for (let i = 0; i < 8; i++) {
      const a = random() * TAU,
        r = random() * radius * 0.22;
      add(
        x + Math.cos(a) * r,
        y + Math.sin(a) * r,
        4.5 + random() * 2,
        birth + 0.045,
        1,
      );
    }
  }
  return particles;
}

export function cycleState(seconds) {
  const t = ((seconds % CYCLE_SECONDS) + CYCLE_SECONDS) % CYCLE_SECONDS;
  return {
    time: t,
    grow: t / 11.5,
    release: smooth((t - 18) / 5),
    progress: t / CYCLE_SECONDS,
  };
}

// A single time-driven position is reusable for drawing, hit testing and reduced motion.
export function sampleParticle(
  p,
  seconds,
  output = {},
  state = cycleState(seconds),
) {
  const appear = smooth((state.grow - p.birth + 0.14) / 0.13);
  const assemble = smooth((state.grow - p.birth) / 0.21);
  const build = assemble * (1 - state.release);
  const fade = smooth(state.time / 0.7) * (1 - smooth((state.time - 22) / 1.7));
  const oscillation = Math.sin(seconds * 0.7 + p.drift);
  output.x = lerp(p.looseX + oscillation * 5, p.x, build);
  output.y = lerp(p.looseY + Math.cos(seconds * 0.5 + p.drift) * 4, p.y, build);
  output.alpha = appear * fade * p.opacity * (0.2 + 0.8 * build);
  output.scale = p.kind === 0 ? 1 : 0.75 + 0.25 * build;
  return output;
}

export function viewportTransform(width, height) {
  const mobile = width <= 650;
  const scale = mobile
    ? Math.min((width * 0.99) / 790, (height * 0.62) / 740)
    : Math.min((width * 0.73) / 790, (height * 0.83) / 740);
  return {
    scale,
    x: mobile ? -10 * scale : width * 0.025,
    y: mobile ? height * 0.3 : height * 0.12,
  };
}

export function stepOffset(offset, point, pointer, delta, strength = 1) {
  const dt = clamp(delta, 0, 1 / 30);
  let fx = 0,
    fy = 0;
  if (pointer.active) {
    const dx = point.x + offset.x - pointer.x;
    const dy = point.y + offset.y - pointer.y;
    const distance = Math.hypot(dx, dy);
    const radius = pointer.radius;
    if (distance < radius) {
      const force = (1 - distance / radius) ** 2 * 1800 * strength;
      // A finite, consistent direction also handles a pointer exactly on a glyph.
      fx = (distance > 0.01 ? dx / distance : 1) * force;
      fy = (distance > 0.01 ? dy / distance : -0.25) * force;
    }
  }
  offset.vx += (fx - 90 * offset.x - 20 * offset.vx) * dt;
  offset.vy += (fy - 90 * offset.y - 20 * offset.vy) * dt;
  offset.x += offset.vx * dt;
  offset.y += offset.vy * dt;
  const length = Math.hypot(offset.x, offset.y);
  if (length > MAX_DISPLACEMENT) {
    const correction = MAX_DISPLACEMENT / length;
    offset.x *= correction;
    offset.y *= correction;
    offset.vx *= 0.5;
    offset.vy *= 0.5;
  }
  return offset;
}
