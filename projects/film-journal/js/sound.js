// ============================================================
//  声音：全部用 Web Audio 实时合成，没有任何音频文件
//  每个章节一套音色 + 一段生成式 BGM；悬停 / 颜色 / 转场各有音效
// ============================================================

const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);
const rand = (a, b) => a + Math.random() * (b - a);
const pick = (arr) => arr[(Math.random() * arr.length) | 0];

// 音色预设：root 是 MIDI 音高，scale 是音阶（半音）
export const PRESETS = {
  home:   { root: 60, scale: [0, 2, 4, 7, 9],          bpm: 70,  voice: 'soft',  label: 'Ambient' },
  meadow: { root: 60, scale: [0, 2, 4, 7, 9],          bpm: 64,  voice: 'soft',  label: 'Meadow · 草地' },
  sea:    { root: 62, scale: [0, 2, 4, 6, 7, 9, 11],   bpm: 104, voice: 'pluck', label: 'Sea · 海' },
  dust:   { root: 57, scale: [0, 3, 5, 7, 10],         bpm: 86,  voice: 'reed',  label: 'Dust · 尘土' },
  glass:  { root: 63, scale: [0, 2, 4, 6, 7, 9, 11],   bpm: 58,  voice: 'bell',  label: 'Glass · 玻璃' },
  rain:   { root: 61, scale: [0, 2, 5, 7, 10],         bpm: 76,  voice: 'drop',  label: 'Rain · 雨' },
};

const CHORDS = {
  home:   [[0, 7, 16], [5, 12, 16], [9, 16, 19], [7, 14, 19]],
  meadow: [[0, 4, 7, 11], [9, 12, 16, 19], [5, 9, 12, 16], [7, 11, 14, 17]],
  sea:    [[0, 4, 7, 14], [2, 6, 9, 16], [7, 11, 14, 18], [4, 7, 11, 16]],
  dust:   [[0, 7, 12, 15], [-2, 5, 10, 14], [-4, 3, 8, 12], [-5, 2, 7, 10]],
  glass:  [[0, 7, 11, 16], [6, 11, 14, 18], [4, 9, 11, 16], [2, 9, 14, 18]],
  rain:   [[0, 7, 14, 17], [-2, 5, 10, 14], [5, 10, 14, 19], [-5, 2, 7, 12]],
};

class SoundEngine {
  constructor() {
    this.ctx = null;
    this.scene = 'home';
    this.listeners = new Set();
    this.lastHover = 0;
    this.lastColor = 0;
    let pref = null;
    try { pref = localStorage.getItem('fj-sound'); } catch (e) { /* 隐私模式 */ }
    this.wanted = pref !== 'off';
    document.addEventListener('visibilitychange', () => {
      if (!this.ctx) return;
      if (document.hidden) this.ctx.suspend();
      else if (this.wanted) this.ctx.resume();
    });
  }

  get on() { return !!this.ctx && this.wanted && this.ctx.state === 'running'; }
  get preset() { return PRESETS[this.scene] || PRESETS.home; }

  onChange(fn) { this.listeners.add(fn); fn(this); }
  _emit() { this.listeners.forEach((fn) => fn(this)); }

  // 浏览器要求：必须在用户点击 / 按键之后才能出声
  unlock() {
    if (!this.wanted) return;
    if (!this.ctx) this._build();
    if (this.ctx.state !== 'running') this.ctx.resume().then(() => this._emit());
  }

  toggle() {
    this.wanted = !this.wanted;
    try { localStorage.setItem('fj-sound', this.wanted ? 'on' : 'off'); } catch (e) { /* ignore */ }
    if (this.wanted) {
      this.unlock();
      if (this.ctx) this.master.gain.setTargetAtTime(0.9, this.ctx.currentTime, 0.2);
    } else if (this.ctx) {
      this.master.gain.setTargetAtTime(0, this.ctx.currentTime, 0.08);
      setTimeout(() => { if (!this.wanted) this.ctx.suspend().then(() => this._emit()); }, 400);
    }
    this._emit();
  }

  setScene(name) {
    if (!PRESETS[name]) name = 'home';
    if (name === this.scene) return;
    this.scene = name;
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this.bgm.gain.cancelScheduledValues(t);
    this.bgm.gain.setTargetAtTime(0, t, 0.15);
    this.bgm.gain.setTargetAtTime(0.55, t + 0.6, 0.6);
    this._waves(name === 'sea');
    this._rain(name === 'rain');
    this._crackle(name === 'dust');
    this.step = 0;
    this._emit();
  }

  // ---------- 搭建音频图 ----------
  _build() {
    const AC = window.AudioContext || window.webkitAudioContext;
    const ctx = (this.ctx = new AC());
    this.master = ctx.createGain();
    this.master.gain.value = 0.9;
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -18; comp.ratio.value = 3; comp.attack.value = 0.01; comp.release.value = 0.3;
    this.master.connect(comp).connect(ctx.destination);

    // 混响（用噪声生成冲激响应）
    this.reverb = ctx.createConvolver();
    this.reverb.buffer = this._impulse(3.4, 2.6);
    this.revSend = ctx.createGain();
    this.revSend.gain.value = 0.5;
    this.revSend.connect(this.reverb).connect(this.master);

    // 延迟（海的章节用得多）
    this.delay = ctx.createDelay(1.5);
    this.delay.delayTime.value = 0.36;
    const fb = ctx.createGain(); fb.gain.value = 0.38;
    const dlp = ctx.createBiquadFilter(); dlp.type = 'lowpass'; dlp.frequency.value = 2400;
    this.delay.connect(dlp).connect(fb).connect(this.delay);
    this.delSend = ctx.createGain(); this.delSend.gain.value = 0.25;
    this.delSend.connect(this.delay);
    dlp.connect(this.master);

    this.sfx = ctx.createGain(); this.sfx.gain.value = 0.85;
    this.bgm = ctx.createGain(); this.bgm.gain.value = 0.55;
    for (const bus of [this.sfx, this.bgm]) {
      bus.connect(this.master); bus.connect(this.revSend); bus.connect(this.delSend);
    }

    this.noiseBuf = this._noise(2);
    this.step = 0;
    this.nextTime = ctx.currentTime + 0.1;
    this.timer = setInterval(() => this._tick(), 40);
    this._waves(this.scene === 'sea');
    this._rain(this.scene === 'rain');
    this._crackle(this.scene === 'dust');
  }

  _impulse(seconds, decay) {
    const ctx = this.ctx, rate = ctx.sampleRate, len = rate * seconds;
    const buf = ctx.createBuffer(2, len, rate);
    for (let c = 0; c < 2; c++) {
      const d = buf.getChannelData(c);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
    }
    return buf;
  }

  _noise(seconds) {
    const ctx = this.ctx, len = ctx.sampleRate * seconds;
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    return buf;
  }

  // 海浪：低通噪声 + 很慢的音量起伏
  _waves(on) {
    const ctx = this.ctx;
    if (on && !this.waveSrc) {
      const src = ctx.createBufferSource(); src.buffer = this.noiseBuf; src.loop = true;
      const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 520;
      const g = ctx.createGain(); g.gain.value = 0;
      const lfo = ctx.createOscillator(); lfo.frequency.value = 0.09;
      const lfoAmt = ctx.createGain(); lfoAmt.gain.value = 0.06;
      lfo.connect(lfoAmt).connect(g.gain);
      src.connect(lp).connect(g).connect(this.bgm);
      g.gain.setTargetAtTime(0.08, ctx.currentTime, 1);
      src.start(); lfo.start();
      this.waveSrc = { src, lfo, g };
    } else if (!on && this.waveSrc) {
      const w = this.waveSrc; this.waveSrc = null;
      w.g.gain.setTargetAtTime(0, ctx.currentTime, 0.3);
      setTimeout(() => { w.src.stop(); w.lfo.stop(); }, 1500);
    }
  }

  // 雨：高通噪声铺一层很轻的沙沙声
  _rain(on) {
    const ctx = this.ctx;
    if (on && !this.rainSrc) {
      const src = ctx.createBufferSource(); src.buffer = this.noiseBuf; src.loop = true;
      const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 1600;
      const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 6500;
      const g = ctx.createGain(); g.gain.value = 0;
      src.connect(hp).connect(lp).connect(g).connect(this.bgm);
      g.gain.setTargetAtTime(0.022, ctx.currentTime, 1.2);
      src.start();
      this.rainSrc = { src, g };
    } else if (!on && this.rainSrc) {
      const r = this.rainSrc; this.rainSrc = null;
      r.g.gain.setTargetAtTime(0, ctx.currentTime, 0.3);
      setTimeout(() => r.src.stop(), 1500);
    }
  }

  _crackle(on) { this.crackleOn = on; }

  // ---------- 乐器 ----------
  _voice(type, time, freq, vel = 0.5, dur = 1, dest = this.sfx) {
    const ctx = this.ctx;
    const out = ctx.createGain();
    out.connect(dest);
    const env = out.gain;
    const stop = (osc, t) => { osc.start(time); osc.stop(t); };

    if (type === 'soft') {
      const a = ctx.createOscillator(); a.type = 'sine'; a.frequency.value = freq;
      const b = ctx.createOscillator(); b.type = 'triangle'; b.frequency.value = freq * 2;
      const bg = ctx.createGain(); bg.gain.value = 0.12;
      a.connect(out); b.connect(bg).connect(out);
      env.setValueAtTime(0, time);
      env.linearRampToValueAtTime(vel * 0.32, time + 0.012);
      env.exponentialRampToValueAtTime(0.0001, time + 1.4 * dur);
      stop(a, time + 1.5 * dur); stop(b, time + 1.5 * dur);
    } else if (type === 'pad') {
      const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 1100; lp.Q.value = 0.4;
      lp.connect(out);
      [-7, 7, 0].forEach((cents, i) => {
        const o = ctx.createOscillator(); o.type = i === 2 ? 'sine' : 'triangle';
        o.frequency.value = freq; o.detune.value = cents; o.connect(lp);
        stop(o, time + dur + 3);
      });
      env.setValueAtTime(0, time);
      env.linearRampToValueAtTime(vel * 0.09, time + 1.2);
      env.setValueAtTime(vel * 0.09, time + dur);
      env.exponentialRampToValueAtTime(0.0001, time + dur + 2.8);
    } else if (type === 'pluck') {
      const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.Q.value = 2;
      lp.frequency.setValueAtTime(5200, time);
      lp.frequency.exponentialRampToValueAtTime(700, time + 0.35);
      lp.connect(out);
      const a = ctx.createOscillator(); a.type = 'triangle'; a.frequency.value = freq;
      const b = ctx.createOscillator(); b.type = 'square'; b.frequency.value = freq * 1.002;
      const bg = ctx.createGain(); bg.gain.value = 0.18;
      a.connect(lp); b.connect(bg).connect(lp);
      env.setValueAtTime(0, time);
      env.linearRampToValueAtTime(vel * 0.3, time + 0.004);
      env.exponentialRampToValueAtTime(0.0001, time + 0.7 * dur);
      stop(a, time + 0.8 * dur); stop(b, time + 0.8 * dur);
    } else if (type === 'reed') {
      const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.Q.value = 3;
      lp.frequency.setValueAtTime(2600, time);
      lp.frequency.exponentialRampToValueAtTime(420, time + 0.5);
      lp.connect(out);
      [-9, 9].forEach((c) => {
        const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = freq; o.detune.value = c;
        o.connect(lp); stop(o, time + 0.9 * dur);
      });
      env.setValueAtTime(0, time);
      env.linearRampToValueAtTime(vel * 0.16, time + 0.006);
      env.exponentialRampToValueAtTime(0.0001, time + 0.85 * dur);
    } else if (type === 'bell') {
      const car = ctx.createOscillator(); car.type = 'sine'; car.frequency.value = freq;
      const mod = ctx.createOscillator(); mod.type = 'sine'; mod.frequency.value = freq * 3.51;
      const idx = ctx.createGain();
      idx.gain.setValueAtTime(freq * 2.2, time);
      idx.gain.exponentialRampToValueAtTime(1, time + 1.6 * dur);
      mod.connect(idx).connect(car.frequency);
      car.connect(out);
      env.setValueAtTime(0, time);
      env.linearRampToValueAtTime(vel * 0.24, time + 0.003);
      env.exponentialRampToValueAtTime(0.0001, time + 2.6 * dur);
      stop(car, time + 2.7 * dur); stop(mod, time + 2.7 * dur);
    } else if (type === 'drop') {
      // 雨滴：正弦从高处一下子落到音高上，很短
      const o = ctx.createOscillator(); o.type = 'sine';
      o.frequency.setValueAtTime(freq * 1.9, time);
      o.frequency.exponentialRampToValueAtTime(freq, time + 0.045);
      const o2 = ctx.createOscillator(); o2.type = 'sine'; o2.frequency.value = freq * 3.01;
      const g2 = ctx.createGain(); g2.gain.value = 0.08;
      o.connect(out); o2.connect(g2).connect(out);
      env.setValueAtTime(0, time);
      env.linearRampToValueAtTime(vel * 0.3, time + 0.003);
      env.exponentialRampToValueAtTime(0.0001, time + 0.42 * dur);
      stop(o, time + 0.5 * dur); stop(o2, time + 0.5 * dur);
    } else if (type === 'drone') {
      const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.value = freq;
      const o2 = ctx.createOscillator(); o2.type = 'triangle'; o2.frequency.value = freq * 1.5; o2.detune.value = 4;
      const g2 = ctx.createGain(); g2.gain.value = 0.25;
      o.connect(out); o2.connect(g2).connect(out);
      env.setValueAtTime(0, time);
      env.linearRampToValueAtTime(vel * 0.12, time + 2);
      env.setValueAtTime(vel * 0.12, time + dur);
      env.exponentialRampToValueAtTime(0.0001, time + dur + 3);
      stop(o, time + dur + 3.2); stop(o2, time + dur + 3.2);
    }
  }

  _noiseBurst(time, { dur = 0.3, from = 400, to = 3000, q = 1.2, vel = 0.25, type = 'bandpass', dest = this.sfx } = {}) {
    const ctx = this.ctx;
    const src = ctx.createBufferSource(); src.buffer = this.noiseBuf;
    const f = ctx.createBiquadFilter(); f.type = type; f.Q.value = q;
    f.frequency.setValueAtTime(from, time);
    f.frequency.exponentialRampToValueAtTime(to, time + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, time);
    g.gain.linearRampToValueAtTime(vel, time + dur * 0.4);
    g.gain.exponentialRampToValueAtTime(0.0001, time + dur);
    src.connect(f).connect(g).connect(dest);
    src.start(time, Math.random()); src.stop(time + dur + 0.05);
  }

  _deg(i, octave = 0) {
    const { root, scale } = this.preset;
    const n = scale.length;
    const o = Math.floor(i / n);
    const d = ((i % n) + n) % n;
    return mtof(root + scale[d] + 12 * (o + octave));
  }

  // ---------- 生成式 BGM ----------
  _tick() {
    if (!this.on) return;
    const ctx = this.ctx;
    const stepDur = 60 / this.preset.bpm / 2;
    if (this.nextTime < ctx.currentTime - 0.5) this.nextTime = ctx.currentTime + 0.05;
    while (this.nextTime < ctx.currentTime + 0.2) {
      this._step(this.step, this.nextTime, stepDur);
      this.nextTime += stepDur;
      this.step++;
    }
  }

  _step(s, t, sd) {
    const sc = this.scene, p = this.preset, bgm = this.bgm;
    const chords = CHORDS[sc];
    const chord = chords[Math.floor(s / 16) % chords.length];
    const bar = s % 16;

    if (sc === 'home') {
      if (bar === 0) chord.forEach((iv) => this._voice('pad', t, mtof(p.root + iv - 12), 0.5, sd * 15, bgm));
      if (s % 2 === 0 && Math.random() < 0.16) this._voice('soft', t, this._deg((Math.random() * 7) | 0, 1), 0.28, 1.2, bgm);
    } else if (sc === 'meadow') {
      if (bar === 0) chord.forEach((iv) => this._voice('pad', t, mtof(p.root + iv - 12), 0.7, sd * 15, bgm));
      if (s % 2 === 0 && Math.random() < 0.3) this._voice('soft', t, this._deg((Math.random() * 8) | 0, 1), 0.35, 1.5, bgm);
      if (bar === 8 && Math.random() < 0.5) this._voice('soft', t + sd * 0.5, this._deg(pick([0, 2, 4]), 2), 0.18, 2, bgm);
    } else if (sc === 'sea') {
      const arp = [0, 1, 2, 3, 2, 1];
      const iv = chord[arp[s % arp.length] % chord.length];
      this._voice('pluck', t, mtof(p.root + iv + (s % 12 < 6 ? 0 : 12)), s % 4 === 0 ? 0.42 : 0.26, 0.8, bgm);
      if (bar === 0) this._voice('pad', t, mtof(p.root + chord[0] - 24), 0.6, sd * 15, bgm);
    } else if (sc === 'dust') {
      const pattern = [1, 0, 0, 1, 0, 0, 1, 0, 1, 0, 0, 1, 0, 1, 0, 0];
      if (pattern[bar]) {
        const iv = pick(chord);
        this._voice('reed', t, mtof(p.root + iv), bar === 0 ? 0.55 : 0.35, 0.9, bgm);
      }
      if (bar === 0) this._voice('drone', t, mtof(p.root + chord[0] - 24), 0.8, sd * 16, bgm);
      if (this.crackleOn && Math.random() < 0.35) {
        this._noiseBurst(t + Math.random() * sd, { dur: 0.012, from: 3000, to: 6000, q: 0.6, vel: rand(0.03, 0.09), type: 'highpass', dest: bgm });
      }
    } else if (sc === 'glass') {
      if (s % 32 === 0) this._voice('drone', t, mtof(p.root - 24), 0.9, sd * 32, bgm);
      if (s % 2 === 0 && Math.random() < 0.34) {
        const iv = pick(chord);
        this._voice('bell', t, mtof(p.root + iv + (Math.random() < 0.3 ? 12 : 0)), 0.32, 1.2, bgm);
      }
    } else if (sc === 'rain') {
      // 慢慢换的和弦 + 不对拍的雨滴，偶尔一滴落在更高处
      if (bar === 0) chord.forEach((iv) => this._voice('pad', t, mtof(p.root + iv - 12), 0.55, sd * 15, bgm));
      if (Math.random() < 0.32) this._voice('drop', t + Math.random() * sd, this._deg((Math.random() * 10) | 0, 1), rand(0.14, 0.3), 1, bgm);
      if (bar % 4 === 2 && Math.random() < 0.4) this._voice('drop', t, this._deg(pick([0, 1, 3]), 2), 0.12, 1.2, bgm);
    }
  }

  // ---------- 交互音效 ----------
  hover(i = 0, vel = 0.5) {
    if (!this.on) return;
    const now = performance.now();
    if (now - this.lastHover < 45) return;
    this.lastHover = now;
    this._voice(this.preset.voice, this.ctx.currentTime + 0.005, this._deg(i, 0), vel, 0.9);
  }

  // 颜色 -> 音高：色相决定音阶里的哪个音，明度决定八度，饱和度决定力度
  color(r, g, b) {
    if (!this.on) return;
    const now = performance.now();
    if (now - this.lastColor < 70) return;
    this.lastColor = now;
    const max = Math.max(r, g, b) / 255, min = Math.min(r, g, b) / 255;
    const l = (max + min) / 2;
    const sat = max === min ? 0 : (max - min) / (1 - Math.abs(2 * l - 1));
    let h = 0;
    if (max !== min) {
      const R = r / 255, G = g / 255, B = b / 255, d = max - min;
      if (max === R) h = ((G - B) / d) % 6; else if (max === G) h = (B - R) / d + 2; else h = (R - G) / d + 4;
      h = (h * 60 + 360) % 360;
    }
    const n = this.preset.scale.length;
    const deg = Math.floor((h / 360) * n);
    const oct = l < 0.28 ? -1 : l > 0.72 ? 1 : 0;
    this._voice(this.preset.voice, this.ctx.currentTime + 0.003, this._deg(deg, oct), 0.22 + sat * 0.4, 0.8);
  }

  note(hex) {
    const v = parseInt(hex.slice(1), 16);
    this.lastColor = 0;
    this.color((v >> 16) & 255, (v >> 8) & 255, v & 255);
  }

  whoosh() {
    if (!this.on) return;
    this._noiseBurst(this.ctx.currentTime, { dur: 0.42, from: 280, to: 4200, q: 1.6, vel: 0.22 });
  }

  riser() {
    if (!this.on) return;
    const t = this.ctx.currentTime;
    this._noiseBurst(t, { dur: 0.7, from: 200, to: 6000, q: 2.2, vel: 0.26 });
    const ch = CHORDS[this.scene] || CHORDS.home;
    ch[0].forEach((iv, i) => this._voice(this.preset.voice, t + 0.45 + i * 0.06, mtof(this.preset.root + iv), 0.4, 1.2));
  }

  tick() {
    if (!this.on) return;
    this._noiseBurst(this.ctx.currentTime, { dur: 0.03, from: 2500, to: 5000, q: 4, vel: 0.12 });
  }
}

export const sound = new SoundEngine();
