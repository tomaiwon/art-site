// ============================================================
//  Film Journal — 主程序
//  路由：#/           首页拼贴
//        #/ch/<id>     章节页
//        #/ch/<id>/<n> 章节页 + 第 n 张大图
// ============================================================
import { SITE, STYLES, CHAPTERS } from './content.js';
import { PHOTOS } from './photos.gen.js';
import { sound } from './sound.js';
import { ParticleWord } from './particles.js';
import {
  loadPixels, renderStyle, renderHighlight, blockWipe, dotAssemble, pixelAt, rgbToHex, hexToRgb,
} from './styles.js';

const $ = (s, r = document) => r.querySelector(s);
const pad2 = (n) => String(n).padStart(2, '0');
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const REDUCE = matchMedia('(prefers-reduced-motion: reduce)').matches;
const narrow = () => matchMedia('(max-width: 860px)').matches;
const store = {
  get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
  set(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* ignore */ } },
};

// ---------- 数据 ----------
const chapters = CHAPTERS.map((c) => ({
  ...c,
  photos: (PHOTOS[c.folder || c.id] || []).map((p, i) => ({
    ...p, i, chId: c.id,
    small: `${SITE.photoRoot}${c.folder || c.id}/${p.n}-900.webp`,
    large: `${SITE.photoRoot}${c.folder || c.id}/${p.n}-2000.webp`,
    caption: (c.captions && c.captions[p.n]) || '',
  })),
})).filter((c) => c.photos.length);
chapters.forEach((c, i) => { c.idx = i; c.num = pad2(i + 1); c.photos.forEach((p) => { p.ch = c; }); });
const byId = Object.fromEntries(chapters.map((c) => [c.id, c]));
const TOTAL = chapters.reduce((s, c) => s + c.photos.length, 0);
const captionOf = (p) => p.caption || `${p.ch.city} · 第 ${pad2(p.i + 1)} 格`;

const state = {
  view: null,
  chapter: null,
  style: STYLES.some((s) => s.id === store.get('fj-style')) ? store.get('fj-style') : 'original',
  focusN: null,
  fromRect: null,
};

function setAccent(hex) {
  const [r, g, b] = hexToRgb(hex);
  const s = document.documentElement.style;
  s.setProperty('--accent', hex);
  s.setProperty('--accent-ink', rgbToHex(r * 0.78, g * 0.78, b * 0.78));
}

// ---------- 顶栏 ----------
$('.logo-name').textContent = SITE.logo;
$('.logo-tag').textContent = SITE.logoTag;
$('.year').textContent = SITE.year;
$('.nav-back.pn-d').href = SITE.backDesktop;
$('.nav-back.pn-m').href = SITE.backMobile;

const menu = $('#index-menu');
const menuBtn = $('[data-nav="chapters"]');
menu.innerHTML = chapters.map((c) => `
  <a href="#/ch/${c.id}">
    <span class="sw" style="background:${c.accent}"></span>
    <span class="n">CH.${c.num}</span>
    <span class="t">${esc(c.key)}<small>${esc(c.title)}</small></span>
    <span class="c">${esc(c.date)} · ${c.photos.length}</span>
  </a>`).join('');
const setMenu = (open) => { menu.hidden = !open; menuBtn.setAttribute('aria-expanded', String(open)); };
menuBtn.addEventListener('click', () => setMenu(menu.hidden));
menu.addEventListener('click', (e) => { if (e.target.closest('a')) setMenu(false); });
document.addEventListener('pointerdown', (e) => {
  if (!menu.hidden && !menu.contains(e.target) && e.target !== menuBtn) setMenu(false);
});

// ---------- 声音开关 ----------
const soundBtn = $('.sound-btn');
const hint = $('.sound-hint');
let unlockedAt = 0;
function firstGesture() {
  if (sound.wanted && !sound.ctx) unlockedAt = performance.now();
  sound.unlock();
  hint.classList.add('gone');
}
window.addEventListener('pointerdown', firstGesture, true);
window.addEventListener('keydown', firstGesture, true);
soundBtn.addEventListener('click', () => {
  if (performance.now() - unlockedAt < 800) return; // 这次点击是用来“解锁”声音的
  sound.toggle();
});
sound.onChange((s) => {
  soundBtn.classList.toggle('is-on', s.on);
  soundBtn.setAttribute('aria-pressed', String(s.on));
  $('.sound-label').textContent = s.wanted ? 'Sound' : 'Muted';
  soundBtn.title = s.wanted ? '关闭声音' : '打开声音';
  if (!s.wanted) hint.classList.add('gone');
});

// ============================================================
//  首页
// ============================================================
const home = $('#home');
const mosaic = $('.mosaic');
const hero = new ParticleWord($('.hero-canvas'), SITE.accent);
const heroLine = $('.hero-line'), heroSub = $('.hero-sub'), heroHint = $('.hero-hint span');

// 顺时针的一圈格子：9 列 × 5 行，中间留给大字
const COLS = 9, ROWS = 5;
const RING = [];
for (let c = 1; c <= COLS; c++) RING.push([1, c]);
for (let r = 2; r < ROWS; r++) RING.push([r, COLS]);
for (let c = COLS; c >= 1; c--) RING.push([ROWS, c]);
for (let r = ROWS - 1; r >= 2; r--) RING.push([r, 1]);

// 各章节的精选照片交错排开
const ringItems = [];
{
  const queues = chapters.map((c) => (c.featured || []).map((n) => c.photos.find((p) => p.n === n)).filter(Boolean));
  const extra = chapters.map((c) => c.photos.filter((p) => !(c.featured || []).includes(p.n)));
  const need = RING.length - 2;
  for (let k = 0; ringItems.length < need && queues.some((q) => q.length); k++) {
    const q = queues[k % queues.length];
    if (q.length) ringItems.push(q.shift());
  }
  for (let k = 0; ringItems.length < need && extra.some((q) => q.length); k++) {
    const q = extra[k % extra.length];
    if (q.length) ringItems.push(q.splice(Math.floor(q.length / 2), 1)[0]);
  }
  ringItems.splice(Math.min(5, ringItems.length), 0, 'red');
  ringItems.splice(Math.min(15, ringItems.length), 0, 'dark');
}

const tiles = ringItems.slice(0, RING.length).map((item) => {
  let el;
  if (item === 'red') {
    el = document.createElement('div');
    el.className = 'tile tile-red';
    el.innerHTML = `<small>${esc(SITE.kicker)}</small><strong>${esc(SITE.slogan)}</strong>`;
  } else if (item === 'dark') {
    el = document.createElement('div');
    el.className = 'tile tile-dark';
    el.innerHTML = `<small>${esc(SITE.darkKicker)}</small><strong>${esc(SITE.darkBig)}</strong><span>${TOTAL} FRAMES<br>${chapters.length} ROLLS</span>`;
  } else {
    el = document.createElement('button');
    el.type = 'button';
    el.className = 'tile';
    el.style.setProperty('--c', item.ch.accent);
    el.setAttribute('aria-label', `CH.${item.ch.num} ${item.ch.key} ${item.ch.title}：${captionOf(item)}`);
    el.innerHTML = `<img src="${item.small}" alt="" decoding="async"><span class="tile-tag"><b>CH.${item.ch.num}</b>${esc(item.ch.key)}<em>${esc(item.ch.title)}</em></span>`;
    el._photo = item;
  }
  mosaic.appendChild(el);
  return el;
});

let rot = 0;
function placeTiles() {
  const n = RING.length;
  tiles.forEach((el, i) => {
    const [r, c] = RING[(((i + rot) % n) + n) % n];
    el.style.gridRow = r;
    el.style.gridColumn = c;
  });
}
placeTiles();

// 滚轮 = 整圈照片顺时针 / 逆时针转一格
function rotate(dir) {
  const first = tiles.map((el) => el.getBoundingClientRect());
  rot += dir;
  placeTiles();
  if (!REDUCE) {
    tiles.forEach((el, i) => {
      const last = el.getBoundingClientRect();
      const dx = first[i].left - last.left, dy = first[i].top - last.top;
      if (!dx && !dy) return;
      el.animate(
        [{ transform: `translate(${dx}px, ${dy}px)` }, { transform: 'none' }],
        { duration: 480, easing: 'cubic-bezier(.65,0,.2,1)' },
      );
    });
  }
  sound.hover((((rot % 10) + 10) % 10), 0.34);
}
let wheelAcc = 0, lastRot = 0;
home.addEventListener('wheel', (e) => {
  if (narrow()) return;
  e.preventDefault();
  wheelAcc += e.deltaY + e.deltaX;
  const now = performance.now();
  if (Math.abs(wheelAcc) > 50 && now - lastRot > 130) {
    rotate(Math.sign(wheelAcc));
    wheelAcc = 0; lastRot = now;
  }
}, { passive: false });

function heroDefault() {
  heroLine.textContent = SITE.heroLine;
  heroSub.textContent = chapters.map((c) => c.key).join(' · ');
  heroSub.classList.remove('zh');
  heroHint.textContent = narrow() ? 'TAP A PHOTO' : 'SCROLL TO TRAVEL';
}
let heroKey = null, heroTimer = 0;
function resetHero() {
  heroKey = null;
  hero.setWord(SITE.hero, null, SITE.accent);
  heroDefault();
}
async function heroShow(p, slot) {
  clearTimeout(heroTimer);
  const key = p.chId + p.n;
  if (heroKey === key) return;
  heroKey = key;
  sound.hover(slot % 10, 0.45);
  heroLine.textContent = `CH.${p.ch.num} / ${p.ch.title} / ${pad2(p.ch.photos.length)} FRAMES`;
  heroSub.textContent = p.ch.intro;
  heroSub.classList.add('zh');
  heroHint.textContent = 'CLICK TO OPEN';
  let px = null;
  try { px = await loadPixels(p.small, 220); } catch (e) { /* 用章节色 */ }
  if (heroKey !== key) return;
  hero.setWord(p.ch.key, px, p.ch.accent);
}
const slotOf = (el) => (((tiles.indexOf(el) + rot) % RING.length) + RING.length) % RING.length;
mosaic.addEventListener('pointerover', (e) => {
  const t = e.target.closest('button.tile');
  if (t) heroShow(t._photo, slotOf(t));
});
mosaic.addEventListener('pointerout', (e) => {
  const t = e.target.closest('button.tile');
  if (!t || t.contains(e.relatedTarget)) return;
  clearTimeout(heroTimer);
  heroTimer = setTimeout(resetHero, 900);
});
mosaic.addEventListener('focusin', (e) => {
  const t = e.target.closest('button.tile');
  if (t) heroShow(t._photo, slotOf(t));
});
mosaic.addEventListener('click', (e) => {
  const t = e.target.closest('button.tile');
  if (!t) return;
  state.focusN = t._photo.n;
  location.hash = `#/ch/${t._photo.chId}`;
});

function showHome() {
  state.view = 'home';
  state.chapter = null;
  home.hidden = false;
  chapterEl.hidden = true;
  mosaic.classList.remove('is-leaving');
  setAccent(SITE.accent);
  sound.setScene('home');
  $('[data-nav="album"]').classList.add('is-active');
  document.title = `Film Journal — ${SITE.logo}`;
  resetHero();
  hero.start();
}

// ============================================================
//  章节页
// ============================================================
const chapterEl = $('#chapter');
const strip = $('.strip');
const track = $('.strip-track');
const progress = $('.ch-progress i');
let cards = [];
let io = null;

const switchEl = $('.style-switch');
switchEl.innerHTML = STYLES.map((s, i) => `
  <button type="button" role="radio" data-style="${s.id}" title="按 ${i + 1}">${s.zh}<span>${s.en}</span></button>`).join('');
switchEl.addEventListener('click', (e) => {
  const b = e.target.closest('button');
  if (b) setStyle(b.dataset.style);
});
function syncSwitch() {
  switchEl.querySelectorAll('button').forEach((b) => b.setAttribute('aria-checked', String(b.dataset.style === state.style)));
}
syncSwitch();

function showChapter(ch) {
  state.view = 'chapter';
  state.chapter = ch;
  home.hidden = true;
  chapterEl.hidden = false;
  hero.stop();
  setAccent(ch.accent);
  sound.setScene(ch.sound);
  $('[data-nav="album"]').classList.remove('is-active');
  document.title = `${ch.key} ${ch.title} — Film Journal`;

  $('.ch-num').textContent = `CH.${ch.num} · ${ch.date}`;
  $('.ch-title .en').textContent = ch.key;
  $('.ch-title .zh').textContent = ch.title;
  $('.ch-intro').textContent = ch.intro;
  $('.ch-count').textContent = `${pad2(ch.photos.length)} FRAMES`;
  const n = chapters.length;
  const prev = chapters[(ch.idx - 1 + n) % n], next = chapters[(ch.idx + 1) % n];
  const pv = $('.ch-prev'), nx = $('.ch-next');
  pv.href = `#/ch/${prev.id}`; pv.textContent = `PREV \\ ${prev.key}`;
  nx.href = `#/ch/${next.id}`; nx.textContent = `${next.key} / NEXT`;
  $('.ch-foot .f1').textContent = SITE.footer;
  $('.ch-foot .f2').textContent = `${TOTAL} FRAMES · ${chapters.length} ROLLS`;
  $('.ch-foot .f3').textContent = SITE.year;
  syncSwitch();
  buildStrip(ch);
}

function buildStrip(ch) {
  if (io) io.disconnect();
  cards.forEach((c) => { if (c.token) c.token.cancelled = true; });
  track.innerHTML = '';
  const len = ch.photos.length;
  cards = ch.photos.map((p, i) => {
    const fig = document.createElement('figure');
    fig.className = 'card';
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'frame';
    btn.style.aspectRatio = `${p.w} / ${p.h}`;
    btn.style.setProperty('--ar', (p.w / p.h).toFixed(4));
    btn.setAttribute('aria-label', `打开 ${pad2(i + 1)} / ${pad2(len)}：${captionOf(p)}`);
    const img = new Image();
    img.alt = captionOf(p);
    img.decoding = 'async';
    img.loading = i < 6 ? 'eager' : 'lazy';
    img.onload = () => img.classList.add('loaded');
    img.src = p.small;
    const cv = document.createElement('canvas');
    btn.append(img, cv);
    const cap = document.createElement('figcaption');
    cap.innerHTML = `<span class="num">${pad2(i + 1)} / ${pad2(len)}</span><span class="cap${p.caption ? '' : ' dim'}">${esc(captionOf(p))}</span>`;
    fig.append(btn, cap);
    track.append(fig);
    const card = { p, i, fig, btn, img, cv, shown: 'original', current: null, token: null, visible: false };
    btn.addEventListener('click', () => {
      state.fromRect = btn.getBoundingClientRect();
      location.hash = `#/ch/${ch.id}/${i + 1}`;
    });
    btn.addEventListener('pointerenter', () => sound.hover(i, 0.4));
    fig._card = card;
    return card;
  });
  io = new IntersectionObserver((entries) => {
    for (const e of entries) {
      const c = e.target._card;
      c.visible = e.isIntersecting;
      if (c.visible && c.shown !== state.style) applyStyle(c, false);
    }
  }, { root: strip, rootMargin: '0px 300px' });
  cards.forEach((c) => io.observe(c.fig));

  strip.scrollLeft = 0;
  sTarget = 0;
  requestAnimationFrame(() => {
    const focus = state.focusN && cards.find((c) => c.p.n === state.focusN);
    state.focusN = null;
    if (focus) {
      scrollToCard(focus, false);
      focus.fig.classList.add('flash');
      setTimeout(() => focus.fig.classList.remove('flash'), 1800);
    }
    updateProgress();
  });
}

function scrollToCard(card, smooth = true) {
  const x = clamp(card.fig.offsetLeft - (strip.clientWidth - card.fig.offsetWidth) / 2, 0, strip.scrollWidth - strip.clientWidth);
  if (smooth) { sTarget = x; kick(); } else { strip.scrollLeft = x; sTarget = x; }
}

// 竖向滚轮 -> 横向平滑滚动
let sTarget = 0, sRaf = 0;
function kick() { if (!sRaf) sRaf = requestAnimationFrame(stepScroll); }
function stepScroll() {
  const d = sTarget - strip.scrollLeft;
  if (Math.abs(d) < 1) { strip.scrollLeft = sTarget; sRaf = 0; return; }
  strip.scrollLeft += Math.sign(d) * Math.max(1, Math.abs(d) * 0.14);
  sRaf = requestAnimationFrame(stepScroll);
}
strip.addEventListener('wheel', (e) => {
  e.preventDefault();
  const max = strip.scrollWidth - strip.clientWidth;
  const base = sRaf ? sTarget : strip.scrollLeft;
  sTarget = clamp(base + e.deltaY + e.deltaX, 0, max);
  kick();
}, { passive: false });
function updateProgress() {
  const max = strip.scrollWidth - strip.clientWidth;
  progress.style.width = `${max > 0 ? (strip.scrollLeft / max) * 100 : 100}%`;
}
strip.addEventListener('scroll', updateProgress, { passive: true });

async function applyStyle(card, animate) {
  const style = state.style;
  if (card.token) card.token.cancelled = true;
  const token = (card.token = { cancelled: false });
  let px;
  try { px = await loadPixels(card.p.small, 640); } catch (e) { return; }
  if (token.cancelled) return;
  const to = document.createElement('canvas');
  renderStyle(style, px, to, { accent: card.p.ch.accent, palette: card.p.p });
  const from = card.current || px.canvas;
  card.cv.classList.add('on');
  if (animate) await blockWipe(card.cv, from, to, card.p.ch.accent, { token, dur: 640 + Math.random() * 200 });
  else {
    card.cv.width = to.width; card.cv.height = to.height;
    card.cv.getContext('2d').drawImage(to, 0, 0);
  }
  if (token.cancelled) return;
  card.current = to;
  card.shown = style;
  if (style === 'original') card.cv.classList.remove('on');
}

function setStyle(id) {
  if (state.style === id || !STYLES.some((s) => s.id === id)) return;
  state.style = id;
  store.set('fj-style', id);
  sound.whoosh();
  syncSwitch();
  if (state.view === 'chapter') cards.forEach((c) => { if (c.visible) applyStyle(c, true); });
  if (lb.open) { lbStyleLabel(); lbRenderStyle(true); }
}

// ============================================================
//  大图：点阵入场 / 放大镜 / 取色 / 色板
// ============================================================
const lbEl = $('#lightbox');
const stage = $('.lb-stage');
const photoBox = $('.lb-photo');
const lbImg = $('.lb-img');
const fx = $('.lb-fx');
const dots = $('.lb-dots');
const loupe = $('.loupe');
const under = $('.lb-under');
const ZOOMS = [2, 3, 4, 6, 8, 12, 16, 24];
const lb = {
  open: false, ch: null, i: -1, px: null, pxSmall: null, token: null,
  styled: null, zi: ZOOMS.indexOf(8), last: null, lastRGB: null, hl: null,
};

function fitPhoto(p) {
  const cs = getComputedStyle(stage);
  const aw = stage.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
  const ah = stage.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom);
  const s = Math.min(aw / p.w, ah / p.h);
  photoBox.style.width = `${Math.max(10, Math.floor(p.w * s))}px`;
  photoBox.style.height = `${Math.max(10, Math.floor(p.h * s))}px`;
}
window.addEventListener('resize', () => { if (lb.open) fitPhoto(lb.ch.photos[lb.i]); });

function lbStyleLabel() {
  const s = STYLES.find((x) => x.id === state.style);
  $('.lb-style .en').textContent = s.en.toUpperCase();
  $('.lb-style .zh').textContent = s.zh;
}

function openLightbox(ch, i) {
  const first = !lb.open;
  if (lb.token) lb.token.cancelled = true;
  const token = (lb.token = { cancelled: false });
  lb.open = true; lb.ch = ch; lb.i = i;
  lb.px = null; lb.pxSmall = null; lb.styled = null; lb.hl = null;
  lbEl.hidden = false;
  const p = ch.photos[i];
  const len = ch.photos.length;

  $('.lb-ch').textContent = `CH.${ch.num} — ${ch.key} ${ch.title}`;
  $('.lb-count b').textContent = pad2(i + 1);
  $('.lb-count span').textContent = ` / ${pad2(len)}`;
  const cap = $('.lb-cap');
  cap.textContent = captionOf(p);
  cap.style.color = p.caption ? '' : 'var(--muted)';
  lbStyleLabel();
  resetUnder();
  $('.lb-palette').innerHTML = p.p.map(([hex, share]) => `
    <li data-hex="${hex}" tabindex="0">
      <span class="sw" style="background:${hex}"></span>
      <span class="hx">${hex}</span>
      <span class="sh">${share}%</span>
    </li>`).join('');

  fitPhoto(p);
  lbImg.classList.remove('show');
  fx.classList.remove('show');
  dots.classList.remove('hide');
  dots.getContext('2d').clearRect(0, 0, dots.width, dots.height);
  lbImg.alt = captionOf(p);
  lbImg.src = p.large;

  let from = null;
  if (first && state.fromRect) {
    const pr = photoBox.getBoundingClientRect(), fr = state.fromRect;
    from = { x: fr.left - pr.left, y: fr.top - pr.top, w: fr.width, h: fr.height };
  }
  state.fromRect = null;

  (async () => {
    let small;
    try { small = await loadPixels(p.small, 360); } catch (e) { lbImg.classList.add('show'); return; }
    if (token.cancelled) return;
    lb.pxSmall = small;
    const big = loadPixels(p.large, 2000);
    await dotAssemble(dots, small, { from, dur: first ? 1000 : 700, token });
    if (token.cancelled) return;
    try { lb.px = await big; } catch (e) { lb.px = small; }
    if (token.cancelled) return;
    try { await lbImg.decode(); } catch (e) { /* 已经能显示 */ }
    if (token.cancelled) return;
    lbImg.classList.add('show');
    lbRenderStyle(false);
    dots.classList.add('hide');
  })();

  // 预加载相邻两张
  [i - 1, i + 1].forEach((k) => {
    const q = ch.photos[(k + len) % len];
    if (q) { const im = new Image(); im.src = q.large; }
  });
}

function lbRenderStyle(animate) {
  if (!lb.open || !lb.px) return;
  const p = lb.ch.photos[lb.i];
  const accent = lb.ch.accent;
  if (state.style === 'original') {
    if (animate && lb.styled) {
      const to = lb.px.canvas;
      const from = lb.styled;
      lb.styled = null;
      blockWipe(fx, from, to, accent, { token: lb.token, dur: 760 }).then(() => { if (!lb.styled) fx.classList.remove('show'); });
    } else {
      lb.styled = null;
      fx.classList.remove('show');
    }
    return;
  }
  const to = document.createElement('canvas');
  to.getContext('2d', { willReadFrequently: true });
  renderStyle(state.style, lb.px, to, { accent, palette: p.p });
  const from = lb.styled || lb.px.canvas;
  lb.styled = to;
  fx.classList.add('show');
  if (animate) blockWipe(fx, from, to, accent, { token: lb.token, dur: 760 });
  else { fx.width = to.width; fx.height = to.height; fx.getContext('2d').drawImage(to, 0, 0); }
}

function closeLightbox() {
  if (!lb.open) return;
  lb.open = false;
  if (lb.token) lb.token.cancelled = true;
  lbEl.hidden = true;
  loupe.classList.remove('show');
  const c = cards[lb.i];
  if (c && state.chapter === lb.ch) scrollToCard(c, false);
}

function lbStep(d) {
  const len = lb.ch.photos.length;
  const i = (lb.i + d + len) % len;
  history.replaceState(null, '', `#/ch/${lb.ch.id}/${i + 1}`);
  sound.hover(i, 0.4);
  openLightbox(lb.ch, i);
}
$('.lb-prev').addEventListener('click', () => lbStep(-1));
$('.lb-next').addEventListener('click', () => lbStep(1));
$('.lb-close').addEventListener('click', () => { location.hash = `#/ch/${lb.ch.id}`; });
stage.addEventListener('click', (e) => { if (e.target === stage) location.hash = `#/ch/${lb.ch.id}`; });

// ---- 放大镜 + 取色 ----
function resetUnder() {
  under.classList.remove('live');
  under.style.background = '';
  under.style.color = '';
  $('.hex', under).textContent = '把鼠标移到照片上';
  $('.zoom', under).textContent = '';
  $('.lb-xy').textContent = '';
}

function currentSource() {
  if (lb.hl) return lb.hl;
  if (lb.styled) return lb.styled;
  return lb.px ? lb.px.img : lb.pxSmall ? lb.pxSmall.canvas : null;
}

function readColor(u, v) {
  const src = lb.hl || lb.styled;
  if (src) {
    const x = clamp((u * src.width) | 0, 0, src.width - 1), y = clamp((v * src.height) | 0, 0, src.height - 1);
    const d = src.getContext('2d', { willReadFrequently: true }).getImageData(x, y, 1, 1).data;
    return [d[0], d[1], d[2]];
  }
  const px = lb.px || lb.pxSmall;
  return px ? pixelAt(px, u, v) : null;
}

function drawLoupe(clientX, clientY) {
  const r = photoBox.getBoundingClientRect();
  const u = (clientX - r.left) / r.width, v = (clientY - r.top) / r.height;
  if (u < 0 || u > 1 || v < 0 || v > 1) { hideLoupe(); return; }
  lb.last = { clientX, clientY };
  const p = lb.ch.photos[lb.i];
  const src = currentSource();
  const rgb = readColor(u, v);
  if (!src || !rgb) return;
  const zoom = ZOOMS[lb.zi];
  const hex = rgbToHex(...rgb);

  // 放大镜画面
  const L = loupe.clientWidth || 200;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  if (loupe.width !== L * dpr) { loupe.width = L * dpr; loupe.height = L * dpr; }
  const ctx = loupe.getContext('2d');
  const sw = src.naturalWidth || src.width, sh = src.naturalHeight || src.height;
  const k = sw / p.w; // 源图像素 / 原图像素
  const span = (L / zoom) * k;
  ctx.imageSmoothingEnabled = false;
  ctx.fillStyle = '#F4F0E8';
  ctx.fillRect(0, 0, loupe.width, loupe.height);
  ctx.drawImage(src, u * sw - span / 2, v * sh - span / 2, span, span, 0, 0, loupe.width, loupe.height);
  const cell = Math.min(loupe.width / 4, (zoom * dpr) / k); // 一个源像素在放大镜里的大小
  const c = loupe.width / 2;
  ctx.strokeStyle = 'rgba(255,255,255,.9)';
  ctx.lineWidth = 1 * dpr;
  ctx.strokeRect(c - cell / 2, c - cell / 2, cell, cell);
  ctx.strokeStyle = 'rgba(0,0,0,.55)';
  ctx.strokeRect(c - cell / 2 - dpr, c - cell / 2 - dpr, cell + 2 * dpr, cell + 2 * dpr);
  const bh = 22 * dpr;
  ctx.fillStyle = 'rgba(24,22,19,.86)';
  ctx.fillRect(0, loupe.height - bh, loupe.width, bh);
  ctx.fillStyle = hex;
  ctx.fillRect(8 * dpr, loupe.height - bh + 6 * dpr, 10 * dpr, 10 * dpr);
  ctx.fillStyle = '#F4F0E8';
  ctx.font = `500 ${10.5 * dpr}px "IBM Plex Mono", ui-monospace, monospace`;
  ctx.textBaseline = 'middle';
  ctx.fillText(`${hex}  ×${zoom} · PX`, 24 * dpr, loupe.height - bh / 2);

  let lx = clientX + 26, ly = clientY + 26;
  if (lx + L > window.innerWidth - 8) lx = clientX - L - 26;
  if (ly + L > window.innerHeight - 8) ly = clientY - L - 26;
  loupe.style.transform = `translate(${lx}px, ${ly}px)`;
  loupe.classList.add('show');

  // 右侧读数
  under.classList.add('live');
  under.style.background = hex;
  const l = (0.299 * rgb[0] + 0.587 * rgb[1] + 0.114 * rgb[2]) / 255;
  under.style.color = l > 0.55 ? '#181613' : '#F4F0E8';
  $('.hex', under).textContent = hex;
  $('.zoom', under).textContent = `×${zoom} · PX`;
  $('.lb-xy').textContent = `X ${Math.round(u * p.w)} · Y ${Math.round(v * p.h)}`;

  // 颜色变化明显时发声
  const prev = lb.lastRGB;
  if (!prev || Math.abs(prev[0] - rgb[0]) + Math.abs(prev[1] - rgb[1]) + Math.abs(prev[2] - rgb[2]) > 40) {
    sound.color(...rgb);
    lb.lastRGB = rgb;
  }
}
function hideLoupe() {
  loupe.classList.remove('show');
  resetUnder();
  lb.last = null;
}
photoBox.addEventListener('pointermove', (e) => drawLoupe(e.clientX, e.clientY));
photoBox.addEventListener('pointerleave', hideLoupe);
photoBox.addEventListener('wheel', (e) => {
  e.preventDefault();
  lb.zi = clamp(lb.zi + (e.deltaY > 0 ? -1 : 1), 0, ZOOMS.length - 1);
  if (lb.last) drawLoupe(lb.last.clientX, lb.last.clientY);
}, { passive: false });

// ---- 色板：悬停高亮该颜色，点击复制 ----
const palEl = $('.lb-palette');
function paletteOn(li) {
  if (!li || !lb.px) return;
  const hex = li.dataset.hex;
  sound.note(hex);
  const c = document.createElement('canvas');
  c.getContext('2d', { willReadFrequently: true });
  renderHighlight(lb.px, c, hex);
  lb.hl = c;
  fx.width = c.width; fx.height = c.height;
  fx.getContext('2d').drawImage(c, 0, 0);
  fx.classList.add('show');
}
function paletteOff() {
  if (!lb.hl) return;
  lb.hl = null;
  if (lb.styled) { fx.getContext('2d').drawImage(lb.styled, 0, 0); }
  else fx.classList.remove('show');
}
palEl.addEventListener('pointerover', (e) => { const li = e.target.closest('li'); if (li && !li.contains(e.relatedTarget)) paletteOn(li); });
palEl.addEventListener('pointerleave', paletteOff);
palEl.addEventListener('focusin', (e) => paletteOn(e.target.closest('li')));
palEl.addEventListener('focusout', paletteOff);
palEl.addEventListener('click', async (e) => {
  const li = e.target.closest('li');
  if (!li) return;
  const hx = $('.hx', li);
  try {
    await navigator.clipboard.writeText(li.dataset.hex);
    hx.textContent = 'COPIED';
  } catch (err) { hx.textContent = li.dataset.hex; }
  setTimeout(() => { hx.textContent = li.dataset.hex; }, 900);
});

// ============================================================
//  转场 + 路由
// ============================================================
const wipe = $('#wipe');
async function transition(opts, swap) {
  if (!opts || REDUCE) { swap(); return; }
  wipe.style.setProperty('--wipe', opts.color);
  $('.wipe-num', wipe).textContent = opts.num || '';
  $('.wipe-text', wipe).textContent = opts.text || '';
  wipe.classList.remove('out');
  void wipe.offsetWidth;
  wipe.classList.add('in');
  await wait(540);
  swap();
  await wait(420);
  wipe.classList.remove('in');
  wipe.classList.add('out');
  await wait(580);
  wipe.classList.remove('out');
}

function parse() {
  const parts = location.hash.replace(/^#\/?/, '').split('/').filter(Boolean);
  if (parts[0] === 'ch' && byId[parts[1]]) {
    const n = parseInt(parts[2], 10);
    return { view: 'chapter', ch: byId[parts[1]], photo: Number.isFinite(n) ? n : null };
  }
  return { view: 'home' };
}

async function route() {
  const r = parse();
  const prevView = state.view;
  setMenu(false);
  if (r.view === 'home') {
    closeLightbox();
    if (prevView !== 'home') {
      await transition(prevView ? { color: SITE.accent, num: SITE.heroLine, text: SITE.hero } : null, showHome);
    }
    return;
  }
  if (!(prevView === 'chapter' && state.chapter === r.ch)) {
    closeLightbox();
    if (prevView === 'home' && !REDUCE) {
      sound.riser();
      mosaic.classList.add('is-leaving');
      await hero.explode();
    }
    await transition(prevView ? { color: r.ch.accent, num: `CH.${r.ch.num} — ${r.ch.title}`, text: r.ch.key } : null, () => showChapter(r.ch));
  }
  if (r.photo) openLightbox(r.ch, clamp(r.photo - 1, 0, r.ch.photos.length - 1));
  else closeLightbox();
}
let routing = Promise.resolve();
window.addEventListener('hashchange', () => { routing = routing.then(route).catch(console.error); });

// ---------- 键盘 ----------
window.addEventListener('keydown', (e) => {
  if (e.metaKey || e.ctrlKey || e.altKey) return;
  const k = e.key;
  if (/^[1-4]$/.test(k) && (state.view === 'chapter' || lb.open)) { setStyle(STYLES[+k - 1].id); return; }
  if (!menu.hidden && k === 'Escape') { setMenu(false); return; }
  if (lb.open) {
    if (k === 'Escape') location.hash = `#/ch/${lb.ch.id}`;
    else if (k === 'ArrowLeft') lbStep(-1);
    else if (k === 'ArrowRight') lbStep(1);
    return;
  }
  if (state.view === 'chapter') {
    if (k === 'Escape') location.hash = '#/';
    else if (k === 'ArrowRight' || k === 'ArrowLeft') {
      e.preventDefault();
      const max = strip.scrollWidth - strip.clientWidth;
      sTarget = clamp((sRaf ? sTarget : strip.scrollLeft) + (k === 'ArrowRight' ? 1 : -1) * strip.clientWidth * 0.6, 0, max);
      kick();
    }
  } else if (state.view === 'home' && !narrow()) {
    if (k === 'ArrowRight' || k === 'ArrowDown') { e.preventDefault(); rotate(1); }
    if (k === 'ArrowLeft' || k === 'ArrowUp') { e.preventDefault(); rotate(-1); }
  }
});

// ---------- 启动 ----------
heroDefault();
matchMedia('(max-width: 860px)').addEventListener('change', () => { if (!heroKey) heroDefault(); });
document.fonts.load('800 100px "Archivo"').catch(() => {}).finally(() => {
  routing = routing.then(route).catch(console.error);
});
