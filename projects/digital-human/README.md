# 数字人

黄熠工作室的动态肖像实验。入口：WORK → 测试 → 数字人。

静态页面可直接由 GitHub Pages 提供，无需后端。`assets/intro.mp4` 为 3.28 秒、25 fps 的 H.264/AAC 视频；`assets/portrait.png` 为经本人选定的数字肖像，同时用于封面和原稿对照。

点击后播放声音，无自动播放。此版本是预渲染视频，不支持实时对话。嘴部开合由配音音量驱动，含轻微眨眼，未做逐字音素同步或转头。配音为合成男声，不是本人声音克隆。

## 生成工具

- [LivePortrait](https://github.com/KlingAIResearch/LivePortrait)，MIT：本地生成口部与眨眼动画。
- [Kokoro-82M-v1.1-zh](https://huggingface.co/hexgrad/Kokoro-82M-v1.1-zh)，Apache-2.0：生成中文配音，音色 `zm_010`。

此目录仅分发页面、经授权的肖像和生成短片，不包含模型权重或推理程序。
