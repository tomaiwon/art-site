#!/usr/bin/env python3
"""
每日思考 Telegram Bot

两种发布流程：
  【每日记录】发文言文给 bot → /daily 润色发布（简短，控制字数）
  【学术思考】在 app 整理好 → 粘贴给 bot → /publish 直接发布（原文不动，只加标题标签）

指令：
  /daily   — 发布每日记录（bot 润色文言文）
  /publish — 发布学术思考（原文发布）
  /preview — 预览整理结果
  /cancel  — 清空重来
"""

import os, json, base64, datetime, io
import urllib.request, urllib.error
from docx import Document
from openai import OpenAI
from telegram import Update, InlineKeyboardButton, InlineKeyboardMarkup
from telegram.ext import (
    ApplicationBuilder, CommandHandler, MessageHandler,
    CallbackQueryHandler, ContextTypes, filters
)

# ── 配置 ──────────────────────────────────────────────────────────
INSERT_MARK   = '<!-- ==================== ENTRIES ==================== -->'
THOUGHTS_PATH = 'thoughts.html'
DOCS_DIR      = 'files/thoughts'

def _load_config():
    cfg = {}
    path = os.path.expanduser('~/.thoughts_bot_config')
    if os.path.exists(path):
        for line in open(path):
            line = line.strip()
            if '=' in line and not line.startswith('#'):
                k, v = line.split('=', 1)
                cfg[k.strip()] = v.strip()
    for key in ('TELEGRAM_BOT_TOKEN', 'OPENAI_API_KEY', 'ALLOWED_USER_ID',
                'GITHUB_TOKEN', 'GITHUB_REPO'):
        if os.environ.get(key):
            cfg[key] = os.environ[key]
    return cfg

CFG        = _load_config()
BOT_TOKEN  = CFG.get('TELEGRAM_BOT_TOKEN', '')
OPENAI_KEY = CFG.get('OPENAI_API_KEY', '')
ALLOWED_ID = int(CFG.get('ALLOWED_USER_ID', '0'))
GH_TOKEN   = CFG.get('GITHUB_TOKEN', '')
GH_REPO    = CFG.get('GITHUB_REPO', '')

ai = OpenAI(api_key=OPENAI_KEY) if OPENAI_KEY else None

# ── 缓冲 ──────────────────────────────────────────────────────────
sessions: dict[int, list[str]] = {}
drafts:   dict[int, dict]      = {}

# ── Prompts ───────────────────────────────────────────────────────
PROMPT_DAILY = """你是作者的文字助手。作者用文言文写了今天的日常记录，你需要：

1. 提炼一个简洁标题（文言风格，10字以内）
2. 将内容润色为简洁古雅的文言文，保留原意，控制在 80-120 字之间，1-2 段
3. 提取 2-4 个关键词作为标签

以 JSON 格式返回：
{"title": "...", "paragraphs": ["..."], "tags": ["..."]}
只返回 JSON。"""

PROMPT_THOUGHT = """你是作者的发布助手。作者已经写好了学术思考内容，你需要：

1. 提炼一个简洁标题（中文为主，可含英文，15字以内）
2. 写一段简要摘要（2-3句，概括核心论点，供网页展示）
3. 将正文原文照搬，按段落分开，供下载文档使用
4. 提取 3-5 个关键词作为标签（中英均可）

以 JSON 格式返回：
{"title": "...", "summary": "两三句摘要", "paragraphs": ["第一段原文", "第二段原文"], "tags": ["..."]}
只返回 JSON。"""

def call_gpt(messages: list[str], prompt: str) -> dict:
    text = '\n\n'.join(messages)
    response = ai.chat.completions.create(
        model='gpt-4o',
        response_format={'type': 'json_object'},
        messages=[
            {'role': 'system', 'content': prompt},
            {'role': 'user',   'content': text},
        ],
    )
    return json.loads(response.choices[0].message.content)

# ── HTML ──────────────────────────────────────────────────────────
def build_article(data: dict, date_str: str, doc_url: str = None) -> str:
    if doc_url:
        # 学术思考：摘要 + 下载链接
        body = f'<p>{data["summary"]}</p>\n      <p><a href="{doc_url}" download style="color:#888;font-size:13px;letter-spacing:1px;">↓ DOWNLOAD FULL TEXT</a></p>'
    else:
        # 每日记录：完整段落
        body = '\n      '.join(f'<p>{p}</p>' for p in data['paragraphs'])
    tags  = '\n      '.join(f'<span class="tag">{t}</span>' for t in data.get('tags', []))
    tag_block = f'\n    <div class="entry-tags">\n      {tags}\n    </div>' if tags else ''
    return f'''
  <article class="entry" id="{date_str}">
    <div class="entry-header">
      <span class="entry-date">{date_str.replace("-", ".")}</span>
      <span class="entry-title">{data["title"]}</span>
    </div>
    <div class="entry-body">
      {body}
    </div>{tag_block}
  </article>
'''

# ── GitHub API ────────────────────────────────────────────────────
def _gh_request(method: str, path: str, body: dict = None):
    url  = f'https://api.github.com/repos/{GH_REPO}/contents/{path}'
    data = json.dumps(body).encode() if body else None
    req  = urllib.request.Request(url, data=data, method=method)
    req.add_header('Authorization', f'Bearer {GH_TOKEN}')
    req.add_header('Accept', 'application/vnd.github+json')
    req.add_header('Content-Type', 'application/json')
    with urllib.request.urlopen(req) as r:
        return json.loads(r.read())

def github_update(article: str, date_str: str) -> tuple[bool, str]:
    try:
        resp     = _gh_request('GET', THOUGHTS_PATH)
        sha      = resp['sha']
        html     = base64.b64decode(resp['content']).decode('utf-8')
        if INSERT_MARK not in html:
            return False, '找不到 thoughts.html 里的标记位置'
        # 新条目插入 ENTRIES 标记之后（置顶）
        new_html = html.replace(INSERT_MARK, INSERT_MARK + '\n' + article)
        _gh_request('PUT', THOUGHTS_PATH, {
            'message': f'thoughts: {date_str}',
            'content': base64.b64encode(new_html.encode('utf-8')).decode(),
            'sha': sha,
        })
        return True, ''
    except urllib.error.HTTPError as e:
        return False, f'GitHub API 错误 {e.code}: {e.read().decode()}'
    except Exception as e:
        return False, str(e)

def _set_font(run, size_pt):
    from docx.shared import Pt
    from docx.oxml.ns import qn
    from lxml import etree
    run.font.name = 'Times New Roman'
    run.font.size = Pt(size_pt)
    # 设置中文字体
    rPr = run._r.get_or_add_rPr()
    rFonts = rPr.find(qn('w:rFonts'))
    if rFonts is None:
        rFonts = etree.SubElement(rPr, qn('w:rFonts'))
    rFonts.set(qn('w:eastAsia'), 'SimSun')

def github_upload_docx(data: dict, date_str: str) -> tuple[bool, str]:
    """生成 .docx 并上传到仓库，返回 (ok, url_or_error)"""
    try:
        from docx.shared import Pt
        doc = Document()
        # 标题
        title_para = doc.add_paragraph()
        run = title_para.add_run(data['title'])
        run.bold = True
        _set_font(run, 16)
        # 正文段落
        for para in data['paragraphs']:
            p = doc.add_paragraph()
            run = p.add_run(para)
            _set_font(run, 12)
        buf = io.BytesIO()
        doc.save(buf)
        docx_bytes = buf.getvalue()

        path = f'{DOCS_DIR}/{date_str}.docx'
        # 检查是否已存在（获取 sha）
        try:
            existing = _gh_request('GET', path)
            sha = existing['sha']
        except urllib.error.HTTPError:
            sha = None

        body = {
            'message': f'thoughts-doc: {date_str}',
            'content': base64.b64encode(docx_bytes).decode(),
        }
        if sha:
            body['sha'] = sha
        _gh_request('PUT', path, body)
        url = f'https://yihuang.art/{path}'
        return True, url
    except urllib.error.HTTPError as e:
        return False, f'GitHub API 错误 {e.code}: {e.read().decode()}'
    except Exception as e:
        return False, str(e)

# ── 共用发布逻辑 ──────────────────────────────────────────────────
async def _do_publish(update, uid, data):
    date_str = datetime.date.today().strftime('%Y-%m-%d')
    article  = build_article(data, date_str)
    ok, err  = github_update(article, date_str)
    if not ok:
        await update.message.reply_text(f'❌ 发布失败：{err}')
        return
    sessions[uid] = []
    drafts.pop(uid, None)
    await update.message.reply_text(
        f'✅ 已发布《{data["title"]}》\n'
        f'https://yihuang.art/thoughts.html#{date_str}'
    )

# ── Handlers ──────────────────────────────────────────────────────
def is_allowed(update: Update) -> bool:
    return ALLOWED_ID == 0 or update.effective_user.id == ALLOWED_ID

async def cmd_start(update: Update, ctx: ContextTypes.DEFAULT_TYPE):
    if not is_allowed(update): return
    sessions[update.effective_user.id] = []
    await update.message.reply_text(
        '你好！\n\n'
        '【每日记录】发文言文 → /daily 润色发布\n'
        '【学术思考】粘贴写好的内容 → /publish 直接发布\n\n'
        '/preview — 预览整理结果\n'
        '/cancel  — 清空重来'
    )

async def cmd_cancel(update: Update, ctx: ContextTypes.DEFAULT_TYPE):
    if not is_allowed(update): return
    uid = update.effective_user.id
    sessions[uid] = []
    drafts.pop(uid, None)
    await update.message.reply_text('已清空，重新开始吧。')

async def cmd_preview(update: Update, ctx: ContextTypes.DEFAULT_TYPE):
    if not is_allowed(update): return
    uid  = update.effective_user.id
    msgs = sessions.get(uid, [])
    if not msgs:
        await update.message.reply_text('还没有内容，先发一些内容吧。')
        return
    await update.message.reply_text('整理预览中…')
    try:
        # preview 默认用学术思考模式
        data = call_gpt(msgs, PROMPT_THOUGHT)
        drafts[uid] = data
        tags_str = '  '.join(f'#{t}' for t in data.get('tags', []))
        text = f'📝 《{data["title"]}》\n\n' + '\n\n'.join(data['paragraphs'])
        if tags_str:
            text += f'\n\n{tags_str}'
        text += '\n\n——\n/publish 发布  /daily 以每日记录发布  /cancel 清空'
        await update.message.reply_text(text)
    except Exception as e:
        await update.message.reply_text(f'❌ 出错了：{e}')

def _daily_keyboard():
    return InlineKeyboardMarkup([[
        InlineKeyboardButton('✅ 发布', callback_data='daily_confirm'),
        InlineKeyboardButton('🔄 重新生成', callback_data='daily_retry'),
        InlineKeyboardButton('❌ 清空', callback_data='cancel'),
    ]])

def _thought_keyboard():
    return InlineKeyboardMarkup([[
        InlineKeyboardButton('✅ 发布', callback_data='thought_confirm'),
        InlineKeyboardButton('❌ 清空', callback_data='cancel'),
    ]])

async def _show_daily_preview(update, uid, data):
    drafts[uid] = ('daily', data)
    tags_str = '  '.join(f'#{t}' for t in data.get('tags', []))
    text = f'📝 《{data["title"]}》\n\n' + '\n\n'.join(data['paragraphs'])
    if tags_str:
        text += f'\n\n{tags_str}'
    await update.message.reply_text(text, reply_markup=_daily_keyboard())

async def cmd_daily(update: Update, ctx: ContextTypes.DEFAULT_TYPE):
    """每日记录：bot 润色文言文后发布"""
    if not is_allowed(update): return
    uid  = update.effective_user.id
    msgs = sessions.get(uid, [])
    if not msgs:
        await update.message.reply_text('还没有内容，先发文言文记录吧。')
        return
    await update.message.reply_text('润色中…')
    try:
        data = call_gpt(msgs, PROMPT_DAILY)
        await _show_daily_preview(update, uid, data)
    except Exception as e:
        await update.message.reply_text(f'❌ 出错了：{e}')

async def cmd_publish(update: Update, ctx: ContextTypes.DEFAULT_TYPE):
    """学术思考：预览后用按钮发布"""
    if not is_allowed(update): return
    uid  = update.effective_user.id
    msgs = sessions.get(uid, [])
    if not msgs:
        await update.message.reply_text('还没有内容，先粘贴内容吧。')
        return
    await update.message.reply_text('整理中…')
    try:
        data = call_gpt(msgs, PROMPT_THOUGHT)
        drafts[uid] = ('thought', data)
        tags_str = '  '.join(f'#{t}' for t in data.get('tags', []))
        text = f'📝 《{data["title"]}》\n\n' + '\n\n'.join(data['paragraphs'])
        if tags_str:
            text += f'\n\n{tags_str}'
        await update.message.reply_text(text, reply_markup=_thought_keyboard())
    except Exception as e:
        await update.message.reply_text(f'❌ 出错了：{e}')

async def on_button(update: Update, ctx: ContextTypes.DEFAULT_TYPE):
    query = update.callback_query
    await query.answer()
    uid = query.from_user.id
    if ALLOWED_ID != 0 and uid != ALLOWED_ID:
        return

    action = query.data

    if action == 'cancel':
        sessions[uid] = []
        drafts.pop(uid, None)
        await query.edit_message_text('已清空，重新开始吧。')

    elif action == 'daily_confirm':
        draft = drafts.get(uid)
        if not draft or not isinstance(draft, tuple):
            await query.edit_message_text('草稿已过期，请重发 /daily。')
            return
        _, data = draft
        await query.edit_message_text('发布中…')
        date_str = datetime.date.today().strftime('%Y-%m-%d')
        ok, err  = github_update(build_article(data, date_str), date_str)
        if ok:
            sessions[uid] = []
            drafts.pop(uid, None)
            await query.edit_message_text(
                f'✅ 已发布《{data["title"]}》\nhttps://yihuang.art/thoughts.html#{date_str}')
        else:
            await query.edit_message_text(f'❌ 发布失败：{err}')

    elif action == 'daily_retry':
        msgs = sessions.get(uid, [])
        if not msgs:
            await query.edit_message_text('消息已丢失，请重新发送内容。')
            return
        await query.edit_message_text('重新润色中…')
        try:
            data = call_gpt(msgs, PROMPT_DAILY)
            drafts[uid] = ('daily', data)
            tags_str = '  '.join(f'#{t}' for t in data.get('tags', []))
            text = f'📝 《{data["title"]}》\n\n' + '\n\n'.join(data['paragraphs'])
            if tags_str:
                text += f'\n\n{tags_str}'
            await ctx.bot.send_message(uid, text, reply_markup=_daily_keyboard())
        except Exception as e:
            await ctx.bot.send_message(uid, f'❌ 出错了：{e}')

    elif action == 'thought_confirm':
        draft = drafts.get(uid)
        if not draft or not isinstance(draft, tuple):
            await query.edit_message_text('草稿已过期，请重发 /publish。')
            return
        _, data = draft
        await query.edit_message_text('上传文档中…')
        date_str = datetime.date.today().strftime('%Y-%m-%d')
        ok, doc_url = github_upload_docx(data, date_str)
        if not ok:
            await query.edit_message_text(f'❌ 文档上传失败：{doc_url}')
            return
        ok, err = github_update(build_article(data, date_str, doc_url), date_str)
        if ok:
            sessions[uid] = []
            drafts.pop(uid, None)
            await query.edit_message_text(
                f'✅ 已发布《{data["title"]}》\nhttps://yihuang.art/thoughts.html#{date_str}')
        else:
            await query.edit_message_text(f'❌ 发布失败：{err}')

async def on_message(update: Update, ctx: ContextTypes.DEFAULT_TYPE):
    if not is_allowed(update): return
    uid = update.effective_user.id
    if uid not in sessions:
        sessions[uid] = []
    text = update.message.text.strip()
    if text:
        sessions[uid].append(text)
        await update.message.reply_text('✓ 收到。\n/daily 每日记录  /publish 学术思考  /preview 预览')

# ── 主入口 ────────────────────────────────────────────────────────
def main():
    if not BOT_TOKEN:
        print('❌ 缺少 TELEGRAM_BOT_TOKEN'); return
    if not OPENAI_KEY:
        print('❌ 缺少 OPENAI_API_KEY'); return
    if not GH_TOKEN or not GH_REPO:
        print('❌ 缺少 GITHUB_TOKEN 或 GITHUB_REPO'); return
    if not ALLOWED_ID:
        print('⚠️  ALLOWED_USER_ID 未设置，任何人都能使用此 bot')

    app = ApplicationBuilder().token(BOT_TOKEN).build()
    app.add_handler(CommandHandler('start',   cmd_start))
    app.add_handler(CommandHandler('cancel',  cmd_cancel))
    app.add_handler(CommandHandler('preview', cmd_preview))
    app.add_handler(CommandHandler('daily',   cmd_daily))
    app.add_handler(CommandHandler('publish', cmd_publish))
    app.add_handler(CallbackQueryHandler(on_button))
    app.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, on_message))

    print('Bot 运行中…  Ctrl+C 停止')
    app.run_polling()

if __name__ == '__main__':
    main()
