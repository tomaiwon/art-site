# Yi Huang Studio — /career/

平行入口：`https://yihuang.art/career/`。原艺术网站（根目录各页面）不在本目录的修改范围内。

独立静态 HTML，无构建依赖。版式参考曹斐个人网站：入口只放名字和轮播图，进入后是图文并茂的中英双语 News。

## 页面（照曹斐网站手机版排版）

- `index.html`：入口。整屏作品图交叉淡入轮播；左上角橙红色斜体衬线大字 "Yi / Huang"，左侧出血；右下角白色小字 ©。点击任意处进入 `news.html`。
  轮播图列表在页面底部脚本的 `SLIDES` 数组里，图放 `assets/entry/`（长边 2000px webp）。轮播图统一选暗调画面，保证每一张都能当封面、橙红名字始终清晰；第一张为威尼斯胶片金色人头。当前 9 张为试选，待作者挑定。
- `news.html`：NOWNESS 公众号式卡片流。浅灰底；左上角斜体小字标，右上角三道杠菜单（全屏斜体菜单：news / works / about / contact）；
  橙红色 "news"；每条为居中灰色日期 → 圆角卡片（图片叠白色 "YI HUANG" 字标与 exhibits / screens / photographs / presents 小字，下方浅灰文字区：黑色标题 + 灰色副标题）。
  新增条目：复制一个 `<li>`（时间戳 + 卡片）放到最上面，图放 `assets/news/`（长边 1600px webp）。

字体只用系统衬线（Times 系）与无衬线，不再加载子集字体。

## 内容依据

条目来自 `files/cv-en.pdf` 的展览与放映记录、`work.html` 与 `projects/` 下已有作品页，以及作者补充：
Genius Cinema 放映的是《洋务运动》预告片；RCA CAP 中期展展出的是《Passing By》。

## 素材

- `assets/entry/`、`assets/news/` 的图片由原站 `images/` 下作品图与 `images/film-practice-2026/` 胶片图转成 webp，
  保留色彩配置，无 EXIF，未裁切或修图。`genius-cinema.webp` 为《洋务运动》封面（原 `images/yw1.png`）。

旧版求职作品集（案例页、样式、字体）已被本版替换，可在提交 `cb45be3` 中找回。

本地预览：仓库根目录运行 `python3 -m http.server 8765`，访问 `/career/`。
