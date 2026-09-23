'use strict';
document.querySelectorAll('[data-copy]').forEach(button => {
  button.addEventListener('click', async () => {
    const status = document.querySelector('.copy-status');
    try {
      await navigator.clipboard.writeText(button.dataset.copy);
      if (status) status.textContent = '邮箱已复制';
    } catch {
      if (status) status.textContent = '请长按或选中上方邮箱进行复制。';
    }
  });
});
document.querySelectorAll('[data-load-video]').forEach(button => {
  button.addEventListener('click', () => {
    const frame = button.closest('.video-frame');
    const iframe = document.createElement('iframe');
    iframe.src = 'https://player.vimeo.com/video/1170432048?title=0&byline=0&portrait=0';
    iframe.title = 'As Fables Go By 洋务运动 — 影片播放器';
    iframe.allow = 'fullscreen; picture-in-picture';
    iframe.allowFullscreen = true;
    frame.replaceChildren(iframe);
    iframe.focus();
  });
});

// Keep the Studio reading menu's native dialog and compact sticky header.
(() => {
  const header = document.querySelector('.site-header');
  const menu = document.querySelector('.reading-menu');
  const trigger = header?.querySelector('.menu-toggle');
  if (!header || !menu || !trigger) return;
  const close = menu.querySelector('.menu-close');
  document.documentElement.classList.add('js-ready');
  let scrollBeforeMenu = 0;
  let destination = null;
  let queued = false;
  const links = [...document.querySelectorAll('a[data-nav]')];
  const sections = [...document.querySelectorAll('[data-section]')];

  function syncHeader() {
    header.classList.toggle('is-scrolled', window.scrollY > 32);
    const height = header.getBoundingClientRect().height;
    document.documentElement.style.setProperty('--header-height', `${height}px`);
    let current = sections.length ? '' : 'projects';
    for (const section of sections) {
      if (section.getBoundingClientRect().top <= height + 40) current = section.dataset.section;
    }
    if (sections.length && window.scrollY > 100 && Math.ceil(window.scrollY + window.innerHeight) >= document.documentElement.scrollHeight - 3) current = sections.at(-1).dataset.section;
    for (const link of links) {
      if (new URL(link.href).hash === `#${current}`) link.setAttribute('aria-current', 'location');
      else link.removeAttribute('aria-current');
    }
    queued = false;
  }
  function scheduleSync() {
    if (!queued) { queued = true; requestAnimationFrame(syncHeader); }
  }
  trigger.addEventListener('click', () => {
    scrollBeforeMenu = window.scrollY;
    destination = null;
    menu.showModal();
    menu.querySelector('.menu-scroll').scrollTop = 0;
    document.documentElement.classList.add('menu-is-open');
    trigger.setAttribute('aria-expanded', 'true');
  });
  close.addEventListener('click', () => menu.close());
  menu.addEventListener('close', () => {
    document.documentElement.classList.remove('menu-is-open');
    trigger.setAttribute('aria-expanded', 'false');
    if (destination) {
      const { hash, target } = destination;
      if (location.hash !== hash) history.pushState(null, '', hash);
      target.setAttribute('tabindex', '-1');
      target.scrollIntoView({ block: 'start', behavior: 'instant' });
      target.focus({ preventScroll: true });
      destination = null;
    } else {
      window.scrollTo({ top: scrollBeforeMenu, behavior: 'instant' });
      trigger.focus({ preventScroll: true });
    }
    scheduleSync();
  });
  menu.addEventListener('click', event => {
    const link = event.target.closest('a[href]');
    if (!link || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const url = new URL(link.href);
    if (url.origin === location.origin && url.pathname === location.pathname && url.hash) {
      const target = document.getElementById(decodeURIComponent(url.hash.slice(1)));
      if (target) { event.preventDefault(); destination = { hash: url.hash, target }; }
    }
    menu.close();
  });
  window.addEventListener('scroll', scheduleSync, { passive: true });
  window.addEventListener('resize', scheduleSync, { passive: true });
  window.addEventListener('pageshow', scheduleSync);
  new ResizeObserver(scheduleSync).observe(header);
  syncHeader();
})();
