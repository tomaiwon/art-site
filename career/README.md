# Yi Huang Studio — /career/

平行入口：`https://yihuang.art/career/`。原艺术网站（根目录各页面）不在本目录的修改范围内。

独立静态 HTML，无构建依赖。版式参考曹斐个人网站：入口只放名字和轮播图，进入后是图文并茂的中英双语 News。

## 页面

- `index.html`：入口。整屏作品图交叉淡入并缓慢推近，左下角名字，右下角中英图说与计数。点击任意处进入 `news.html`。
  轮播图列表在页面底部脚本的 `SLIDES` 数组里，图放 `assets/entry/`（长边 2000px webp）。当前 9 张为试选，待作者挑定。
- `news.html`：个人动态。12 栏网格图文左右交错，竖图/方图收窄，无图条目用大字排版；按展览 / 放映 / 摄影 / 新作筛选；
  编号 N° 与左右交错由脚本按可见条目自动生成；滚动进场动画，尊重减少动态效果偏好。
  新增条目：复制一个 `<li class="item">` 放到最上面，图放 `assets/news/`（长边 1600px webp）。

## 内容依据

条目来自 `files/cv-en.pdf` 的展览与放映记录、`work.html` 与 `projects/` 下已有作品页，以及作者补充：
Genius Cinema 放映的是《洋务运动》预告片；RCA CAP 中期展展出的是《Passing By》。

## 字体与素材

- 英文 / 数字沿用主站 `../fonts/E.ttf`、`../fonts/N.ttf`。
- 中文 `assets/Z-career.woff2` 是主站中文字体 `../fonts/Z-news.woff2` 的子集，只含这两页用到的字。
  改动中文后重新生成：
  `cat index.html news.html > /tmp/chars.txt && pyftsubset ../fonts/Z-news.woff2 --text-file=/tmp/chars.txt --flavor=woff2 --layout-features='*' --output-file=assets/Z-career.woff2`
- `assets/entry/`、`assets/news/` 的图片由原站 `images/` 下作品图与 `images/film-practice-2026/` 胶片图转成 webp，
  保留色彩配置，无 EXIF，未裁切或修图。`genius-cinema.webp` 为《洋务运动》封面（原 `images/yw1.png`）。

旧版求职作品集（案例页、样式、字体）已被本版替换，可在提交 `cb45be3` 中找回。

本地预览：仓库根目录运行 `python3 -m http.server 8765`，访问 `/career/`。
