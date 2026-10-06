# -*- coding: utf-8 -*-
"""补回被锚点替换吃掉的 scope-out 与 delivery 的 spotTitles 键。

事故原因：我的锚点字符串把 delivery 那一行也包含进去了，
str.replace 时整段被替换掉，于是 delivery 连同 scope-out 一起丢失。
（scope-out 是被更早的那次替换吃掉的，同样原因。）

教训：锚点应当只包含「插入点」，不要包含要保留的内容。
本脚本按语言块精确定位并补回，最后做完整性校验。
"""
import io
import re

PATH = r"E:\APP\GitHub\dsh-requirement-check\src\i18n.js"
src = io.open(PATH, encoding="utf-8", newline=None).read()

# 要补的内容：放在 goal 之后（与原文顺序一致：goal, scope-out, done）
ADD = {
    "zh-CN": [
        ("      goal: '要做什么（一句话目标）',\n",
         "      'scope-out': '明确不做什么（范围边界）',\n"),
        ("      reference: '参照物或样例（有就更好）',\n",
         "      delivery: '怎么交付、以后怎么打开（使用方式）',\n"),
    ],
    "zh-TW": [
        ("      goal: '要做什麼（一句話目標）',\n",
         "      'scope-out': '明確不做什麼（範圍界線）',\n"),
        ("      reference: '參考物或範例（有就更好）',\n",
         "      delivery: '怎麼交付、以後怎麼打開（使用方式）',\n"),
    ],
    "en": [
        ("      goal: 'What to build (one-sentence goal)',\n",
         "      'scope-out': 'What NOT to build (scope boundary)',\n"),
        ("      reference: 'Reference or sample (nice to have)',\n",
         "      delivery: 'How it is delivered and reopened',\n"),
    ],
}


def span(loc):
    if loc == "en":
        s = src.index("  en: {")
        e = len(src)
    elif loc == "zh-TW":
        s = src.index("'zh-TW': {")
        e = src.index("  en: {", s)
    else:
        s = src.index("'zh-CN': {")
        e = src.index("'zh-TW': {", s)
    return s, e


# 从后往前处理，避免位移
for loc in ("en", "zh-TW", "zh-CN"):
    s, e = span(loc)
    seg = src[s:e]
    for anchor, insert in ADD[loc]:
        if insert.strip() in seg:
            print("  %s: %s 已存在，跳过" % (loc, insert.strip().split("'")[1]))
            continue
        assert anchor in seg, "%s 找不到锚点: %r" % (loc, anchor)
        seg = seg.replace(anchor, anchor + insert, 1)
        print("  %s: 补回 %s" % (loc, insert.strip().split("'")[1]))
    src = src[:s] + seg + src[e:]

io.open(PATH, "w", encoding="utf-8", newline="\r\n").write(src)

# ---------------- 完整性校验 ----------------
src = io.open(PATH, encoding="utf-8", newline=None).read()

print("\n=== spotTitles / spotWhy / spotFix 键完整性 ===")
# 盲区 id 列表（与 blindspots.js 的 SPOTS 对应）
IDS = ['goal', 'scope-out', 'done', 'input', 'output', 'error-case', 'operator',
       'environment', 'arch', 'privacy', 'volume', 'frequency', 'pain', 'reference', 'delivery']

ok = True
for loc in ("zh-CN", "zh-TW", "en"):
    s, e = span(loc)
    seg = src[s:e]
    for group in ("spotTitles", "spotWhy", "spotFix"):
        gs = seg.index(group + ": {")
        ge = seg.index("\n    },", gs)
        body = seg[gs:ge]
        missing = []
        for i in IDS:
            pat = r"\n      '%s':" % re.escape(i) if "-" in i else r"\n      %s:" % re.escape(i)
            if not re.search(pat, body):
                missing.append(i)
        if missing:
            ok = False
        print("  %-7s %-11s %d/%d %s" % (loc, group, len(IDS) - len(missing), len(IDS),
                                          "缺: " + str(missing) if missing else "齐全"))

tops = {}
for loc in ("zh-CN", "zh-TW", "en"):
    s, e = span(loc)
    tops[loc] = len(set(re.findall(r"\n    ([A-Za-z][A-Za-z0-9_]*)\s*:", src[s:e])))
print("\n  顶层键数:", tops, "一致:", len(set(tops.values())) == 1)

print("\n" + ("全部通过" if ok and len(set(tops.values())) == 1 else "仍有缺失"))
