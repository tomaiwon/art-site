# Yi Huang 个人视觉作品集

平行入口：`https://yihuang.art/career/`。原艺术网站及其页面不在本目录的修改范围内。

独立静态 HTML 页面，沿用仓库的 GitHub Pages 发布方式，无构建依赖。

## 当前页面

- `index.html`：个人定位、三组精选作品、教育及工具实践、联系。作品画面和职责、产出放在一起；已完成作品与后续计划分开呈现。
- `as-fables-go-by.html`：24分钟独立影像，包含研究、拍摄与后期过程，按需加载既有 Vimeo 播放器。
- `remote-fantasy.html`：虚拟场景与交互案例，包含建筑模型及交互层级过程板，可打开原图查看。
- `ai-content-workflow.html`：个人 AI 辅助内容工作流与真实图文成品，清楚保留人工选题、审核和最终发布环节。
- `ai-video-workflow.html`：尚未完成的30–60秒视频制作计划，不与已完成项目并列。

## 视觉与交互

`style.css` 是独立的视觉作品集样式：系统无衬线字体、浅色背景、蓝色功能强调、图像与项目说明并排；手机端顺序堆叠。首页和案例页共用单层导航与页脚，不再载入沉思录的阅读样式、签名标志或宋体字体。

`site.js` 仅负责导航位置状态、邮箱复制反馈，以及点击后载入 Vimeo。普通链接在禁用 JavaScript 时仍可访问，影片外链常驻。支持键盘焦点、减少动态效果偏好及打印。

## 内容与素材依据

内容来自用户提供的《求职.docx》、原站履历与作品、已有东亚制造图文实践。项目时长、职责、教育与职业方向以求职文档为准。未添加效率、流量或商业项目指标。

- `assets/film-cover.png`：原站 `images/yw1.png`，`films.html`确认其为《洋务运动》封面，保持原画幅。
- `assets/as-fables-location.jpg`、`assets/as-fables-frame.jpg`：项目已有实地拍摄与影片画面。
- `assets/remote-fantasy.png`：原站 `images/no6.png`。作者、技术与项目内容见 `projects/remotefantasy.html`，2024年见 `work.html`。
- `../images/no15.png`：建筑模型迭代与交互层级过程板；`../images/no7.png`：虚拟场景细节。引用已有原站资源，不修改原图。
- `assets/editorial-output-007.jpg`：东亚制造第007期实际图文成品。产品照片来自原资料来源，保留署名，不能表述为作者摄影或AI生成。

旧版阅读样式和字体资源仍保存在目录中，但当前页面不再引用。相关授权文件随字体资源保留。作品旧档案入口标为“早期项目档案”，与求职文档确认的已完成状态区分。

本地预览：从仓库根目录运行 `python3 -m http.server 8765`，访问 `/career/`。发布前检查本地引用、图片尺寸、桌面与手机布局、复制邮箱、影片播放器、过程图入口，并确认修改只涉及 `career/`。
