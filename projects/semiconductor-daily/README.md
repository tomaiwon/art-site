# Semiconductor Daily 半导体早报

2026-10 · 数字媒介本体系列 · 作者：黄熠

作品展示页，入口为 `/projects/semiconductor-daily/`。桌面 `work.html` 与手机 `work-digital.html`
的数字媒介本体系列均有入口，排在第一位；它接续原来的《Automatic 生长半导体》（已移入「测试」）。

## 展示范围

- 三个刊次的封面：早报（白底、石青色带）、午报（白底、金色带）、晚报（玄墨底、彩色图）。
- 一期完整早报：封面、三则新闻各一张图页加一张字页、声明页，共 8 页。
- 作品说明、六步工作流与来源说明，可键盘操作的放大图集（`gallery.js` 与 Automatic 页相同）。
- 图片为 1080×1350 WebP 展示副本，不含 EXIF、XMP 或内部稿件元数据；`assets-manifest.json`
  记录尺寸、页序、大小与 SHA-256。
- 展示的是一期示例：三则新闻取自 2026 年 10 月中旬的公开报道（格芯新闻稿、Tom's Hardware 公开部分、
  The Elec），文字经核对。它不是自动更新的页面，不连接本地工作台、Telegram 或任何接口。

## 来源与字体

- 报道来源与链接见页面「作品资料」。图片版权归原权利人，网页不另行授予图片再使用许可。
- 图内刊头匾额「洋務文工團」用 Oradano 明朝（CC0）；**图内刊名「半導體早報」用百家造字杜怀健行隶，
  属商业字体，正式发布前需取得商用授权。**
- 正文 `assets/text.woff2` 与列表 `fonts/Z-daily-label.woff2` 均由本站现有 `fonts/Z-news.woff2`
  提取字符子集，沿用其本站使用范围；英文复用 `fonts/E.ttf`，辅助文字复用已有 DM Mono（OFL）。

## 维护

无构建步骤或新增依赖。样式与看图脚本复制自 `projects/automatic/`，字体名改为 Daily*，
工作流改为六列。发布走 GitHub Pages 的 main 分支。
