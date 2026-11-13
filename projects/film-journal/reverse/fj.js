// 自动生成：poster-reverse-studio/tools/showcase.py export 从 reverse/fj.js 复制，别在这里改。
// ============================================================
//  胶片手记里的倒推
//  本机：tools/serve.py 打开 /site/projects/film-journal/ 时把这个文件注入进去（放海报、挑照片、画布、交给 Claude）。
//  网站：tools/showcase.py export 把它复制到 yihuang.art/projects/film-journal/reverse/，window.RV_PUBLIC 打开只读版
//        （原作 + 分析 + 我们的版本；数据是导出的静态文件）。
//
//  #/reverse            倒推首页：放一张海报（拖进来 / ⌘V / 选文件），下面是倒推过的海报
//  #/reverse/<收件箱目录>  一张海报：每一步是一格胶片（原图、框、字、颜色、图像、路径、锚、为什么好看、不拿、挑照片、搭）
//  在章节里：倒推中的海报，候选照片带标记；打开大图可以「用在这个图位」
//  读图、判断、搭都走 poster-reverse-studio 的那一套（tools/autoread.py、inbox/、工作台）
// ============================================================
import { SITE, STYLES, CHAPTERS } from '../js/content.js';
import { PHOTOS } from '../js/photos.gen.js';
import { loadPixels, renderStyle, hexToRgb, rgbToHex, pixelAt } from '../js/styles.js';
import { sound } from '../js/sound.js';
const createEditor = () => ({ isOpen: false, open() {}, close() {} });   // 网站上没有画布

// 网站上的只读版（tools/showcase.py export-fj 导出到 yihuang.art/projects/film-journal/reverse/）：
// window.RV_PUBLIC = { base } 时数据走导出的静态文件，放海报、挑照片、指定图、画布、删、交给 Claude 都不显示
const PUB = window.RV_PUBLIC || null;
const U = (p) => (PUB ? PUB.base + p : '/' + p);                 // 收件箱里的文件：本机走服务，网站走导出的副本
const refUrl = (dir) => U(`${dir}/${PUB ? 'ref.jpg' : 'ref.png'}`);
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const pad2 = (n) => String(n).padStart(2, '0');
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const REDUCE = matchMedia('(prefers-reduced-motion: reduce)').matches;
const INK = '#181613';

// ---------- 胶片手记的照片 ----------
const CH = CHAPTERS.map((c, idx) => ({ ...c, idx, num: pad2(idx + 1), folder: c.folder || c.id, photos: PHOTOS[c.folder || c.id] || [] }));
const byFolder = Object.fromEntries(CH.map((c) => [c.folder, c]));
const byId = Object.fromEntries(CH.map((c) => [c.id, c]));
const TOTAL = CH.reduce((n, c) => n + c.photos.length, 0);
const photoUrl = (key, size = 900) => `/images/film-practice-2026/${key}-${size}.webp`;
function frameOf(key) {
  const [folder, n] = key.split('/'); const ch = byFolder[folder];
  const i = ch ? ch.photos.findIndex((p) => p.n === n) : -1;
  return { key, folder, n, ch, i, cap: ch?.captions?.[n] || (ch ? `${ch.city} · 第 ${+n} 格` : key) };
}

function setAccent(hex) {
  const [r, g, b] = hexToRgb(hex); const s = document.documentElement.style;
  s.setProperty('--accent', hex); s.setProperty('--accent-ink', rgbToHex(r * 0.78, g * 0.78, b * 0.78));
}
function toast(msg) {
  const t = document.createElement('div'); t.className = 'rv-toast'; t.textContent = msg; document.body.append(t); setTimeout(() => t.remove(), 2700);
}
const when = (v, full = false) => { if (!v) return ''; const d = new Date(typeof v === 'number' ? v : String(v)); if (isNaN(d)) return String(v); const m = `${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`; return full ? `${d.getFullYear()}-${m}` : `${m} ${pad2(d.getHours())}:${pad2(d.getMinutes())}`; };
const loadImg = (src) => new Promise((res, rej) => { const im = new Image(); im.onload = () => res(im); im.onerror = rej; im.src = src; });

// ---------- 页面骨架：顶栏加 REVERSE，main 里加一个跟章节页一样的视图 ----------
const navItem = document.createElement('a');
navItem.className = 'nav-item rv-nav'; navItem.href = '#/reverse'; navItem.innerHTML = '<i></i>REVERSE'; navItem.title = PUB ? '海报倒推' : '海报倒推（只在这台电脑上）';
$('.nav').insertBefore(navItem, $('.sound-btn'));
// 手机上顶栏放不下第五格：REVERSE 也放进 CHAPTERS 菜单最后一行（宽屏不显示这一行，见 fj.css）
const menuItem = document.createElement('a'); menuItem.className = 'rv-menu'; menuItem.href = '#/reverse';
menuItem.innerHTML = '<span class="sw"></span><span class="n">RV</span><span class="t">REVERSE<small>海报倒推</small></span><span class="c">POSTERS</span>';
$('#index-menu')?.append(menuItem);

const sec = document.createElement('section');
sec.id = 'reverse'; sec.className = 'view'; sec.hidden = true; sec.setAttribute('aria-label', '海报倒推');
sec.innerHTML = `
  <div class="ch-head">
    <a class="ch-back" href="#/">BACK</a>
    <div class="ch-title"><p class="ch-num"></p><h2><span class="en"></span> <span class="zh"></span></h2><p class="ch-intro"></p></div>
    <p class="ch-count"></p>
  </div>
  <div class="strip" tabindex="0" aria-label="横向滚动"><div class="strip-track"></div></div>
  <div class="ch-progress" aria-hidden="true"><i></i></div>
  <div class="ch-bar"><a class="ch-prev" href="#/"></a><div class="rv-actions"></div><a class="ch-next" href="#/reverse"></a></div>
  <footer class="ch-foot"><span class="f1">POSTER REVERSE</span><span class="f2"></span><span class="f3">${PUB ? 'YIHUANG.ART' : 'LOCAL ONLY'}</span></footer>`;
$('main').append(sec);
const strip = $('.strip', sec), track = $('.strip-track', sec), prog = $('.ch-progress i', sec), actions = $('.rv-actions', sec);
const fileIn = Object.assign(document.createElement('input'), { type: 'file', accept: 'image/*', hidden: true });
document.body.append(fileIn);

// 滚轮横着走（跟章节页一样）；文字格里面的滚动不抢
let sT = 0, sRaf = 0;
strip.addEventListener('wheel', (e) => {
  const tx = e.target.closest('.rv-text');
  if (tx && tx.scrollHeight > tx.clientHeight + 2) return;
  e.preventDefault();
  sT = clamp((sRaf ? sT : strip.scrollLeft) + e.deltaY + e.deltaX, 0, strip.scrollWidth - strip.clientWidth);
  if (!sRaf) sRaf = requestAnimationFrame(glide);
}, { passive: false });
function glide() {
  const d = sT - strip.scrollLeft; strip.scrollLeft += d * 0.16;
  if (Math.abs(d) > 0.6) sRaf = requestAnimationFrame(glide); else { strip.scrollLeft = sT; sRaf = 0; }
}
strip.addEventListener('scroll', () => { const m = strip.scrollWidth - strip.clientWidth; prog.style.width = (m > 0 ? strip.scrollLeft / m * 100 : 0) + '%'; });

function head({ back, backText = 'BACK', num, en, zh, intro, count, prev, prevText, next, nextText, f2 }) {
  const b = $('.ch-back', sec); b.href = back; b.textContent = backText;
  $('.ch-num', sec).textContent = num; $('.en', sec).textContent = en; $('.zh', sec).textContent = zh;
  $('.ch-intro', sec).textContent = intro; $('.ch-count', sec).textContent = count;
  const p = $('.ch-prev', sec), n = $('.ch-next', sec);
  p.href = prev; p.textContent = prevText; n.href = next || '#'; n.textContent = nextText || ''; n.hidden = !next;   // 没有「下一个」就不显示（旧工作台的入口 11-13 撤了）
  n.target = /^https?:|^\//.test(next) ? '_blank' : ''; n.onclick = null;
  $('.f2', sec).textContent = f2;
}

// 一格：frame（图 / canvas / 文字）+ 图注
function card({ ar = '0.72', kind = 'button', cls = '', html = '', num, cap, dot = null, onClick = null, wide = null }) {
  const fig = document.createElement('figure'); fig.className = 'card';
  const fr = document.createElement(kind === 'button' ? 'button' : 'div');
  if (kind === 'button') fr.type = 'button';
  fr.className = 'frame ' + cls; fr.style.aspectRatio = ar; if (wide) fr.style.width = wide;
  const [an, ad] = String(ar).split('/').map(Number); fr.style.setProperty('--ar', (ad ? an / ad : an).toFixed(4));   // 窄屏时胶片手记按 --ar 定宽
  fr.innerHTML = html;
  if (onClick) fr.addEventListener('click', onClick);
  fr.addEventListener('pointerenter', () => sound.hover?.(track.children.length, 0.3));
  const fc = document.createElement('figcaption');
  fc.innerHTML = `<span class="num">${esc(num)}</span>${dot === null || PUB ? '' : `<span class="rv-dot${dot ? ' on' : ''}" title="${dot ? '有了' : '还没定'}"></span>`}<span class="cap">${cap}</span>`;
  fig.append(fr, fc); track.append(fig);
  return { fig, fr };
}

// ---------- 转场：用胶片手记自己的色幕 ----------
const wipe = $('#wipe');
let pending = null;   // 从章节过来时，胶片手记会自己拉色幕：把上面的字换成我们的
new MutationObserver(() => {
  if (!pending) return; const t = $('.wipe-text', wipe);
  if (t.textContent !== pending.text) { t.textContent = pending.text; $('.wipe-num', wipe).textContent = pending.num; wipe.style.setProperty('--wipe', pending.color); }
}).observe($('.wipe-text', wipe), { childList: true, characterData: true, subtree: true });
async function curtain(color, num, text, swap) {
  if (REDUCE) { await swap(); return; }
  wipe.style.setProperty('--wipe', color); $('.wipe-num', wipe).textContent = num; $('.wipe-text', wipe).textContent = text;
  wipe.classList.remove('out'); void wipe.offsetWidth; wipe.classList.add('in');
  await wait(540); await swap(); await wait(320);
  wipe.classList.remove('in'); wipe.classList.add('out'); await wait(580); wipe.classList.remove('out');
}

// ---------- 路由 ----------
let lastHash = location.hash, cur = null, booted = false;
const parseRV = (h) => { const p = h.replace(/^#\/?/, '').split('/').filter(Boolean); return p[0] === 'reverse' ? { dir: p[1] ? 'inbox/' + decodeURIComponent(p[1]) : null, edit: p[2] === 'edit' } : null; };

function enter() {
  document.body.classList.add('rv-on'); sec.hidden = false; navItem.classList.add('is-active');
  bar.hidden = true;
}
function leave() {
  document.body.classList.remove('rv-on'); sec.hidden = true; navItem.classList.remove('is-active'); closeLB();
}
async function route() {
  const h = location.hash, from = lastHash; lastHash = h;
  const r = parseRV(h), fromCh = /^#\/ch\//.test(from);
  if (!r) {
    if (cur !== null) {
      cur = null;
      if (/^#\/ch\//.test(h)) setTimeout(leave, 560);          // 胶片手记自己会拉色幕，盖住了再撤
      else await curtain(SITE.accent, SITE.heroLine, SITE.hero, leave);
    }
    setTimeout(decorate, 700);
    return;
  }
  const key = r.dir || 'home';
  const projHash = r.dir ? '#/reverse/' + encodeURIComponent(r.dir.replace(/^inbox\//, '')) : '#/reverse';
  if (!r.edit && editor.isOpen) { editor.close(); if (cur === key) { if (RV.P) { const x = strip.scrollLeft; renderProject(await loadProject(r.dir)); strip.scrollLeft = x; sT = x; } return; } }
  if (cur === key) { if (r.edit && r.dir && !editor.isOpen) editor.open(r.dir, projHash); return; }
  const first = cur === null; cur = key;
  const data = r.dir ? await loadProject(r.dir).catch((e) => { toast('打不开：' + e.message); return null; }) : await loadHome();
  if (!data || cur !== key) return;
  const show = () => { enter(); r.dir ? renderProject(data) : renderHome(data); strip.scrollLeft = 0; sT = 0; };
  const text = r.dir ? 'POSTER' : 'REVERSE', num = r.dir ? `REVERSE — ${data.st.name || ''}` : (PUB ? 'POSTER REVERSE' : 'POSTER REVERSE / LOCAL');
  if (!booted) { booted = true; show(); }
  else if (first && fromCh) { pending = { text, num, color: INK }; setTimeout(() => (pending = null), 1600); await wait(560); show(); }
  else await curtain(INK, num, text, show);
  setTimeout(() => setAccent(RV.accent), 700);   // 胶片手记回到首页时会把色换回去，这里再定一次
  if (r.edit && r.dir) editor.open(r.dir, projHash);
}
window.addEventListener('hashchange', () => { route().catch(console.error); });
// 一张海报的页开着时：别处改了项目（Claude 处理排队、出了新版本、换了当前版）就重新读，别拿着旧的不放
let pageMt = 0;
setInterval(async () => {
  const P = RV.P; if (PUB || !P || editor.isOpen || document.hidden || !cur || cur === 'home') return;
  try {
    const { mtime } = await fetch(`/api/inbox/stamp?dir=${encodeURIComponent(P.dir)}`).then((r) => r.json());
    if (!pageMt || P.dir !== pageMt.dir) { pageMt = { dir: P.dir, t: mtime }; return; }
    if (mtime > pageMt.t + 0.001) { pageMt.t = mtime; const x = strip.scrollLeft; renderProject(await loadProject(P.dir)); strip.scrollLeft = x; sT = x; }
  } catch (e) { /* 服务没开 */ }
}, 4000);

// ============================================================
//  倒推首页
// ============================================================
const RV = { accent: SITE.accent, P: null, style: 'original' };
async function loadHome() { return fetch(PUB ? U('data/index.json') : '/api/fj/projects', { cache: 'no-store' }).then((r) => r.json()); }
function renderHome({ projects, intro: pubIntro }) {
  RV.home = { projects, intro: pubIntro }; const all = projects;
  RV.accent = SITE.accent; RV.P = null; setAccent(RV.accent); sound.setScene?.('home');
  document.title = 'REVERSE 海报倒推 — Film Journal';
  head({ back: '#/', num: PUB ? 'POSTER REVERSE · 2026' : 'LOCAL · 只在这台电脑上', en: 'REVERSE', zh: '海报倒推',
    intro: PUB ? (pubIntro || '') : `放一张别人的海报：程序先量框、字、颜色，再从胶片手记 ${TOTAL} 格里挑我们的照片。`, count: `${pad2(projects.length)} POSTERS`,
    prev: '#/', prevText: 'ALBUM \\ 胶片手记', next: '', nextText: '', f2: `${projects.length} POSTERS · ${TOTAL} FRAMES · ${CH.length} ROLLS` });
  // 版式库（tools/patterns.py build）：按样式筛参考海报
  const cnt = {}; all.forEach((p) => (p.card?.styles || []).forEach((s) => { cnt[s] = (cnt[s] || 0) + 1; }));
  const SO = ['满版照片', '字墙', '平色底抠图', '拼贴', '双色调', '竖排', '框中照片', '手写字', '插画', '网格', '极简留白'];
  const styles = SO.filter((s) => cnt[s]).concat(Object.keys(cnt).filter((s) => !SO.includes(s)));
  actions.innerHTML = (PUB ? '' : `<button type="button" data-a="file">选文件<span>FILE</span></button><button type="button" data-a="paste">粘贴<span>⌘V</span></button>`)
    + (styles.length ? `${PUB ? '' : '<span class="sep"></span>'}<span class="rv-sty">${[['', '全部']].concat(styles.map((s) => [s, s])).map(([s, l]) => `<button type="button" data-a="pstyle" data-s="${esc(s)}" aria-pressed="${(RV.styleF || '') === s}">${esc(l)}${s ? `<em>${cnt[s]}</em>` : ''}</button>`).join('')}</span>` : '');
  if (RV.styleF) projects = projects.filter((p) => (p.card?.styles || []).includes(RV.styleF));
  track.innerHTML = '';
  if (!PUB) card({ ar: '0.72', cls: 'rv-drop-wrap', html: `<div class="rv-drop"><b>DROP</b><span>把海报拖进来，或者 ⌘V 粘贴</span><em>程序先跑：框 · 字 · 颜色 · 锚 · 路径</em></div>`,
    num: 'NEW', cap: '放一张海报', onClick: () => fileIn.click() });
  // 按项目排：同一个项目（state.scope，见 tools/project.py）的海报挨在一起，没归项目的算胶片手记
  const order = []; projects.forEach((p) => { const k = p.scope || ''; if (!order.includes(k)) order.push(k); });
  order.sort((a, b) => (a === '') - (b === ''));
  projects = order.flatMap((k) => projects.filter((p) => (p.scope || '') === k));
  projects.forEach((p, i) => {
    const todo = p.todo?.length || 0, done = !!p.built;
    const { fr } = card({ ar: '0.72', html: `<img alt="" src="${esc(PUB ? U(p.built) : refUrl(p.dir))}">`, num: `${p.scope ? esc(p.scope) : '胶片手记'} · ${pad2(i + 1)} / ${pad2(projects.length)}`, dot: PUB ? null : done,
      cap: PUB ? `${p.card?.no ? esc(p.card.no) + ' ' : ''}${esc(p.name)}${p.card?.styles?.length ? ' · ' + p.card.styles.map(esc).join(' / ') : ''}`
        : `${p.card?.no ? esc(p.card.no) + ' ' : ''}${p.kindLabel ? '【' + esc(p.kindLabel) + '】' : ''}${esc(p.name)} · ${esc(when(p.created))}${done ? ' · 搭好了' : p.reasons ? ' · 判断写好了' : ` · 还要定 ${todo} 项`}${p.card?.styles?.length ? ' · ' + p.card.styles.map(esc).join(' / ') : ''}`,
      onClick: () => { location.hash = '#/reverse/' + encodeURIComponent(p.dir.replace(/^inbox\//, '')); } });
    const im = $('img', fr); im.onload = () => { im.classList.add('loaded'); fr.style.aspectRatio = `${im.naturalWidth} / ${im.naturalHeight}`; fr.style.setProperty('--ar', (im.naturalWidth / im.naturalHeight).toFixed(4)); };
  });
}

// 放海报：拖、粘贴、选文件 → tools/autoread.py → 收件箱 → 打开
async function takeFile(file) {
  if (PUB) return;
  if (!file || !/^image\//.test(file.type)) { toast('要一张图'); return; }
  let res = null;
  await curtain(INK, 'READING — 量框、字、颜色', 'READING', async () => {
    try {
      const r = await fetch('/api/autoread', { method: 'POST', body: file, headers: { 'X-Name': encodeURIComponent((file.name || '粘贴').replace(/\.[^.]+$/, '')) } });
      res = await r.json(); if (!r.ok) throw new Error(res.error || r.status);
    } catch (e) { toast('读不了：' + e.message); res = null; }
  });
  if (res?.inbox) location.hash = '#/reverse/' + encodeURIComponent(res.inbox.replace(/^inbox\//, ''));
}
fileIn.addEventListener('change', () => { takeFile(fileIn.files[0]); fileIn.value = ''; });
sec.addEventListener('dragover', (e) => { if (PUB || cur !== 'home') return; e.preventDefault(); sec.classList.add('drag'); });
sec.addEventListener('dragleave', (e) => { if (!sec.contains(e.relatedTarget)) sec.classList.remove('drag'); });
sec.addEventListener('drop', (e) => { if (PUB || cur !== 'home') return; e.preventDefault(); sec.classList.remove('drag'); takeFile(e.dataTransfer.files[0]); });
document.addEventListener('paste', (e) => {
  if (PUB || cur !== 'home') return;
  const it = [...(e.clipboardData?.items || [])].find((x) => x.type.startsWith('image/'));
  if (it) { e.preventDefault(); takeFile(it.getAsFile()); }
});
actions.addEventListener('click', async (e) => {
  const b = e.target.closest('[data-a]'); if (!b) return;
  const a = b.dataset.a;
  if (a === 'file') fileIn.click();
  else if (a === 'paste') {
    try { const items = await navigator.clipboard.read(); for (const it of items) { const t = it.types.find((x) => x.startsWith('image/')); if (t) { const bl = await it.getType(t); takeFile(new File([bl], '粘贴', { type: t })); return; } } toast('剪贴板里没有图'); }
    catch { toast('按 ⌘V 粘贴'); }
  } else if (a === 'style') setStyle(b.dataset.style);
  else if (a === 'claude') toClaude();
  else if (a === 'designate') openDesignate(RV.P.dir, RV.P.j.state, () => { RV.P.st = RV.P.j.state; const x = strip.scrollLeft; renderProject(RV.P); strip.scrollLeft = x; })
  else if (a === 'edit') location.hash = '#/reverse/' + encodeURIComponent(RV.P.dir.replace(/^inbox\//, '')) + '/edit';
  else if (a === 'delete') deletePoster(RV.P.dir, RV.P.st.name);
  else if (a === 'pstyle') { RV.styleF = b.dataset.s || ''; if (RV.home) { renderHome(RV.home); strip.scrollLeft = 0; } }
});

// ============================================================
//  一张海报：每一步一格
// ============================================================
async function loadProject(dir) {
  const j = await fetch(U(`${dir}/project.json`), { cache: 'no-store' }).then((r) => { if (!r.ok) throw new Error('没有这个收件箱'); return r.json(); });
  const img = await loadImg(refUrl(dir));
  let slots = [];
  if (!PUB) try { slots = (await fetch('/api/fj/match', { method: 'POST', body: JSON.stringify({ state: j.state, top: 8 }) }).then((r) => r.json())).slots || []; } catch (e) { console.warn(e); }
  const st = j.state;
  // 海报的主色当这一页的强调色（像每卷胶片有自己的颜色）：彩度最高、又不太浅的那个
  const chroma = (h) => { const [r, g, b] = hexToRgb(h); const mx = Math.max(r, g, b), mn = Math.min(r, g, b); return (mx - mn) * (mx < 235 ? 1 : 0.3); };
  const accent = (st.famNotes || []).map((f) => f.hex).sort((a, b) => chroma(b) - chroma(a))[0];
  let card = null;   // 版式库里这张的卡（号、样式、教训）
  if (PUB) card = j.card || null;
  else try { card = ((await fetch('/api/fj/projects').then((r) => r.json())).projects || []).find((p) => p.dir === dir)?.card || null; } catch (e) { /* 没有版式库也照常 */ }
  return { dir, j, st, img, slots, card, accent: accent && chroma(accent) > 60 ? accent : INK };
}
function saveProject() {
  const P = RV.P; return fetch(`/api/inbox/save?dir=${encodeURIComponent(P.dir)}`, { method: 'POST', body: JSON.stringify(P.j) });
}
const MODE = { swap: '换内容', translate: '换语言', remix: '重组' };
const TECH = { text: '字', image: '图', line: '线', frame: '框线', seal: '印' };

function renderProject(P) {
  RV.P = P; RV.accent = P.accent; setAccent(P.accent); sound.setScene?.('glass');
  const st = P.st, boxes = st.boxes || [];
  const todo = (st.auto?.todo || []).filter((t) =>      // 程序读完时列的「还要定」，判断写进去以后就划掉
    !(/为什么好看/.test(t) && (st.reasons || []).length) && !(/^锚/.test(t) && st.anchorNote) && !(/不拿/.test(t) && ((st.notTake || []).length || (st.changes || []).length))
    && !(/朝向/.test(t) && boxes.filter((b) => b.kind === 'image').every((b) => b.image?.facing)) && !(/内容/.test(t) && boxes.filter((b) => b.kind === 'text').every((b) => b.text?.content))
    && !(/字体类/.test(t) && boxes.filter((b) => b.kind === 'text').every((b) => b.text?.family)));
  const imgs = boxes.filter((b) => b.kind === 'image');
  const ratio = (st.facts || []).find((f) => /字面/.test(f)) || '';
  const openReq = [...(st.requests || []), ...(st.build?.requests || [])].filter((q) => q.status !== 'done' && !q.deleted);
  document.title = `POSTER ${st.name || ''} — Reverse`;
  if (!PUB) remember(P);
  const steps = [];
  const W = P.img.naturalWidth, H = P.img.naturalHeight, ar = `${W} / ${H}`;
  const posterCard = (mode, num, cap, dot) => {
    const { fr } = card({ ar, html: '<canvas></canvas>', num, cap, dot, onClick: () => openLB(mode) });
    const cv = $('canvas', fr); drawPoster(cv, mode); return cv;
  };
  const photoLed = !PUB && ['photo', 'illus'].includes(st.kind?.kind);   // 照片主导 / 插画：多一张「拍摄清单」（网站上不放：那是给拍摄的内部清单）
  const ours = PUB ? (P.j.versions || []) : [];                          // 网站上：我们的版本（当前版在前）
  const N = PUB ? 9 + ours.length : 11 + (photoLed ? 1 : 0); let k = 0; const nm = () => `${pad2(++k)} / ${pad2(N)}`;
  track.innerHTML = '';
  RV.cv0 = posterCard('original', nm(), `${PUB && P.j.after_zh ? `原作 · ${esc(P.j.after_zh.replace(/^版式参考：/, ''))} · ` : ''}原图 · ${P.card?.no ? '版式库 ' + esc(P.card.no) + (P.card.styles?.length ? '：' + P.card.styles.map(esc).join(' / ') : '') + ' · ' : ''}${st.kind ? '【' + esc(st.kind.label) + '】' + esc((st.kind.why || [])[1] || '') + ' · ' : ''}${esc(st.out?.size || '')} · ${esc(MODE[st.mode] || '')} · 点开用放大镜看`, true);
  posterCard('boxes', nm(), `框 · ${boxes.length} 个：${Object.entries(boxes.reduce((m, b) => (m[TECH[b.kind] || b.kind] = (m[TECH[b.kind] || b.kind] || 0) + 1, m), {})).map(([a, n]) => `${a} ${n}`).join(' · ')}`, boxes.length > 0);
  posterCard('type', nm(), `字 · ${esc(ratio.replace(/^.*?字面[^：:]*[：:]?/, '字面 ') || '层级、字重、方向')}`, boxes.some((b) => b.text?.family));
  posterCard('color', nm(), `颜色 · ${(st.famNotes || []).slice(0, 4).map((f) => esc(f.name)).join(' · ')}`, (st.famNotes || []).some((f) => f.use));
  posterCard('image', nm(), `图像 · ${imgs.map((b) => `${esc(b.label)}：${esc((b.image?.needs || []).join(' ') || (PUB ? (b.image?.tech || []).join(' ') || '—' : '还没写要什么'))}`).join('；') || '没有图位'}`, imgs.every((b) => b.image?.needs?.length));
  posterCard('path', nm(), `阅读路径 · ${(st.path || []).length} 步${st.thumbNote ? ' · ' + esc(st.thumbNote) : ''}`, (st.path || []).length > 1);
  posterCard('anchor', nm(), `锚 · ${esc(st.anchorNote || '还没定')}`, !!st.anchorNote);
  // 为什么好看
  const rs = st.reasons || [];
  card({ kind: 'div', ar: '0.8', cls: 'rv-text', num: nm(), dot: rs.length >= 2, cap: `为什么好看 · ${rs.length} 条${rs.some((r) => r.restraint) ? '（有克制）' : ''}`,
    html: `<h3>WHY IT WORKS · 为什么好看</h3>${rs.length ? rs.map((r) => `<div class="r">${r.restraint ? '<i>克制</i>' : ''}<b>选了</b> ${esc(r.chose)}<br><b>没选</b> ${esc(r.rejected)}<small>证据 ${esc(r.evidence)}</small><b>所以</b> ${esc(r.so)}</div>`).join('') : `<p class="empty">${PUB ? '还没写。' : '还没写。程序只量事实，这一步交给 Claude（底栏右边「交给 Claude」）。'}</p>`}` });
  const nt = st.notTake || [], ch = st.changes || [];
  card({ kind: 'div', ar: '0.8', cls: 'rv-text', num: nm(), dot: nt.length + ch.length > 0, cap: '不拿 · 主动改',
    html: `<h3>NOT TAKEN · 不拿</h3>${nt.length ? `<ul>${nt.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>` : '<p class="empty">还没写。</p>'}<h3 style="margin-top:22px">CHANGED · 主动改</h3>${ch.length ? `<ul>${ch.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>` : '<p class="empty">还没写。</p>'}${todo.length && !PUB ? `<h3 style="margin-top:22px">TODO · 程序说还要定</h3><ul>${todo.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>` : ''}` });
  // 照片主导：不硬复刻——视觉方案 + 拍摄清单（tools/brief.py 读图、写判断时自动出 brief.md）
  if (photoLed) {
    const { fr } = card({ kind: 'div', ar: '0.8', cls: 'rv-text rv-brief', num: nm(), dot: null, cap: `拍摄清单 · 【${esc(st.kind.label)}】出视觉方案 + 拍摄清单，不硬复刻`, html: '<h3>SHOT LIST · 拍摄清单</h3><p class="empty">读取中……</p>' });
    fetch(`/${P.dir}/brief.md?t=${Date.now()}`).then((r) => (r.ok ? r.text() : Promise.reject())).then(
      (t) => { fr.innerHTML = '<h3>SHOT LIST · 拍摄清单</h3>' + mdLite(t.replace(/^# .*\n/, '')); },
      () => { fr.innerHTML = '<h3>SHOT LIST · 拍摄清单</h3><p class="empty">还没出。Claude 接手时会跑 tools/brief.py。</p>'; });
  }
  // 挑照片：每个图位一格
  const photoSlots = P.slots.filter((s) => !s.logo);
  if (!photoSlots.length && !PUB) card({ kind: 'div', ar: '0.8', cls: 'rv-text', num: nm(), dot: null, cap: '挑照片', html: '<h3>PICK · 挑照片</h3><p class="empty">这张海报没有照片图位。</p>' });
  photoSlots.forEach((s, si) => pickCard(s, si === 0 ? nm() : `${pad2(k)}${'abcdefghijklmnopqrstuvwxyz'[si] || si} / ${pad2(N)}`));   // 图位多（《総索引》十件东西）也编得上号
  // 搭（网站上：我们的版本，一版一格）
  if (PUB) ours.forEach((v, i) => oursCard(v, i, nm()));
  else buildCard(nm());
  // 底栏
  head({ back: '#/reverse', num: `REVERSE · ${when(st.created, true)} · ${st.out?.size || ''}`, en: 'POSTER', zh: st.name || '未命名',
    intro: PUB ? [P.j.note_zh, P.j.after_zh].filter(Boolean).join('　') : (todo.length ? `程序量完了；还要定：${todo.slice(0, 3).join('、')}${todo.length > 3 ? '……' : ''}` : '程序量完了，判断也写好了。') + (openReq.length ? `　画布里有 ${openReq.length} 条等 Claude 改。` : ''),
    count: `${pad2(N)} STEPS`, prev: '#/reverse', prevText: 'POSTERS \\ 倒推首页', next: PUB ? '' : '#', nextText: PUB ? '' : '交给 CLAUDE / HAND OVER',
    f2: PUB ? `${boxes.length} BOXES · ${ours.length} ${ours.length > 1 ? 'VERSIONS' : 'VERSION'} · ${esc(P.j.after_en || '')}` : `${boxes.length} BOXES · ${photoSlots.reduce((n, s) => n + s.candidates.length, 0)} CANDIDATES FROM ${TOTAL} FRAMES` });
  if (!PUB) $('.ch-next', sec).onclick = (e) => { e.preventDefault(); toClaude(); };
  actions.innerHTML = STYLES.map((s, i) => `<button type="button" data-a="style" data-style="${s.id}" role="radio" aria-checked="${s.id === RV.style}" title="按 ${i + 1}">${s.zh}<span>${s.en}</span></button>`).join('')
    + (PUB ? '' : `<span class="sep"></span><button type="button" data-a="designate" aria-pressed="${!!st.designated}" title="${st.designated ? '已指定：' + esc(st.designated.name) : '指定用哪张图来复刻（不选就照旧）'}">${st.designated ? '已指定图' : '指定图'}<span>IMAGE</span></button><button type="button" data-a="edit">改<span>EDIT</span></button><span class="sep"></span><button type="button" data-a="delete" class="rv-del" title="删掉这张海报（挪进 inbox/.trash，能找回）">删<span>DELETE</span></button>`);
}
// 网站上：我们的一版一格（点开进同一个大图，PREV / NEXT 能翻回原图和分析）
function oursCard(v, i, num) {
  const { fr } = card({ ar: `${v.w} / ${v.h}`, html: `<img alt="" class="loaded" loading="lazy" src="${esc(U(v.img))}">`, num, dot: null,
    cap: `我们的版本${v.id ? ' · ' + esc(v.id) : ''}${RV.P?.st.out?.size ? ' · ' + esc(RV.P.st.out.size) : ''} · 点开看大图`, onClick: () => openLB('ours' + i) });
  return fr;
}
function drawOurs(cv, v, maxEdge) {
  const go = (im) => {
    const s = Math.min(1, maxEdge / Math.max(im.naturalWidth, im.naturalHeight)), W = Math.round(im.naturalWidth * s), H = Math.round(im.naturalHeight * s), dpr = Math.min(2, devicePixelRatio || 1);
    cv.width = W * dpr; cv.height = H * dpr; const g = cv.getContext('2d'); g.setTransform(dpr, 0, 0, dpr, 0, 0); g.drawImage(im, 0, 0, W, H);
  };
  if (v._im) go(v._im); else loadImg(U(v.big || v.img)).then((im) => { v._im = im; if (oursOf(LB.mode) === v) go(im); });
}

// 画海报 + 这一步的标注
function drawPoster(cv, mode, maxEdge = 900) {
  const P = RV.P, im = P.img, st = P.st; const s = Math.min(1, maxEdge / Math.max(im.naturalWidth, im.naturalHeight));
  const W = Math.round(im.naturalWidth * s), H = Math.round(im.naturalHeight * s), dpr = Math.min(2, devicePixelRatio || 1);
  cv.width = W * dpr; cv.height = H * dpr; const g = cv.getContext('2d'); g.setTransform(dpr, 0, 0, dpr, 0, 0);
  const acc = RV.accent === INK ? '#E0461E' : RV.accent;
  const R = (b) => [b.x0 * W, b.y0 * H, (b.x1 - b.x0) * W, (b.y1 - b.y0) * H];
  const veil = (a) => { g.fillStyle = `rgba(244,240,232,${a})`; g.fillRect(0, 0, W, H); };
  const clear = (b) => { const [x, y, w, h] = R(b); g.drawImage(im, b.x0 * im.naturalWidth, b.y0 * im.naturalHeight, (b.x1 - b.x0) * im.naturalWidth, (b.y1 - b.y0) * im.naturalHeight, x, y, w, h); };
  const label = (txt, x, y, col = INK) => {
    g.font = `700 ${Math.max(9, W / 70)}px "IBM Plex Mono", ui-monospace, monospace`; const tw = g.measureText(txt).width, th = Math.max(9, W / 70) * 1.5;
    const lx = clamp(x, 0, W - tw - 8), ly = clamp(y - th, 0, H - th);
    g.fillStyle = col; g.fillRect(lx, ly, tw + 8, th); g.fillStyle = '#F4F0E8'; g.textBaseline = 'middle'; g.fillText(txt, lx + 4, ly + th / 2 + 0.5);
  };
  if (mode === 'color') {
    const pal = (st.famNotes || []).map((f) => [f.hex, 0]);
    loadPixels(refUrl(P.dir), maxEdge).then((px) => { const tmp = document.createElement('canvas'); renderStyle('blocks', px, tmp, { palette: pal }); g.drawImage(tmp, 0, 0, W, H); chips(); });
    const chips = () => { const fs = st.famNotes || [], cw = W / Math.max(1, fs.length), ch = H * 0.06; fs.forEach((f, i) => { g.fillStyle = f.hex; g.fillRect(i * cw, H - ch, cw, ch); }); g.fillStyle = INK; g.fillRect(0, H - ch - 1, W, 1); };
    return;
  }
  g.drawImage(im, 0, 0, W, H);
  if (mode === 'original') { if (RV.style !== 'original') styleCanvas(cv, RV.style); return; }
  const boxes = st.boxes || [];
  if (mode === 'boxes') {
    veil(0.25);
    boxes.forEach((b) => { const [x, y, w, h] = R(b); const col = b.kind === 'image' ? acc : INK; g.strokeStyle = col; g.lineWidth = b.kind === 'image' ? 2.5 : 1.5; g.setLineDash(b.kind === 'text' ? [] : [6, 4]); g.strokeRect(x, y, w, h); });
    g.setLineDash([]); boxes.forEach((b) => { const [x, y] = R(b); label(b.label || b.id, x, y, b.kind === 'image' ? acc : INK); });
  } else if (mode === 'type') {
    veil(0.72); const tb = boxes.filter((b) => b.kind === 'text');
    tb.forEach(clear); tb.forEach((b) => { const [x, y, w, h] = R(b); g.strokeStyle = acc; g.lineWidth = 1.5; g.strokeRect(x, y, w, h); });
    tb.forEach((b) => { const [x, y] = R(b); const t = b.text || {}; label(`${t.role || b.label} ${t.weight || ''}${t.family ? ' ' + t.family : ''}${t.dir === '竖' ? ' 竖' : ''}`, x, y); });
  } else if (mode === 'image') {
    veil(0.78); const ib = boxes.filter((b) => b.kind === 'image');
    ib.forEach(clear); ib.forEach((b) => { const [x, y, w, h] = R(b); g.strokeStyle = acc; g.lineWidth = 3; g.strokeRect(x, y, w, h); label(`${b.label}：${(b.image?.needs || []).join(' ') || (b.image?.tech || []).join(' ')}`, x, y + 0.001 * H + Math.max(9, W / 70) * 1.5, acc); });
  } else if (mode === 'path') {
    veil(0.45); const pts = (st.path || []).map((p) => [p.x * W, p.y * H]);
    g.strokeStyle = acc; g.lineWidth = 2.5; g.beginPath(); pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.stroke();
    pts.forEach(([x, y], i) => { const r = Math.max(9, W / 45); g.fillStyle = acc; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill(); g.fillStyle = '#F4F0E8'; g.font = `800 ${r}px Archivo, sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(i + 1, x, y + 1); g.textAlign = 'start'; });
  } else if (mode === 'anchor') {
    veil(0.55); const by = Object.fromEntries(boxes.map((b) => [b.id, b]));
    (st.anchors || []).forEach((a) => { const b = by[a.box]; if (!b) return; const [x, y, w, h] = R(b); g.strokeStyle = acc; g.lineWidth = 3; g.beginPath();
      if (a.side === 'top') { g.moveTo(0, y); g.lineTo(W, y); } else if (a.side === 'bottom') { g.moveTo(0, y + h); g.lineTo(W, y + h); } else if (a.side === 'left') { g.moveTo(x, 0); g.lineTo(x, H); } else if (a.side === 'right') { g.moveTo(x + w, 0); g.lineTo(x + w, H); }
      g.setLineDash([8, 6]); g.stroke(); g.setLineDash([]); g.lineWidth = 1.5; g.strokeRect(x, y, w, h); });
  }
}
async function styleCanvas(cv, style) {
  const px = await loadPixels(refUrl(RV.P.dir), 900); const tmp = document.createElement('canvas');
  renderStyle(style, px, tmp, { accent: RV.accent === INK ? '#E0461E' : RV.accent, palette: (RV.P.st.famNotes || []).map((f) => [f.hex, 0]) });
  const g = cv.getContext('2d'); g.setTransform(1, 0, 0, 1, 0, 0); g.drawImage(tmp, 0, 0, cv.width, cv.height);
}
function setStyle(style) {
  RV.style = style; $$('[data-a="style"]', actions).forEach((b) => b.setAttribute('aria-checked', String(b.dataset.style === style)));
  if (RV.cv0) drawPoster(RV.cv0, 'original'); if (LB.open) drawLB();
}

// ---------- 挑照片 ----------
function pickCard(s, num) {
  const P = RV.P, picks = P.st.build?.picks || {}, pk = picks[s.box] || {}, chosen = pk.key || pk.src;
  const cid = (c) => c.key || c.src;   // 胶片手记的格是 卷/格号；项目素材是 proj/<项目>/<id>
  const lab = (c) => c.key ? `${frameOf(c.key).ch?.key || ''} ${frameOf(c.key).n}` : c.name;
  const chs = [...new Set(s.candidates.filter((c) => c.key).map((c) => c.key.split('/')[0]))].map((f) => byFolder[f]).filter(Boolean);
  const from = s.scope ? `从「${esc(s.scope)}」的素材里挑` : '从胶片手记里挑';
  const { fr } = card({ kind: 'div', ar: '1.3', cls: 'rv-pick', num, dot: !!chosen,
    cap: `挑${s.logo ? '标志' : '照片'} · ${esc(s.label)}${chosen ? ` · 用了 ${esc(pk.key ? lab(pk) : pk.name || '')}` : ' · ' + from}`,
    html: `<header><b>${esc(s.label)}</b><span>要 ${esc(s.needs.join(' ') || '—')} · 框 ${s.ratio}</span></header>
      <div class="rv-cands">${s.candidates.slice(0, 8).map((c) => { const f = c.key ? frameOf(c.key) : null; return `<button type="button" class="rv-cand${cid(c) === chosen ? ' on' : ''}" data-id="${esc(cid(c))}" style="--chc:${f?.ch?.accent || INK}" title="${esc(f ? f.cap : c.name)}｜${esc(c.why.join('、'))}"><img alt="" loading="lazy" src="${c.key ? photoUrl(c.key) : '/' + esc(c.thumb)}"><span class="tag">${esc(lab(c))}<em>${c.score.toFixed(1)}</em></span></button>`; }).join('')}</div>
      <footer><span class="why">${esc(s.candidates[0]?.why.join(' · ') || '没有候选')}</span>${chs.slice(0, 3).map((c) => `<a href="#/ch/${c.id}" title="在 ${esc(c.key)} 这一卷里看，候选会标出来">${esc(c.key)} →</a>`).join('')}</footer>` });
  const candOf = (b) => s.candidates.find((c) => cid(c) === b.dataset.id);
  fr.addEventListener('click', (e) => { const b = e.target.closest('.rv-cand'); if (!b) return; const c = candOf(b); if (c?.key) pick(s.box, c.key); else if (c) pickSrc(s.box, c); });
  fr.addEventListener('pointerover', (e) => { const b = e.target.closest('.rv-cand'); if (!b) return; const c = candOf(b); $('.why', fr).textContent = (c?.why || []).join(' · ') + '　' + (c?.key ? frameOf(c.key).cap : c?.name || ''); });
}
async function pickSrc(boxId, c) {   // 项目素材（不是胶片手记的格）
  const P = RV.P, st = P.j.state;
  st.build = st.build || { inks: [], slots: {}, order: [], assets: {}, ack: {}, thumbOK: false };
  st.build.picks = st.build.picks || {}; st.build.picks[boxId] = { src: c.src, name: c.name, scope: c.src.split('/')[1] };
  P.st = st; await fetch(`/api/inbox/pick?dir=${encodeURIComponent(P.dir)}`, { method: 'POST', body: JSON.stringify({ box: boxId, pick: st.build.picks[boxId] }) }); remember(P);
  toast(`「${(st.boxes.find((b) => b.id === boxId) || {}).label || boxId}」用 ${c.name}`); sound.click?.();
  if (cur && cur !== 'home') { const x = strip.scrollLeft; renderProject(P); strip.scrollLeft = x; sT = x; }
}
async function pick(boxId, key, back = false) {
  const P = RV.P || (await loadProject(ACTIVE().dir)); if (!RV.P) RV.P = P;
  const st = P.j.state; const f = frameOf(key);
  st.build = st.build || { inks: [], slots: {}, order: [], assets: {}, ack: {}, thumbOK: false };
  st.build.picks = st.build.picks || {};
  st.build.picks[boxId] = { key, src: `site/images/film-practice-2026/${key}-2000.webp`, name: `${f.ch?.key || ''} ${f.n}`, chapter: f.ch?.id };
  P.st = st; await fetch(`/api/inbox/pick?dir=${encodeURIComponent(P.dir)}`, { method: 'POST', body: JSON.stringify({ box: boxId, pick: st.build.picks[boxId] }) }); remember(P);
  toast(`「${(st.boxes.find((b) => b.id === boxId) || {}).label || boxId}」用 ${f.ch?.key || ''} ${f.n}：${f.cap}`);
  sound.click?.();
  if (back) location.hash = '#/reverse/' + encodeURIComponent(P.dir.replace(/^inbox\//, ''));
  else if (cur && cur !== 'home') { const x = strip.scrollLeft; renderProject(P); strip.scrollLeft = x; sT = x; }
}
function buildCard(num) {
  const P = RV.P, picks = Object.keys(P.st.build?.picks || {}).length;
  const { fr } = card({ ar: `${P.img.naturalWidth} / ${P.img.naturalHeight}`, num, dot: false, html: '<div class="rv-text" style="position:absolute;inset:0"><h3>BUILD · 搭</h3><p class="empty">正在找搭好的版本……</p></div>',
    cap: `搭 · ${picks ? `挑了 ${picks} 张照片 · ` : ''}点开是画布：点一层就改，改完导出 PDF`, onClick: () => { location.hash = '#/reverse/' + encodeURIComponent(P.dir.replace(/^inbox\//, '')) + '/edit'; } });
  fetch('/api/fj/projects', { cache: 'no-store' }).then((r) => r.json()).then(({ projects }) => {
    const me = projects.find((p) => p.dir === P.dir);
    if (me?.built) {
      fr.innerHTML = `<img alt="" class="loaded" src="/${esc(me.built)}?t=${encodeURIComponent(me.builtAt || Date.now())}">`; fr.closest('figure').querySelector('.rv-dot')?.classList.add('on');
      const cap = fr.closest('figure').querySelector('figcaption .cap'); if (cap && me.ver) cap.textContent = `搭 · ${me.ver}${me.verName ? ' ' + me.verName : ''}${me.nver > 1 ? ` · 共 ${me.nver} 版` : ''} · 点开改图层、局部，改完导出 PDF`;
    }
    else fr.querySelector('.empty').textContent = '还没搭。点这一格打开画布：照片已经按你挑的放进图位，接着排字、回测、导出。';
  });
}
// 交给 Claude 的那句话：指定了图就多一行「指定用这张图复刻」（不指定就照旧，Claude 自己从素材里挑）
// 删海报：整个文件夹挪进 inbox/.trash/（服务端 /api/inbox/delete），提示里能撤销
async function deletePoster(dir, name) {
  if (!confirm(`删掉「${name || dir}」？\n\n整个文件夹（判断、版本、成品图）挪进 inbox/.trash/，能找回。`)) return;
  const r = await fetch('/api/inbox/delete?dir=' + encodeURIComponent(dir), { method: 'POST' }).then((x) => x.json()).catch((e) => ({ error: String(e) }));
  if (!r.ok) { toast('没删成：' + (r.error || '')); return; }
  location.hash = '#/reverse';
  const t = document.createElement('div'); t.className = 'rv-toast rv-undo'; t.innerHTML = `删了「${esc(name || dir)}」（在 inbox/.trash）<button type="button">撤销</button>`; document.body.append(t);
  const kill = setTimeout(() => t.remove(), 8000);
  t.querySelector('button').onclick = async () => {
    clearTimeout(kill); t.remove();
    const q = await fetch('/api/inbox/restore?dir=' + encodeURIComponent(dir), { method: 'POST' }).then((x) => x.json()).catch((e) => ({ error: String(e) }));
    if (q.ok) { toast('找回来了'); location.hash = '#/reverse/' + encodeURIComponent(dir.replace(/^inbox\//, '')); } else toast('没找回：' + (q.error || ''));
  };
}
// brief.md 只有 ## 标题、- 列表、**粗体**：够用的一点点 Markdown
function mdLite(t) {
  const inl = (x) => esc(x).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>');
  let h = '', ul = false;
  for (const ln of t.split('\n')) {
    if (/^- /.test(ln)) { if (!ul) { h += '<ul>'; ul = true; } h += `<li>${inl(ln.slice(2))}</li>`; continue; }
    if (ul) { h += '</ul>'; ul = false; }
    if (/^##+ /.test(ln)) h += `<h4>${inl(ln.replace(/^#+ /, ''))}</h4>`;
    else if (ln.trim()) h += `<p>${inl(ln)}</p>`;
  }
  return h + (ul ? '</ul>' : '');
}
// 按类型写做法（照片主导 / 版式主导，2026-11-12 定的分工）；指定了图就照指定图，不再说「不硬复刻」
const KIND_HOW = {
  photo: '这张是【照片主导】：不硬复刻——出视觉方案（调色、字体系统、层级、图放哪），套在素材里最接近的一张上，拍摄清单看 brief.md',
  illus: '这张是【图像主导·插画】：不硬复刻那幅画——出视觉方案，用我们的图套版，要画的东西写进 brief.md',
  layout: '这张是【版式主导】：完整逆向还原——网格、字体系统、比例、色彩关系、图位都照原作',
  hybrid: '这张是【混合】：版式完整还原，照片 / 抠图是其中一块，要挑得准',
};
function claudeLine(dir, d, k) {
  let line = `用 poster-reverse 接着逆向 poster-reverse-studio/${dir}`;
  const kk = k && (k.kind || k);
  if (kk && KIND_HOW[kk]) line += '\n' + (d && (kk === 'photo' || kk === 'illus') ? `这张是【${k.label || kk}】，但指定了图：用指定图套原作的版式` : KIND_HOW[kk]);
  if (d) line += `\n指定用这张图复刻：${d.orig ? `${d.orig}${d.t != null ? `（第 ${d.t} 秒，原素材 ${d.raw}）` : `（原素材 ${d.raw}）`}` : (d.path || d.src)}${d.note ? `\n方向：${d.note}` : ''}\n（照这张图的方向做：构图、裁切、调色都从它出发，不再从素材里另挑）`;
  return line;
}
function toClaude() {
  const P = RV.P; if (!P) return;
  const line = claudeLine(P.dir, P.st.designated, P.st.kind);
  navigator.clipboard?.writeText(line).then(() => toast(P.st.designated ? '复制了（带指定图），到 Claude 里粘贴' : '复制了，到 Claude 里粘贴：' + line), () => toast(line));
}

// ---------- 指定图：选一张图（上传 / 拖进来 / ⌘V / 项目素材里挑），交给 Claude 时照它的方向复刻；不选就不管 ----------
const dzEl = document.createElement('div'); dzEl.id = 'rv-dz'; dzEl.hidden = true; dzEl.setAttribute('role', 'dialog'); dzEl.setAttribute('aria-label', '指定图');
document.body.appendChild(dzEl);
const DZ = { dir: null, st: null, scope: null, pick: null, onDone: null, group: '', offset: 0, q: '' };
// 素材归类的标签（tools/tagmat.py）：点了就筛，同一类里多选是「或」
const DZ_FACETS = [['人', [['一人', '一个人'], ['几人', '几个人'], ['人群', '人群'], ['无', '没人']]], ['景别', ['全身', '半身', '特写', '远景']], ['姿态', ['站', '坐']], ['朝向', ['正面', '侧面', '背面']],
  ['留白', [['左', '左边空'], ['右', '右边空'], ['上', '上面空'], ['下', '下面空']]], ['适合', ['抠出', '满版']], ['服装', ['红帽', '清装', '救生衣']],
  ['景', ['墓地', '海', '水', '雪山', '室内', '夜', '建筑']], ['道具', ['陶罐', '电脑', '收音机', '纸箱']]];
function dzConds() { const by = {}; for (const c of DZ.chips) { const [k, v] = c.split(':'); (by[k] = by[k] || []).push(v); } return Object.entries(by).map(([k, vs]) => `${k}:${vs.join('|')}`).join(' '); }
async function openDesignate(dir, st, onDone) {
  Object.assign(DZ, { dir, st, scope: st.scope || null, pick: st.designated ? { ...st.designated } : null, onDone, group: '', offset: 0, q: '', chips: new Set(), hide: true, sim: '' });
  const cur = st.designated;
  dzEl.innerHTML = `<div class="dz-box">
    <header><b>指定用这张图复刻</b><span>不指定就照旧：Claude 自己从素材里挑。指定了，交给 Claude 的那句话会带上它，照它的方向做。</span><button type="button" class="dz-x" data-a="close" aria-label="关">×</button></header>
    <div class="dz-main">
      <div class="dz-left">
        <div class="dz-cur">${cur ? `<img alt="" src="/${esc(cur.src)}${cur.src.includes('?') ? '' : ''}"><div><b>现在指定的</b><span>${esc(cur.name)}</span>${cur.note ? `<em>方向：${esc(cur.note)}</em>` : ''}<button type="button" class="ed-btn" data-a="clear">清掉，不指定</button></div>` : '<p class="dim">现在没有指定图。</p>'}</div>
        <label class="dz-drop" tabindex="0"><input type="file" accept="image/*" hidden><b>拖一张图进来</b><span>或者点这里选文件、⌘V 粘贴</span></label>
        <div class="dz-sel"></div>
        <label class="dz-note"><span>方向（可以不写）</span><textarea rows="3" placeholder="比如：就用这张的构图，人放到上半，下面留暗；或者：只要这张的光">${esc(cur?.note || '')}</textarea></label>
        <div class="dz-row"><button type="button" class="ed-btn on" data-a="save">指定这张</button><button type="button" class="ed-btn" data-a="close">取消</button></div>
      </div>
      <div class="dz-right">${DZ.scope ? `<div class="dz-tabs"><input type="search" class="dz-q" placeholder="搜：C0295、灯塔、陶罐、红帽……"></div><div class="dz-chips" hidden></div><div class="dz-simbar" hidden></div><div class="dz-grid"></div><button type="button" class="ed-btn dz-more" data-a="more" hidden>再多一些</button>` : '<p class="dim">这张海报没归到项目（tools/project.py assign），只能上传或拖图进来。</p>'}</div>
    </div></div>`;
  dzEl.hidden = false; renderSel();
  const fileIn2 = $('input[type=file]', dzEl);
  fileIn2.addEventListener('change', () => { if (fileIn2.files[0]) uploadDz(fileIn2.files[0]); fileIn2.value = ''; });
  const drop = $('.dz-drop', dzEl);
  drop.addEventListener('dragover', (e) => { e.preventDefault(); drop.classList.add('on'); });
  drop.addEventListener('dragleave', () => drop.classList.remove('on'));
  drop.addEventListener('drop', (e) => { e.preventDefault(); drop.classList.remove('on'); const f = e.dataTransfer.files[0]; if (f) uploadDz(f); });
  if (DZ.scope) {
    const r = await fetch(`/api/proj/pool?name=${encodeURIComponent(DZ.scope)}&n=0`).then((x) => x.json());
    const G = Object.entries(r.groups || {}); const nameOf = { raw: '原素材', frame: '正片抽帧', lib: '素材库', still: '剧照', poster: '旧海报', render: '渲染' };
    $('.dz-tabs', dzEl).insertAdjacentHTML('beforeend', G.map(([g, n]) => { const [k, t] = g.split('/'); return `<button type="button" data-g="${esc(g)}">${esc(t || nameOf[k] || k)}<em>${n}</em></button>`; }).join(''));
    const qi = $('.dz-q', dzEl); let qt; qi.addEventListener('input', () => { clearTimeout(qt); qt = setTimeout(() => { DZ.q = qi.value.trim(); loadGroup(DZ.q ? '' : (G[0]?.[0] || '')); }, 250); });
    const chips = $('.dz-chips', dzEl);
    chips.innerHTML = DZ_FACETS.map(([k, vs]) => `<span class="dz-fk">${esc(k)}</span>` + vs.map((v) => { const [val, lab] = Array.isArray(v) ? v : [v, v]; return `<button type="button" data-c="${esc(k + ':' + val)}">${esc(lab)}</button>`; }).join('')).join('')
      + `<label class="dz-hide"><input type="checkbox" checked> 藏掉有问题的（横着的、太暗、带字幕、录屏）</label>`;
    $('.dz-hide input', chips).addEventListener('change', (e) => { DZ.hide = e.target.checked; loadGroup(DZ.group); });
    loadGroup(G[0]?.[0] || '');
  }
}
async function loadGroup(g, more = false) {
  DZ.group = g; if (!more) DZ.offset = 0;
  const [k, t] = (g || '').split('/'); const n = 96;
  $$('.dz-tabs button', dzEl).forEach((b) => b.setAttribute('aria-current', String(b.dataset.g === g)));
  const tc = dzConds();
  const r = await fetch(`/api/proj/pool?name=${encodeURIComponent(DZ.scope)}&kind=${encodeURIComponent(k)}${t ? `&tag=${encodeURIComponent(t)}` : ''}&offset=${DZ.offset}&n=${n}${DZ.q ? `&q=${encodeURIComponent(DZ.q)}` : ''}${tc ? `&t=${encodeURIComponent(tc)}` : ''}${DZ.hide ? '&hide=1' : ''}${DZ.sim ? `&similar=${encodeURIComponent(DZ.sim)}` : ''}`).then((x) => x.json());
  const chips = $('.dz-chips', dzEl); if (chips) chips.hidden = !r.tagged;
  $$('.dz-chips [data-c]', dzEl).forEach((b) => b.setAttribute('aria-pressed', String(DZ.chips.has(b.dataset.c))));
  const sb = $('.dz-simbar', dzEl); if (sb) { sb.hidden = !DZ.sim; sb.innerHTML = DZ.sim ? `像这张的：${esc(DZ.sim)}（共 ${r.total} 张）<button type="button" data-a="nosim">不找像的了 ×</button>` : ''; }
  const grid = $('.dz-grid', dzEl);
  const html = r.items.map((it) => `<button type="button" data-src="${esc(it.src)}" data-name="${esc(it.label)}" data-id="${esc(it.id)}" data-kind="${esc(it.kind)}" title="${esc(it.label + (it.tags ? '\n' + it.tags : ''))}" aria-pressed="${DZ.pick?.src === it.src}"><img alt="" loading="lazy" src="/${esc(it.thumb)}"><span>${esc(it.label.replace(/^\S+ /, ''))}</span>${it.tags ? `<small>${esc(it.tags)}</small>` : ''}<i class="dz-sim" data-sim="${esc(it.id)}" title="找像这张的">像</i></button>`).join('');
  grid.innerHTML = more ? grid.innerHTML + html : html;
  DZ.offset += r.items.length; $('.dz-more', dzEl).hidden = DZ.offset >= r.total;
}
function renderSel() {
  const box = $('.dz-sel', dzEl); const p = DZ.pick;
  box.innerHTML = p && p.src !== DZ.st.designated?.src ? `<img alt="" src="/${esc(p.thumb || p.src)}"><span>选中：${esc(p.name)}</span>` : '';
  $$('.dz-grid button', dzEl).forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.src === p?.src)));
}
async function uploadDz(f) {
  toast('传上去……');
  const r = await fetch(`/api/inbox/upload?dir=${encodeURIComponent(DZ.dir)}&name=${encodeURIComponent('指定_' + (f.name || 'paste.png'))}`, { method: 'POST', body: f }).then((x) => x.json());
  if (r.src) { DZ.pick = { src: r.src, name: f.name || '粘贴的图' }; renderSel(); toast('传好了，点「指定这张」'); }
}
async function saveDz(clear = false) {
  const note = $('.dz-note textarea', dzEl)?.value || '';
  const body = clear ? { clear: true } : { src: DZ.pick?.src, name: DZ.pick?.name, note, raw: DZ.pick?.kind === 'raw' ? DZ.pick.id : undefined };
  if (!clear && !body.src) { toast('先选一张图'); return; }
  const r = await fetch(`/api/inbox/designate?dir=${encodeURIComponent(DZ.dir)}`, { method: 'POST', body: JSON.stringify(body) }).then((x) => x.json());
  if (!r.ok) { toast('没存上：' + (r.error || '')); return; }
  DZ.st.designated = r.designated || undefined; if (!r.designated) delete DZ.st.designated;
  dzEl.hidden = true; toast(clear ? '清掉了：交给 Claude 时不带指定图' : '指定好了：交给 Claude 那句话会带上这张图'); sound.click?.();
  DZ.onDone?.(DZ.st.designated);
}
dzEl.addEventListener('click', (e) => {
  if (e.target === dzEl) { dzEl.hidden = true; return; }
  const g = e.target.closest('.dz-tabs button'); if (g) { loadGroup(g.dataset.g); return; }
  const c = e.target.closest('.dz-chips [data-c]'); if (c) { DZ.chips.has(c.dataset.c) ? DZ.chips.delete(c.dataset.c) : DZ.chips.add(c.dataset.c); loadGroup(DZ.chips.size ? '' : DZ.group); return; }   // 按标签筛时搜全部素材，不只当前那个文件夹
  const sm = e.target.closest('.dz-sim'); if (sm) { e.stopPropagation(); DZ.sim = sm.dataset.sim; loadGroup(''); return; }
  const it = e.target.closest('.dz-grid button'); if (it) { DZ.pick = { src: it.dataset.src, name: it.dataset.name, id: it.dataset.id, kind: it.dataset.kind, thumb: it.querySelector('img').getAttribute('src').replace(/^\//, '') }; renderSel(); return; }
  const b = e.target.closest('[data-a]'); if (!b) return;
  const a = b.dataset.a;
  if (a === 'close') dzEl.hidden = true;
  else if (a === 'nosim') { DZ.sim = ''; loadGroup(DZ.group); }
  else if (a === 'save') saveDz();
  else if (a === 'clear') saveDz(true);
  else if (a === 'more') loadGroup(DZ.group, true);
});
document.addEventListener('paste', (e) => {
  if (dzEl.hidden) return;
  const it = [...(e.clipboardData?.items || [])].find((x) => x.type.startsWith('image/'));
  if (it) { e.preventDefault(); e.stopImmediatePropagation(); uploadDz(it.getAsFile()); }
}, true);
document.addEventListener('keydown', (e) => { if (!dzEl.hidden && e.key === 'Escape') { dzEl.hidden = true; e.stopPropagation(); } }, true);
window.RVDesignate = { open: openDesignate, line: claudeLine };

// ============================================================
//  海报的大图：放大镜、色板、量到的事实
// ============================================================
const lbEl = document.createElement('div');
lbEl.id = 'rv-lb'; lbEl.hidden = true; lbEl.setAttribute('role', 'dialog');
lbEl.innerHTML = `<div class="lb-stage"><div class="lb-photo"><canvas class="pic"></canvas></div></div>
  <aside class="lb-side">
    <div class="lb-top"><p class="lb-ch"></p><button class="lb-close" type="button">CLOSE <span aria-hidden="true">×</span></button></div>
    <p class="lb-count"><b></b><span></span></p><p class="lb-cap"></p>
    <div class="lb-block"><div class="lb-label"><span>UNDER LOUPE</span><span class="lb-xy"></span></div><div class="lb-under"><span class="hex">把鼠标移到海报上</span><span class="zoom"></span></div></div>
    <div class="lb-block"><div class="lb-label"><span>PALETTE · 用途</span><span>COPY</span></div><ul class="lb-palette rv-pal"></ul></div>
    <div class="lb-block"><div class="lb-label"><span>FACTS · 程序量到的</span><span></span></div><ul class="rv-facts"></ul></div>
    <div class="lb-nav"><button class="lb-prev" type="button">← PREV</button><button class="lb-next" type="button">NEXT →</button></div>
  </aside>`;
document.body.append(lbEl);
const LB = { open: false, mode: 'original' };
const MODES = ['original', 'boxes', 'type', 'color', 'image', 'path', 'anchor'];
const MODE_ZH = { original: '原图', boxes: '框', type: '字', color: '颜色', image: '图像', path: '阅读路径', anchor: '锚' };
// 网站上大图多几页：我们的版本接在分析后面（'ours0'、'ours1'……）
const OURS = () => (PUB && RV.P?.j.versions) || [];
const lbModes = () => MODES.concat(OURS().map((_, i) => 'ours' + i));
const oursOf = (mode) => { const m = /^ours(\d+)$/.exec(mode || ''); return m ? OURS()[+m[1]] || null : null; };
function openLB(mode) { LB.open = true; LB.mode = mode; lbEl.hidden = false; drawLB(); sound.open?.(); }
function closeLB() { LB.open = false; lbEl.hidden = true; }
function drawLB() {
  const P = RV.P, st = P.st, pic = $('.pic', lbEl), ph = $('.lb-photo', lbEl), stage = $('.lb-stage', lbEl);
  const v = oursOf(LB.mode), ms = lbModes();
  const sw = stage.clientWidth - 80, sh = stage.clientHeight - 80, ar = v ? v.w / v.h : P.img.naturalWidth / P.img.naturalHeight;
  const w = Math.min(sw, sh * ar); ph.style.width = w + 'px'; ph.style.height = w / ar + 'px';
  if (v) drawOurs(pic, v, 1600); else drawPoster(pic, LB.mode, 1600);
  $('.lb-ch', lbEl).textContent = `POSTER · ${st.name || ''}`;
  $('.lb-count b', lbEl).textContent = pad2(ms.indexOf(LB.mode) + 1); $('.lb-count span', lbEl).textContent = ` / ${pad2(ms.length)} · ${v ? '我们的版本' + (v.id ? ' ' + v.id : '') : MODE_ZH[LB.mode]}`;
  $('.lb-cap', lbEl).textContent = v ? (P.j.note_zh || '') : (st.thumbNote || st.motif || `${(st.boxes || []).length} 个框 · ${st.out?.size || ''}`);
  $('.rv-pal', lbEl).innerHTML = (st.famNotes || []).map((f) => `<li data-hex="${f.hex}"><span class="sw" style="background:${f.hex}"></span><span class="hx">${f.hex.toUpperCase()}</span><span class="use"><b>${esc(f.name)}</b> ${esc(f.use || '')}</span></li>`).join('');
  $('.rv-facts', lbEl).innerHTML = (st.facts || []).slice(0, 14).map((f) => `<li>${esc(f)}</li>`).join('');
}
lbEl.addEventListener('click', (e) => {
  if (e.target.closest('.lb-close') || e.target === $('.lb-stage', lbEl)) closeLB();
  else if (e.target.closest('.lb-prev')) { const ms = lbModes(); LB.mode = ms[(ms.indexOf(LB.mode) + ms.length - 1) % ms.length]; drawLB(); }
  else if (e.target.closest('.lb-next')) { const ms = lbModes(); LB.mode = ms[(ms.indexOf(LB.mode) + 1) % ms.length]; drawLB(); }
  const li = e.target.closest('.rv-pal li'); if (li) navigator.clipboard?.writeText(li.dataset.hex).then(() => toast('复制了 ' + li.dataset.hex));
});
$('.lb-photo', lbEl).addEventListener('pointermove', (e) => {
  const P = RV.P; if (!P) return; const r = e.currentTarget.getBoundingClientRect(); const u = (e.clientX - r.left) / r.width, v = (e.clientY - r.top) / r.height;
  const ov = oursOf(LB.mode);   // 看我们的版本时，放大镜读的是我们的图，不标原作的框
  loadPixels(ov ? U(ov.big || ov.img) : refUrl(P.dir), 900).then((px) => { const c = pixelAt(px, u, v); const hx = rgbToHex(...c);
    const un = $('.lb-under', lbEl); un.classList.add('live'); $('.hex', un).innerHTML = `<i style="display:inline-block;width:14px;height:14px;background:${hx};vertical-align:-2px;margin-right:8px"></i>${hx}`;
    $('.lb-xy', lbEl).textContent = `${(u * 100).toFixed(1)} · ${(v * 100).toFixed(1)} %`;
    const hit = ov ? [] : (P.st.boxes || []).filter((b) => u >= b.x0 && u <= b.x1 && v >= b.y0 && v <= b.y1).map((b) => b.label || b.id);
    $('.zoom', un).textContent = hit.join(' · '); });
});
window.addEventListener('resize', () => { if (LB.open) drawLB(); });

// ============================================================
//  回到章节：候选照片带标记；大图里可以「用在这个图位」
// ============================================================
const KEY = 'rv-active';
const ACTIVE = () => { try { return JSON.parse(sessionStorage.getItem(KEY) || 'null'); } catch { return null; } };
function remember(P) {
  const slots = P.slots.filter((s) => !s.logo).map((s) => ({ box: s.box, label: s.label, keys: s.candidates.map((c) => c.key), chosen: P.j.state.build?.picks?.[s.box]?.key || null }));
  try { sessionStorage.setItem(KEY, JSON.stringify({ dir: P.dir, name: P.st.name, slots })); } catch {}
}
const bar = document.createElement('div'); bar.className = 'rv-bar'; bar.hidden = true; document.body.append(bar);
bar.addEventListener('click', (e) => { if (e.target.closest('.x')) { try { sessionStorage.removeItem(KEY); } catch {} bar.hidden = true; $$('.rv-badge').forEach((x) => x.remove()); $$('.rv-cand-on').forEach((x) => x.classList.remove('rv-cand-on')); } });

function decorate() {
  if (PUB) { bar.hidden = true; return; }
  const A = ACTIVE(); const m = location.hash.match(/^#\/ch\/([^/]+)(?:\/(\d+))?/);
  if (!A || !m || !byId[m[1]] || cur !== null) { bar.hidden = true; return; }
  const ch = byId[m[1]];
  const back = '#/reverse/' + encodeURIComponent(A.dir.replace(/^inbox\//, ''));
  let n = 0;
  $$('#chapter .strip-track figure.card').forEach((fig, i) => {
    fig.querySelector('.rv-badge')?.remove(); fig.classList.remove('rv-cand-on');
    const key = `${ch.folder}/${ch.photos[i]?.n}`;
    const hits = A.slots.map((s) => ({ s, r: s.keys.indexOf(key) })).filter((x) => x.r >= 0);
    if (!hits.length) return; n++;
    fig.classList.add('rv-cand-on');
    const b = document.createElement('span'); b.className = 'rv-badge';
    b.textContent = hits.map(({ s, r }) => (s.chosen === key ? `已用 · ${s.label}` : `${s.label} · 候选 ${r + 1}`)).join(' / ');
    fig.append(b);
  });
  bar.innerHTML = `<b>REVERSE</b><span>倒推中：${esc(A.name || '')} · ${n ? `这一卷有 ${n} 张候选` : '这一卷没有候选'}</span><a href="${back}">回到海报 →</a><button class="x" type="button" title="不再标">×</button>`;
  bar.hidden = false;
  if (m[2]) useInLightbox(A, `${ch.folder}/${ch.photos[+m[2] - 1]?.n}`, back);
}
function useInLightbox(A, key, back) {
  const side = $('#lightbox .lb-side'); if (!side) return;
  side.querySelector('.rv-use')?.remove();
  const blk = document.createElement('div'); blk.className = 'lb-block rv-use';
  blk.innerHTML = `<div class="lb-label"><span>POSTER REVERSE</span><span>${esc(A.name || '')}</span></div>` +
    A.slots.map((s) => { const r = s.keys.indexOf(key); return `<button type="button" data-box="${esc(s.box)}">用在「${esc(s.label)}」${s.chosen === key ? '（已经用了）' : ''}<em>${r >= 0 ? `候选 ${r + 1}` : '不在候选里'}</em></button>`; }).join('');
  blk.addEventListener('click', async (e) => {
    const b = e.target.closest('button[data-box]'); if (!b) return;
    if (!RV.P || RV.P.dir !== A.dir) RV.P = await loadProject(A.dir);
    await pick(b.dataset.box, key, true);
  });
  side.insertBefore(blk, side.querySelector('.lb-nav'));
}
// 章节的胶片条是胶片手记自己画的：画完（或者翻到下一张大图）就补标记
const chTrack = $('#chapter .strip-track');
if (chTrack) new MutationObserver(() => { clearTimeout(decorate.t); decorate.t = setTimeout(decorate, 60); }).observe(chTrack, { childList: true });
const lbCount = $('#lightbox .lb-count');
if (lbCount) new MutationObserver(() => { clearTimeout(decorate.t); decorate.t = setTimeout(decorate, 60); }).observe(lbCount, { childList: true, subtree: true, characterData: true });

// ---------- 键盘 ----------
window.addEventListener('keydown', (e) => {
  if (cur === null || e.metaKey || e.ctrlKey || e.altKey || editor.isOpen) return;
  if (LB.open) {
    if (e.key === 'Escape') closeLB();
    else if (e.key === 'ArrowRight') $('.lb-next', lbEl).click();
    else if (e.key === 'ArrowLeft') $('.lb-prev', lbEl).click();
    e.stopImmediatePropagation(); return;
  }
  if (/^[1-4]$/.test(e.key) && cur !== 'home') { setStyle(STYLES[+e.key - 1].id); e.stopImmediatePropagation(); return; }
  if (e.key === 'Escape') { location.hash = cur === 'home' ? '#/' : '#/reverse'; e.stopImmediatePropagation(); }
  if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') { e.stopImmediatePropagation(); e.preventDefault(); sT = clamp(strip.scrollLeft + (e.key === 'ArrowRight' ? 1 : -1) * strip.clientWidth * 0.6, 0, strip.scrollWidth - strip.clientWidth); if (!sRaf) sRaf = requestAnimationFrame(glide); }
}, true);

// 胶片手记回首页时会把强调色换回去：倒推开着的时候守住自己的色
new MutationObserver(() => { if (cur !== null && document.documentElement.style.getPropertyValue('--accent').trim().toLowerCase() !== RV.accent.toLowerCase()) setAccent(RV.accent); })
  .observe(document.documentElement, { attributes: true, attributeFilter: ['style'] });

// ---------- 画布（点一层就改） ----------
const editor = createEditor({ $, $$, esc, toast, sound, photoUrl, frameOf, designate: (dir, st, cb) => openDesignate(dir, st, cb), claudeLine });

// ---------- 启动 ----------
route().catch(console.error);
setTimeout(decorate, 900);
