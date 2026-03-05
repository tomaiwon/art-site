#!/usr/bin/env python3
"""
Yi Huang Art Site — 本地 CMS
运行: python cms.py
浏览器打开: http://localhost:5000
"""

import os, re, subprocess, shutil
from flask import Flask, render_template_string, request, redirect, url_for, flash
from werkzeug.utils import secure_filename

app = Flask(__name__)
app.secret_key = 'yihuang-cms-2026'

SITE        = os.path.dirname(os.path.abspath(__file__))
WORK_HTML   = os.path.join(SITE, 'work.html')
PROJECTS    = os.path.join(SITE, 'projects')
IMAGES      = os.path.join(SITE, 'images')

CATEGORIES = [
    ('数字媒介本体系列', 'Digital Media Ontology Series'),
    ('艺术史系列',       'Art History Series'),
    ('文章',             'Articles'),
    ('过往实践',         'Practice Series'),
]

TEMPLATE_TYPES = [
    ('video',        '视频优先（全屏视频，INFO/FILM 切换）'),
    ('text',         '图文优先（无视频）'),
    ('text_video',   '图文优先 + 底部视频'),
    ('construction', 'Under Construction'),
]

ALLOWED = {'png','jpg','jpeg','webp','gif'}

# ── 工具函数 ──────────────────────────────────────────────────────────────────

def extract_vimeo_id(raw):
    """从 Vimeo 嵌入代码或链接中提取视频 ID"""
    m = re.search(r'vimeo\.com/(?:video/)?(\d+)', raw)
    return m.group(1) if m else raw.strip()

def slugify(title):
    s = title.lower().strip()
    s = re.sub(r'[^\w\s-]', '', s)
    s = re.sub(r'[\s_]+', '-', s)
    return s

def git_push(msg):
    cmds = [
        ['git', '-C', SITE, 'add', '-A'],
        ['git', '-C', SITE, 'commit', '-m', msg],
        ['git', '-C', SITE, 'pull', '--rebase'],
        ['git', '-C', SITE, 'push'],
    ]
    log = []
    for cmd in cmds:
        r = subprocess.run(cmd, capture_output=True, text=True)
        log.append(r.stdout + r.stderr)
    return '\n'.join(log)

def insert_work_entry(cat_zh, date, title_en, title_zh, slug):
    """在 work.html 对应分类的列表最顶部插入新条目"""
    with open(WORK_HTML, encoding='utf-8') as f:
        html = f.read()

    display = f"{title_en} {title_zh}".strip() if title_zh else title_en
    li = (f'\n        <li class="item">\n'
          f'          <span class="year">{date}</span>\n'
          f'          <span class="name"><a href="projects/{slug}.html">{display}</a></span>\n'
          f'        </li>')

    # 按中文标题定位 section，然后找第一个 <li class="item">
    pat = re.compile(
        r'(class="name group-title-zh"[^>]*>' + re.escape(cat_zh) + r'.*?<ul class="list">)',
        re.DOTALL
    )
    m = pat.search(html)
    if not m:
        return False, f'找不到分类「{cat_zh}」'

    # 找 <ul> 后第一个 <li>
    ul_end = m.end()
    li_pos = html.find('<li', ul_end)
    if li_pos == -1:
        # 空列表，直接在 </ul> 前插入
        ul_close = html.find('</ul>', ul_end)
        html = html[:ul_close] + li + '\n      ' + html[ul_close:]
    else:
        html = html[:li_pos] + li.lstrip('\n') + '\n        ' + html[li_pos:]

    with open(WORK_HTML, 'w', encoding='utf-8') as f:
        f.write(html)
    return True, 'work.html 更新成功'

# ── HTML 模板生成 ────────────────────────────────────────────────────────────

SHARED_STYLE = '''
  @font-face{{ font-family:"EFont"; src:url("../fonts/E.ttf") format("truetype"); }}
  @font-face{{ font-family:"ZFont"; src:url("../fonts/Z.ttf") format("truetype"); }}
  html,body,*{{ font-synthesis:none; }}
  html,body{{ margin:0; padding:0; width:100%; height:100%; background:#000; color:#fff; }}
  .nav-left,.nav-right{{
    position:fixed; top:22px; z-index:1000;
    font-family:"ZFont","EFont",sans-serif;
    font-size:28px; letter-spacing:2.5px; opacity:0.6; transition:opacity .2s;
  }}
  .nav-left{{ left:30px; }} .nav-right{{ right:30px; }}
  .nav-left:hover,.nav-right:hover{{ opacity:1; }}
  .nav-left a,.nav-right button,.nav-right a{{
    color:#fff; background:none; border:none;
    text-decoration:none; cursor:pointer; font:inherit;
  }}
  .nav-left a:hover,.nav-right button:hover,.nav-right a:hover{{
    text-decoration:underline; text-underline-offset:5px;
  }}
  .info-box{{ max-width:760px; margin:0 auto; font-family:"Helvetica Neue",Helvetica,Arial,sans-serif; }}
  .info-box h1{{ font-size:28px; font-weight:500; letter-spacing:0.3px; margin-bottom:26px; color:#ddd; }}
  .info-box p{{ font-size:12px; line-height:1.5; margin-bottom:22px; }}
  .en{{ font-family:"Helvetica Neue",Helvetica,Arial,sans-serif; font-weight:500; color:#ddd; }}
  .zh{{ font-family:"SimSun","宋体",serif; font-weight:700; color:#eee; }}
  .work-image{{ width:100%; margin:34px 0; display:block; height:auto; }}
  .work-image.tight{{ margin-bottom:14px; }}
  .caption{{ font-size:12px; color:#666; line-height:1.55; margin-top:-6px; margin-bottom:26px; }}
  .lang-divider{{ border:0; border-top:1px solid #333; margin:42px 0 36px; }}
  .footer-divider{{ border:0; border-top:1px solid #333; margin:54px 0 28px; }}
  .self-reflection{{ display:flex; gap:40px; padding-bottom:40px; }}
  .self-reflection p{{ width:50%; margin:0; }}
  @media(max-width:860px){{ .self-reflection{{ flex-direction:column; gap:20px; }} .self-reflection p{{ width:100%; }} }}
'''

def _info_body(d):
    """生成 info-box 里通用的图文内容 HTML"""
    imgs_en = ''
    imgs_zh = ''
    for i, img in enumerate(d['images']):
        tag = f'<img class="work-image tight" src="../images/{img}" alt="still {i+1:02d}">\n'
        if i == 0:
            imgs_en = tag
        else:
            imgs_zh += f'      <img class="work-image" src="../images/{img}" alt="still {i+1+1:02d}">\n'

    format_tech_en = ''
    if d['format'] or d['tech']:
        format_tech_en = f'''    <p class="en caption">
      Format: {d["format"]}<br>
      Tech: {d["tech"]}
    </p>'''

    content_zh_block = ''
    if d['content_zh']:
        content_zh_block = f'''
    <p class="zh">
      {d["content_zh"]}
    </p>'''

    series_zh_block = ''
    if d['series_zh']:
        series_zh_block = f'''
    <p class="zh">
      {d["series_zh"]}
    </p>

    <p class="zh">制作人：{d["producer_zh"] or d["producer"]}</p>
'''

    refl_block = ''
    if d['reflection_zh'] or d['reflection_en']:
        refl_block = f'''    <hr class="footer-divider">
    <div class="self-reflection">
      <p class="zh">自检：{d["reflection_zh"]}</p>
      <p class="en">Self Reflection: {d["reflection_en"]}</p>
    </div>
'''

    zh_gallery = ''
    if imgs_zh:
        zh_gallery = f'    <div class="zh-gallery">\n{imgs_zh}    </div>\n'

    return f'''  <div class="info-box">
    <h1>ABOUT</h1>

    <p class="en">
      {d["series_en"]}<br>
      {d["category_en"]}
    </p>

    <p class="en">Producer: {d["producer"]}</p>

    <p class="en">
      Content: {d["content_en"]}
    </p>

{imgs_en}
{format_tech_en}

    <hr class="lang-divider">
{series_zh_block}
{content_zh_block}

{zh_gallery}
{refl_block}
    <p style="color:#666;">© 2026 All Rights Reserved.</p>
  </div>'''


def gen_video(d):
    vimeo_id = d['vimeo_id']
    info = _info_body(d)
    return f'''<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>{d["title_en"]}</title>
<style>
{SHARED_STYLE}
  html,body{{ overflow:hidden; }}
  #video-section{{ position:absolute; inset:0; }}
  #video-section iframe{{ width:100%; height:100%; border:0; }}
  #info-section{{ position:absolute; inset:0; display:none; overflow-y:auto; padding:80px 22px; background:#000; }}
  .zh-gallery{{ padding-bottom:80px; }}
</style>
</head>
<body>

<div class="nav-left"><a href="/work.html">BACK</a></div>
<div class="nav-right"><button id="toggleBtn" onclick="toggleView()">INFO</button></div>

<div id="video-section">
  <iframe
    src="https://player.vimeo.com/video/{vimeo_id}?title=0&byline=0&portrait=0&badge=0&autopause=0&player_id=0&app_id=58479"
    allow="autoplay; fullscreen; picture-in-picture"
    allowfullscreen>
  </iframe>
</div>

<div id="info-section">
{info}
</div>

<script>
function toggleView(){{
  const v=document.getElementById("video-section");
  const i=document.getElementById("info-section");
  const b=document.getElementById("toggleBtn");
  if(i.style.display==="block"){{
    i.style.display="none"; v.style.display="block"; b.innerText="INFO";
  }}else{{
    v.style.display="none"; i.style.display="block"; b.innerText="FILM"; i.scrollTop=0;
  }}
}}
</script>
</body>
</html>'''


def gen_text(d):
    info = _info_body(d)
    return f'''<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>{d["title_en"]}</title>
<style>
{SHARED_STYLE}
  #page{{ min-height:100vh; overflow-y:auto; box-sizing:border-box; padding:80px 22px; }}
  .zh-gallery{{ padding-bottom:60px; }}
</style>
</head>
<body>

<div class="nav-left"><a href="/work.html">BACK</a></div>

<div id="page">
{info}
</div>

</body>
</html>'''


def gen_text_video(d):
    vimeo_id = d['vimeo_id']
    info = _info_body(d)
    return f'''<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>{d["title_en"]}</title>
<style>
{SHARED_STYLE}
  #page{{ min-height:100vh; overflow-y:auto; box-sizing:border-box; padding:80px 22px; }}
  .zh-gallery{{ padding-bottom:60px; }}
  .film-wrap{{ margin-top:26px; padding-bottom:40px; }}
  .film-title{{ font-size:12px; color:#666; margin:0 0 12px 0; }}
  .film-embed{{ position:relative; width:100%; aspect-ratio:16/9; background:#000; border:1px solid #222; }}
  .film-embed iframe{{ position:absolute; inset:0; width:100%; height:100%; border:0; }}
</style>
</head>
<body>

<div class="nav-left"><a href="/work.html">BACK</a></div>
<div class="nav-right"><a href="#film">FILM</a></div>

<div id="page">
{info}
  <div class="info-box">
    <div class="film-wrap" id="film">
      <p class="film-title">{d["title_en"]}</p>
      <div class="film-embed">
        <iframe
          src="https://player.vimeo.com/video/{vimeo_id}?title=0&byline=0&portrait=0&badge=0&autopause=0&player_id=0&app_id=58479"
          allow="fullscreen; picture-in-picture"
          allowfullscreen>
        </iframe>
      </div>
    </div>
  </div>
</div>

</body>
</html>'''


def gen_construction(d):
    return f'''<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>{d["title_en"]}</title>
<style>
{SHARED_STYLE}
  html,body{{ overflow:hidden; display:flex; align-items:center; justify-content:center; }}
  .msg{{ font-family:"Helvetica Neue",Helvetica,Arial,sans-serif; font-size:14px; letter-spacing:2px; color:#555; text-align:center; }}
</style>
</head>
<body>
<div class="nav-left"><a href="/work.html">BACK</a></div>
<div class="msg">
  {d["title_en"]}<br><br>
  UNDER CONSTRUCTION
</div>
</body>
</html>'''


GENERATORS = {
    'video':        gen_video,
    'text':         gen_text,
    'text_video':   gen_text_video,
    'construction': gen_construction,
}

# ── Flask 路由 ────────────────────────────────────────────────────────────────

ADMIN_CSS = '''
* { box-sizing: border-box; margin: 0; padding: 0; }
body { background: #0a0a0a; color: #ddd; font-family: "Helvetica Neue", Helvetica, Arial, sans-serif;
       font-size: 13px; line-height: 1.6; padding: 40px 24px 80px; }
h1 { font-size: 22px; font-weight: 500; letter-spacing: 2px; color: #fff; margin-bottom: 36px; }
h2 { font-size: 13px; font-weight: 700; letter-spacing: 2px; color: #888; margin: 36px 0 14px;
     text-transform: uppercase; border-bottom: 1px solid #222; padding-bottom: 6px; }
.wrap { max-width: 720px; margin: 0 auto; }
a { color: #aaa; text-decoration: none; }
a:hover { color: #fff; text-decoration: underline; }
.btn { display: inline-block; background: #fff; color: #000; padding: 9px 22px;
       font-size: 12px; letter-spacing: 1.5px; font-weight: 700; cursor: pointer;
       border: none; margin-top: 8px; }
.btn:hover { background: #ccc; }
.btn-sm { padding: 5px 14px; font-size: 11px; }
.btn-ghost { background: transparent; color: #666; border: 1px solid #333; }
.btn-ghost:hover { color: #fff; border-color: #666; background: transparent; }
label { display: block; color: #888; font-size: 11px; letter-spacing: 1px;
        text-transform: uppercase; margin-bottom: 5px; margin-top: 18px; }
input[type=text], input[type=url], textarea, select {
  width: 100%; background: #111; border: 1px solid #2a2a2a; color: #ddd;
  padding: 9px 12px; font-size: 13px; font-family: inherit; outline: none; }
input[type=text]:focus, textarea:focus, select:focus { border-color: #555; }
textarea { resize: vertical; min-height: 90px; }
select option { background: #111; }
.row { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
.flash { background: #1a3a1a; border: 1px solid #2a5a2a; color: #8f8; padding: 12px 16px;
         margin-bottom: 24px; font-size: 12px; }
.flash.err { background: #3a1a1a; border-color: #5a2a2a; color: #f88; }
.work-list { list-style: none; }
.work-list li { display: flex; gap: 16px; align-items: baseline;
                padding: 6px 0; border-bottom: 1px solid #181818; }
.work-list .year { color: #555; min-width: 70px; font-size: 12px; }
.work-list .title { color: #aaa; }
.work-list .title a { color: #aaa; }
.section-label { color: #666; font-size: 11px; letter-spacing: 2px; }
.log { background: #0d0d0d; border: 1px solid #222; padding: 12px; font-size: 11px;
       color: #666; white-space: pre-wrap; margin-top: 16px; max-height: 200px; overflow-y: auto; }
input[type=file] { color: #888; }
.hint { font-size: 11px; color: #555; margin-top: 4px; }
'''

DASH_TMPL = '''<!doctype html>
<html lang="zh"><head><meta charset="utf-8">
<title>CMS — Yi Huang</title>
<style>{{ css }}</style></head><body>
<div class="wrap">
  <h1>Yi Huang / CMS</h1>
  {% for msg, cls in messages %}<div class="flash {{ cls }}">{{ msg }}</div>{% endfor %}
  <a href="/new" class="btn">+ 新增作品</a>

  {% for cat_zh, works in categories %}
  <h2>{{ cat_zh }}</h2>
  <ul class="work-list">
    {% for date, title, href in works %}
    <li>
      <span class="year">{{ date }}</span>
      <span class="title"><a href="{{ href }}" target="_blank">{{ title }}</a></span>
    </li>
    {% endfor %}
    {% if not works %}<li><span class="section-label">（空）</span></li>{% endif %}
  </ul>
  {% endfor %}
</div></body></html>'''

NEW_TMPL = '''<!doctype html>
<html lang="zh"><head><meta charset="utf-8">
<title>新增作品 — CMS</title>
<style>{{ css }}</style></head><body>
<div class="wrap">
  <h1><a href="/">← 返回</a>&nbsp;&nbsp;新增作品</h1>
  {% for msg, cls in messages %}<div class="flash {{ cls }}">{{ msg }}</div>{% endfor %}

  <form method="POST" enctype="multipart/form-data">

    <h2>基本信息</h2>
    <div class="row">
      <div>
        <label>日期 (YYYY.MM)</label>
        <input type="text" name="date" placeholder="2026.03" required>
      </div>
      <div>
        <label>分类</label>
        <select name="category">
          {% for zh, en in categories %}
          <option value="{{ zh }}">{{ zh }}</option>
          {% endfor %}
        </select>
      </div>
    </div>

    <div class="row">
      <div>
        <label>英文标题</label>
        <input type="text" name="title_en" placeholder="Memory Entropy" required>
      </div>
      <div>
        <label>中文标题（可选）</label>
        <input type="text" name="title_zh" placeholder="记忆熵">
      </div>
    </div>

    <label>文件名（留空自动生成）</label>
    <input type="text" name="slug" placeholder="memory-entropy">
    <p class="hint">生成路径: projects/[文件名].html</p>

    <h2>页面模板</h2>
    <label>模板类型</label>
    <select name="template_type">
      {% for val, label in templates %}
      <option value="{{ val }}">{{ label }}</option>
      {% endfor %}
    </select>

    <label>Vimeo 嵌入代码或链接（视频模板必填）</label>
    <textarea name="vimeo_id" style="min-height:60px" placeholder="粘贴 Vimeo 给的嵌入代码，或直接填视频 ID"></textarea>
    <p class="hint">自动提取视频 ID，无需手动处理</p>

    <h2>英文内容</h2>
    <label>系列信息（EN）</label>
    <input type="text" name="series_en" placeholder="Film / Digital Medium Ontology Series — Chapter">

    <label>制作人（EN）</label>
    <input type="text" name="producer" placeholder="Yi Huang">

    <label>内容描述（EN）</label>
    <textarea name="content_en" placeholder="Content..."></textarea>

    <div class="row">
      <div>
        <label>格式</label>
        <input type="text" name="format" placeholder="Digital Video, Color, Sound">
      </div>
      <div>
        <label>技术</label>
        <input type="text" name="tech" placeholder="TouchDesigner, Gaussian Splatting">
      </div>
    </div>

    <h2>中文内容（可选）</h2>
    <label>系列信息（ZH）</label>
    <input type="text" name="series_zh" placeholder="独立影像 / 数字媒介本体系列分章">

    <label>制作人（ZH）</label>
    <input type="text" name="producer_zh" placeholder="黄熠">

    <label>内容描述（ZH）</label>
    <textarea name="content_zh" placeholder="内容..."></textarea>

    <h2>自检</h2>
    <div class="row">
      <div>
        <label>Self Reflection (EN)</label>
        <textarea name="reflection_en" placeholder="Self Reflection: ..."></textarea>
      </div>
      <div>
        <label>自检（ZH）</label>
        <textarea name="reflection_zh" placeholder="自检：..."></textarea>
      </div>
    </div>

    <h2>图片上传</h2>
    <label>上传图片（可多选，第一张为封面）</label>
    <input type="file" name="images" multiple accept="image/*">
    <p class="hint">上传后自动复制到 images/ 目录</p>

    <h2>部署</h2>
    <label>Commit 信息</label>
    <input type="text" name="commit_msg" placeholder="feat: add Memory Entropy">

    <br><br>
    <button type="submit" name="action" value="preview" class="btn btn-ghost">预览生成</button>
    &nbsp;
    <button type="submit" name="action" value="deploy" class="btn">生成 + 推送 GitHub</button>
  </form>
</div></body></html>'''

PREVIEW_TMPL = '''<!doctype html>
<html lang="zh"><head><meta charset="utf-8">
<title>预览 — CMS</title>
<style>{{ css }}</style></head><body>
<div class="wrap">
  <h1><a href="/new">← 返回修改</a>&nbsp;&nbsp;预览</h1>
  <p style="color:#888; margin-bottom:16px;">
    将在 <b style="color:#fff">work.html</b> 的「{{ category }}」分类插入：<br>
    <span style="color:#aaa">{{ date }} — {{ title }}</span>
  </p>
  <p style="color:#888; margin-bottom:24px;">
    项目页面：<b style="color:#fff">projects/{{ slug }}.html</b>（{{ template }}）
  </p>
  <pre style="background:#111; padding:16px; font-size:11px; color:#888; overflow-x:auto;
              max-height:400px; white-space:pre-wrap; border:1px solid #222;">{{ preview_html }}</pre>
  <br>
  <form method="POST" action="/deploy">
    <input type="hidden" name="payload" value="{{ payload }}">
    <button type="submit" class="btn">确认推送 GitHub</button>
    &nbsp;<a href="/" class="btn btn-ghost">取消</a>
  </form>
</div></body></html>'''


def parse_works():
    """从 work.html 解析各分类的作品列表"""
    with open(WORK_HTML, encoding='utf-8') as f:
        html = f.read()

    result = []
    for cat_zh, _ in CATEGORIES:
        pat = re.compile(
            r'class="name group-title-zh"[^>]*>' + re.escape(cat_zh) +
            r'.*?<ul class="list">(.*?)</ul>',
            re.DOTALL
        )
        m = pat.search(html)
        works = []
        if m:
            items = re.findall(
                r'<span class="year">(.*?)</span>\s*'
                r'<span class="name"><a href="(.*?)">(.*?)</a>',
                m.group(1), re.DOTALL
            )
            for date, href, title in items:
                works.append((date.strip(), title.strip(), href.strip()))
        result.append((cat_zh, works))
    return result


@app.route('/')
def index():
    categories = parse_works()
    msgs = [(m, 'ok') for m in request.args.getlist('ok')]
    msgs += [(m, 'err') for m in request.args.getlist('err')]
    return render_template_string(
        DASH_TMPL.replace('{{ css }}', ADMIN_CSS),
        categories=categories, messages=msgs
    )


@app.route('/new', methods=['GET', 'POST'])
def new_work():
    messages = []
    if request.method == 'POST':
        f = request.form
        action = f.get('action', 'deploy')

        title_en  = f.get('title_en', '').strip()
        title_zh  = f.get('title_zh', '').strip()
        date      = f.get('date', '').strip()
        cat_zh    = f.get('category', '')
        cat_en    = next((en for zh, en in CATEGORIES if zh == cat_zh), '')
        tmpl_type = f.get('template_type', 'video')
        slug      = f.get('slug', '').strip() or slugify(title_en)
        vimeo_id  = extract_vimeo_id(f.get('vimeo_id', ''))
        commit_msg = f.get('commit_msg', '').strip() or f'feat: add {title_en}'

        # 处理上传图片
        img_names = []
        for img_file in request.files.getlist('images'):
            if img_file and img_file.filename:
                fn = secure_filename(img_file.filename)
                dest = os.path.join(IMAGES, fn)
                img_file.save(dest)
                img_names.append(fn)

        data = {
            'title_en':     title_en,
            'title_zh':     title_zh,
            'date':         date,
            'category_en':  cat_en,
            'series_en':    f.get('series_en', '').strip(),
            'series_zh':    f.get('series_zh', '').strip(),
            'producer':     f.get('producer', '').strip(),
            'producer_zh':  f.get('producer_zh', '').strip(),
            'content_en':   f.get('content_en', '').strip(),
            'content_zh':   f.get('content_zh', '').strip(),
            'format':       f.get('format', '').strip(),
            'tech':         f.get('tech', '').strip(),
            'reflection_en':f.get('reflection_en', '').strip(),
            'reflection_zh':f.get('reflection_zh', '').strip(),
            'vimeo_id':     vimeo_id,
            'images':       img_names,
        }

        # 生成 HTML
        gen = GENERATORS.get(tmpl_type, gen_construction)
        page_html = gen(data)

        if action == 'preview':
            import urllib.parse, json
            payload = urllib.parse.quote(json.dumps({
                'slug': slug, 'cat_zh': cat_zh, 'date': date,
                'title': f"{title_en} {title_zh}".strip(),
                'page_html': page_html,
                'commit_msg': commit_msg,
            }))
            return render_template_string(
                PREVIEW_TMPL.replace('{{ css }}', ADMIN_CSS),
                category=cat_zh,
                date=date,
                title=f"{title_en} {title_zh}".strip(),
                slug=slug,
                template=dict(TEMPLATE_TYPES).get(tmpl_type, tmpl_type),
                preview_html=page_html[:3000] + ('...' if len(page_html) > 3000 else ''),
                payload=payload,
            )

        # 直接部署
        ok, msg = _do_deploy(slug, cat_zh, date, title_en, title_zh, page_html, commit_msg)
        if ok:
            return redirect(f'/?ok={msg}')
        else:
            messages.append((msg, 'err'))

    return render_template_string(
        NEW_TMPL.replace('{{ css }}', ADMIN_CSS),
        categories=CATEGORIES,
        templates=TEMPLATE_TYPES,
        messages=messages,
    )


@app.route('/deploy', methods=['POST'])
def deploy():
    import urllib.parse, json
    payload = json.loads(urllib.parse.unquote(request.form.get('payload', '{}')))
    slug      = payload.get('slug', '')
    cat_zh    = payload.get('cat_zh', '')
    date      = payload.get('date', '')
    title     = payload.get('title', '')
    page_html = payload.get('page_html', '')
    commit_msg = payload.get('commit_msg', 'feat: add work')

    title_parts = title.split(' ', 1)
    title_en = title_parts[0]
    title_zh = title_parts[1] if len(title_parts) > 1 else ''

    ok, msg = _do_deploy(slug, cat_zh, date, title_en, title_zh, page_html, commit_msg)
    if ok:
        return redirect(f'/?ok={msg}')
    return redirect(f'/?err={msg}')


def _do_deploy(slug, cat_zh, date, title_en, title_zh, page_html, commit_msg):
    # 写项目页面
    out = os.path.join(PROJECTS, f'{slug}.html')
    with open(out, 'w', encoding='utf-8') as fp:
        fp.write(page_html)

    # 更新 work.html
    ok, msg = insert_work_entry(cat_zh, date, title_en, title_zh, slug)
    if not ok:
        return False, msg

    # Git push
    log = git_push(commit_msg)
    return True, f'部署成功 → projects/{slug}.html'


if __name__ == '__main__':
    import webbrowser, threading
    def open_browser():
        import time; time.sleep(0.8)
        webbrowser.open('http://localhost:5000')
    threading.Thread(target=open_browser, daemon=True).start()
    print('\n  Yi Huang CMS 启动中...')
    print('  浏览器将自动打开 http://localhost:5000\n')
    app.run(debug=False, port=5000)
