// ============================================================
//  照片的四种呈现：原图 / 油墨 / 网点 / 色块
//  以及两个动画：色块擦除转场、点阵聚合入场
// ============================================================

export const PAPER = [244, 240, 232];

export const hexToRgb = (hex) => {
  const v = parseInt(hex.replace('#', ''), 16);
  return [(v >> 16) & 255, (v >> 8) & 255, v & 255];
};
export const rgbToHex = (r, g, b) =>
  '#' + [r, g, b].map((x) => Math.round(x).toString(16).padStart(2, '0')).join('').toUpperCase();

const cache = new Map();

// 读取照片像素（同源才可以，所以要用本地服务器打开）
export function loadPixels(src, maxEdge = 700) {
  const key = src + '@' + maxEdge;
  if (cache.has(key)) return cache.get(key);
  const p = new Promise((resolve, reject) => {
    const img = new Image();
    img.decoding = 'async';
    img.onload = () => {
      const s = Math.min(1, maxEdge / Math.max(img.naturalWidth, img.naturalHeight));
      const w = Math.max(1, Math.round(img.naturalWidth * s));
      const h = Math.max(1, Math.round(img.naturalHeight * s));
      const canvas = document.createElement('canvas');
      canvas.width = w; canvas.height = h;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      ctx.drawImage(img, 0, 0, w, h);
      let data;
      try { data = ctx.getImageData(0, 0, w, h).data; } catch (e) { reject(e); return; }
      resolve({ img, canvas, w, h, data });
    };
    img.onerror = reject;
    img.src = src;
  });
  cache.set(key, p);
  p.catch(() => cache.delete(key));
  return p;
}

export function pixelAt(px, u, v) {
  const x = Math.max(0, Math.min(px.w - 1, (u * px.w) | 0));
  const y = Math.max(0, Math.min(px.h - 1, (v * px.h) | 0));
  const k = (y * px.w + x) * 4;
  return [px.data[k], px.data[k + 1], px.data[k + 2]];
}

function cellAverage(px, x0, y0, cw, ch) {
  // 取 5 个点平均，够用又快
  const { data, w, h } = px;
  let r = 0, g = 0, b = 0;
  const pts = [[0.5, 0.5], [0.25, 0.25], [0.75, 0.25], [0.25, 0.75], [0.75, 0.75]];
  for (const [fx, fy] of pts) {
    const x = Math.min(w - 1, (x0 + cw * fx) | 0);
    const y = Math.min(h - 1, (y0 + ch * fy) | 0);
    const k = (y * w + x) * 4;
    r += data[k]; g += data[k + 1]; b += data[k + 2];
  }
  return [r / 5, g / 5, b / 5];
}

const lum = (c) => (0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2]) / 255;

// 油墨：纸色 -> 章节色 -> 深墨，三段渐变映射
function inkLUT(accent) {
  const a = hexToRgb(accent);
  const deep = a.map((x) => x * 0.22);
  const lut = new Uint8ClampedArray(256 * 3);
  for (let i = 0; i < 256; i++) {
    let t = i / 255;
    t = t * t * (3 - 2 * t); // 加一点对比
    let c;
    if (t > 0.5) { const k = (t - 0.5) / 0.5; c = a.map((x, j) => x + (PAPER[j] - x) * k); }
    else { const k = t / 0.5; c = deep.map((x, j) => x + (a[j] - x) * k); }
    lut[i * 3] = c[0]; lut[i * 3 + 1] = c[1]; lut[i * 3 + 2] = c[2];
  }
  return lut;
}

export function renderStyle(style, px, out, { accent = '#E0461E', palette = [] } = {}) {
  out.width = px.w; out.height = px.h;
  const ctx = out.getContext('2d');
  const { w, h } = px;

  if (style === 'original') { ctx.drawImage(px.canvas, 0, 0); return out; }

  if (style === 'ink') {
    const lut = inkLUT(accent);
    const img = ctx.createImageData(w, h);
    const s = px.data, d = img.data;
    for (let i = 0; i < s.length; i += 4) {
      let l = (0.299 * s[i] + 0.587 * s[i + 1] + 0.114 * s[i + 2]);
      l += (Math.random() - 0.5) * 14; // 颗粒
      const k = Math.max(0, Math.min(255, l | 0)) * 3;
      d[i] = lut[k]; d[i + 1] = lut[k + 1]; d[i + 2] = lut[k + 2]; d[i + 3] = 255;
    }
    ctx.putImageData(img, 0, 0);
    return out;
  }

  if (style === 'halftone') {
    ctx.fillStyle = `rgb(${PAPER})`;
    ctx.fillRect(0, 0, w, h);
    const cell = Math.max(4, Math.round(Math.max(w, h) / 92));
    let row = 0;
    for (let y = 0; y < h + cell; y += cell * 0.87, row++) {
      const off = row % 2 ? cell / 2 : 0;
      for (let x = -cell; x < w + cell; x += cell) {
        const cx = x + off;
        const c = cellAverage(px, Math.max(0, cx - cell / 2), Math.max(0, y - cell / 2), cell, cell);
        const l = lum(c);
        const r = cell * 0.62 * Math.sqrt(Math.max(0.04, 1 - l * 0.9));
        // 稍微提饱和、压暗，像印刷油墨
        const m = (c[0] + c[1] + c[2]) / 3;
        const col = c.map((x) => Math.max(0, Math.min(255, (m + (x - m) * 1.35) * 0.92)));
        ctx.fillStyle = `rgb(${col[0] | 0},${col[1] | 0},${col[2] | 0})`;
        ctx.beginPath();
        ctx.arc(cx, y, r, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    return out;
  }

  if (style === 'blocks') {
    const pal = palette.length ? palette.map((p) => hexToRgb(p[0])) : null;
    const cols = 30;
    const cell = Math.max(4, w / cols);
    for (let y = 0; y < h; y += cell) {
      for (let x = 0; x < w; x += cell) {
        let c = cellAverage(px, x, y, cell, cell);
        if (pal) {
          let best = pal[0], bd = Infinity;
          for (const p of pal) {
            const d = (p[0] - c[0]) ** 2 + (p[1] - c[1]) ** 2 + (p[2] - c[2]) ** 2;
            if (d < bd) { bd = d; best = p; }
          }
          c = best;
        }
        ctx.fillStyle = `rgb(${c[0] | 0},${c[1] | 0},${c[2] | 0})`;
        ctx.fillRect(Math.floor(x), Math.floor(y), Math.ceil(cell) + 1, Math.ceil(cell) + 1);
      }
    }
    return out;
  }
  ctx.drawImage(px.canvas, 0, 0);
  return out;
}

// 只保留接近某个颜色的像素，其余褪成纸色（色板悬停时用）
export function renderHighlight(px, out, hex) {
  out.width = px.w; out.height = px.h;
  const ctx = out.getContext('2d');
  const t = hexToRgb(hex);
  const img = ctx.createImageData(px.w, px.h);
  const s = px.data, d = img.data;
  for (let i = 0; i < s.length; i += 4) {
    const dist = Math.sqrt((s[i] - t[0]) ** 2 + (s[i + 1] - t[1]) ** 2 + (s[i + 2] - t[2]) ** 2);
    const k = Math.max(0, Math.min(1, (dist - 40) / 50)) * 0.86;
    d[i] = s[i] + (PAPER[0] - s[i]) * k;
    d[i + 1] = s[i + 1] + (PAPER[1] - s[i + 1]) * k;
    d[i + 2] = s[i + 2] + (PAPER[2] - s[i + 2]) * k;
    d[i + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  return out;
}

const reduce = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

// 色块擦除：每一格先闪一下章节色，再换成新的画面
export function blockWipe(out, from, to, accent, { dur = 720, token = null } = {}) {
  const w = to.width, h = to.height;
  out.width = w; out.height = h;
  const ctx = out.getContext('2d');
  if (reduce()) { ctx.drawImage(to, 0, 0); return Promise.resolve(); }
  const cols = 7, rows = Math.max(4, Math.round(cols * h / w));
  const cw = w / cols, ch = h / rows;
  const cells = [];
  for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
    cells.push({ i, j, delay: ((i / cols) * 0.55 + (j / rows) * 0.45) * dur * 0.55 + Math.random() * dur * 0.18 });
  }
  const flash = 120;
  const start = performance.now();
  return new Promise((resolve) => {
    const frame = () => {
      if (token && token.cancelled) return resolve();
      const t = performance.now() - start;
      let done = true;
      for (const c of cells) {
        const x = Math.floor(c.i * cw), y = Math.floor(c.j * ch);
        const ww = Math.ceil(cw) + 1, hh = Math.ceil(ch) + 1;
        const lt = t - c.delay;
        if (lt < 0) { ctx.drawImage(from, x, y, ww, hh, x, y, ww, hh); done = false; }
        else if (lt < flash) { ctx.fillStyle = accent; ctx.fillRect(x, y, ww, hh); done = false; }
        else ctx.drawImage(to, x, y, ww, hh, x, y, ww, hh);
      }
      if (done) { ctx.drawImage(to, 0, 0); resolve(); } else requestAnimationFrame(frame);
    };
    frame();
  });
}

// 点阵聚合：照片先变成一颗颗色点，从缩略图的位置飞过来拼好
export function dotAssemble(canvas, px, { from = null, dur = 900, token = null } = {}) {
  const r = canvas.getBoundingClientRect();
  const W = r.width, H = r.height;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
  const ctx = canvas.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  if (reduce() || !W) return Promise.resolve();
  const cols = Math.max(24, Math.min(64, Math.round(W / 11)));
  const cell = W / cols;
  const rows = Math.round(H / cell);
  const dots = [];
  for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
    const u = (i + 0.5) / cols, v = (j + 0.5) / rows;
    const c = pixelAt(px, u, v);
    const tx = u * W, ty = v * H;
    let sx, sy;
    if (from) { sx = from.x + u * from.w + (Math.random() - 0.5) * 60; sy = from.y + v * from.h + (Math.random() - 0.5) * 60; }
    else { sx = W / 2 + (Math.random() - 0.5) * W * 1.6; sy = H / 2 + (Math.random() - 0.5) * H * 1.6; }
    dots.push({ sx, sy, tx, ty, c: `rgb(${c[0]},${c[1]},${c[2]})`, d: Math.random() * dur * 0.35 + (u + v) * dur * 0.1 });
  }
  const start = performance.now();
  const ease = (t) => 1 - Math.pow(1 - t, 3);
  return new Promise((resolve) => {
    const frame = () => {
      if (token && token.cancelled) return resolve();
      const t = performance.now() - start;
      ctx.clearRect(0, 0, W, H);
      let done = true;
      for (const d of dots) {
        let k = (t - d.d) / (dur * 0.55);
        if (k < 1) done = false;
        k = ease(Math.max(0, Math.min(1, k)));
        const x = d.sx + (d.tx - d.sx) * k;
        const y = d.sy + (d.ty - d.sy) * k;
        const rad = cell * (0.18 + 0.3 * k);
        ctx.globalAlpha = 0.2 + 0.8 * k;
        ctx.fillStyle = d.c;
        ctx.beginPath(); ctx.arc(x, y, rad, 0, Math.PI * 2); ctx.fill();
      }
      ctx.globalAlpha = 1;
      if (done) resolve(); else requestAnimationFrame(frame);
    };
    frame();
  });
}
