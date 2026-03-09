#!/usr/bin/env python3
"""
Daily News Digest — 艺术 · 电影 · AI · 半导体 · 国际时事
每天伦敦时间 10:00 自动运行（GitHub Actions），生成 news.html 并提交
"""

import feedparser
import datetime
import os
import re
import socket
import subprocess
import json
import urllib.request
from openai import OpenAI

socket.setdefaulttimeout(12)

# CI 检测：GitHub Actions 自动设置 CI=true
IS_CI = os.environ.get('CI', '').lower() == 'true'

# ── RSS 源 ────────────────────────────────────────────────────────
FEEDS = {
    'art': {
        'title':  '艺术事件',
        'label':  'ART',
        'accent': '#7a5c28',
        'dim':    '#b8965a',
        'sources': [
            ('Artforum',          'https://www.artforum.com/feed/'),
            ('Hyperallergic',     'https://hyperallergic.com/feed/'),
            ('Frieze',            'https://www.frieze.com/feed'),
            ('e-flux',            'https://www.e-flux.com/announcements/feed/'),
            ('The Art Newspaper', 'https://www.theartnewspaper.com/rss'),
            ('Rhizome',           'https://rhizome.org/feed/'),
            ('Artnet News',       'https://news.artnet.com/feed'),
            ('Dezeen',            'https://www.dezeen.com/feed/'),
            ('Colossal',          'https://www.thisiscolossal.com/feed/'),
            ('Creative Review',   'https://www.creativereview.co.uk/feed/'),
        ],
    },
    'film': {
        'title':  '影像',
        'label':  'FILM',
        'accent': '#3a4878',
        'dim':    '#7a88b8',
        'sources': [
            ('Variety',              'https://variety.com/feed/'),
            ('IndieWire',            'https://www.indiewire.com/feed/'),
            ('Deadline',             'https://deadline.com/feed/'),
            ('The Playlist',         'https://theplaylist.net/feed/'),
            ('Screen Daily',         'https://www.screendaily.com/rss'),
            ('Hollywood Reporter',   'https://www.hollywoodreporter.com/c/news/feed/'),
            ('Little White Lies',    'https://lwlies.com/feed/'),
            ('Roger Ebert',          'https://www.rogerebert.com/feed'),
            ('Filmmaker Magazine',   'https://filmmakermagazine.com/feed/'),
        ],
    },
    'ai': {
        'title':  '人工智能科技',
        'label':  'AI',
        'accent': '#2a6848',
        'dim':    '#6aaa88',
        'sources': [
            ('MIT Tech Review',  'https://www.technologyreview.com/feed/'),
            ('VentureBeat AI',   'https://venturebeat.com/category/ai/feed/'),
            ('Ars Technica',     'https://feeds.arstechnica.com/arstechnica/index'),
            ('The Verge',        'https://www.theverge.com/rss/index.xml'),
            ('Wired',            'https://www.wired.com/feed/rss'),
            ('TechCrunch AI',    'https://techcrunch.com/category/artificial-intelligence/feed/'),
            ('404 Media',        'https://www.404media.co/feed'),
            ('AI News',          'https://artificialintelligence-news.com/feed/'),
            ('Rest of World',    'https://restofworld.org/feed/'),
        ],
    },
    'semi': {
        'title':  '半导体产业',
        'label':  'SEMI',
        'accent': '#782828',
        'dim':    '#b87878',
        'sources': [
            ('EE Times',        'https://www.eetimes.com/feed/'),
            ('SemiEngineering', 'https://semiengineering.com/feed/'),
            ('IEEE Spectrum',   'https://spectrum.ieee.org/feeds/feed.rss'),
            ("Tom's Hardware",  'https://www.tomshardware.com/feeds/all'),
            ('AnandTech',       'https://www.anandtech.com/rss/'),
            ('EDN',             'https://www.edn.com/feed/'),
            ('The Register',    'https://www.theregister.com/headlines.rss'),
        ],
    },
    'intl': {
        'title':  '国际时事',
        'label':  'INTL',
        'accent': '#3a3a5a',
        'dim':    '#7a7a9a',
        'sources': [
            ('Reuters World',       'https://feeds.reuters.com/reuters/worldNews'),
            ('BBC World',           'http://feeds.bbci.co.uk/news/world/rss.xml'),
            ('South China Morning Post', 'https://www.scmp.com/rss/91/feed'),
            ('The Diplomat',        'https://thediplomat.com/feed/'),
            ('Foreign Policy',      'https://foreignpolicy.com/feed/'),
            ('Nikkei Asia',         'https://asia.nikkei.com/rss/feed/nar'),
            ('Taiwan News',         'https://www.taiwannews.com.tw/en/rss'),
            ('VOA News',            'https://www.voanews.com/api/z$pqmvekg-qv'),
        ],
    },
}

MAX_PER_SOURCE   = 3
MAX_PER_CATEGORY = 12

# CI 环境输出到仓库根目录 news.html；本地输出到桌面
if IS_CI:
    OUTPUT_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'news.html')
else:
    OUTPUT_PATH  = os.path.expanduser('~/Desktop/cc_test/news.html')
    GITHUB_REPO  = os.path.expanduser('~/Desktop/art-site')
    GITHUB_PAGE  = os.path.join(GITHUB_REPO, 'news.html')

HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) '
                  'AppleWebKit/537.36 (KHTML, like Gecko) '
                  'Chrome/120.0.0.0 Safari/537.36'
}

# ── OpenAI 客户端 ─────────────────────────────────────────────────
def _load_api_key():
    key = os.environ.get('OPENAI_API_KEY', '')
    if not key:
        try:
            with open(os.path.expanduser('~/.openai_key')) as f:
                key = f.read().strip()
        except FileNotFoundError:
            pass
    return key

_api_key  = _load_api_key()
ai_client = OpenAI(api_key=_api_key) if _api_key else None
AI_MODEL  = 'gpt-4o-mini'

SYSTEM_PROMPT = (
    "你是一名专业的 AI 科技新闻编辑，"
    "任务是将不同来源的推文内容翻译成简洁、准确、有逻辑的中文新闻摘要。"
)

# ── 工具函数 ──────────────────────────────────────────────────────
def strip_html(text):
    text = re.sub(r'<[^>]+>', ' ', text or '')
    text = re.sub(r'\s+', ' ', text)
    return text.strip()

def fmt_date(parsed_time):
    if not parsed_time:
        return ''
    try:
        dt = datetime.datetime(*parsed_time[:6])
        return dt.strftime('%m%d')
    except Exception:
        return ''

def fetch_category(sources):
    items = []
    for source_name, url in sources:
        try:
            feed = feedparser.parse(url, request_headers=HEADERS)
            for entry in feed.entries[:MAX_PER_SOURCE]:
                title   = strip_html(entry.get('title', '')).strip()
                link    = entry.get('link', '#')
                summary = strip_html(
                    entry.get('summary') or entry.get('description') or ''
                )
                summary = summary[:220] + ('…' if len(summary) > 220 else '')
                date    = fmt_date(
                    entry.get('published_parsed') or entry.get('updated_parsed')
                )
                if title:
                    items.append({
                        'title':   title,
                        'link':    link,
                        'summary': summary,
                        'source':  source_name,
                        'date':    date,
                    })
        except Exception:
            pass
    return items[:MAX_PER_CATEGORY]

# ── 翻译与整理 ────────────────────────────────────────────────────
def translate_category(items, category_title):
    if not items or not ai_client:
        return items

    input_items = [
        {'i': i, 'title': item['title'], 'summary': item['summary']}
        for i, item in enumerate(items)
        if item.get('title')
    ]
    if not input_items:
        return items

    user_prompt = (
        f"以下是「{category_title}」的新闻条目，请将每条的标题翻译为中文，"
        f"并将摘要整理为 40-80 字的简洁中文摘要（去除广告、无关内容）。\n"
        f"以 json 格式返回，结构为 {{\"items\": [{{\"i\": 序号, \"title_zh\": \"中文标题\", \"summary_zh\": \"中文摘要\"}}]}}\n\n"
        f"{json.dumps(input_items, ensure_ascii=False)}"
    )

    try:
        response = ai_client.chat.completions.create(
            model=AI_MODEL,
            max_tokens=4096,
            response_format={'type': 'json_object'},
            messages=[
                {'role': 'system', 'content': SYSTEM_PROMPT},
                {'role': 'user',   'content': user_prompt},
            ],
        )
        result    = json.loads(response.choices[0].message.content)
        trans_map = {t['i']: t for t in result.get('items', [])}
        for i, item in enumerate(items):
            if i in trans_map:
                item['title_zh']   = trans_map[i]['title_zh']
                item['summary_zh'] = trans_map[i]['summary_zh']
    except Exception as e:
        print(f'  [翻译失败: {e}]')

    return items

# ── HTML 生成 ─────────────────────────────────────────────────────
def build_section(key, meta, items):
    label = meta['label']
    title = meta['title']

    if not items:
        rows = '<li class="item"><span class="year">—</span><span class="name-zh">暂无内容</span></li>'
    else:
        row_parts = []
        for item in items:
            title_zh = item.get('title_zh') or ''
            title_en = item['title']
            date_str = item['date'] or '—'
            if title_zh:
                row_parts.append(
                    f'<li class="item">'
                    f'<span class="year">{date_str}</span> '
                    f'<a href="{item["link"]}" target="_blank" class="name-zh">{title_zh}</a>'
                    f'<span class="name-en">{title_en}</span>'
                    f'</li>'
                )
            else:
                row_parts.append(
                    f'<li class="item">'
                    f'<span class="year">{date_str}</span>'
                    f'<a href="{item["link"]}" target="_blank" class="name-zh">{title_en}</a>'
                    f'</li>'
                )
        rows = '\n        '.join(row_parts)

    return (
        f'<section class="group" id="{key}">'
        f'<h2 class="group-head">'
        f'<span class="group-zh">{title}</span>'
        f'<span class="group-en">{label}</span>'
        f'</h2>'
        f'<ul class="list">{rows}</ul>'
        f'</section>'
    )

def generate_html(sections_html):
    now     = datetime.datetime.now()
    date_en = now.strftime('%d %b %Y').upper()
    date_zh = now.strftime('%Y · %m · %d')

    return f'''<!doctype html>
<html lang="zh-Hans">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<title>Yi Huang 黄熠 — AUTOMATIC</title>
<!-- Google tag (gtag.js) -->
<script async src="https://www.googletagmanager.com/gtag/js?id=G-BPBFT1Q5SF"></script>
<script>window.dataLayer=window.dataLayer||[];function gtag(){{dataLayer.push(arguments);}}gtag('js',new Date());gtag('config','G-BPBFT1Q5SF');</script>
<link rel="preload" as="font" href="fonts/E.ttf" type="font/ttf" crossorigin>
<link rel="preload" as="font" href="fonts/Z-news.woff2" type="font/woff2" crossorigin>
<style>
  @font-face{{font-family:"EFont";src:url("fonts/E.ttf") format("truetype");font-weight:400;font-style:normal;font-display:block;}}
  @font-face{{font-family:"EFont";src:url("fonts/E.ttf") format("truetype");font-weight:700;font-style:normal;font-display:block;}}
  @font-face{{font-family:"ZFont";src:url("fonts/Z-news.woff2") format("woff2");font-weight:400;font-style:normal;font-display:block;}}
  @font-face{{font-family:"ZFont";src:url("fonts/Z-news.woff2") format("woff2");font-weight:700;font-style:normal;font-display:block;}}
  @font-face{{font-family:"NFont";src:url("fonts/N.ttf") format("truetype");font-weight:400;font-style:normal;font-display:block;}}
  @font-face{{font-family:"NFont";src:url("fonts/N.ttf") format("truetype");font-weight:700;font-style:normal;font-display:block;}}

  html,body{{height:100%;}}
  body{{
    margin:0;
    background:#ffffff;
    color:#111;
    font-family:"ZFont","EFont","PingFang SC","Noto Sans SC",sans-serif;
    -webkit-font-smoothing:antialiased;
    -moz-osx-font-smoothing:grayscale;
  }}

  .top-nav{{
    position:fixed;
    top:22px;
    right:30px;
    z-index:2;
    display:flex;
    flex-direction:column;
    align-items:flex-end;
    gap:10px;
    font-size:28px;
    font-weight:700;
    letter-spacing:2.5px;
    font-family:"EFont","ZFont",sans-serif;
  }}
  .top-nav a{{color:#111;text-decoration:none;line-height:1;}}
  .top-nav a:hover{{text-decoration:underline;text-underline-offset:5px;}}

  .page{{
    min-height:100vh;
    box-sizing:border-box;
    padding:72px 70px;
  }}

  .page-title{{
    font-size:28px;
    letter-spacing:2.5px;
    font-weight:700;
    margin:0 0 18px 0;
    font-family:"EFont","ZFont",sans-serif;
  }}

  .group{{margin:18px 0 26px 0;max-width:860px;}}
  .group-head{{margin:0 0 10px 0;line-height:1.2;}}
  .group-zh{{
    display:block;
    font-family:"ZFont","EFont",sans-serif;
    font-size:22px;
    font-weight:700;
    letter-spacing:0.2px;
    color:#111;
  }}
  .group-en{{
    display:block;
    font-family:"EFont","ZFont",sans-serif;
    font-size:17px;
    font-weight:700;
    letter-spacing:0.6px;
    color:#2a2a2a;
    margin-top:4px;
  }}

  .list{{list-style:none;padding:0;margin:0;}}
  .item{{
    display:block;
    margin:6px 0;
  }}
  .year{{
    font-family:"ZFont","EFont",sans-serif;
    font-weight:700;
    font-size:20px;
    letter-spacing:0.6px;
    color:#111;
  }}
  .name-zh{{
    font-family:"ZFont","EFont",sans-serif;
    font-weight:700;
    font-size:20px;
    letter-spacing:0.2px;
    color:#111;
    text-decoration:none;
  }}
  .name-zh:hover{{text-decoration:underline;text-underline-offset:4px;}}
  .name-en{{
    display:block;
    font-family:"EFont","ZFont",sans-serif;
    font-size:13px;
    font-weight:400;
    color:#888;
    margin-top:2px;
    letter-spacing:0.1px;
  }}

  @media(max-width:860px){{
    .page{{padding:70px 22px;}}
    .top-nav{{font-size:16px;letter-spacing:1.5px;right:18px;top:18px;gap:8px;}}
    .page-title{{font-size:24px;}}
    .year,.name-zh{{font-size:15px;}}
    .group-zh{{font-size:15px;}}
    .group-en{{font-size:14px;}}
  }}

  .thoughts-btn{{
    display:inline-block;
    font-family:"ZFont","EFont",sans-serif;
    font-size:22px;
    font-weight:700;
    letter-spacing:1.5px;
    color:#111;
    text-decoration:none;
    border:1px solid #111;
    padding:5px 14px;
    margin:0 0 18px 0;
  }}
  .thoughts-btn:hover{{background:#111;color:#fff;}}
  .next-update{{
    font-family:"EFont","ZFont",sans-serif;
    font-size:13px;
    letter-spacing:1.5px;
    color:#888;
    margin:-8px 0 22px 0;
  }}
  #countdown{{
    font-family:"ZFont","EFont",sans-serif;
    font-size:18px;
    font-variant-numeric:tabular-nums;
  }}
</style>
</head>
<body>

<nav class="top-nav" aria-label="Primary">
  <a href="index.html">ABOUT</a>
  <a href="work.html">WORK</a>
  <a href="contact.html">CONTACT</a>
  <a href="support.html">SUPPORT</a>
</nav>

<main class="page">
  <h1 class="page-title">AUTOMATIC</h1>
  <div class="next-update">NEXT UPDATE &nbsp;<span id="countdown">--:--:--</span></div>
  <a href="thoughts.html" class="thoughts-btn">沉思录</a>
  <script>(function(){{
    function secs(){{
      var f=new Intl.DateTimeFormat('en-GB',{{timeZone:'Europe/London',hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:false}});
      var p={{}};
      f.formatToParts(new Date()).forEach(function(x){{p[x.type]=+x.value;}});
      var s=p.hour*3600+p.minute*60+p.second;
      return s<36000?36000-s:86400-s+36000;
    }}
    function pad(n){{return String(n).padStart(2,'0');}}
    function tick(){{
      var s=secs();
      document.getElementById('countdown').textContent=pad(s/3600|0)+':'+pad(s%3600/60|0)+':'+pad(s%60);
    }}
    tick();setInterval(tick,1000);
  }})();</script>

  {''.join(sections_html)}
</main>

</body>
</html>'''

# ── 本地推送到 GitHub（仅本地运行时使用）──────────────────────────
def push_to_github():
    if IS_CI:
        return  # CI 环境由 workflow 处理 git commit/push
    import shutil
    if not os.path.exists(GITHUB_REPO):
        print('  [GitHub] 仓库不存在，跳过推送')
        return
    date_str = datetime.datetime.now().strftime('%Y-%m-%d %H:%M')
    try:
        subprocess.run(['git', '-C', GITHUB_REPO, 'pull', '--rebase'],
                       check=True, capture_output=True)
        shutil.copy(OUTPUT_PATH, GITHUB_PAGE)
        subprocess.run(['git', '-C', GITHUB_REPO, 'add', 'news.html'],
                       check=True, capture_output=True)
        subprocess.run(['git', '-C', GITHUB_REPO, 'commit', '-m',
                        f'news: {date_str}'],
                       check=True, capture_output=True)
        subprocess.run(['git', '-C', GITHUB_REPO, 'push'],
                       check=True, capture_output=True)
        print(f'  [GitHub] ✓ 已推送 → yihuang.art/news.html')
    except subprocess.CalledProcessError as e:
        print(f'  [GitHub] 推送失败: {e.stderr.decode().strip()}')

# ── 主程序 ────────────────────────────────────────────────────────
def main():
    print(f'[{datetime.datetime.now().strftime("%H:%M:%S")}] Fetching news...')

    if ai_client:
        print(f'  OpenAI ({AI_MODEL}): 已连接，将翻译并整理内容')
    else:
        print(f'  OpenAI: 未配置，显示原文')

    sections_html         = []
    all_items_by_category = {}
    for key, meta in FEEDS.items():
        print(f'  → {meta["title"]}', end='', flush=True)
        items = fetch_category(meta['sources'])
        print(f'  {len(items)} 条', end='', flush=True)
        if ai_client and items:
            print('  翻译中...', end='', flush=True)
            items = translate_category(items, meta['title'])
            import time; time.sleep(1)
        print()
        all_items_by_category[key] = items
        sections_html.append(build_section(key, meta, items))

    html = generate_html(sections_html)

    os.makedirs(os.path.dirname(os.path.abspath(OUTPUT_PATH)), exist_ok=True)
    with open(OUTPUT_PATH, 'w', encoding='utf-8') as f:
        f.write(html)

    print(f'  → Saved: {OUTPUT_PATH}')

    if not IS_CI:
        subprocess.run(['open', OUTPUT_PATH])
        print('  → Opened in browser.')

    push_to_github()

if __name__ == '__main__':
    main()
