#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""把 src/ 下的样式与脚本内联成单个可直接双击打开的 HTML 文件。"""
import os
import sys

ROOT = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(ROOT, "src")
OUT = os.path.join(ROOT, "傅里叶变换可视化实验台.html")

JS_ORDER = [
    "math.js",
    "core.js",
    "signals.js",
    "props.js",
    "chart.js",
    "ui.js",
    "lab.js",
    "propsview.js",
    "pairsview.js",
    "sysview.js",
    "main.js",
]


def read(path):
    with open(path, "r", encoding="utf-8") as fh:
        return fh.read()


def main():
    tpl = read(os.path.join(SRC, "index.tpl.html"))
    css = read(os.path.join(SRC, "style.css"))

    parts = []
    for name in JS_ORDER:
        path = os.path.join(SRC, "js", name)
        if not os.path.exists(path):
            print("missing js: %s" % path, file=sys.stderr)
            return 1
        parts.append("/* ===== %s ===== */\n%s" % (name, read(path)))
    js = "\n\n".join(parts)

    html = tpl.replace("@@CSS", css).replace("@@JS", js)
    with open(OUT, "w", encoding="utf-8") as fh:
        fh.write(html)
    print("built %s  (%.1f KB)" % (OUT, len(html.encode("utf-8")) / 1024.0))
    return 0


if __name__ == "__main__":
    sys.exit(main())
