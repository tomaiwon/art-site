#!/usr/bin/env python3
"""往「作品图集」加一张作品。

    python3 projects/gallery/add_work.py 图片路径 --title "作品名" [--en "English title"]
        [--year 2026.10] [--note "一句说明"] [--alt "图像描述"] [--slug 文件名]
        [--push] [--no-upload] [--keep-location]
    python3 projects/gallery/add_work.py --push      # 只把 projects/gallery/ 已有的改动推上线

做的事:
  1. 生成两张去掉元数据的 WebP 预览(网格用 thumb、放大用 view),存进 previews/;
  2. 把原图原样上传到 GitHub Release「gallery」(不进 git 仓库,单个文件上限 2 GB);
  3. 把作品写进 works.json 最前面;
  4. 加 --push 则只提交 projects/gallery 下这次的改动并推送,约 1 分钟后上线。

原图带拍摄地点(GPS)时默认拒绝上传,请导出一份不含位置信息的再传,或确认后加 --keep-location。
"""
import argparse
import json
import re
import shutil
import subprocess
import sys
import tempfile
from datetime import datetime
from pathlib import Path

from PIL import Image, ImageOps

REPO = "tomaiwon/art-site"
TAG = "gallery"
HERE = Path(__file__).resolve().parent
ROOT = HERE.parent.parent
MANIFEST = HERE / "works.json"
PREVIEWS = HERE / "previews"
THUMB_WIDTH = 1000  # 网格最宽约 500px,按 2 倍屏
VIEW_EDGE = 2400  # 放大查看的长边
Image.MAX_IMAGE_PIXELS = None  # 高清原图可能超过 Pillow 的默认像素上限


def run(*cmd, check=True, **kw):
    return subprocess.run(cmd, check=check, text=True, capture_output=True, **kw)


def make_slug(text, taken):
    base = re.sub(r"[^a-z0-9]+", "-", text.lower()).strip("-") or datetime.now().strftime("work-%Y%m%d-%H%M%S")
    slug, n = base, 2
    while slug in taken:
        slug, n = f"{base}-{n}", n + 1
    return slug


def has_location(path):
    out = run("mdls", "-raw", "-name", "kMDItemLatitude", str(path), check=False).stdout.strip()
    return out not in ("", "(null)")


def open_image(path, tmp):
    try:
        img = Image.open(path)
        img.load()
    except Exception:
        # HEIC 等 Pillow 读不了的格式,先用 macOS 自带 sips 转一份 PNG 来做预览
        png = Path(tmp) / "decoded.png"
        run("sips", "-s", "format", "png", str(path), "--out", str(png))
        img = Image.open(png)
        img.load()
    img = ImageOps.exif_transpose(img)
    return img.convert("RGBA" if "A" in img.getbands() else "RGB")


def save_webp(img, dest, size):
    copy = img.copy()
    copy.thumbnail(size, Image.LANCZOS)
    copy.save(dest, "WEBP", quality=84, method=6)
    return copy.size


def ensure_release():
    if run("gh", "release", "view", TAG, "-R", REPO, check=False).returncode == 0:
        return
    run("gh", "release", "create", TAG, "-R", REPO, "--latest=false",
        "--title", "作品图集 Gallery · 原图",
        "--notes", "yihuang.art/projects/gallery/ 的高清原图。网页只放预览,原图在这里。")


def publish(paths, message):
    git = lambda *a: run("git", "-C", str(ROOT), *a)
    git("pull", "--ff-only", "origin", "main")
    git("add", *map(str, paths))
    if run("git", "-C", str(ROOT), "diff", "--cached", "--quiet", check=False).returncode == 0:
        print("没有需要推送的改动。")
        return
    git("commit", "-m", message)
    git("push", "origin", "main")
    print("已推送,约 1 分钟后在 https://yihuang.art/projects/gallery/ 上线。")


def main():
    ap = argparse.ArgumentParser(description="往作品图集加一张作品")
    ap.add_argument("image", type=Path, nargs="?")
    ap.add_argument("--title")
    ap.add_argument("--en", default="")
    ap.add_argument("--year", default=datetime.now().strftime("%Y.%m"))
    ap.add_argument("--note", default="")
    ap.add_argument("--alt", default="")
    ap.add_argument("--slug", default="")
    ap.add_argument("--push", action="store_true", help="提交并推送到网站")
    ap.add_argument("--no-upload", action="store_true", help="只在本地生成预览和清单,不上传原图")
    ap.add_argument("--keep-location", action="store_true", help="原图带 GPS 也照样上传")
    args = ap.parse_args()

    if args.image is None:
        if not args.push:
            ap.error("请给出图片路径;只推送已有改动用 --push")
        publish([HERE], "gallery: update")
        return
    if not args.title:
        ap.error("请用 --title 给作品起名")

    src = args.image.expanduser().resolve()
    if not src.is_file():
        sys.exit(f"找不到文件:{src}")
    if not args.no_upload and not args.keep_location and has_location(src):
        sys.exit("这张图带拍摄地点(GPS)。请导出一份不含位置信息的再传"
                 "(照片 App:文件 → 导出 → 取消勾选「位置信息」),或确认后加 --keep-location。")

    data = json.loads(MANIFEST.read_text("utf-8"))
    works = data["works"]
    slug = make_slug(args.slug or args.en or src.stem, {w["id"] for w in works})
    ext = src.suffix.lower().lstrip(".").replace("jpeg", "jpg")
    filename = f"{slug}.{ext}"

    PREVIEWS.mkdir(exist_ok=True)
    with tempfile.TemporaryDirectory() as tmp:
        img = open_image(src, tmp)
        width, height = img.size
        thumb_w, thumb_h = save_webp(img, PREVIEWS / f"{slug}-thumb.webp", (THUMB_WIDTH, THUMB_WIDTH * 4))
        save_webp(img, PREVIEWS / f"{slug}.webp", (VIEW_EDGE, VIEW_EDGE))

        if not args.no_upload:
            ensure_release()
            staged = Path(tmp) / filename
            shutil.copy2(src, staged)
            print(f"上传原图 {filename}({src.stat().st_size / 1e6:.1f} MB)…")
            run("gh", "release", "upload", TAG, str(staged), "-R", REPO, "--clobber")

    works.insert(0, {
        "id": slug,
        "title": args.title,
        "title_en": args.en,
        "year": args.year,
        "note": args.note,
        "alt": args.alt or args.title,
        "file": filename,
        "width": width,
        "height": height,
        "bytes": src.stat().st_size,
        "thumb": f"previews/{slug}-thumb.webp",
        "thumb_width": thumb_w,
        "thumb_height": thumb_h,
        "view": f"previews/{slug}.webp",
    })
    MANIFEST.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", "utf-8")
    print(f"已加入作品图集:{args.title}({slug},{width}×{height})")

    if args.push:
        publish([MANIFEST, PREVIEWS / f"{slug}-thumb.webp", PREVIEWS / f"{slug}.webp"], f"gallery: add {args.title}")
    else:
        print("还没上线:本地看过没问题后,运行 add_work.py --push 推送。")


if __name__ == "__main__":
    main()
