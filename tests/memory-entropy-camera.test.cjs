const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const pagePath = path.join(__dirname, '../projects/digital_12c.html');
const source = fs.readFileSync(pagePath, 'utf8').match(/<script>([\s\S]*?)<\/script>/)[1];

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}

function namedError(name) {
  return Object.assign(new Error(name), { name });
}

class Target {
  constructor() { this.listeners = new Map(); }
  addEventListener(type, listener, options = {}) {
    const listeners = this.listeners.get(type) || [];
    listeners.push({ listener, once: !!options.once });
    this.listeners.set(type, listeners);
  }
  removeEventListener(type, listener) {
    this.listeners.set(type, (this.listeners.get(type) || []).filter(item => item.listener !== listener));
  }
  dispatch(type, properties = {}) {
    const event = { type, target: this, preventDefault() {}, ...properties };
    for (const item of [...(this.listeners.get(type) || [])]) {
      if (item.once) this.removeEventListener(type, item.listener);
      item.listener.call(this, event);
    }
    this[`on${type}`]?.call(this, event);
  }
}

function element() {
  const classes = new Set();
  return Object.assign(new Target(), {
    textContent: '', disabled: false, hidden: false, style: {}, attributes: {},
    classList: {
      add(...values) { values.forEach(value => classes.add(value)); },
      remove(...values) { values.forEach(value => classes.delete(value)); },
      contains(value) { return classes.has(value); },
    },
    setAttribute(name, value) { this.attributes[name] = String(value); },
    removeAttribute(name) { delete this.attributes[name]; },
    getAttribute(name) { return this.attributes[name] ?? null; },
    focus() {},
  });
}

function stream() {
  const track = Object.assign(new Target(), {
    readyState: 'live', stopCalls: 0,
    stop() { this.stopCalls += 1; this.readyState = 'ended'; },
  });
  return { track, getTracks: () => [track], getVideoTracks: () => [track] };
}

// Control permission and playback independently. No real device or browser permission is used.
function loadPage({ secure = true, supported = true } = {}) {
  const requests = [];
  const playbacks = [];
  const timers = new Map();
  let timerId = 0;
  const context2d = {
    save() {}, restore() {}, scale() {}, translate() {}, drawImage() {},
    fillRect() {}, fillText() {}, getImageData: () => ({ data: new Uint8ClampedArray(128 * 72 * 4) }),
  };
  const makeCanvas = () => Object.assign(element(), {
    getContext: () => context2d, toDataURL: () => 'data:image/jpeg;base64,',
  });
  const elements = Object.fromEntries([
    'c', 'webcam-video', 'start-overlay', 'start-btn', 'start-message', 'cam-status', 'countdown',
  ].map(id => [id, id === 'c' ? makeCanvas() : element()]));
  const video = elements['webcam-video'];
  Object.assign(video, {
    srcObject: null, readyState: 0, videoWidth: 640, videoHeight: 360,
    muted: true, playsInline: true, paused: true, pauseCalls: 0,
    play() {
      const playback = deferred();
      playbacks.push(playback);
      return playback.promise;
    },
    pause() { this.pauseCalls += 1; this.paused = true; },
  });
  const window = Object.assign(new Target(), {
    innerWidth: 1280, innerHeight: 720, isSecureContext: secure,
    location: { protocol: secure ? 'https:' : 'http:', hostname: 'example.test' },
  });
  const navigator = supported ? {
    mediaDevices: {
      getUserMedia(constraints) {
        const request = deferred();
        requests.push({ ...request, constraints });
        return request.promise;
      },
    },
  } : {};
  const document = Object.assign(new Target(), {
    readyState: 'complete', visibilityState: 'visible', hidden: false,
    getElementById: id => elements[id] || null,
    createElement: tag => tag === 'canvas' ? makeCanvas() : element(),
  });
  const globals = {
    window, document, navigator, isSecureContext: secure, location: window.location,
    console: { warn() {}, error() {}, log() {} },
    DOMException, performance: { now: () => 0 },
    requestAnimationFrame() { return 1; }, cancelAnimationFrame() {},
    setTimeout(callback, delay) { const id = ++timerId; timers.set(id, { callback, delay }); return id; },
    clearTimeout(id) { timers.delete(id); },
    Image: class { constructor() { this.complete = true; this.naturalWidth = 640; } },
  };
  Object.assign(window, globals);
  vm.runInNewContext(source, globals, { filename: pagePath });
  return {
    elements, video, window, requests, playbacks,
    click() { elements['start-btn'].dispatch('click'); },
    runTimers(delay) {
      for (const [id, timer] of [...timers]) {
        if (timer.delay !== delay) continue;
        timers.delete(id);
        timer.callback();
      }
    },
    overlayHidden() {
      const overlay = elements['start-overlay'];
      return overlay.classList.contains('hidden') || overlay.hidden || overlay.style.display === 'none';
    },
    play(index = 0) {
      video.readyState = 4;
      video.paused = false;
      video.dispatch('loadedmetadata');
      video.dispatch('loadeddata');
      video.dispatch('canplay');
      playbacks[index].resolve();
      video.dispatch('playing');
    },
  };
}

const settle = () => new Promise(resolve => setImmediate(resolve));

test('opening the experience requests only video automatically', () => {
  const page = loadPage();
  assert.equal(page.requests.length, 1);
  assert.ok(page.requests[0].constraints.video);
  assert.notEqual(page.requests[0].constraints.audio, true);
  assert.equal(page.overlayHidden(), false);
});

test('permission rejection preserves a readable message and permits a new attempt', async () => {
  const page = loadPage();
  page.requests[0].reject(namedError('NotAllowedError'));
  await settle();
  assert.equal(page.overlayHidden(), false);
  assert.equal(page.elements['start-btn'].disabled, false);
  assert.match(page.elements['start-message'].textContent, /permission|allow|权限|允许/i);
  page.click();
  assert.equal(page.requests.length, 2);
});

test('permission alone does not hide the overlay; successful playback does', async () => {
  const page = loadPage();
  const media = stream();
  page.requests[0].resolve(media);
  await settle();
  assert.equal(page.playbacks.length, 1);
  assert.equal(page.video.srcObject, media);
  assert.equal(page.overlayHidden(), false);
  page.play();
  await settle();
  assert.equal(page.overlayHidden(), true);
  assert.equal(media.track.stopCalls, 0);
  assert.match(page.elements['cam-status'].textContent, /CAM/i);
});

test('repeated start events cannot create concurrent permission or playback requests', async () => {
  const page = loadPage();
  page.click();
  page.click();
  assert.equal(page.requests.length, 1);
  page.requests[0].resolve(stream());
  await settle();
  page.click();
  assert.equal(page.requests.length, 1);
  assert.equal(page.playbacks.length, 1);
  page.play();
  await settle();
  page.click();
  assert.equal(page.requests.length, 1);
});

test('playback rejection releases the stream and offers a retry instead of a black screen', async () => {
  const page = loadPage();
  const media = stream();
  page.requests[0].resolve(media);
  await settle();
  page.playbacks[0].reject(namedError('NotAllowedError'));
  await settle();
  assert.ok(media.track.stopCalls > 0);
  assert.equal(page.video.srcObject, null);
  assert.equal(page.overlayHidden(), false);
  assert.equal(page.elements['start-btn'].disabled, false);
  assert.match(page.elements['start-message'].textContent, /play|播放|重试|retry/i);
  page.click();
  assert.equal(page.requests.length, 2);
});

test('stalled playback times out, releases the camera, and restores retry', async () => {
  const page = loadPage();
  const media = stream();
  page.requests[0].resolve(media);
  await settle();
  page.runTimers(12000);
  await settle();
  assert.ok(media.track.stopCalls > 0);
  assert.equal(page.video.srcObject, null);
  assert.equal(page.overlayHidden(), false);
  assert.equal(page.elements['start-btn'].disabled, false);
  page.playbacks[0].resolve();
  await settle();
  assert.equal(page.overlayHidden(), false, 'late playback must not turn a timed-out attempt into success');
});

test('permission resolving after pagehide immediately releases its late stream', async () => {
  const page = loadPage();
  const media = stream();
  page.window.dispatch('pagehide', { persisted: true });
  page.requests[0].resolve(media);
  await settle();
  assert.ok(media.track.stopCalls > 0);
  assert.equal(page.video.srcObject, null);
  assert.equal(page.playbacks.length, 0);
  assert.equal(page.overlayHidden(), false);
});

test('a late permission result from a departed session cannot replace the restored camera', async () => {
  const page = loadPage();
  const oldMedia = stream();
  const newMedia = stream();
  page.window.dispatch('pagehide', { persisted: true });
  page.window.dispatch('pageshow', { persisted: true });
  assert.equal(page.requests.length, 2);
  page.requests[1].resolve(newMedia);
  await settle();
  page.play();
  await settle();
  page.requests[0].resolve(oldMedia);
  await settle();
  assert.ok(oldMedia.track.stopCalls > 0);
  assert.equal(newMedia.track.stopCalls, 0);
  assert.equal(page.video.srcObject, newMedia);
  assert.equal(page.overlayHidden(), true);
});

test('a departed playback failure cannot stop the camera of a restored session', async () => {
  const page = loadPage();
  const oldMedia = stream();
  const newMedia = stream();
  page.requests[0].resolve(oldMedia);
  await settle();
  page.window.dispatch('pagehide', { persisted: true });
  page.window.dispatch('pageshow', { persisted: true });
  page.requests[1].resolve(newMedia);
  await settle();
  page.play(1);
  await settle();
  page.playbacks[0].reject(namedError('AbortError'));
  await settle();
  assert.ok(oldMedia.track.stopCalls > 0);
  assert.equal(newMedia.track.stopCalls, 0);
  assert.equal(page.video.srcObject, newMedia);
  assert.equal(page.overlayHidden(), true);
});

test('leaving a running experience stops its camera and BFCache restoration requests again', async () => {
  const page = loadPage();
  const media = stream();
  page.requests[0].resolve(media);
  await settle();
  page.play();
  await settle();
  page.window.dispatch('pagehide', { persisted: true });
  assert.ok(media.track.stopCalls > 0);
  assert.equal(page.video.srcObject, null);
  page.window.dispatch('pageshow', { persisted: true });
  assert.equal(page.requests.length, 2);
  assert.equal(page.overlayHidden(), false);
});

test('an insecure page explains HTTPS without requesting a camera', async () => {
  const page = loadPage({ secure: false });
  await settle();
  assert.equal(page.requests.length, 0);
  assert.equal(page.overlayHidden(), false);
  assert.equal(page.elements['start-btn'].disabled, false);
  assert.match(page.elements['start-message'].textContent, /https|安全/i);
});

test('an unsupported browser keeps the recovery screen visible', async () => {
  const page = loadPage({ supported: false });
  await settle();
  assert.equal(page.requests.length, 0);
  assert.equal(page.overlayHidden(), false);
  assert.equal(page.elements['start-btn'].disabled, false);
  assert.match(page.elements['start-message'].textContent, /support|browser|支持|浏览器/i);
});

for (const [name, expected] of [
  ['NotFoundError', /no camera|not found|connect|没有|未找到|未检测|连接/i],
  ['NotReadableError', /busy|another|use|read|占用|读取|使用|关闭/i],
]) {
  test(`${name} shows an actionable error and restores retry`, async () => {
    const page = loadPage();
    page.requests[0].reject(namedError(name));
    await settle();
    assert.equal(page.overlayHidden(), false);
    assert.equal(page.elements['start-btn'].disabled, false);
    assert.match(page.elements['start-message'].textContent, expected);
  });
}
