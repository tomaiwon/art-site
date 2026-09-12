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
  });
  closeButton.addEventListener("click", () => menu.close());
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
      menu.close();
    });
  }
  window.addEventListener("scroll", scheduleUpdate, { passive: true });
  window.addEventListener("resize", scheduleUpdate, { passive: true });
  window.addEventListener("pageshow", scheduleUpdate);
  new ResizeObserver(scheduleUpdate).observe(header);
  updateNavigation();
})();
