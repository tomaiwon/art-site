// ============================================================
//  首页中间的点阵大字：鼠标会把点推开，悬停照片时变成章节名，
//  点的颜色直接取自那张照片（照片被“映射”进字里）
// ============================================================

const hexToRgb = (hex) => {
  const v = parseInt(hex.replace('#', ''), 16);
  return [(v >> 16) & 255, (v >> 8) & 255, v & 255];
};

export class ParticleWord {
  constructor(canvas, color) {
    this.c = canvas;
    this.ctx = canvas.getContext('2d');
    this.ps = [];
    this.mouse = { x: -9999, y: -9999 };
    this.base = hexToRgb(color);
    this.word = '';
    this.src = null; // { data, w, h } 照片像素
    this.running = false;
    this.free = false;
    this.t = 0;
    this.reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

    this.ro = new ResizeObserver(() => this.resize());
    this.ro.observe(canvas);
    window.addEventListener('pointermove', (e) => {
      const r = this.c.getBoundingClientRect();
      this.mouse.x = e.clientX - r.left;
      this.mouse.y = e.clientY - r.top;
    }, { passive: true });
    document.addEventListener('pointerleave', () => { this.mouse.x = this.mouse.y = -9999; });
  }

  resize() {
    const r = this.c.getBoundingClientRect();
    if (!r.width || !r.height) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const changed = r.width !== this.w || r.height !== this.h;
    this.w = r.width; this.h = r.height; this.dpr = dpr;
    this.c.width = Math.round(r.width * dpr);
    this.c.height = Math.round(r.height * dpr);
    // 尺寸真的变了才重新排点；第一次出现时点会从四周飞进来
    if (this.word && changed) this.setWord(this.word, this.src, this.colorHex, this.ps.length > 0);
  }

  _sample(text) {
    const w = Math.round(this.w), h = Math.round(this.h);
    const off = document.createElement('canvas');
    off.width = w; off.height = h;
    const o = off.getContext('2d');
    if ('fontStretch' in o) o.fontStretch = 'expanded';
    const fam = '"Archivo", "PingFang SC", sans-serif';
    let size = h * 0.42;
    o.font = `800 ${size}px ${fam}`;
    const mw = o.measureText(text).width;
    size = Math.min(h * 0.42, size * (w * 0.84) / mw);
    o.font = `800 ${size}px ${fam}`;
    o.textAlign = 'center';
    o.textBaseline = 'middle';
    o.fillStyle = '#000';
    const cy = h * 0.42;
    o.fillText(text, w / 2, cy);
    const gap = Math.max(4, Math.min(10, Math.round(size / 15)));
    const data = o.getImageData(0, 0, w, h).data;
    const pts = [];
    let minX = w, minY = h, maxX = 0, maxY = 0;
    for (let y = gap / 2; y < h; y += gap) {
      for (let x = gap / 2; x < w; x += gap) {
        if (data[((y | 0) * w + (x | 0)) * 4 + 3] > 130) {
          pts.push([x, y]);
          if (x < minX) minX = x; if (x > maxX) maxX = x;
          if (y < minY) minY = y; if (y > maxY) maxY = y;
        }
      }
    }
    return { pts, gap, box: { x: minX, y: minY, w: Math.max(1, maxX - minX), h: Math.max(1, maxY - minY) } };
  }

  // 照片像素按 cover 方式铺进文字的外框
  _colorAt(x, y, box, i) {
    if (!this.src) {
      const c = this.color || this.base;
      const j = ((i * 9301 + 49297) % 233280) / 233280; // 稳定的轻微明暗变化
      const k = 0.9 + j * 0.18;
      return [Math.min(255, c[0] * k), Math.min(255, c[1] * k), Math.min(255, c[2] * k)];
    }
    const { data, w, h } = this.src;
    const ia = w / h, ba = box.w / box.h;
    let u = (x - box.x) / box.w, v = (y - box.y) / box.h;
    if (ia > ba) { const s = ba / ia; u = (1 - s) / 2 + u * s; } else { const s = ia / ba; v = (1 - s) / 2 + v * s; }
    const px = Math.max(0, Math.min(w - 1, (u * w) | 0));
    const py = Math.max(0, Math.min(h - 1, (v * h) | 0));
    const k = (py * w + px) * 4;
    let r = data[k], g = data[k + 1], b = data[k + 2];
    const l = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    if (l > 0.78) { const f = 0.78 / l; r *= f; g *= f; b *= f; } // 太亮的点在米色纸上看不见
    return [r, g, b];
  }

  setWord(text, src = null, color = null, instant = false) {
    this.word = text; this.src = src; this.colorHex = color;
    this.color = color ? hexToRgb(color) : null;
    if (!this.w) return;
    this.free = false;
    const { pts, gap, box } = this._sample(text);
    this.gap = gap;
    this.r = gap * 0.4;
    // 从左到右分配，形变时会像一阵风扫过去
    pts.sort((a, b) => a[0] - b[0] + (Math.random() - 0.5) * gap * 6);
    const alive = this.ps.filter((p) => !p.dying).sort((a, b) => a.x - b.x);
    const next = [];
    for (let i = 0; i < pts.length; i++) {
      const [tx, ty] = pts[i];
      let p = alive[i];
      if (!p) {
        const edge = Math.random() < 0.5;
        p = {
          x: instant ? tx : edge ? (Math.random() < 0.5 ? -20 : this.w + 20) : Math.random() * this.w,
          y: instant ? ty : edge ? Math.random() * this.h : (Math.random() < 0.5 ? -20 : this.h + 20),
          vx: 0, vy: 0, c: null, a: 0,
        };
      }
      p.tx = tx; p.ty = ty; p.dying = false; p.ta = 1;
      p.tc = this._colorAt(tx, ty, box, i);
      if (!p.c || instant) p.c = p.tc.slice();
      if (instant) { p.x = tx; p.y = ty; p.a = 1; }
      p.ph = Math.random() * Math.PI * 2;
      next.push(p);
    }
    for (let i = pts.length; i < alive.length; i++) {
      const p = alive[i];
      p.dying = true; p.ta = 0;
      p.tx = p.x + (Math.random() - 0.5) * 120;
      p.ty = p.y + (Math.random() - 0.5) * 120;
      next.push(p);
    }
    const kept = new Set(next);
    this.ps = next.concat(this.ps.filter((p) => p.dying && !kept.has(p)));
  }

  // 点击时炸开
  explode() {
    this.free = true;
    const cx = this.mouse.x > -999 ? this.mouse.x : this.w / 2;
    const cy = this.mouse.y > -999 ? this.mouse.y : this.h / 2;
    for (const p of this.ps) {
      const dx = p.x - cx, dy = p.y - cy;
      const d = Math.hypot(dx, dy) || 1;
      const s = 6 + Math.random() * 22;
      p.vx = (dx / d) * s + (Math.random() - 0.5) * 6;
      p.vy = (dy / d) * s + (Math.random() - 0.5) * 6;
      p.ta = 0;
    }
    return new Promise((res) => setTimeout(res, this.reduce ? 0 : 420));
  }

  start() {
    if (this.running) return;
    this.running = true;
    const loop = () => {
      if (!this.running) return;
      this._frame();
      this.raf = requestAnimationFrame(loop);
    };
    this.raf = requestAnimationFrame(loop);
  }

  stop() { this.running = false; cancelAnimationFrame(this.raf); }

  _frame() {
    const { ctx, dpr } = this;
    if (!this.w) return;
    this.t += 0.016;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, this.w, this.h);
    const R = Math.max(60, this.gap * 12);
    const R2 = R * R;
    const mx = this.mouse.x, my = this.mouse.y;
    const spring = this.reduce ? 0.2 : 0.055;
    const damp = this.free ? 0.97 : 0.8;
    const ps = this.ps;
    let anyDying = false;
    for (let i = 0; i < ps.length; i++) {
      const p = ps[i];
      if (!this.free) {
        const wob = this.reduce ? 0 : Math.sin(this.t * 1.6 + p.ph) * 0.35;
        p.vx += (p.tx + wob - p.x) * spring;
        p.vy += (p.ty + wob - p.y) * spring;
        const dx = p.x - mx, dy = p.y - my, d2 = dx * dx + dy * dy;
        if (d2 < R2) {
          const d = Math.sqrt(d2) || 1;
          const f = (1 - d / R) * (1 - d / R) * 9;
          p.vx += (dx / d) * f; p.vy += (dy / d) * f;
        }
      }
      p.vx *= damp; p.vy *= damp;
      p.x += p.vx; p.y += p.vy;
      p.a += (p.ta - p.a) * (this.free ? 0.09 : 0.08);
      if (p.c) {
        p.c[0] += (p.tc[0] - p.c[0]) * 0.1;
        p.c[1] += (p.tc[1] - p.c[1]) * 0.1;
        p.c[2] += (p.tc[2] - p.c[2]) * 0.1;
      }
      if (p.dying) anyDying = true;
      if (p.a < 0.02) continue;
      ctx.globalAlpha = p.a;
      ctx.fillStyle = `rgb(${p.c[0] | 0},${p.c[1] | 0},${p.c[2] | 0})`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, this.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    if (anyDying && Math.random() < 0.1) this.ps = ps.filter((p) => !(p.dying && p.a < 0.03));
  }
}
