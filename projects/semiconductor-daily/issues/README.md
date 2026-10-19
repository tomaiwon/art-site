# 半导体早午晚报 · 每日存档数据

由东亚制造工作台（本机 `poster-pipeline/site_publish.py`）每出一期自动生成并推送，不要手改。

- `{期号}/{页}.webp`：这一期各页的展示副本（封面和各则图页、字页，不含免责声明；900 宽 WebP，一期约 300 KB）。
- `{年-月}.json`：这个月每期一条：日期、标题行（如「1019午报」）、各页图片路径。
- `index.json`：有哪些月份。

显示在 `news.html` 倒计时下面的「半导体早午晚报 / DAILY SEMICONDUCTOR」栏：每期一行标题，下面一排图，点开可以翻看；
只显示两日内（北京时间今天和昨天），新的在前。`news.html` 每天由 GitHub Actions 跑 `fetch_news.py` 重新生成，
这一栏写在 `fetch_news.py` 的 `_DAILY_SEMI` 模板里；改样式要改那里，只改 `news.html` 会在第二天被覆盖。

网站仓库已约 1.1 GB，所以图只留最近 3 天，更早的每次推送时自动删掉（json 里那期的图片列表清空）。
自动推送用一个专用浅克隆（`~/Library/Application Support/eam-studio/art-site`），只提交本目录。
本地工作副本改网站前先 `git pull`。从第 099 期开始；之前是设计阶段的试出图，不上网站。
