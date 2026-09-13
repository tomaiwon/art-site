# NEWS 与沉思录 · 移动版测试

入口：WORK → 测试 → 工作室。

移动分类页为 `/work-test.html`；桌面访问分类页时回到 `/work.html#tests`，沿用网站现有的双端入口方式。样页路径为 `/projects/news-thoughts-mobile/`，菜单和页脚可返回测试分类。

纯静态 HTML/CSS/JavaScript，无构建或服务端依赖。沿用移动试刊 002 的整页排版、吸顶导航、全屏目录、背景滚动锁定和阅读位置恢复。该样页为设计测试，没有自动采集或发布功能。

阅读字体：西文标题、正文与斜体使用 Source Serif 4，中文使用思源宋体，英文菜单与辅助文字使用用户选定的 DM Mono Light（300），配套 Regular（400）和 Medium（500）。字体随本站托管，不依赖设备是否安装，也不依赖外部字体服务。

页头与目录使用用户定稿的 Studio Yi Huang 标志：松弛横向笔触、一笔朱红，搭配 Archivo 700（宽度轴 87.5）字标。两处共用 `assets/studio-yi-huang.svg`，文字已转曲，不需要加载额外字体；图形为嵌入位图。品牌名称在中英文模式中保持一致，返回选读的辅助标签随语言切换。标志尺寸随可用空间缩放，通过正片叠底融入纸色背景，外围画布已收紧；原有菜单和滚动逻辑保持。Archivo 许可证保存在 `assets/Archivo-OFL.txt`。

字体对照页：`font-reference/`。A 为 IBM Plex Mono Light，B 为 DM Mono Light，C 为 Inconsolata Light；使用相同文案、字号和字距，独立于阅读页的字体选择。

菜单从右侧滑入，关闭时向右收起；关闭按钮、Escape 和栏目跳转共用退出动画，保留焦点及阅读位置恢复。系统要求减少动态效果时直接开关。菜单、关闭、语言和方向箭头采用共用 SVG 符号，线条和尺寸统一。

菜单存档链接下方加入 Instagram、微信和邮箱的 SVG 图标，使用原站 `index.html` 已公开的工作室联系方式。Instagram 在新标签页打开 `@yihuang_art`；微信按钮展开／收起原有 `images/qrcode-wechat.jpg` 二维码，关闭目录时重置；邮箱使用 `mailto:yihuangart09@gmail.com`。图标点击区域为 44×44px，支持键盘焦点，微信展开状态通过 `aria-expanded` 标注。

栏目标题左侧保留两款人物原稿：见闻使用牵手人物，沉思录使用吹奏人物。两张原始 PNG 完整存放于 `assets/section-emblems/`，页面以 SVG 视框展示人物区域。它们作为小幅栏目插图，与页头的 Studio Yi Huang 标志分别使用。

页面右上角和目录内均有语言切换按钮。默认中文，英文模式涵盖正文、栏目、标题、图表、图片描述及辅助标签；选择保存在本站的 `yi-reading-language` 本地存储项中。浏览器不允许存储时仍可切换。`i18n.js` 保存英文文案，HTML 保存中文原文。外部原站和全文文档保留其原有语言。

Adobe 字体经过网页转换／字符子集处理，依照原许可证的保留字体名称要求，内部名称改为 `Yi Reading Serif` 与 `Yi Reading Song`；实际字形来自上述原字体。来源、版本与许可证见 `fonts/README.md`。更新 HTML、元数据、辅助标签或语言按钮的中文内容时，应重新生成中文字库子集并核对字符覆盖。

内容来源：

- 选读及视觉参考：[Works in Progress, The world’s most complex machine](https://worksinprogress.co/issue/the-worlds-most-complex-machine/)，Neil Hacker，2026-04-23。中文短导读为测试样页整理。
- 图片：[ASML High NA 洁净室照片](https://assets.worksinprogress.co/wp-content/uploads/2026/04/ASML_HighNA_cleanroom_Veldhoven_069-1-scaled.jpg)，页面署名 © ASML / WIP，用于相关文章选读与测试入口预览。
- 数据图：[IEA Energy and AI (2025)](https://www.iea.org/reports/energy-and-ai/executive-summary)。2024 年为估计，2030 年为基准情景预测，覆盖全部数据中心；图为自行重绘。
- NEWS 标题与沉思录正文来自 yihuang.art 原有公开栏目，保留来源、日期和全文链接。
