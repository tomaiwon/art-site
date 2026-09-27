"use strict";
(() => {
  const dialog = document.querySelector(".viewer");
  if (!dialog || typeof dialog.showModal !== "function") return;
  const image = document.querySelector("#viewer-image");
  const caption = document.querySelector("#viewer-caption");
  const count = document.querySelector("#viewer-count");
  const prev = document.querySelector("#viewer-prev");
  const next = document.querySelector("#viewer-next");
  const close = document.querySelector("#viewer-close");
  const links = [...document.querySelectorAll("a[data-gallery]")];
  let group = [],
    index = 0,
    opener;

  function show() {
    const link = group[index];
    image.src = link.href;
    image.alt = link.querySelector("img").alt;
    caption.textContent = link.dataset.caption;
    count.textContent = `${index + 1} / ${group.length}`;
    prev.disabled = index === 0;
    next.disabled = index === group.length - 1;
  }
  links.forEach((link) =>
    link.addEventListener("click", (event) => {
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey)
        return;
      event.preventDefault();
      opener = link;
      group = links.filter(
        (item) => item.dataset.gallery === link.dataset.gallery,
      );
      index = group.indexOf(link);
      show();
      document.body.classList.add("viewer-open");
      dialog.showModal();
      close.focus();
    }),
  );
  close.addEventListener("click", () => dialog.close());
  prev.addEventListener("click", () => {
    if (index > 0) {
      index--;
      show();
    }
  });
  next.addEventListener("click", () => {
    if (index < group.length - 1) {
      index++;
      show();
    }
  });
  dialog.addEventListener("keydown", (event) => {
    if (event.key === "ArrowLeft" && index > 0) {
      event.preventDefault();
      index--;
      show();
    }
    if (event.key === "ArrowRight" && index < group.length - 1) {
      event.preventDefault();
      index++;
      show();
    }
  });
  dialog.addEventListener("close", () => {
    document.body.classList.remove("viewer-open");
    image.removeAttribute("src");
    opener?.focus({ preventScroll: true });
  });
})();
