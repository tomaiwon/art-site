(() => {
  const vase = document.querySelector('[data-home-vase]');
  const toggle = vase.querySelector('.home-vase__toggle');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const turn = new Image();
  turn.alt = '';
  turn.hidden = true;
  vase.querySelector('.home-vase__drift').append(turn);
  let visible = !('IntersectionObserver' in window);
  let paused = false;
  let floating = false;

  function updateMotion() {
    toggle.hidden = reducedMotion.matches;
    const shouldFloat = visible && !document.hidden && !reducedMotion.matches && !paused;
    if (shouldFloat === floating) return;

    floating = shouldFloat;
    vase.classList.toggle('is-floating', floating);

    if (floating) {
      turn.src = vase.dataset.turnSrc;
    } else {
      turn.hidden = true;
      vase.classList.remove('is-turning');
      turn.removeAttribute('src');
    }
  }

  turn.addEventListener('load', () => {
    if (!floating) return;
    turn.hidden = false;
    vase.classList.add('is-turning');
  });

  toggle.addEventListener('click', () => {
    paused = !paused;
    toggle.setAttribute('aria-pressed', String(paused));
    updateMotion();
  });

  if (!visible) {
    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      updateMotion();
    });
    observer.observe(vase);
  }

  document.addEventListener('visibilitychange', updateMotion);
  reducedMotion.addEventListener('change', updateMotion);
  updateMotion();
})();
