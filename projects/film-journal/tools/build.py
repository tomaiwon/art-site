#!/usr/bin/env python3
"""
照片数据生成器
==============
扫描网站里的 images/film-practice-2026/<文件夹>/NNN-900.webp（+ NNN-2000.webp），
生成 js/photos.gen.js：每张照片的尺寸 + 5 色主色板与占比。

加了新照片、或者 content.js 里新增了一个章节文件夹之后，运行：
    python3 projects/film-journal/tools/build.py
也可以指定别的照片根目录：
    python3 projects/film-journal/tools/build.py images/某个文件夹

依赖：pip install opencv-python numpy
"""
import os
import sys
import json

try:
    import cv2
    import numpy as np
except ImportError:
    sys.exit("需要 opencv-python 和 numpy：pip install opencv-python numpy")

HERE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))   # projects/film-journal
SITE = os.path.dirname(os.path.dirname(HERE))                        # 网站根目录
PHOTO_ROOT = os.path.abspath(sys.argv[1]) if len(sys.argv) > 1 else os.path.join(SITE, "images", "film-practice-2026")
GEN = os.path.join(HERE, "js", "photos.gen.js")


def palette(img, k=5):
    """Lab 空间 k-means，返回 [[#HEX, 占比%], ...]，按占比从大到小"""
    h, w = img.shape[:2]
    s = 120 / max(h, w)
    sm = cv2.resize(img, (max(1, round(w * s)), max(1, round(h * s))), interpolation=cv2.INTER_AREA)
    lab = cv2.cvtColor(sm, cv2.COLOR_BGR2LAB).reshape(-1, 3).astype(np.float32)
    cv2.setRNGSeed(7)
    crit = (cv2.TERM_CRITERIA_EPS + cv2.TERM_CRITERIA_MAX_ITER, 40, 0.5)
    _, labels, centers = cv2.kmeans(lab, k, None, crit, 4, cv2.KMEANS_PP_CENTERS)
    counts = np.bincount(labels.ravel(), minlength=k)
    bgr = cv2.cvtColor(np.clip(centers, 0, 255).astype(np.uint8).reshape(1, -1, 3), cv2.COLOR_LAB2BGR).reshape(-1, 3)
    order = [int(i) for i in np.argsort(-counts) if counts[i] > 0]
    total = counts.sum()
    shares = [int(round(100 * counts[i] / total)) for i in order]
    shares[0] += 100 - sum(shares)  # 四舍五入后保证总和 100
    return [["#%02X%02X%02X" % (int(bgr[i][2]), int(bgr[i][1]), int(bgr[i][0])), sh] for i, sh in zip(order, shares)]


def scan():
    data = {}
    for folder in sorted(os.listdir(PHOTO_ROOT)):
        d = os.path.join(PHOTO_ROOT, folder)
        if not os.path.isdir(d):
            continue
        nums = sorted({f.split("-")[0] for f in os.listdir(d) if f.endswith("-900.webp")})
        items = []
        for n in nums:
            small = cv2.imread(os.path.join(d, f"{n}-900.webp"))
            if small is None:
                continue
            big_path = os.path.join(d, f"{n}-2000.webp")
            big = cv2.imread(big_path) if os.path.exists(big_path) else small
            H, W = big.shape[:2]
            items.append({"n": n, "w": W, "h": H, "p": palette(small)})
        if items:
            data[folder] = items
            print(f"  {folder}: {len(items)} 张")
    return data


if __name__ == "__main__":
    print("读取", os.path.relpath(PHOTO_ROOT, SITE))
    data = scan()
    with open(GEN, "w", encoding="utf-8") as f:
        f.write("// 自动生成，请不要手改。重新生成：python3 projects/film-journal/tools/build.py\n")
        f.write("export const PHOTOS = ")
        f.write(json.dumps(data, ensure_ascii=False, separators=(",", ":")))
        f.write(";\n")
    print("完成 ->", os.path.relpath(GEN, SITE))
