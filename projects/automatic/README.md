# AUTOMATIC 生长半导体

2026-09-28 · 数字媒介本体系列 · 作者：黄熠

本目录是作品展示页，入口为 `/projects/automatic/`。桌面 `work.html` 与
手机 `work-digital.html` 的数字媒介本体系列均有入口。现有系列项目保持原样。

## 展示范围

- 三张历史封面：No.013、No.007、No.064。
- 一套完整作品：No.007，依次为封面、两张产品图内页、声明页。
- 创作方法、编辑流程、来源说明与可键盘操作的放大图集。
- 图片为成品的 1080×1350 WebP 展示副本，保留原图内的文字、署名及期号。
  图片文件不含原 PNG 的隐藏文字、EXIF、XMP 或内部稿件元数据。
- 这是固定作品选集，不随本地工作台或新闻流自动更新；新增作品需另行选择并发布。

作品页不包含新闻后台、写稿或发布接口，不连接本地工作台，也不上传内部研判、
草稿、模型设置、账号资料、文章全文或整份归档。页面介绍的是制作方法，图中标题
作为历史作品的一部分保留，不代表此页面重新核验或更新了相关报道。

## 来源与字体

No.007 报道来源为 EE Times Asia，产品图片来自 Alif Semiconductor 的
[Balletto B1 StartKit](https://alifsemi.com/support/kits/balletto-b1startkit/) 与
[Ensemble E1C StartKit](https://alifsemi.com/support/kits/ensemble-e1cstartkit/)
官方产品资料。No.013 报道来源为 DigiTimes；No.064 为 The Elec。各期报道链接
在页面资料区保留，图片版权归原权利人，网页没有另行授予图片再使用许可。

正文 `assets/text.woff2` 和列表 `fonts/Z-automatic-label.woff2` 均由本站现有
`fonts/Z-news.woff2` 提取字符子集，沿用其已确认的本网站字体使用范围，不授予
字体再分发许可。英文复用本站 `fonts/E.ttf`；辅助文字复用已有 DM Mono 及其
既存 OFL 许可。没有复制本地工作台的字体文件。

## 维护与验证

无构建步骤或新增依赖。发布走原 GitHub Pages 的 main 分支。

`assets-manifest.json` 记录六个展示图片的尺寸、期号、页序、大小和 SHA-256。
更新时只导出选定的图片像素，并重新检查来源、文字、字体覆盖、图片清单与两端入口。
不要用复制整个归档目录的方式更新。

本轮验证：本地资源链接、图片清单/哈希、图片元数据清理、中文字符覆盖、原列表
内容保留、JavaScript 语法和 diff 检查通过。实际浏览器完成桌面排版、388 CSS px
窄屏无横向溢出、两处图集放大、翻页、Escape 关闭和焦点恢复；无脚本错误。
窄屏测试是桌面浏览器模拟，不代表所有手机型号的实机验收。

不开启 JavaScript 时，介绍与图片仍可浏览，图片链接直接打开展示图。
