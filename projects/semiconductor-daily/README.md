# Semiconductor Daily 半导体早午晚报

2026-10 · 数字媒介本体系列 · 作者：黄熠

作品页入口为 `/projects/semiconductor-daily/`。桌面 `work.html` 与手机 `work-digital.html` 的数字媒介本体系列均有入口。

## 现在的页面（2026-10-21 起）

`index.html` 是作品集《Semiconductor Daily》的网页版：一套东亚半导体新闻系统从手动挑选到零点击出刊的六周，
中英双语，15 章，28 页。它和 PDF 版同源，源文件与构建脚本在私有仓库 `tomaiwon/eam-pipeline` 的 `docs/portfolio/`
（`portfolio.html` → `build.py`），这里放的是生成结果，**不要在这里手改**，改源文件后重新生成再拷过来。

- `portfolio/`：网页版用到的图片、字体、样式，以及 PDF `YiHuang_SemiconductorDaily_Portfolio.pdf`（页首「PDF ↓」下载）。
- 字体：思源宋体子集（改名 Yi Portfolio Song）、Source Serif 4、IBM Plex Mono，均为 SIL OFL，许可文件在 `portfolio/fonts/`；
  页眉用本站的 Mom's Typewriter；「東亞製造」字标为王漢宗粗明體子集。
- 图表数据为 2026-10-21 16:20 的工作台快照。成品图里的新闻配图版权归原媒体与摄影者。

## 同目录里别的东西（不属于作品集页面）

- `live/`：实时监测台的静态版与离线快照，工作台每 30 分钟有变化才推一次（`live_snapshot.py`）。**不要动。**
- `issues/`：工作台每期自动推送的早午晚报数据，`news.html` 的「半导体早午晚报」栏读取它。**不要动。**
- `assets/`：旧版作品页的图片；`work-digital.html` 的缩略图和旧链接仍在用 `assets/cover-morning.webp`。
- `style.css`、`gallery.js`、`assets-manifest.json`：旧版作品页（单期示例 + 六步工作流）的样式、看图脚本与清单，
  现已不被 `index.html` 引用，留作旧版存档；旧版 `index.html` 可从 git 历史取回。
- 图内刊名「半導體早報」用百家造字杜怀健行隶，属商业字体，正式发布前需取得商用授权。
