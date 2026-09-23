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
