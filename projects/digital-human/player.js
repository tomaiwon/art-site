(() => {
  'use strict';

  function initializePlayer() {
    const byId = (id) => document.getElementById(id);
    const film = byId('film');
    const original = byId('original');
    const stage = byId('portrait-stage');
    const motionTab = byId('motion-tab');
    const originalTab = byId('original-tab');
    const primary = byId('primary-play');
    const primaryLabel = byId('primary-label');
    const transport = byId('transport-play');
    const seek = byId('seek');
    const elapsed = byId('elapsed');
    const duration = byId('duration');
    const mute = byId('mute');
    const status = byId('status');
    const controls = byId('player-controls');
    if (![film, original, stage, motionTab, originalTab, primary, primaryLabel,
      transport, seek, elapsed, duration, mute, status, controls].every(Boolean)) return;

    const idleMessage = status.textContent.trim() || '点击播放，才会发出声音。';
    const idleLabel = primaryLabel.textContent.trim() || '播放短片';
    let view = 'motion';
    let playback = 'idle';
    let wantsPlayback = false;
    let command = 0;
    let pageSuspended = false;
    let metadataReady = film.readyState >= 1;
    let hasPlayed = false;
    let mediaDuration = Number(seek.max) || 3.28;
    let scrubbing = false;
    let pointerScrubbing = false;
    let resumeAfterScrub = false;
    let scrubTime = 0;

    const clamp = (value) => Math.max(0, Math.min(mediaDuration, Number(value) || 0));
    const canPlayHere = () => view === 'motion' && !document.hidden && !pageSuspended;
    const timeText = (value) => {
      const whole = Math.max(0, Math.floor(Number(value) || 0));
      return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, '0')}`;
    };

    function announce(message) {
      // Time updates never enter this live region.
      if (status.textContent !== message) status.textContent = message;
    }

    function paintButtons() {
      document.body.dataset.view = view;
      document.body.dataset.playback = playback;
      const label = view === 'original' ? '播放动态'
        : playback === 'loading' ? '取消加载'
          : playback === 'playing' ? '暂停播放'
            : playback === 'ended' ? '再看一次'
              : playback === 'error' ? '重新播放'
                : playback === 'paused' ? '继续播放' : idleLabel;
      primaryLabel.textContent = label;
      primary.setAttribute('aria-label', label);
      transport.setAttribute('aria-label', label);
      transport.title = label;
      seek.disabled = !metadataReady || view === 'original';
      stage.setAttribute('aria-busy', String(view === 'motion' && playback === 'loading'));
    }

    function setPlayback(next, message) {
      playback = next;
      paintButtons();
      if (view === 'original') announce('正在查看原稿，动态已暂停。');
      else if (message) announce(message);
    }

    function updateTime(previewTime) {
      const value = clamp(previewTime === undefined ? film.currentTime : previewTime);
      elapsed.textContent = timeText(value);
      duration.textContent = timeText(mediaDuration);
      seek.max = String(mediaDuration);
      seek.value = String(value);
      seek.setAttribute('aria-valuetext', `${value.toFixed(2)} 秒，共 ${mediaDuration.toFixed(2)} 秒`);
    }

    function updateMetadata() {
      if (Number.isFinite(film.duration) && film.duration > 0) mediaDuration = film.duration;
      metadataReady = film.readyState >= 1;
      paintButtons();
      if (!scrubbing) updateTime();
    }

    function cancelPlayback(message) {
      command += 1;
      wantsPlayback = false;
      scrubbing = false;
      pointerScrubbing = false;
      resumeAfterScrub = false;
      film.pause();
      if (playback !== 'error' && playback !== 'ended') {
        const next = hasPlayed || film.currentTime > 0 || playback !== 'idle' ? 'paused' : 'idle';
        setPlayback(next, message || (next === 'idle' ? idleMessage : '已暂停。'));
      } else paintButtons();
      updateTime();
    }

    function selectView(next) {
      if (next === 'original') cancelPlayback();
      view = next;
      film.hidden = next === 'original';
      original.hidden = next !== 'original';
      motionTab.setAttribute('aria-pressed', String(next === 'motion'));
      originalTab.setAttribute('aria-pressed', String(next === 'original'));
      paintButtons();
      if (next === 'original') announce('正在查看原稿，动态已暂停。');
      else if (playback === 'error') announce('短片暂时无法播放，请点击重试。');
      else if (playback === 'ended') announce('播放完毕，可以再看一次。');
      else if (playback === 'paused') announce('已暂停，点击继续播放。');
      else if (playback === 'idle') announce(idleMessage);
    }

    function failPlayback(message) {
      command += 1;
      wantsPlayback = false;
      scrubbing = false;
      pointerScrubbing = false;
      resumeAfterScrub = false;
      playback = 'error';
      film.pause();
      setPlayback('error', message);
    }

    function requestPlayback({ restartIfEnded = true } = {}) {
      if (!canPlayHere()) return;
      const request = ++command;
      wantsPlayback = true;
      setPlayback('loading', '正在加载短片…');
      try {
        // load() is reserved for an explicit retry after a media error.
        if (film.error) {
          metadataReady = false;
          film.load();
          paintButtons();
        } else if (restartIfEnded && (film.ended || film.currentTime >= mediaDuration - 0.01)) {
          film.currentTime = 0;
          updateTime();
        }
        Promise.resolve(film.play()).then(() => {
          // An old request must never pause a newer, valid play request.
          if (request !== command) {
            if (!wantsPlayback || !canPlayHere()) film.pause();
            return;
          }
          if (!wantsPlayback || !canPlayHere()) film.pause();
          // Only the media's `playing` event marks actual playback.
        }).catch((error) => {
          if (request !== command || !wantsPlayback || !canPlayHere()) return;
          failPlayback(error && error.name === 'NotAllowedError'
            ? '浏览器未开始播放，请再次点击播放。'
            : '短片暂时无法播放，请点击重试。');
        });
      } catch (_error) {
        if (request === command) failPlayback('短片暂时无法播放，请点击重试。');
      }
    }

    function togglePlayback() {
      if (view === 'original') {
        selectView('motion');
        requestPlayback();
      } else if (wantsPlayback) cancelPlayback('已暂停。');
      else requestPlayback();
    }

    function beginScrub() {
      if (seek.disabled || scrubbing) return;
      resumeAfterScrub = wantsPlayback || !film.paused;
      scrubTime = clamp(seek.value);
      scrubbing = true;
      command += 1;
      wantsPlayback = false;
      film.pause();
      setPlayback('paused', '正在调整进度…');
    }

    function finishScrub() {
      if (!scrubbing) return;
      const resume = resumeAfterScrub && canPlayHere();
      scrubbing = false;
      pointerScrubbing = false;
      resumeAfterScrub = false;
      try {
        film.currentTime = scrubTime;
        updateTime(scrubTime);
        // Native play() at the end can restart automatically, even without an
        // explicit currentTime reset. Finishing a seek must not trigger replay.
        if (scrubTime >= mediaDuration - 0.005) setPlayback('ended', '播放完毕，可以再看一次。');
        else if (resume) requestPlayback({ restartIfEnded: false });
        else setPlayback('paused', '已暂停。');
      } catch (_error) {
        failPlayback('暂时无法定位，请点击播放后重试。');
      }
    }

    primary.addEventListener('click', togglePlayback);
    transport.addEventListener('click', togglePlayback);
    motionTab.addEventListener('click', () => selectView('motion'));
    originalTab.addEventListener('click', () => selectView('original'));
    seek.addEventListener('pointerdown', (event) => {
      if (event.button !== 0 || seek.disabled) return;
      beginScrub();
      pointerScrubbing = true;
    });
    seek.addEventListener('keydown', (event) => {
      if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End', 'PageUp', 'PageDown'].includes(event.key)) beginScrub();
    });
    seek.addEventListener('keyup', (event) => {
      // A range already at its boundary emits no input/change for that key.
      if (!pointerScrubbing && ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End', 'PageUp', 'PageDown'].includes(event.key)) finishScrub();
    });
    seek.addEventListener('input', () => {
      beginScrub();
      if (!scrubbing) return;
      scrubTime = clamp(seek.value);
      updateTime(scrubTime);
    });
    seek.addEventListener('change', finishScrub);
    seek.addEventListener('blur', finishScrub);
    window.addEventListener('pointerup', () => { if (pointerScrubbing) finishScrub(); });
    window.addEventListener('pointercancel', () => { if (pointerScrubbing) finishScrub(); });

    function updateMute() {
      const muted = film.muted || film.volume === 0;
      mute.setAttribute('aria-pressed', String(muted));
      mute.setAttribute('aria-label', muted ? '开启声音' : '静音');
      mute.title = muted ? '开启声音' : '静音';
      document.body.dataset.muted = String(muted);
    }
    mute.addEventListener('click', () => {
      if (film.muted || film.volume === 0) {
        film.muted = false;
        if (film.volume === 0) film.volume = 1;
      } else film.muted = true;
      updateMute();
    });
    film.addEventListener('volumechange', updateMute);
    film.addEventListener('loadedmetadata', updateMetadata);
    film.addEventListener('durationchange', updateMetadata);
    film.addEventListener('emptied', () => {
      metadataReady = false;
      paintButtons();
    });
    film.addEventListener('timeupdate', () => { if (!scrubbing) updateTime(); });
    film.addEventListener('play', () => {
      if (!wantsPlayback || !canPlayHere()) film.pause();
      else setPlayback('loading', '正在开始播放…');
    });
    film.addEventListener('playing', () => {
      if (!wantsPlayback || !canPlayHere()) {
        film.pause();
        return;
      }
      hasPlayed = true;
      setPlayback('playing', '正在播放。');
    });
    film.addEventListener('waiting', () => {
      if (wantsPlayback && canPlayHere()) setPlayback('loading', '正在缓冲…');
    });
    film.addEventListener('stalled', () => {
      if (wantsPlayback && canPlayHere() && film.readyState < 3) setPlayback('loading', '正在缓冲…');
    });
    film.addEventListener('seeking', () => {
      if (view !== 'motion' || scrubbing || playback === 'error') return;
      // Seeking events arrive after finishScrub. A completed seek to the end
      // must keep its replay state instead of reverting to a generic pause.
      if (!wantsPlayback && film.currentTime >= mediaDuration - 0.005) {
        setPlayback('ended', '播放完毕，可以再看一次。');
        return;
      }
      setPlayback(wantsPlayback ? 'loading' : 'paused', '正在定位…');
    });
    film.addEventListener('seeked', () => {
      if (!scrubbing) updateTime();
      if (!wantsPlayback && !scrubbing && view === 'motion' && playback !== 'error') {
        const atEnd = film.currentTime >= mediaDuration - 0.005;
        setPlayback(atEnd ? 'ended' : 'paused', atEnd ? '播放完毕，可以再看一次。' : '已暂停。');
      }
    });
    film.addEventListener('pause', () => {
      if (scrubbing || film.ended || !film.paused || playback === 'error' || playback === 'ended') return;
      // A queued pause event from an older operation is ignored if play resumed.
      if (wantsPlayback) {
        wantsPlayback = false;
        command += 1;
      }
      const next = hasPlayed || film.currentTime > 0 || playback !== 'idle' ? 'paused' : 'idle';
      setPlayback(next, next === 'idle' ? idleMessage : '已暂停。');
    });
    film.addEventListener('ended', () => {
      command += 1;
      wantsPlayback = false;
      resumeAfterScrub = false;
      setPlayback('ended', '播放完毕，可以再看一次。');
      updateTime();
    });
    film.addEventListener('error', () => failPlayback('短片加载失败，请点击重试。'));
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) cancelPlayback('已暂停。');
    });
    window.addEventListener('pagehide', () => {
      pageSuspended = true;
      cancelPlayback('已暂停。');
    });
    window.addEventListener('pageshow', () => { pageSuspended = false; });

    // Enable custom controls only after every required element and handler exists.
    film.controls = false;
    film.removeAttribute('controls');
    controls.hidden = false;
    selectView('motion');
    updateMetadata();
    updateMute();
    if (film.error) failPlayback('短片加载失败，请点击重试。');
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initializePlayer, { once: true });
  else initializePlayer();
})();
