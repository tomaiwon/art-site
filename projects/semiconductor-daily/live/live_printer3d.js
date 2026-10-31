// 监测台 07 PRINTER 的 3D 版(three.js):白模打印机 + 1px 墨线,纸是会弯的薄片,出纸、抛起、翻飞、落到地上堆起来。
// 由 live_view.html 里的真实进度驱动(Printer.floor / sheet / eject / retract / clear / mood);加载失败时页面照用 2D 线稿。
// ?look=xray 换成透视看法:机身透明,看得见纸路和来回走的打印头。?front=drum|slit|gears|dial 换正面机构(默认 dial)。
import * as THREE from 'three';

const room = document.getElementById('room');
const LOOK = new URLSearchParams(location.search).get('look') === 'xray' ? 'xray' : 'model';
const FRONT = ['drum', 'slit', 'gears', 'dial'].includes(new URLSearchParams(location.search).get('front'))
  ? new URLSearchParams(location.search).get('front') : 'dial';   // 用户定了 D:进度表盘 + 今天几条
const REDUCE = matchMedia('(prefers-reduced-motion: reduce)').matches;
const INK = 0x111111, CINNABAR = 0xbd4030;
const PW = 9.6, PH = 12;                    // 纸:4:5,和封面同比例
const SLOT = new THREE.Vector3(0, 11.2, 6.4);  // 出纸口(机顶前沿)
const FAN = { x: -50, z: 16 };                 // 风扇一开始放在左前方;看的人可以拖着它走(位置只在这一页里,不存)
const FAN_LEVELS = [0, 8, 14, 22, 30, 40];     // 风速档位 → 扇叶转速;风力按转速比例放大(2 档 = 原来的风)
const PILE = { x: 0, z: 14 };                  // 风扇总是朝着纸堆这一带吹

function start() {
  const canvas = document.createElement('canvas');
  canvas.className = 'p3d';
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  } catch (e) {
    return;                                  // 没有 WebGL:留着 2D 线稿
  }
  renderer.setPixelRatio(Math.min(2, devicePixelRatio));
  renderer.setClearColor(0xffffff, 1);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  room.prepend(canvas);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(24, 3, 20, 600);
  const target = new THREE.Vector3(-2, 9, 10);
  const home = new THREE.Vector3(24, 46, 116);

  scene.add(new THREE.HemisphereLight(0xffffff, 0xeeeeee, 2.2));
  const sun = new THREE.DirectionalLight(0xffffff, 1.6);
  sun.position.set(-34, 70, 46);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -90, right: 90, top: 60, bottom: -60, near: 1, far: 220 });
  sun.shadow.radius = 5;
  sun.shadow.bias = -0.0008;
  scene.add(sun);

  const ground = new THREE.Mesh(new THREE.PlaneGeometry(600, 600), new THREE.ShadowMaterial({ opacity: 0.11 }));
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  // —— 打印机:白模 + 墨线 ——————————————————————————————————————————————
  const ink = new THREE.LineBasicMaterial({ color: INK });
  const soft = new THREE.LineBasicMaterial({ color: 0xbdbdbd });
  const white = LOOK === 'xray'
    ? new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.18, depthWrite: false })
    : new THREE.MeshLambertMaterial({ color: 0xffffff });
  const grey = new THREE.MeshLambertMaterial({ color: 0xf1f1ef });
  const dark = new THREE.MeshBasicMaterial({ color: INK });


  // —— 正面机构的几种画法 —————————————————————————————————————————————————
  function gearShape(r, teeth, depth = 0.45) {
    const s = new THREE.Shape(), n = teeth * 4;
    for (let i = 0; i <= n; i++) {
      const a = (i / n) * Math.PI * 2, q = i % 4, rr = q === 1 || q === 2 ? r : r - depth;
      const x = Math.cos(a) * rr, y = Math.sin(a) * rr;
      if (i) s.lineTo(x, y); else s.moveTo(x, y);
    }
    const hole = new THREE.Path();
    hole.absarc(0, 0, r * 0.18, 0, Math.PI * 2, true);
    s.holes.push(hole);
    return s;
  }
  function gear(r, teeth, at, depth = 0.35) {
    const geom = new THREE.ExtrudeGeometry(gearShape(r, teeth), { depth, bevelEnabled: false, curveSegments: 4 });
    const g = new THREE.Group();
    g.position.set(...at);
    g.add(part(geom, white, ink));
    const spoke = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(-r * 0.62, 0, depth + 0.01), new THREE.Vector3(r * 0.62, 0, depth + 0.01)]);
    g.add(new THREE.LineSegments(spoke, soft));
    g.userData.teeth = teeth;
    return g;
  }
  function buildFront(kind) {
    const out = { spin() {} };
    if (kind === 'drum') {                            // 横置滚筒:压纸辊 + 主滚筒,两端齿轮,表面刻线随转动
      printer.add(part(new THREE.BoxGeometry(17, 6.6, 0.2), grey, ink, [-5, 6.1, 11.0]));
      const drum = new THREE.Group();
      drum.position.set(-5, 5.4, 11.1);
      const body = part(new THREE.CylinderGeometry(1.9, 1.9, 13, 48, 1, true), white, null);
      body.rotation.z = Math.PI / 2;
      drum.add(body);
      const knurl = [];
      for (let k = 0; k < 18; k++) {
        const a = (k / 18) * Math.PI * 2, y = Math.cos(a) * 1.92, z = Math.sin(a) * 1.92;
        knurl.push(new THREE.Vector3(-6.5, y, z), new THREE.Vector3(6.5, y, z));
      }
      drum.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(knurl), soft));
      for (const x of [-6.6, 6.6]) {
        const ring = new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(
          Array.from({ length: 48 }, (_, i) => new THREE.Vector3(x, Math.cos(i / 48 * 6.283) * 1.9, Math.sin(i / 48 * 6.283) * 1.9))), ink);
        drum.add(ring);
      }
      printer.add(drum);
      const pinch = new THREE.Group();
      pinch.position.set(-5, 8.1, 11.1);
      const pb = part(new THREE.CylinderGeometry(0.7, 0.7, 11.5, 32, 1, true), white, null);
      pb.rotation.z = Math.PI / 2;
      pinch.add(pb);
      const pl = [];
      for (let k = 0; k < 8; k++) { const a = k / 8 * 6.283; pl.push(new THREE.Vector3(-5.75, Math.cos(a) * .71, Math.sin(a) * .71), new THREE.Vector3(5.75, Math.cos(a) * .71, Math.sin(a) * .71)); }
      pinch.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(pl), soft));
      printer.add(pinch);
      const gl = gear(2.3, 18, [-11.8, 5.4, 11.0], 0.3), gr = gear(1.4, 11, [-11.8, 8.6, 11.0], 0.3);
      gl.rotation.y = Math.PI / 2; gr.rotation.y = Math.PI / 2;
      printer.add(gl, gr);
      out.spin = (dt, now, sp) => {
        drum.rotation.x -= sp * dt * 0.6; pinch.rotation.x += sp * dt * 0.6 * 1.9 / 0.7;
        gl.rotation.x = drum.rotation.x; gr.rotation.x = -drum.rotation.x * 18 / 11;
      };
    } else if (kind === 'slit') {                     // 观察缝 + 格栅:纸路上一道光来回扫
      printer.add(part(new THREE.BoxGeometry(17, 0.6, 0.12), dark, null, [-5, 8.6, 11.02]));
      const scan = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.42, 0.14), new THREE.MeshBasicMaterial({ color: 0xffffff }));
      scan.position.set(-5, 8.6, 11.06);
      printer.add(scan);
      const grille = [];
      for (let k = 0; k < 11; k++) { const y = 3.2 + k * 0.42; grille.push(new THREE.Vector3(-13.2, y, 11.02), new THREE.Vector3(3.2, y, 11.02)); }
      printer.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(grille), soft));
      printer.add(new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.PlaneGeometry(16.4, 4.8)), ink).translateX(-5).translateY(5.3).translateZ(11.02));
      out.spin = (dt, now, sp) => { scan.visible = sp > 0; scan.position.x = -5 + Math.sin(now / (sp > 2 ? 240 : 900)) * 7.4; };
    } else if (kind === 'gears') {                    // 齿轮组:四个大小不一的齿轮咬合着转
      printer.add(part(new THREE.BoxGeometry(17, 6.8, 0.2), grey, ink, [-5, 6.1, 11.0]));
      const spec = [[2.6, 20, [-10.4, 5.6]], [1.8, 14, [-6.8, 7.1]], [1.3, 10, [-4.2, 6.0]], [2.0, 15, [-1.4, 5.0]]];
      const gs = spec.map(([r, t, [x, y]]) => { const g = gear(r, t, [x, y, 11.1]); printer.add(g); return g; });
      gs.forEach((g, i) => { g.rotation.z = i % 2 ? Math.PI / g.userData.teeth : 0; });
      out.spin = (dt, now, sp) => { gs.forEach((g, i) => { g.rotation.z += (i % 2 ? 1 : -1) * sp * dt * 0.9 * 20 / g.userData.teeth; }); };
    } else {                                          // 进度表盘:指针指出这一条做到哪;旁边六格是今天出了几条
      const faceCanvas = document.createElement('canvas');
      faceCanvas.width = faceCanvas.height = 512;
      const c = faceCanvas.getContext('2d');
      c.fillStyle = '#fff'; c.fillRect(0, 0, 512, 512);
      c.translate(256, 256);
      for (let k = 0; k <= 40; k++) {
        const a = -Math.PI * 1.25 + (k / 40) * Math.PI * 1.5, long = k % 5 === 0;
        c.strokeStyle = long ? '#111' : '#9a9a9a'; c.lineWidth = long ? 4 : 2;
        c.beginPath(); c.moveTo(Math.cos(a) * (long ? 178 : 196), Math.sin(a) * (long ? 178 : 196));
        c.lineTo(Math.cos(a) * 214, Math.sin(a) * 214); c.stroke();
      }
      c.fillStyle = '#111'; c.font = '500 34px "SF Mono", ui-monospace, monospace'; c.textAlign = 'center';
      [['0', -1.25], ['50', -0.5], ['100', 0.25]].forEach(([t, f]) => { const a = Math.PI * f; c.fillText(t, Math.cos(a) * 140, Math.sin(a) * 140 + 12); });
      c.fillStyle = '#8a8a8a'; c.font = '400 26px "SF Mono", ui-monospace, monospace';
      c.fillText('ISSUE %', 0, 120);
      const tex = new THREE.CanvasTexture(faceCanvas);
      tex.colorSpace = THREE.SRGBColorSpace;
      const face = part(new THREE.CircleGeometry(3.1, 64), new THREE.MeshBasicMaterial({ map: tex }), null, [-8.6, 6.3, 11.03]);
      printer.add(face);
      const rim = part(new THREE.TorusGeometry(3.2, 0.12, 8, 64), white, null, [-8.6, 6.3, 11.06]);
      printer.add(rim);
      printer.add(new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(Array.from({ length: 64 }, (_, i) =>
        new THREE.Vector3(-8.6 + Math.cos(i / 64 * 6.283) * 3.32, 6.3 + Math.sin(i / 64 * 6.283) * 3.32, 11.06))), ink));
      const needle = new THREE.Group();
      needle.position.set(-8.6, 6.3, 11.12);
      needle.add(new THREE.Mesh(new THREE.BoxGeometry(0.1, 2.6, 0.06), dark).translateY(1.1));
      needle.add(new THREE.Mesh(new THREE.CircleGeometry(0.28, 24), dark));
      printer.add(needle);
      const cells = [];                                 // 名额格子:近 24 小时上限几条就亮几格(10-31 起 8 条)
      for (let k = 0; k < 8; k++) {
        const m = new THREE.MeshBasicMaterial({ color: 0xffffff });
        const cell = part(new THREE.BoxGeometry(0.92, 0.92, 0.12), m, ink, [-4.4 + k * 1.15, 4.0, 11.06]);
        printer.add(cell);
        cells.push({ m, cell });
      }
      printer.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(-4.9, 5.3, 11.03), new THREE.Vector3(4.2, 5.3, 11.03)]), soft));
      out.today = (n, guard) => cells.forEach(({ m, cell }, k) => {
        cell.visible = k < guard;
        m.color.setHex(k < Math.min(n, guard) ? INK : 0xffffff);
      });
      out.spin = (dt, now, sp, prog) => {
        const shake = sp > 2 ? Math.sin(now / 45) * 0.012 : 0;
        needle.rotation.z = Math.PI * 0.75 - prog * Math.PI * 1.5 + shake;   // 左下 0,右下 100
      };
      out.today(...today);
    }
    return out;
  }

  function part(geom, mat = white, line = ink, at = [0, 0, 0]) {
    const mesh = new THREE.Mesh(geom, mat);
    mesh.position.set(...at);
    mesh.castShadow = LOOK === 'model' && mat !== dark;
    mesh.receiveShadow = true;
    if (line) mesh.add(new THREE.LineSegments(new THREE.EdgesGeometry(geom, 20), line));
    return mesh;
  }
  const printer = new THREE.Group();
  scene.add(printer);
  printer.add(part(new THREE.BoxGeometry(34, 1.2, 25), white, ink, [0, 0.6, 0]));          // 底座
  printer.add(part(new THREE.BoxGeometry(30, 10, 22), white, ink, [0, 6.2, 0]));           // 机身
  printer.add(part(new THREE.BoxGeometry(26, 0.8, 13), white, ink, [0, 11.6, -3.8]));     // 机顶盖
  printer.add(part(new THREE.BoxGeometry(15, 0.12, 1.1), dark, null, [0, 11.22, SLOT.z])); // 出纸口
  // 后面的进纸托盘和一叠白纸
  const tray = new THREE.Group();
  tray.position.set(0, 12.2, -10.5);
  tray.rotation.x = -0.42;
  tray.add(part(new THREE.BoxGeometry(14, 0.3, 11), white, ink, [0, 0, -4]));
  for (let k = 0; k < 4; k++) tray.add(part(new THREE.BoxGeometry(PW, 0.06, PH * 0.82), white, soft, [0, 0.2 + k * 0.08, -4]));
  printer.add(tray);
  // 正面左半边的机构(?front= 换):drum 横置滚筒 / slit 观察缝 / gears 齿轮组 / dial 进度表盘
  let mood = 'idle', moodInfo = null, progress = 0, today = [0, 8];
  const front = buildFront(FRONT);
  const lcdCanvas = document.createElement('canvas');
  lcdCanvas.width = 320; lcdCanvas.height = 112;
  const lcdTex = new THREE.CanvasTexture(lcdCanvas);
  lcdTex.colorSpace = THREE.SRGBColorSpace;
  const lcd = part(new THREE.PlaneGeometry(8.4, 2.94), new THREE.MeshBasicMaterial({ map: lcdTex }), ink, [8.4, 8.3, 11.02]);
  printer.add(lcd);
  const lampMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
  const lamp = part(new THREE.CylinderGeometry(0.55, 0.55, 0.3, 24), lampMat, ink, [13.4, 8.3, 11.12]);
  lamp.rotation.x = Math.PI / 2;
  printer.add(lamp);
  const vents = new THREE.BufferGeometry().setFromPoints([4.4, 5.4, 6.4].flatMap(y =>
    [new THREE.Vector3(4.6, y, 11.02), new THREE.Vector3(13.8, y, 11.02)]));
  printer.add(new THREE.LineSegments(vents, soft));
  // 机身里的打印头(透视看法里看得见,出纸时来回走)
  const head = part(new THREE.BoxGeometry(3.2, 1.6, 2.2), white, ink, [0, 9.4, SLOT.z - 1.2]);
  const rail = part(new THREE.CylinderGeometry(0.18, 0.18, 26, 8), white, soft, [0, 9.4, SLOT.z - 2.6]);
  rail.rotation.z = Math.PI / 2;
  printer.add(head, rail);

  function drawLcd() {
    const c = lcdCanvas.getContext('2d');
    c.fillStyle = '#f4f4f2'; c.fillRect(0, 0, 320, 112);
    c.fillStyle = mood === 'blocked' ? '#bd4030' : '#111';
    c.font = '500 30px "SF Mono", ui-monospace, Menlo, monospace';
    const label = { idle: 'IDLE', writing: 'WARMING', printing: 'PRINTING', done: 'DONE', blocked: 'HELD' }[mood] || 'IDLE';
    c.fillText(label, 16, 46);
    c.font = '400 22px "SF Mono", ui-monospace, Menlo, monospace';
    c.fillStyle = '#8a8a8a';
    const t = new Date().toLocaleTimeString('zh-CN', { timeZone: 'Asia/Shanghai', hour12: false, hour: '2-digit', minute: '2-digit' });
    c.fillText('BJT ' + t, 16, 88);
    lcdTex.needsUpdate = true;
  }
  drawLcd();
  setInterval(drawLcd, 30000);

  // —— 纸 —————————————————————————————————————————————————————————————
  const loader = new THREE.TextureLoader();
  const covers = new Map();
  function coverTex(url) {
    if (!covers.has(url)) {
      const t = loader.load(url, () => { needsFrame = true; });
      t.colorSpace = THREE.SRGBColorSpace;
      t.anisotropy = 4;
      covers.set(url, t);
    }
    return covers.get(url);
  }
  function makePaper(map) {
    const geom = new THREE.PlaneGeometry(PW, PH, 6, 8);
    geom.userData.base = geom.attributes.position.array.slice();
    const front = new THREE.Mesh(geom, new THREE.MeshLambertMaterial({ map, color: map ? 0xffffff : 0xfdfdfb }));
    const back = new THREE.Mesh(geom, new THREE.MeshLambertMaterial({ color: 0xfafaf8, side: THREE.BackSide }));
    front.castShadow = back.castShadow = true;
    front.receiveShadow = true;
    const edge = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.PlaneGeometry(PW, PH)),
      new THREE.LineBasicMaterial({ color: 0xcfcfcf }));
    const g = new THREE.Group();
    g.rotation.order = 'YXZ';
    g.add(front, back, edge);
    g.userData = { front, edge, geom };
    return g;
  }
  function bend(paper, curl, twist = 0) {             // 弯纸:沿两边卷一点、再扭一点
    const { geom, edge } = paper.userData;
    const base = geom.userData.base, pos = geom.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = base[i * 3] / (PW / 2), y = base[i * 3 + 1] / (PH / 2);
      pos.array[i * 3 + 2] = curl * (x * x - 0.35) * 1.6 + twist * x * y * 1.2;
    }
    pos.needsUpdate = true;
    geom.computeVertexNormals();
    edge.visible = Math.abs(curl) + Math.abs(twist) < 0.02;
  }
  function typedTexture() {
    const c = document.createElement('canvas');
    c.width = 480; c.height = 600;
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return { canvas: c, tex: t };
  }
  function wrap(ctx, text, maxW) {
    const lines = [];
    let line = '';
    for (const ch of text) {
      if (ctx.measureText(line + ch).width > maxW) { lines.push(line); line = ch; } else line += ch;
    }
    if (line) lines.push(line);
    return lines;
  }
  function drawTyped(t, info, n) {                  // 纸上逐行打出:标题、关键数字、导语,末尾光标
    const c = t.canvas.getContext('2d');
    c.fillStyle = '#fdfdfb'; c.fillRect(0, 0, 480, 600);
    c.fillStyle = '#111';
    c.fillRect(34, 34, 92, 18);
    let left = n;
    const take = s => { const out = s.slice(0, Math.max(0, left)); left -= s.length; return out; };
    c.font = '600 40px "Songti SC", "STSong", serif';
    let y = 112;
    for (const line of wrap(c, take(info.title || ''), 412)) { c.fillText(line, 34, y); y += 52; }
    c.fillStyle = '#e6e6e6'; c.fillRect(34, y - 18, 412, 2); y += 40;
    const fig = info.figure || {};
    if (fig.value) {
      c.fillStyle = '#111'; c.font = '500 72px "SF Mono", ui-monospace, monospace';
      c.fillText(take(fig.value), 34, y + 34); y += 70;
      c.fillStyle = '#8a8a8a'; c.font = '400 22px "PingFang SC", sans-serif';
      c.fillText(take(fig.label || ''), 34, y); y += 46;
    }
    c.fillStyle = '#333'; c.font = '400 24px "PingFang SC", sans-serif';
    for (const line of wrap(c, take((info.hook || '').slice(0, 60)), 412)) { c.fillText(line, 34, y); y += 36; }
    if (left < 0 && Math.floor(performance.now() / 420) % 2) {
      c.fillStyle = '#111'; c.fillRect(34, y - 26, 12, 26);
    }
    t.tex.needsUpdate = true;
  }

  // 地上的纸堆:每张纸记一个层号(后落下 / 被吹动的在上面),高度每帧按「压在谁上面」重新算,纸滑到哪都不会穿进别的纸
  const GAP = 0.08, NEAR = 9;                    // 两张纸中心距离小于 NEAR 就算叠在一起
  let layerSeq = 0;
  const overlaps = (a, b) => Math.hypot(a.position.x - b.position.x, a.position.z - b.position.z) < NEAR;
  function groundAt(x, z, except) {              // 某处落下一张新纸时的高度:比那里已有的纸都高一层
    let y = 0.04;
    for (const q of floorPapers) {
      if (q !== except && Math.hypot(q.position.x - x, q.position.z - z) < NEAR) y = Math.max(y, q.userData.restY + GAP);
    }
    return y;
  }
  function restack() {                           // 按层号从下往上重排高度;被别的纸压着的标为 covered(吹不动)
    const order = floorPapers.slice().sort((a, b) => a.userData.layer - b.userData.layer);
    order.forEach((q, i) => {
      let y = 0.04;
      for (let j = 0; j < i; j++) if (overlaps(q, order[j])) y = Math.max(y, order[j].userData.restY + GAP);
      q.userData.restY = y;
      q.userData.covered = false;
      for (let j = 0; j < i; j++) if (overlaps(q, order[j])) order[j].userData.covered = true;
      q.position.y = y + (q === hovered ? 0.6 : 0);
    });
  }
  const rnd = s => { const x = Math.sin(s * 9301 + 49297) * 233280; return x - Math.floor(x); };
  function inPrinter(x, z) { return Math.abs(x) < 24 && z > -18 && z < 19.5; }   // 纸心离底座要留出半张纸

  const floorGroup = new THREE.Group();
  scene.add(floorGroup);
  let floorPapers = [];
  function lay(paper, x, z, yaw) {
    const y = groundAt(x, z, paper);
    paper.position.set(x, y, z);
    paper.rotation.set(-Math.PI / 2, yaw, 0);
    paper.userData.layer = ++layerSeq;
    paper.userData.restY = y;
    bend(paper, 0);
  }
  function spot(seed) {
    let x = (rnd(seed) + rnd(seed + 13) - 1) * 50, z = -2 + rnd(seed + 11) * 32;   // 两个随机数相加:多数落在中间,少数飘远
    if (inPrinter(x, z)) z = 19.5 + rnd(seed + 5) * 9;
    if (Math.hypot(x - FAN.x, z - FAN.z) < 9) x = FAN.x + 12 + rnd(seed + 17) * 6;   // 别压在风扇底座上
    return [x, z, (rnd(seed + 7) - 0.5) * 1.6];
  }

  // —— 风扇:左边一台台扇,扇叶转、扇头慢慢左右摆;风扫到的纸,迎风那边被轻轻掀起、颤动 ——————————
  const fan = new THREE.Group();
  fan.position.set(FAN.x, 0, FAN.z);
  scene.add(fan);
  fan.add(part(new THREE.CylinderGeometry(4.2, 4.6, 0.9, 40), white, ink, [0, 0.45, 0]));            // 底座
  fan.add(part(new THREE.CylinderGeometry(0.38, 0.38, 11, 12), white, ink, [0, 6, 0]));               // 立杆
  const fanHead = new THREE.Group();
  fanHead.position.set(0, 12.2, 0);
  fan.add(fanHead);
  const motor = part(new THREE.CylinderGeometry(1.3, 1.6, 3.2, 28), white, ink, [-1.2, 0, 0]);      // 电机,朝 +x 吹
  motor.rotation.z = Math.PI / 2;
  fanHead.add(motor);
  const ringAt = (r, x, n = 72) => new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(
    Array.from({ length: n }, (_, i) => new THREE.Vector3(x, Math.cos(i / n * 6.2832) * r, Math.sin(i / n * 6.2832) * r))), ink);
  fanHead.add(ringAt(6.2, 1.6), ringAt(6.2, 3.4), ringAt(2.2, 3.9, 40));                             // 网罩前后两圈 + 前面的小圈
  const cage = [];
  for (let k = 0; k < 24; k++) {                                                                        // 网罩的辐条
    const a = (k / 24) * 6.2832, c = Math.cos(a), sn = Math.sin(a);
    cage.push(new THREE.Vector3(1.6, c * 6.2, sn * 6.2), new THREE.Vector3(3.4, c * 6.2, sn * 6.2),
      new THREE.Vector3(3.4, c * 6.2, sn * 6.2), new THREE.Vector3(3.9, c * 2.2, sn * 2.2));
  }
  fanHead.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(cage), soft));
  const blades = new THREE.Group();
  blades.position.x = 2.4;
  fanHead.add(blades);
  const bladeShape = new THREE.Shape();
  bladeShape.moveTo(0, 0.5);
  bladeShape.bezierCurveTo(1.4, 1.2, 5.6, 2.6, 5.5, 0.4);
  bladeShape.bezierCurveTo(5.4, -1.2, 2.0, -0.9, 0, -0.5);
  for (let k = 0; k < 3; k++) {
    const b = part(new THREE.ShapeGeometry(bladeShape, 10), new THREE.MeshLambertMaterial({ color: 0xffffff, side: THREE.DoubleSide }), ink);
    b.rotation.y = Math.PI / 2;                                                                         // 扇叶在 yz 平面里
    const holder = new THREE.Group();
    holder.rotation.x = (k / 3) * 6.2832;
    holder.add(b);
    b.rotation.x = 0.35;                                                                                // 一点桨距
    blades.add(holder);
  }
  blades.add(part(new THREE.SphereGeometry(0.7, 16, 12), white, null));
  let wind = 0, windDir = new THREE.Vector3(1, 0, 0), fanOff = false, bladeSpeed = 14, level = 2;
  try { const saved = +localStorage.getItem('eam-fan-level'); if (saved >= 0 && saved <= 5 && localStorage.getItem('eam-fan-level') !== null) level = saved; } catch (e) {}
  const scale = () => bladeSpeed / FAN_LEVELS[2];                // 风力倍数:2 档 = 1,5 档约 2.9
  function windAt(x, z) {                        // 某处的风力:离风扇越远越弱,偏离扇头朝向越多越弱;风越大吹得越远
    const dx = x - fan.position.x, dz = z - fan.position.z, d = Math.hypot(dx, dz);
    if (d < 1) return 0;
    const cos = (dx * windDir.x + dz * windDir.z) / d, reach = 110 * (0.6 + 0.4 * scale());
    return cos <= 0.55 ? 0 : wind * Math.pow((cos - 0.55) / 0.45, 1.5) * Math.max(0, 1 - d / reach);
  }
  function flutter(paper, strength, now) {       // 迎风那一边掀起、颤动(纸是平躺的:局部 x、y 在地面上)
    const { geom, edge } = paper.userData;
    const base = geom.userData.base, pos = geom.attributes.position;
    const yaw = paper.rotation.y, wx = Math.cos(yaw) * windDir.x - Math.sin(yaw) * windDir.z;
    const wy = -Math.sin(yaw) * windDir.x - Math.cos(yaw) * windDir.z;
    const ph = paper.userData.phase ?? (paper.userData.phase = Math.random() * 6.28);
    for (let i = 0; i < pos.count; i++) {
      const x = base[i * 3], y = base[i * 3 + 1];
      const d = -(x * wx + y * wy) / 7.6;                          // 1 = 最迎风的角,-1 = 背风的角
      const lift = Math.max(0, d);
      pos.array[i * 3 + 2] = Math.min(4.5, strength * lift * lift * 4.2) * (0.75 + 0.25 * Math.sin(now / 130 + ph + d * 2.5));
    }
    pos.needsUpdate = true;
    geom.computeVertexNormals();
    edge.visible = strength < 0.04;
  }

  // —— 动画状态 ——————————————————————————————————————————————————————————
  let printing = null;     // {paper, out, outTarget, typed?, info, n}
  const fliers = [];
  const settling = [];
  let needsFrame = true;

  const api = {
    floor(papers) {
      floorGroup.clear();
      layerSeq = 0;
      floorPapers = [];
      papers.slice().reverse().forEach(p => {
        const paper = makePaper(coverTex(p.cover));
        paper.userData.p = p;
        lay(paper, ...spot(p.serial));
        floorGroup.add(paper);
        floorPapers.push(paper);
      });
      needsFrame = true;
    },
    sheet(info, out) {
      if (!printing) {
        const typed = info.cover ? null : typedTexture();
        const paper = makePaper(typed ? typed.tex : coverTex(info.cover));
        scene.add(paper);
        printing = { paper, out: 0, outTarget: out, typed, info, n: 0, born: performance.now() };
      }
      printing.info = info;
      printing.outTarget = out;
      needsFrame = true;
    },
    eject(p) {
      if (!printing || printing.typed) {
        if (printing) scene.remove(printing.paper);
        const paper = makePaper(coverTex(p.cover));
        scene.add(paper);
        printing = { paper, out: printing ? printing.out : 0.2, outTarget: 1.05, typed: null, info: p, n: 0 };
      }
      printing.outTarget = 1.05;
      printing.launch = { at: performance.now() + (REDUCE ? 0 : 900), p };
      needsFrame = true;
    },
    retract() { if (printing) printing.outTarget = 0.25; },
    clear() { if (printing) { scene.remove(printing.paper); printing = null; } },
    mood(state, info) { mood = state; moodInfo = info; drawLcd(); needsFrame = true; },
    offline(on) { fanOff = on; needsFrame = true; syncControls(); },   // 工作台离线:风扇停、纸落定,不假装在跑
    today(n, guard) { today = [n, guard]; front.today && front.today(n, guard); needsFrame = true; },
  };

  function launch(p, paper) {
    printing = null;
    if (REDUCE) {
      scene.remove(paper);
      const fresh = makePaper(coverTex(p.cover));
      fresh.userData.p = p;
      lay(fresh, ...spot(p.serial));
      floorGroup.add(fresh);
      floorPapers.push(fresh);
      return;
    }
    const s = p.serial;
    fliers.push({
      paper, p, t: 0,
      pos: paper.position.clone(),
      vel: new THREE.Vector3((rnd(s) - 0.5) * 14, 20 + rnd(s + 1) * 5, 7 + rnd(s + 2) * 5),
      phase: rnd(s + 3) * 6.28, w: 2.2 + rnd(s + 4) * 1.2, glide: 10 + rnd(s + 6) * 7,
      heading: (rnd(s + 8) - 0.3) * 2.4, yaw: 0, spin: (rnd(s + 9) - 0.5) * 2.2,
    });
  }

  // 一阵大风:把地上最迎风的一张整张掀起来,翻飞一段落到别处(纸就这样越吹越散)
  let gustIn = 4;
  function gust() {
    const pick = floorPapers.filter(p => p !== hovered && !p.userData.covered)
      .map(p => [p, windAt(p.position.x, p.position.z) * (0.6 + Math.random() * 0.8)])
      .filter(([, w]) => w > 0.3).sort((a, b) => b[1] - a[1])[0];
    if (!pick) return;
    const paper = pick[0], i = floorPapers.indexOf(paper);
    floorPapers.splice(i, 1);
    floorGroup.remove(paper);
    scene.add(paper);
    const k = Math.random(), boost = Math.max(1, scale());
    fliers.push({
      paper, p: paper.userData.p, t: 1.2,                         // 已经是平躺着的:直接进入翻飞那一段
      pos: paper.position.clone().setY(paper.position.y + 0.3),
      vel: new THREE.Vector3(windDir.x * (10 + k * 8) * boost, (7 + k * 6) * Math.sqrt(boost), windDir.z * (10 + k * 8) * boost + (Math.random() - 0.5) * 6),
      phase: Math.random() * 6.28, w: 2.4 + Math.random() * 1.4, glide: 6 + Math.random() * 6,
      heading: Math.random() * 6.28, yaw: paper.rotation.y, spin: (Math.random() - 0.5) * 3,
    });
  }

  // —— 风扇的交互:拖着走(手机上点一下风扇、再点地面放下)、换档、收拾纸堆 ——————————————
  const ground0 = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), hitPoint = new THREE.Vector3();
  let dragging = false, picked = false, moved = false, grabOffset = new THREE.Vector3();
  const fanParts = [];
  fan.traverse(o => { if (o.isMesh) fanParts.push(o); });
  function overFan() { return ray.intersectObjects(fanParts, false).length > 0; }
  function groundAtPointer() { return ray.ray.intersectPlane(ground0, hitPoint) ? hitPoint.clone() : null; }
  function placeFan(x, z) {                        // 留在画面里、别压进打印机
    x = Math.max(-64, Math.min(64, x)); z = Math.max(-12, Math.min(34, z));
    if (Math.abs(x) < 28 && z > -20 && z < 22) z = z < 1 ? -20 : 22;
    fan.position.set(x, 0, z);
    needsFrame = true;
  }
  function setPointer(e) {
    const r = canvas.getBoundingClientRect();
    mouse.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(mouse, camera);
  }
  canvas.addEventListener('pointerdown', e => {
    setPointer(e);
    if (e.pointerType === 'touch') {               // 手机:点风扇「拿起」,再点地面「放下」
      if (overFan()) { picked = !picked; fanRing.visible = picked; needsFrame = true; e.preventDefault(); }
      else if (picked) { const g = groundAtPointer(); if (g) placeFan(g.x, g.z); picked = false; fanRing.visible = false; }
      return;
    }
    if (!overFan()) return;
    const g = groundAtPointer();
    if (!g) return;
    dragging = true; moved = false;
    grabOffset.set(fan.position.x - g.x, 0, fan.position.z - g.z);
    canvas.setPointerCapture(e.pointerId);
    canvas.style.cursor = 'grabbing';
    e.preventDefault();
  });
  canvas.addEventListener('pointerup', e => {
    if (!dragging) return;
    dragging = false;
    canvas.releasePointerCapture(e.pointerId);
    canvas.style.cursor = 'grab';
  });
  // 拿起时地上的一圈虚线
  const fanRing = new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(
    Array.from({ length: 48 }, (_, i) => new THREE.Vector3(Math.cos(i / 48 * 6.2832) * 6, 0.15, Math.sin(i / 48 * 6.2832) * 6))),
    new THREE.LineDashedMaterial({ color: INK, dashSize: 1, gapSize: 0.8 }));
  fanRing.computeLineDistances();
  fanRing.visible = false;
  fan.add(fanRing);

  const ctl = document.createElement('div');
  ctl.className = 'fanctl';
  ctl.innerHTML = '<span class="k">FAN</span><span class="lv">' + FAN_LEVELS.map((_, i) =>
    `<button type="button" data-lv="${i}" aria-label="风速 ${i} 档">${i === 0 ? '关' : i}</button>`).join('') + '</span>'
    + '<button type="button" class="tidy">收拾纸堆</button><span class="hint">拖动风扇换位置 · 风越大吹得越远</span>';
  room.appendChild(ctl);
  function syncControls() {
    ctl.querySelectorAll('[data-lv]').forEach(b => {
      b.classList.toggle('on', +b.dataset.lv === level);
      b.disabled = fanOff;
    });
    ctl.classList.toggle('off', fanOff);
    ctl.querySelector('.hint').textContent = fanOff ? '工作台离线,风扇停了' : (matchMedia('(pointer: coarse)').matches
      ? '点风扇、再点地面换位置 · 风越大吹得越远' : '拖动风扇换位置 · 风越大吹得越远');
  }
  ctl.querySelectorAll('[data-lv]').forEach(b => b.onclick = () => {
    level = +b.dataset.lv;
    try { localStorage.setItem('eam-fan-level', String(level)); } catch (e) {}
    syncControls(); needsFrame = true;
  });
  ctl.querySelector('.tidy').onclick = () => {     // 吹乱了:按期号把纸摆回原处,风扇也回到左前方
    const papers = floorPapers.slice().sort((a, b) => b.userData.p.serial - a.userData.p.serial).map(p => p.userData.p);
    fliers.splice(0).forEach(f => scene.remove(f.paper));
    settling.splice(0).forEach(s => scene.remove(s.paper));
    placeFan(FAN.x, FAN.z);
    api.floor(papers);
  };
  syncControls();

  // —— 鼠标:轻微视差、悬停抬起、点开大图 ——————————————————————————————
  const mouse = new THREE.Vector2(), aim = new THREE.Vector2();
  const ray = new THREE.Raycaster();
  let hovered = null;
  canvas.addEventListener('pointermove', e => {
    setPointer(e);
    if (dragging) {                                  // 拖着风扇走:跟着鼠标落在地面上的点
      const g = groundAtPointer();
      if (g) { placeFan(g.x + grabOffset.x, g.z + grabOffset.z); moved = true; }
      return;
    }
    const hit = ray.intersectObjects(floorPapers.map(p => p.userData.front), false)[0];
    const paper = hit ? floorPapers.find(p => p.userData.front === hit.object) : null;
    if (paper !== hovered) hovered = paper;
    canvas.style.cursor = overFan() ? 'grab' : paper ? 'zoom-in' : 'default';
    needsFrame = true;
  });
  canvas.addEventListener('pointerleave', () => { if (!dragging) { mouse.set(0, 0); hovered = null; } needsFrame = true; });
  canvas.addEventListener('click', () => {
    if (moved) { moved = false; return; }            // 刚拖完风扇,不算点纸
    if (hovered && !picked && window.openPaper) window.openPaper(hovered.userData.p);
  });

  // —— 尺寸与可见性 ——————————————————————————————————————————————————————
  function resize() {
    const w = room.clientWidth, h = room.clientHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.fov = w < 700 ? 42 : 24;
    camera.updateProjectionMatrix();
    needsFrame = true;
  }
  new ResizeObserver(resize).observe(room);
  let visible = true;
  new IntersectionObserver(es => { visible = es[0].isIntersecting; if (visible) needsFrame = true; }).observe(room);

  // —— 每一帧 ————————————————————————————————————————————————————————————
  let last = performance.now(), frameNo = 0;
  function frame(now) {
    requestAnimationFrame(frame);
    const dt = Math.min(0.033, (now - last) / 1000);
    last = now;
    const busy = printing || fliers.length || settling.length || mood === 'writing' || mood === 'printing' || mood === 'done';
    if (!visible || document.hidden) return;
    if (REDUCE && !busy && !needsFrame && aim.distanceTo(mouse) < 0.002) return;
    if (!busy && (frameNo++ % 2)) return;                          // 只有风在吹时 30 帧够了
    if (fanOff && bladeSpeed < 0.05 && !busy && !needsFrame && aim.distanceTo(mouse) < 0.002) return;   // 离线且风扇已停:不再重画
    needsFrame = false;

    if (!dragging) aim.lerp(mouse, REDUCE ? 1 : 0.06);
    camera.position.set(home.x + aim.x * 10, home.y + aim.y * 5, home.z);
    camera.lookAt(target);

    const spinning = mood === 'writing' ? 1.2 : (mood === 'printing' || mood === 'done') ? 5 : 0;
    const goal = mood === 'idle' || mood === 'blocked' ? 0 : mood === 'writing' ? 0.25 : mood === 'done' ? 1
      : printing ? 0.3 + 0.65 * printing.out : 0.5;
    progress += (goal - progress) * Math.min(1, dt * 2);
    if (!REDUCE) front.spin(dt, now, spinning, progress);
    const blink = Math.floor(now / 550) % 2;
    lampMat.color.setHex(mood === 'blocked' ? CINNABAR : (mood === 'writing' || mood === 'printing') ? (blink ? INK : 0xffffff)
      : mood === 'done' ? INK : 0xffffff);
    head.position.x = (mood === 'printing' && !REDUCE) ? Math.sin(now / 260) * 9 : head.position.x * 0.9;
    printer.position.y = (mood === 'printing' && !REDUCE) ? Math.sin(now / 30) * 0.03 : 0;

    if (!REDUCE) {                                                  // 风:扇叶一直转,扇头左右摆,风力一阵一阵的
      bladeSpeed += ((fanOff ? 0 : FAN_LEVELS[level]) - bladeSpeed) * Math.min(1, dt * 0.8);   // 换档、关掉时扇叶慢慢变速
      blades.rotation.x += dt * bladeSpeed;
      const aimYaw = Math.atan2(PILE.z - fan.position.z, PILE.x - fan.position.x);         // 朝纸堆
      const swing = Math.sin(now / 5200) * 0.42;
      if (!fanOff && level > 0) fanHead.rotation.y = -(aimYaw + swing);
      windDir.set(Math.cos(-fanHead.rotation.y), 0, Math.sin(-fanHead.rotation.y));
      wind = (0.95 + 0.35 * Math.sin(now / 1700) + 0.2 * Math.sin(now / 610)) * scale();
      floorPapers.forEach(p => {
        if (p === hovered) return;
        const u = p.userData, w = windAt(p.position.x, p.position.z) * (u.covered ? 0 : 1);   // 被压在下面的吹不动
        flutter(p, w, now);
        if (w > 0.2) {                                            // 顺着风在地上滑开,边滑边打转
          const sp = (w - 0.2) * 3.2;
          if (!u.sliding) { u.sliding = true; u.layer = ++layerSeq; }   // 开始滑的纸到最上层,从别的纸上面滑过
          u.spin ??= (Math.random() - 0.5) * 0.6;
          p.position.x = Math.max(-60, Math.min(60, p.position.x + windDir.x * sp * dt));
          p.position.z = Math.max(-10, Math.min(28, p.position.z + windDir.z * sp * dt));
          p.rotation.y += u.spin * sp * dt;
          if (inPrinter(p.position.x, p.position.z)) {             // 撞到打印机:贴着它往两边滑过去,别全堵在前面
            p.position.z = Math.max(p.position.z, 19.5);
            p.position.x += (p.position.x >= 0 ? 1 : -1) * sp * dt * 0.9;
          }
        } else u.sliding = false;
      });
      gustIn -= dt;
      if (gustIn <= 0) {                                            // 风越大,大风来得越勤、一次掀起的越多
        const sc = scale();
        gustIn = (4 + Math.random() * 6) / Math.max(1, sc * sc);
        if (!printing && !fanOff && sc > 0.3 && fliers.length < Math.max(2, Math.round(sc * 2))) gust();
      }
    }
    restack();
    if (printing) {
      const pr = printing;
      pr.out += (pr.outTarget - pr.out) * Math.min(1, dt * (REDUCE ? 60 : 2.2));
      const p = pr.paper;
      p.position.set(SLOT.x, SLOT.y - PH / 2 + PH * pr.out + 0.05, SLOT.z);
      p.rotation.set(-0.12, 0, 0);
      bend(p, 0.05 * Math.sin(now / 400));
      if (pr.typed) {
        pr.n = Math.min(400, pr.n + dt * 16);
        drawTyped(pr.typed, pr.info, Math.floor(pr.n));
      }
      if (pr.launch && now >= pr.launch.at && pr.out > 0.98) launch(pr.launch.p, p);
    }

    for (let k = fliers.length - 1; k >= 0; k--) {
      const f = fliers[k];
      f.t += dt;
      const sway = Math.sin(f.t * f.w + f.phase);
      f.vel.y += (-18 - 2.4 * f.vel.y) * dt;                                   // 重力 + 空气阻力:终速约 7.5 单位/秒,像纸
      const glideX = Math.cos(f.heading) * f.glide * sway, glideZ = Math.sin(f.heading) * f.glide * sway;
      const settleIn = Math.min(1, f.t / 1.1);
      const blow = windAt(f.pos.x, f.pos.z) * 11;
      f.vel.x += (glideX * settleIn + blow * windDir.x - f.vel.x) * dt * 1.6;   // 风把飘着的纸往右带
      f.vel.z += (glideZ * settleIn + (1 - settleIn) * 8 + blow * windDir.z - f.vel.z) * dt * 1.6;
      f.pos.addScaledVector(f.vel, dt);
      if (inPrinter(f.pos.x, f.pos.z) && f.pos.y < 14) f.pos.z = Math.max(f.pos.z, 19.5);   // 别落进机器里
      f.pos.x = Math.max(-60, Math.min(60, f.pos.x)); f.pos.z = Math.max(-10, Math.min(28, f.pos.z));   // 也别飞出画面
      f.yaw += f.spin * dt;
      const flat = 1 - Math.pow(1 - settleIn, 2);
      const pitch = -0.12 + (-Math.PI / 2 + 0.12) * flat + 0.5 * Math.cos(f.t * f.w + f.phase) * flat;
      const roll = 0.35 * Math.sin(f.t * f.w * 0.8 + f.phase) * flat;
      f.paper.position.copy(f.pos);
      f.paper.rotation.set(pitch, f.yaw, roll);
      bend(f.paper, 0.35 * Math.sin(f.t * f.w * 1.3 + f.phase), 0.25 * sway);
      const ground = groundAt(f.pos.x, f.pos.z);
      if (f.t > 0.6 && f.pos.y <= ground + PH * 0.18 * Math.abs(Math.sin(pitch + Math.PI / 2))) {
        fliers.splice(k, 1);
        settling.push({ paper: f.paper, p: f.p, from: f.paper.rotation.clone(), y0: f.pos.y, ground, t: 0, x: f.pos.x, z: f.pos.z, yaw: f.yaw });
      }
    }
    for (let k = settling.length - 1; k >= 0; k--) {               // 落地:压平,轻轻一顿
      const s = settling[k];
      s.t += dt / 0.35;
      const e = Math.min(1, s.t), ease = 1 - Math.pow(1 - e, 3);
      s.paper.rotation.set(s.from.x + (-Math.PI / 2 - s.from.x) * ease, s.yaw, s.from.z * (1 - ease));
      s.paper.position.y = s.y0 + (s.ground - s.y0) * ease;
      bend(s.paper, 0.2 * (1 - ease) * Math.sin(s.t * 9));
      if (e >= 1) {
        settling.splice(k, 1);
        scene.remove(s.paper);
        s.paper.userData.p = s.p;
        lay(s.paper, s.x, s.z, s.yaw);
        floorGroup.add(s.paper);
        floorPapers.push(s.paper);
      }
    }
    renderer.render(scene, camera);
  }
  resize();
  requestAnimationFrame(frame);
  if (window.registerPrinter3D) window.registerPrinter3D(api);
}

if (room) start();
