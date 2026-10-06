# -*- coding: utf-8 -*-
"""补 platformHeadingPrefix（标题的括号样式，三语不同）。

事故：英文报告里出现了中文书名号 —— `【Target platform and bitness】`。
原因是 buildPlatformBlock 里把 `【` `】` 硬写死了。
这类「文案对了但符号不对」的问题不会报错，只能靠肉眼看输出发现。
"""
import io
import re

PATH = r"E:\APP\GitHub\dsh-requirement-check\src\i18n.js"
src = io.open(PATH, encoding="utf-8", newline=None).read()

ADD = {
    "zh-CN": "    platformHeadingPrefix: '【',\n    platformHeadingSuffix: '】',\n",
    "zh-TW": "    platformHeadingPrefix: '【',\n    platformHeadingSuffix: '】',\n",
    "en": "    platformHeadingPrefix: '',\n    platformHeadingSuffix: ':',\n",
}

for loc in ("en", "zh-TW", "zh-CN"):
    start = "  en: {" if loc == "en" else "'%s': {" % loc
    s = src.index(start)
    if loc == "en":
        e = len(src)
    elif loc == "zh-TW":
        e = src.index("  en: {", s)
    else:
        e = src.index("'zh-TW': {", s)
    seg = src[s:e]
    anchor = "    platformHeading: "
    assert anchor in seg, loc + " 定位失败"
    seg2 = seg.replace(anchor, ADD[loc] + anchor, 1)
    assert seg2 != seg, loc + " 插入失败"
    src = src[:s] + seg2 + src[e:]
    print("已补:", loc)

io.open(PATH, "w", encoding="utf-8", newline="\r\n").write(src)


def block(loc):
    if loc == "en":
        s = src.index("  en: {")
        return src[s:]
    s = src.index("'%s': {" % loc)
    e = src.index("  en: {", s) if loc == "zh-TW" else src.index("'zh-TW': {", s)
    return src[s:e]


KEYS = ["platformHeadingPrefix", "platformHeadingSuffix"]
ok = True
for loc in ("zh-CN", "zh-TW", "en"):
    t = block(loc)
    counts = {k: len(re.findall(r"\b%s\s*:" % k, t)) for k in KEYS}
    bad = {k: c for k, c in counts.items() if c != 1}
    print("  %-7s %s" % (loc, "各 1 次" if not bad else "异常 " + str(bad)))
    if bad:
        ok = False

tops = {loc: len(set(re.findall(r"\n    ([A-Za-z][A-Za-z0-9_]*)\s*:", block(loc)))) for loc in ("zh-CN", "zh-TW", "en")}
print("  顶层键数:", tops, "一致:", len(set(tops.values())) == 1)
print("\n" + ("通过" if ok and len(set(tops.values())) == 1 else "仍有问题"))
