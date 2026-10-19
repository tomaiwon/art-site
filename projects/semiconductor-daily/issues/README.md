# 半导体早午晚报 · 每日存档数据

由东亚制造工作台（本机 `poster-pipeline/site_publish.py`）每出一期自动生成并推送，不要手改。

- `{期号}.webp`：中文封面展示副本（900 宽，约 70 KB）。网站仓库已约 1.1 GB，所以每期只放封面。
- `{年-月}.json`：这个月每期一条：日期、刊次、三则中文标题与发布文案里的摘要、来源链接、
  三行英文标题（X 英文稿的标题；没有 X 稿时工作台另译）、X 串推链接。
- `index.json`：有哪些月份。

显示在 `news.html` 倒计时下面的「半导体早午晚报 / DAILY SEMICONDUCTOR」栏：只显示两日内（北京时间今天和昨天）、
中英文都齐的期数，新的在前。`news.html` 每天由 GitHub Actions 跑 `fetch_news.py` 重新生成，这一栏写在
`fetch_news.py` 的 `_DAILY_SEMI` 模板里；改样式要改那里，只改 `news.html` 会在第二天被覆盖。

自动推送用一个专用浅克隆（`~/Library/Application Support/eam-studio/art-site`），只提交本目录。
本地工作副本改网站前先 `git pull`。从第 099 期开始；之前是设计阶段的试出图，不上网站。
