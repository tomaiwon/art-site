'use strict';
// Native links keep navigation and case pages usable without JavaScript.
document.querySelectorAll('[data-copy]').forEach(button => {
  button.addEventListener('click', async () => {
    const status = document.querySelector('.copy-status');
    try {
      await navigator.clipboard.writeText(button.dataset.copy);
      if (status) status.textContent = '邮箱已复制';
    } catch {
      if (status) status.textContent = '请选中上方邮箱进行复制。';
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
(() => {
  const sections = [...document.querySelectorAll('[data-section]')];
  const links = [...document.querySelectorAll('[data-nav]')];
  if (!sections.length) {
    const works = links.find(link => link.dataset.nav === 'projects');
    works?.setAttribute('aria-current', 'page');
    return;
  }
  let queued = false;
  function sync() {
    let current = '';
    const threshold = (document.querySelector('.site-header')?.offsetHeight || 76) + 60;
    sections.forEach(section => {
      if (section.getBoundingClientRect().top <= threshold) current = section.dataset.section;
    });
    if (window.scrollY > 100 && window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4) current = 'contact';
    links.forEach(link => {
      if (link.dataset.nav === current) link.setAttribute('aria-current', 'location');
      else link.removeAttribute('aria-current');
    });
    queued = false;
  }
  function schedule() { if (!queued) { queued = true; requestAnimationFrame(sync); } }
  window.addEventListener('scroll', schedule, {passive:true});
  window.addEventListener('resize', schedule);
  window.addEventListener('pageshow', schedule);
  sync();
})();
