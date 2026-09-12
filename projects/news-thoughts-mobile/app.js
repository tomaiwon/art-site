(() => {
  const header = document.querySelector(".site-header");
  const menu = document.querySelector(".reading-menu");
  const menuButton = document.querySelector(".site-header .menu-toggle");
  const closeButton = menu.querySelector(".menu-close");
  const navLinks = [...document.querySelectorAll("a[data-nav]")];
  const sections = [...document.querySelectorAll("[data-section]")];
  let queued = false;
  let returnScrollY = 0;
  let destination = null;
  let menuAnimation = null;
  let closing = false;
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

  function animateMenu(from, to, duration) {
    if (reducedMotion.matches || typeof menu.animate !== "function") return null;
    const animation = menu.animate(
      [{ transform: from }, { transform: to }],
      { duration, easing: "cubic-bezier(.22, 1, .36, 1)", fill: "forwards" },
    );
    // Cancellation is expected when closing before the entrance has finished.
    animation.finished.catch(() => {});
    menuAnimation = animation;
    return animation;
  }

  function closeMenu() {
    if (!menu.open || closing) return;
    closing = true;
    const from = getComputedStyle(menu).transform;
    menuAnimation?.cancel();
    menuAnimation = null;
    const animation = animateMenu(from, "translateX(100%)", 240);
    if (animation) {
      const finish = () => {
        if (menuAnimation === animation && closing) menu.close();
      };
      animation.finished.then(finish, finish);
    } else menu.close();
  }

  function updateNavigation() {
    header.classList.toggle("is-scrolled", window.scrollY > 32);
    const height = header.getBoundingClientRect().height;
    document.documentElement.style.setProperty(
      "--header-height",
      `${height}px`,
    );
    if (menu.open) {
      menu.style.setProperty(
        "--menu-masthead-height",
        `${header.querySelector(".masthead").getBoundingClientRect().height}px`,
      );
    }
    let current = "top";
    for (const section of sections) {
      if (section.getBoundingClientRect().top <= height + 36)
        current = section.dataset.section;
    }
    const atBottom =
      window.scrollY > 100 &&
      Math.ceil(window.scrollY + window.innerHeight) >=
        document.documentElement.scrollHeight - 3;
    if (atBottom) current = sections[sections.length - 1].dataset.section;
    for (const link of navLinks) {
      if (link.getAttribute("href") === `#${current}`)
        link.setAttribute("aria-current", "location");
      else link.removeAttribute("aria-current");
    }
    queued = false;
  }
  function scheduleUpdate() {
    if (!queued) {
      queued = true;
      requestAnimationFrame(updateNavigation);
    }
  }
  menuButton.addEventListener("click", () => {
    if (menu.open || closing) return;
    returnScrollY = window.scrollY;
    destination = null;
    menu.style.setProperty(
      "--menu-masthead-height",
      `${header.querySelector(".masthead").getBoundingClientRect().height}px`,
    );
    menu.showModal();
    menu.querySelector(".menu-scroll").scrollTop = 0;
    document.documentElement.classList.add("menu-is-open");
    menuButton.setAttribute("aria-expanded", "true");
    const animation = animateMenu("translateX(100%)", "translateX(0)", 320);
    animation?.finished.then(() => {
      if (menuAnimation !== animation || closing) return;
      animation.cancel();
      menuAnimation = null;
    }, () => {});
  });
  closeButton.addEventListener("click", closeMenu);
  menu.addEventListener("cancel", (event) => {
    event.preventDefault();
    closeMenu();
  });
  menu.addEventListener("keydown", (event) => {
    if (event.key !== "Tab") return;
    const focusable = [...menu.querySelectorAll("a[href], button")];
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  });
  menu.addEventListener("close", () => {
    closing = false;
    menuAnimation?.cancel();
    menuAnimation = null;
    document.documentElement.classList.remove("menu-is-open");
    menuButton.setAttribute("aria-expanded", "false");
    if (destination) {
      const { target, hash } = destination;
      destination = null;
      if (window.location.hash !== hash) history.pushState(null, "", hash);
      target.setAttribute("tabindex", "-1");
      target.scrollIntoView({ block: "start", behavior: "auto" });
      target.focus({ preventScroll: true });
    } else {
      window.scrollTo({ top: returnScrollY, behavior: "auto" });
      menuButton.focus({ preventScroll: true });
    }
    scheduleUpdate();
  });
  for (const link of menu.querySelectorAll("a")) {
    link.addEventListener("click", (event) => {
      if (closing) {
        event.preventDefault();
        return;
      }
      if (
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      )
        return;
      const hash = link.getAttribute("href");
      if (hash.startsWith("#")) {
        const target = document.querySelector(hash);
        if (!target) return;
        event.preventDefault();
        destination = { target, hash };
      }
      closeMenu();
    });
  }
  window.addEventListener("scroll", scheduleUpdate, { passive: true });
  window.addEventListener("resize", scheduleUpdate, { passive: true });
  window.addEventListener("pageshow", scheduleUpdate);
  document.addEventListener("reading:languagechange", scheduleUpdate);
  new ResizeObserver(scheduleUpdate).observe(header);
  updateNavigation();
})();
