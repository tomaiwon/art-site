# 交接：/career/ 改版（A24 光盘版 news 待纯复刻）

给本地 Claude Code 接手用。作者用中文沟通，回复请用中文。

## 1. 仓库与分支

- 仓库：`tomaiwon/art-site`（线上 `https://yihuang.art`，GitHub Pages 静态站，无构建步骤）
- 分支：`claude/personal-website-examples-1239ne`（尚未合并到 `main`，线上还看不到）
- 拉取：
  ```
  git fetch origin
  git checkout claude/personal-website-examples-1239ne
  ```
- 本地预览：仓库根目录 `python3 -m http.server 8765`，打开 `http://localhost:8765/career/`
- 改动范围只限 `career/`。根目录主站各页面（`index.html`、`news.html`、`work.html` 等）、`fetch_news.py`、`.github/` 都不要动。

## 2. 当前页面

| 文件 | 状态 | 说明 |
|---|---|---|
| `career/index.html` | 作者认可 | 入口：整屏暗调作品图轮播，左上橙红斜体大字 "Yi / Huang"（照曹斐网站手机版），点任意处进入 `news.html`。轮播图 9 张为试选，作者之后会挑。 |
| `career/news.html` | 保留，不要删 | 列表版 news：公众号（NOWNESS）卡片流，顶部账号栏 + 底部菜单栏，同月日期只显示一次。 |
| `career/news-disc.html` | **待重做** | A24 光盘版 news，本次交接的任务。 |
| `career/README.md` | 说明文档 | 各页面、素材来源、字体说明。改完页面要同步更新。 |
| `career/assets/entry/` | 素材 | 入口轮播图（长边 2000px webp）。 |
| `career/assets/news/` | 素材 | 每条动态的配图（长边 1600px webp）。 |

## 3. 任务：把 `news-disc.html` 做成 A24 概念站的纯复刻

参考站：<https://a24.raviklaassens.com/>（Ravi Klaassens 的 A24 非商业概念站，Astro + Three.js r178 + GSAP + Barba.js + Lenis）。

作者的要求是**纯复刻**，不是"参考思路"：光盘的视角、排布、镜头、转场、尺寸、字体、节奏都照原站，只把内容换成作者的动态。

作者对现版的反馈：交互细节还可以（胶囊导航、Index 下拉片单、遮罩文字切换、信息面板、预告片灯箱、颗粒），但**光盘的视角不对**。现版是 11 张盘排成一圈、正前方一张面向镜头的"转盘"，这是云端环境打不开原站时推断出来的，不是原站的样子。

### 云端这边做不到的原因

云端环境的网络策略拦截了 `a24.raviklaassens.com`、`raviklaassens.b-cdn.net`、`cdn.jsdelivr.net` 等域名，只拿到作者用浏览器"另存为"的首页 HTML（没有 `_files` 文件夹，缺样式表和脚本）。本地网络可以直接访问，应该从原站本身取证。

### 建议做法

1. 用浏览器（Playwright / Chromium）打开原站，桌面 1440×900 和手机 430×932 各截图、录屏：首屏、拖动 / 滚动切换光盘的全过程、打开 Index、点进详情页、预告片灯箱。先看清楚光盘的镜头视角和排布再动手。
2. 读原站的样式和脚本，找光盘场景的写法（相机位置与 FOV、光盘排布与朝向、切换时的动画曲线和时长、材质与灯光、盘面贴图 `disc.webp` 的样式）：
   - 页面 CSS：`/_astro/ExportPage.*.css`
   - 页面脚本：`/_astro/ExportPage.astro_astro_type_script_index_0_lang.*.js`，以及它引用的 `/_astro/*.js` 模块（`three.module.*.js`、`RectAreaLightUniformsLib.*.js` 等）
   - 盘面贴图示例：`https://raviklaassens.b-cdn.net/a24/films/<slug>/disc.webp?v=7`
3. 按原站重写 `news-disc.html` 的 3D 部分（视角、排布、动效），页面其余结构对齐原站的 CSS。
4. 桌面和手机都截图，和原站并排对比，确认一致后再提交。

### 已知的原站首页结构（来自作者保存的 HTML）

- `nav.nav.theme-dark`：居中导航，`A24 logo / Films / Television / Index 12 ▾`。Index 按钮悬停时文字 "Index" 与数字 "12" 上下切换；下拉 `.nav-dropdown` 列出片名 + 年份，行背景从底部 `scaleY(0→1)` 展开，年份从下方滑入；`.nav-page-dot` 标当前页；加载时显示 "Projecting" + 转圈。
- `section#section_hero[data-disc-gallery]`：
  - `.experience_info`：片名（`heading-s`）+ 三个 `.info-content_panel`（上方分隔线，左标签右内容）：DIRECTED BY / YEAR / STARRING。
  - `.testimonial_wrap`：两条影评，星级 + 媒体名（`subheading-xs`）+ 两行引语（`heading-xs`，居中）。
  - `[data-disc-mask]`：文字切换用的遮罩。
  - `[data-disc-canvas] canvas[data-engine="three.js r178"]`：光盘画布，全屏、`pointer-events:none`（交互在别处接）。
  - `[data-film-list]`：隐藏的数据列表，字段有 title、directors、year、starring、disc-art-url、detail-url、review-publication / testimonial / stars。
  - 读屏文字："Tony, 3 of 12"；"Use the left and right arrow keys to browse films…"
- `[data-trailer-lightbox]`：预告片灯箱，上下两条 `strip`，控件：TAP FOR SOUND、CLOSE、PAUSE、时间、进度条、SOUND + 音量、MAXIMIZE。
- `.grain[data-grain-animate]`：动态颗粒。`.transition__dark`：页面转场遮罩。
- 字体：`PPNeueMontreal-Medium.woff2`、`PPEiko-Regular.woff2`。这两款是付费字体，不能直接拷贝使用；现版用 Google Fonts 的 Inter 和 Instrument Serif 替代。若作者购买授权，可换回。

## 4. 内容映射（保持不变）

数据在 `news-disc.html` 里的 `window.ITEMS` 数组，11 条，最新在前：

| 原站字段 | 作者内容 |
|---|---|
| 片名 | `title`（主标题，中英不一）+ `alt`（副标题） |
| DIRECTED BY | TYPE 类型（Exhibition 展览 / Screening 放映 / Photography 摄影 …） |
| YEAR | DATE 日期（只到月份，如 2026.06） |
| STARRING | VENUE 地点（多行） |
| 影评 × 2 | `notes`：一条英文、一条中文说明。不要编造星级评分和媒体评价。 |
| disc.webp | 用 `img` 作品图生成盘面（现版在 canvas 上把图裁成圆并印弧形文字；如原站盘面样式不同，照原站改） |
| 预告片 | `vimeo` 字段（有视频的 5 条），没有视频的点击直接进 `href` 作品页 |

内容来源和事实核对见 `README.md` 的"内容依据"。不要新增未经作者确认的事实（奖项、合作者、中英文标题等）。

## 5. 作者偏好（这次改版过程中确认过的）

- 要"炫酷一点、装一点"，但每次提参考都要求**照着抄准**，不要自由发挥；看不到参考时先要截图 / 录屏，不要凭记忆硬做。
- 主要在手机上看，手机版优先，电脑版也要成立。
- 名字写 "Yi Huang"；主色是入口页的橙红 `#e4553b`。
- 中英双语。
- 贴参考链接时要给完整可点的 URL。
- 列表版 `news.html` 保留，新版本另开文件。

## 6. 验收与收尾

- 桌面 + 手机截图与原站并排对比，视角、排布、动效一致。
- 浏览器控制台无报错；拖动、滚轮、方向键、Index、灯箱都能用；`prefers-reduced-motion` 下不转。
- 同步更新 `career/README.md` 里 `news-disc.html` 的说明。
- 提交到 `claude/personal-website-examples-1239ne` 并推送。作者确认后再开 PR 合并到 `main` 上线（上线地址 `https://yihuang.art/career/`）。
- 若决定让入口页进入光盘版，把 `career/index.html` 里 `href="news.html"` 改成 `news-disc.html`（先问作者）。
