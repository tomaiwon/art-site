# AI 作图素材库 · 中文版（脸 / 姿势 / 服装）

<img width="2650" height="1864" alt="Image" src="https://github.com/user-attachments/assets/7d9d60fb-20e0-4cca-9797-91281727dfa2" />

把作者 **あぎ / ギア（[@giaaibusi](https://x.com/giaaibusi)）** 公开的三套 AI 作图参考素材，做成了一个中文检索界面：

| 库 | 内容 | 数量 | 源站 |
| --- | --- | --- | --- |
| 脸库 | 正面向、纯色背景的头部参考（脸部特写 893 / 造型 606） | 1,499 张 | <https://ai-portrait-gallery.pages.dev/> |
| 姿势库 | 无脸灰色人偶线稿，每姿势 5 个机位 | 288 姿势 / 1,439 图 | <https://ai-pose-gallery.pages.dev/> |
| 服装库 | 无人物、只有服装的参考图（8 个分类） | 1,407 套 | <https://ai-costume-gallery.pages.dev/> |

中文版做的事：分类与标签全部译成中文、中英双语搜索、一键复制作图指令、三库统一入口，外加**随机组合生成提示词**。

**在线版**：<https://sleepyzone.online/ai-ref-library-cn/>（GitHub Pages，推 main 自动更新）

## 目录

- [随机组合](#随机组合)：一次抽齐脸 / 服装 / 姿势，并生成提示词
  - [两种参考图形式](#两种参考图形式)：链接版 vs 单张三联图
- [打开方式](#打开方式)：双击 index.html 即可
- [原图怎么来](#原图怎么来)：本地原图 / 源站 / 网盘备份
- [埋点](#埋点)：默认关闭，填一个 ID 即可接入
- [授权](#授权)：三个库的许可差异
- [免责](#免责)

## 随机组合

<img width="2644" height="1842" alt="Image" src="https://github.com/user-attachments/assets/73470587-cffd-42ba-be7d-ce1e8db4aa82" />

点顶部 **🎲 随机组合**：从脸库、服装库、姿势库各随机抽一条，三张参考图并排，并自动生成现成的提示词。

- **单独「换一个」**：只换某一张，另外两张不动，方便先定脸再挑衣服
- **限定范围**：姿势可只取标准系 / 上半身 / 双人互动，服装可只取春 / 夏 / 秋 / 冬 / 内衣 / 派对 / 泳装 / 性感

### 两种参考图形式

| 模式 | 适用场景 | 你能拿到什么 |
| --- | --- | --- |
| **参考图 = 链接** | 能联网取图的 Agent（Claude / GPT + 浏览器工具 / 有 shell 的编码 Agent） | 提示词里带三张图的源站直链 + curl 取图命令，开头写明「先取图、不许凭描述生成」 |
| **参考图 = 一张三联图** | 只能贴图、不能读 URL 的模型（多数对话式图像模型） | 一键生成 2828×1380 的三联参考图（左①脸 / 中②服装 / 右③姿势，带编号标注），可下载或直接复制到剪贴板 |

<img width="1574" height="1628" alt="Image" src="https://github.com/user-attachments/assets/a698df0d-9fc6-48c2-a824-086736eb2e72" />

<img width="1620" height="1854" alt="Image" src="https://github.com/user-attachments/assets/17454dd8-3e23-47cc-8f6c-f3607bf7df6b" />

## 打开方式

**直接双击 index.html** 即可（本地 file:// 就能跑，不需要服务器）。

如果浏览器限制本地脚本，也可以在目录里起个静态服务：

    python3 -m http.server 8080

然后访问 http://localhost:8080 。

## 原图怎么来

仓库里**只有缩略图**（内嵌在 data/*.js 里，所以任何环境都不会裂图）。点「下载原图」时按这个顺序：

1. config.js 里配了本地目录、且文件存在、且使用 file:// 打开 → 直接用本地原图（快、离线可用）
    * 下载原图后，放置本目录的上层目录，和 config.js 配置一致即可
2. 否则 → 跳转作者源站的对应文件，国内访问会比较慢，推荐下载原图

附原图下载地址（网盘下载仅为本地预览高清图）：

**AI 作图脸库**

[https://pan.baidu.com/s/1rxqVp0qkxCQf-8Z8DXI6HA?pwd=jR2P](https://pan.baidu.com/s/1rxqVp0qkxCQf-8Z8DXI6HA?pwd=jR2P)

[https://pan.quark.cn/s/469084c4f0fa](https://pan.quark.cn/s/469084c4f0fa)

**AI 服装库**

[https://pan.baidu.com/s/1bsGuveiCBRbucS-17tpTrg?pwd=s39e](https://pan.baidu.com/s/1bsGuveiCBRbucS-17tpTrg?pwd=s39e)

[https://pan.quark.cn/s/492b9782ab78](https://pan.quark.cn/s/492b9782ab78)

**AI 作图姿势库**

[https://pan.quark.cn/s/6b1004add615](https://pan.quark.cn/s/6b1004add615)

[https://pan.baidu.com/s/1rY8E88d19xabnoBGhex4zg?pwd=vsf6](https://pan.baidu.com/s/1rY8E88d19xabnoBGhex4zg?pwd=vsf6)

## 埋点

默认不采集（`providers` 为空时：不加载任何第三方脚本、不发任何请求，事件只写进浏览器的 `window.__trackLog`，保留最近 200 条）。**本站当前已开启：GA4 `G-0C99160522` + Microsoft Clarity `r1wmvdsf4a`。**

要启用，在 `config.js` 里填项目 ID，**可以同时接多家**：

```js
window.ANALYTICS = {
  providers: [
    { provider: "clarity", id: "你的 Clarity 项目 ID" },
    { provider: "ga4", id: "G-XXXXXXXXXX" }
  ]
};
```

| provider | 填什么 | 说明 |
| --- | --- | --- |
| `none` | — | 默认，只本地打日志 |
| `ga4` | `G-XXXXXXXXXX` | Google Analytics 4，会写 cookie，国内访问偏慢 |
| `baidu` | `hm.js?` 后面那串 | 百度统计，国内速度最好 |
| `umami` | website-id | Umami Cloud，无 cookie，需自建或订阅 |
| `clarity` | 项目 ID | Microsoft Clarity，**会话录制 + 热图 + 点击统计**，免费无限量，国内可访问 |
| `cloudflare` | beacon token | Cloudflare Web Analytics，只统计 PV，无自定义事件 |

Clarity 的具体接入：在 <https://clarity.microsoft.com> 新建项目、填站点域名，拿到项目 ID（形如 `abcdefghij`）填进上面的 `id` 即可。它会把每个自定义事件记成 `event`，并把 `lib / type / value / label / mode / action / trigger / id` 作为标签上报，在 Clarity 后台的 **Filters** 里可以直接按这些标签筛会话录制。

### 上报的事件

| 事件 | 触发点 | 携带参数 |
| --- | --- | --- |
| `lib_view` | 切换脸库 / 姿势库 / 服装库 / 组合 | `lib` |
| `search` | 搜索框输入（防抖 800ms） | `lib`, `q`（截断 40 字） |
| `filter` | 分类 / 发长 / 机位 / 视图筛选 | `lib`, `type`, `value` |
| `item_open` | 打开任意条目大图 | `lib`, `id` |
| `original_download` | 点「下载原图」 | `lib`, `id` |
| `copy` | 任意复制按钮 | `label` |
| `combo_roll` | 随机组合（全部换 / 单项换） | `trigger`, `face`, `costume`, `pose` |
| `combo_mode` | 切换「链接 / 三联图」模式 | `mode` |
| `combo_sheet` | 下载或复制三联图 | `action` |

调试：控制台执行 `window.__trackDebug = true` 刷新，每条事件都会打印；`window.__trackLog` 随时可查。

> 隐私提醒：`search` 会上报搜索词。如果不想收集，可以把 app.js 里 `trackEvent("search", ...)` 的 `q` 参数删掉。

## 授权

| 库 | 授权 | 能否再分发图片 |
| --- | --- | --- |
| 脸库 | **CC0**（放弃著作权） | ✅ 可以 |
| 姿势库 | 免费商用、可修改、可参考 | ❌ 禁止再分发图片本体（含改过的版本） |
| 服装库 | 同上 | ❌ 禁止再分发图片本体 |

- 三个库都**不涉及真实人物**（全部 AI 生成）
- 服装库作者做过品牌相似度检查，但**不保证不侵权**，商用前请自行判断
- 本仓库只收录缩略图用于检索，原图请走源站下载；**请勿把原图打包再分发**

## 免责

素材版权归原作者所有，本仓库仅为个人使用的中文检索界面，按原样提供、无担保。

---

[↑ 回到目录](#目录)
