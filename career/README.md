# Yi Huang Studio — /career/

平行入口：`https://yihuang.art/career/`。原艺术网站（根目录各页面）不在本目录的修改范围内。

独立静态 HTML，无构建依赖。版式参考曹斐个人网站：入口只放名字和轮播图，进入后是图文并茂的中英双语 News。

## 页面（照曹斐网站手机版排版）

- `index.html`：入口。整屏作品图交叉淡入轮播；左上角橙红色斜体衬线大字 "Yi / Huang"，左侧出血；右下角白色小字 ©。点击任意处进入 `news.html`。
  轮播图列表在页面底部脚本的 `SLIDES` 数组里，图放 `assets/entry/`（长边 2000px webp）。轮播图统一选暗调画面，保证每一张都能当封面、橙红名字始终清晰；第一张为威尼斯胶片金色人头。当前 9 张为试选，待作者挑定。
- `news.html`：照公众号消息页（NOWNESS 现在）的观看方式。
  顶部账号栏「YI HUANG 动态」+ 右侧人像图标（→ 关于）；内容为居中窄列（最宽 500px，两侧留白随窗口变宽，手机上两侧至少 22px）；
  每条为居中灰色日期（2026年6月；同一月份只显示一次，由脚本自动隐藏重复日期）→ 圆角卡片（图片叠白色 "YI HUANG" 字标与 exhibits / screens / photographs / presents，下方浅灰文字区：黑色标题 + 灰色副标题）；
  底部固定菜单栏：≡ 作品（子菜单：数字媒介本体系列 / 艺术史系列 / 过往实践 / 叙事影像 / 全部作品）、≡ 阅读（文章 / 每日简报）、关于、联系图标。
  新增条目：复制一个 `<li>`（时间戳 + 卡片）放到最上面，图放 `assets/news/`（长边 1600px webp）。

- `news-disc.html`：news 的 A24 光盘版（与 `news.html` 列表版并存），纯复刻 <https://a24.raviklaassens.com/>（Ravi Klaassens 的 A24 概念站）首页。
  2026-09 按原站脚本与样式重做：参数照抄原站（相机 FOV 40、距离 4.4；光盘组整体绕 X、Y 各转 -30°、缩放 1.08；
  盘沿弧线排开：第 m 张 x = sin(0.35m)·2.3·2.4，z = (1−cos(0.35m))·2.4，侧盘缩到 0.8；手机/平板改为横排下沉、正前方放大 1.5 倍，
  相邻盘刚好露出屏幕边缘；材质、灯光、环境反射、雾、拖动惯性与回弹弹簧、滚轮一次一张、悬停倾斜、划过推盘、按下下压、
  悬停或键盘选中时的手绘黑圈、进场飞入与点开时侧转缩走，全部按原站数值），代码为自写，未拷贝原站脚本。
  版式照原站：浅灰 #f2f2f2 底 + 颗粒；左上标题 + TYPE / DATE / VENUE 面板（对应 DIRECTED BY / YEAR / STARRING）；
  底部两条说明（对应影评，不加星级与引号）；桌面导航顶部居中、手机为底部白色停靠栏；Index 片单为白色下拉面板，当前条黑底；
  文字切换走原站的逐行遮罩（出 0.4s、进 0.7s，缓动 cubic-bezier(.32,.72,0,1)）；流式字号同原站（1920 宽 = 16px 基准）。
  盘面贴图由作品图自动生成：沿上缘一圈等宽小字（类型 · 地点 · 日期 · YI HUANG），底部为标题 + 斜体 "Yi Huang" 字标，
  亮底用橙红 #e4553b、暗底用白。点正前方的盘：有 Vimeo 视频的弹出预告片灯箱（黑幕从盘的位置展开；左上信息，右上 VIEW PROJECT / CLOSE，
  中间 TAP FOR SOUND，底部 PAUSE、时间、进度条、SOUND、音量、MAXIMIZE；Esc 关闭，空格暂停），没有视频的直接进作品页。
  操作：拖动 / 滚轮 / ← → / Home End / Enter 打开 / 空格翻面 / Index 跳转；`prefers-reduced-motion` 下不转、不飞、文字直接切换。
  依赖：Three.js 0.178、GSAP 3.13（均 jsDelivr）、Google Fonts（Instrument Serif、Inter、IBM Plex Mono，替代原站付费字体 PP Eiko、
  PP Neue Montreal、PP Museum）、Vimeo 播放器接口。数据在页面里的 `window.ITEMS` 数组，新增一条就在最前面加一项。

字体只用系统衬线（Times 系）与无衬线，不再加载子集字体。

## 内容依据

条目来自 `files/cv-en.pdf` 的展览与放映记录、`work.html` 与 `projects/` 下已有作品页，以及作者补充：
Genius Cinema 放映的是《洋务运动》预告片；RCA CAP 中期展展出的是《Passing By》。

## 素材

- `assets/entry/`、`assets/news/` 的图片由原站 `images/` 下作品图与 `images/film-practice-2026/` 胶片图转成 webp，
  保留色彩配置，无 EXIF，未裁切或修图。`genius-cinema.webp` 为《洋务运动》封面（原 `images/yw1.png`）。

旧版求职作品集（案例页、样式、字体）已被本版替换，可在提交 `cb45be3` 中找回。

本地预览：仓库根目录运行 `python3 -m http.server 8765`，访问 `/career/`。
