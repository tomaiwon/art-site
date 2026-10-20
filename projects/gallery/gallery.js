"use strict";
// 作品图集:读 works.json 渲染图版;预览图放在仓库 previews/,原图放在 GitHub Release「gallery」。
(() => {
  const grid = document.querySelector("#plate-grid");
  const empty = document.querySelector("#plate-empty");
  const total = document.querySelector("#plate-total");

  const el = (tag, props = {}, children = []) => {
    const node = Object.assign(document.createElement(tag), props);
    node.append(...children);
    return node;
  };
  const formatBytes = (bytes) =>
    bytes >= 1e9 ? `${(bytes / 1e9).toFixed(2)} GB` : `${(bytes / 1e6).toFixed(1)} MB`;

  function plate(work, releaseBase, index) {
    const original = releaseBase + encodeURIComponent(work.file);
    const label = work.title_en ? `${work.title} ${work.title_en}` : work.title;
    const img = el("img", {
      src: work.thumb,
      alt: work.alt || work.title,
      width: work.thumb_width,
      height: work.thumb_height,
      loading: index < 3 ? "eager" : "lazy",
      decoding: "async",
    });
    const link = el("a", { className: "image-link", href: work.view }, [
      img,
      el("span", { className: "enlarge", textContent: "↗" }),
    ]);
    link.dataset.caption = work.year ? `${label} · ${work.year}` : label;
    link.dataset.original = original;
    link.setAttribute("aria-label", `放大查看「${work.title}」`);
    link.lastChild.setAttribute("aria-hidden", "true");

    const title = el("span", { className: "plate-title", textContent: work.title });
    if (work.title_en) title.append(el("span", { lang: "en", textContent: work.title_en }));
    const caption = el("figcaption", {}, [
      title,
      el("span", { className: "plate-year", textContent: work.year || "" }),
    ]);
    if (work.note) caption.append(el("p", { className: "plate-note", textContent: work.note }));
    const ext = work.file.split(".").pop().toUpperCase();
    const download = el("a", { className: "download", href: original, textContent: "下载原图 ↓" });
    download.setAttribute("download", work.file);
    download.setAttribute("aria-label", `下载「${work.title}」原图,${formatBytes(work.bytes)}`);
    caption.append(
      el("div", { className: "plate-file" }, [
        el("span", { textContent: `${work.width}×${work.height} · ${ext} · ${formatBytes(work.bytes)}` }),
        download,
      ]),
    );
    return el("figure", { className: "plate" }, [link, caption]);
  }

  async function render() {
    let data;
    try {
      const res = await fetch("works.json", { cache: "no-cache" });
      data = await res.json();
    } catch {
      data = { works: [] };
    }
    const works = data.works || [];
    grid.replaceChildren(...works.map((work, i) => plate(work, data.release, i)));
    empty.hidden = works.length > 0;
    total.textContent = works.length ? `${String(works.length).padStart(2, "0")} PLATES` : "";
    setupViewer();
  }

  function setupViewer() {
    const dialog = document.querySelector(".viewer");
    if (!dialog || typeof dialog.showModal !== "function") return;
    const image = document.querySelector("#viewer-image");
    const caption = document.querySelector("#viewer-caption");
    const count = document.querySelector("#viewer-count");
    const download = document.querySelector("#viewer-download");
    const prev = document.querySelector("#viewer-prev");
    const next = document.querySelector("#viewer-next");
    const close = document.querySelector("#viewer-close");
    const links = [...grid.querySelectorAll(".image-link")];
    let index = 0,
      opener;

    function show() {
      const link = links[index];
      image.src = link.href;
      image.alt = link.querySelector("img").alt;
      caption.textContent = link.dataset.caption;
      download.href = link.dataset.original;
      download.setAttribute("download", "");
      count.textContent = `${index + 1} / ${links.length}`;
      prev.disabled = index === 0;
      next.disabled = index === links.length - 1;
    }
    function step(delta) {
      const target = index + delta;
      if (target < 0 || target >= links.length) return;
      index = target;
      show();
    }
    links.forEach((link, i) =>
      link.addEventListener("click", (event) => {
        if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
        event.preventDefault();
        opener = link;
        index = i;
        show();
        document.body.classList.add("viewer-open");
        dialog.showModal();
        close.focus();
      }),
    );
    close.addEventListener("click", () => dialog.close());
    prev.addEventListener("click", () => step(-1));
    next.addEventListener("click", () => step(1));
    dialog.addEventListener("keydown", (event) => {
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        step(-1);
      }
      if (event.key === "ArrowRight") {
        event.preventDefault();
        step(1);
      }
    });
    dialog.addEventListener("close", () => {
      document.body.classList.remove("viewer-open");
      image.removeAttribute("src");
      opener?.focus({ preventScroll: true });
    });
  }

  render();
})();
