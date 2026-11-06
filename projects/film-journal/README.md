# Film Journal 胶片手记

2026 年的胶片做成一个可以“听”的照片集，五章：剑桥 / 马赛 / 阿尔勒 / 威尼斯 / 丙午年那座岛，284 张。
网址：`/projects/film-journal/`，在作品页「过往实践」和移动版首页都有入口。

## 照片从哪来

不复制照片，直接读网站里已有的 `images/film-practice-2026/<文件夹>/NNN-900.webp` 和 `NNN-2000.webp`。
`js/photos.gen.js` 存每张照片的尺寸和 5 色主色板，由下面的脚本生成：

```bash
python3 projects/film-journal/tools/build.py
```

照片有增减时重新跑一次。脚本需要 `opencv-python` 和 `numpy`。

## 本地预览

在网站根目录启动服务器，再打开 `http://localhost:8765/projects/film-journal/`：

```bash
python3 -m http.server 8765
```

不能直接双击 `index.html`：取色要读照片像素，必须走服务器。

## 改内容

文案、章节、配色、音色、图注都在 `js/content.js`：

- 新加一卷：在 `CHAPTERS` 里加一项。`folder` 填 `images/film-practice-2026/` 下的文件夹名，然后跑一次 `build.py`。
- 图注写在 `captions` 里，按照片编号对应。没写的照片显示「城市 · 第 N 格」。
- 首页拼贴放哪几张，由 `featured` 决定。

## 操作

- 首页：鼠标划过大字会把点推开；悬停照片，大字会变成章节名，并用这张照片的颜色上色；滚轮让整圈照片转动；点击进入章节。
- 章节页：滚轮横向浏览，`1–4` 切换风格（原图 / 油墨 / 网点 / 色块），`Esc` 回到照片集首页。
- 大图：`← →` 切换，滚轮调放大镜倍数，悬停色板会高亮这个颜色，点击色板复制色值，`Esc` 关闭。
- 声音全部由 Web Audio 实时合成，第一次点击页面后才会响。右上角 Sound 可以关闭。

## 文件

```
index.html          页面骨架
css/style.css       视觉系统
js/app.js           路由、首页、章节、大图
js/particles.js     粒子大字
js/styles.js        四种风格、色块擦除、点阵入场
js/sound.js         合成器与生成式 BGM
js/content.js       内容配置
js/photos.gen.js    自动生成，不要手改
tools/build.py      尺寸 + 色板提取
```
