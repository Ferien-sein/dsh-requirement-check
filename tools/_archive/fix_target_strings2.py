# -*- coding: utf-8 -*-
"""清理：zh-TW / en 的段落被误插进了 zh-CN 块，删掉它们。

同时加一道校验：每个语言块里不应出现其它语言的特征词。
这类「插错块」的问题不报错、只会让某个语言显示错文案，很难靠肉眼发现。
"""
import io
import re

PATH = r"E:\APP\GitHub\dsh-requirement-check\src\i18n.js"
src = io.open(PATH, encoding="utf-8", newline=None).read()

s = src.index("'zh-CN': {")
e = src.index("'zh-TW': {")
blk = src[s:e]

# 要删掉的两段：繁体版和英文版
TW_SEG = """    paramTarget: '目標系統與位元數。預設 auto = 跟隨使用者自己的電腦。',
    outPlatform: '本機平台資訊（供確認預設值）',
    platformCurrentFmt: '本機：{osLabel} {bits} 位元{archNote}',
    platformTargetFmt: '預設目標：{target}',
    platformCertainty: '說明：偵測的是執行本插件的機器。若目標使用者用的是別的系統或 32 位元機器，請以對方為準。',
"""
EN_SEG = """    paramTarget: "Target platform and bitness. Default auto = follow the user's own machine.",
    outPlatform: 'Local platform info (to confirm the default)',
    platformCurrentFmt: 'Local machine: {osLabel} {bits}-bit{archNote}',
    platformTargetFmt: 'Default target: {target}',
    platformCertainty: 'Note: this detects the machine running the plugin. If the intended user is on a different OS or a 32-bit machine, follow theirs.',
"""

removed = 0
for seg, name in ((TW_SEG, "繁体"), (EN_SEG, "英文")):
    if seg in blk:
        blk = blk.replace(seg, "")
        removed += 1
        print("从 zh-CN 块删除误插的%s段落" % name)
    else:
        print("zh-CN 块里没有%s段落（无需处理）" % name)

src = src[:s] + blk + src[e:]
io.open(PATH, "w", encoding="utf-8", newline="\r\n").write(src)
print("共删除 %d 段\n" % removed)

# ---------------- 校验 ----------------
src = io.open(PATH, encoding="utf-8", newline=None).read()


def block(loc):
    if loc == "en":
        s = src.index("  en: {")
        e = src.index("\n  },", s)
    else:
        s = src.index("'%s': {" % loc)
        e = src.index("\n  },", s)
    return src[s:e]


KEYS = ["paramTarget", "outPlatform", "platformCurrentFmt", "platformTargetFmt", "platformCertainty"]

print("=== 每键在每块出现次数 ===")
ok = True
for loc in ("zh-CN", "zh-TW", "en"):
    t = block(loc)
    counts = {k: len(re.findall(r"\b%s\s*:" % k, t)) for k in KEYS}
    bad = {k: c for k, c in counts.items() if c != 1}
    print("  %-7s %s" % (loc, "各 1 次" if not bad else "异常: %s" % bad))
    if bad:
        ok = False

# 语言特征词：块里不应出现别的语言的标志性字符
MARKERS = {
    "zh-CN": {"简": ["简体中文", "预设", "预设值", "目标", "位数", "位元数"]},
    "zh-TW": {"繁": ["繁體中文", "預設", "目標", "位元數", "說明"]},
    "en": {"英": ["Simplified", "Traditional", "Default target"]},
}

# 繁体的判别字（简体不该出现）
SIMPLIFIED_IN_TRAD = ["预设", "目标", "位数", "说明", "系统", "电脑", "资讯", "验证"]
TRADITIONAL_IN_SIMP = ["預設", "目標", "位元", "說明", "系統", "電腦", "資訊"]

print("\n=== 跨语言污染检查 ===")
tw = block("zh-TW")
cn = block("zh-CN")
bad_tw = [w for w in SIMPLIFIED_IN_TRAD if w in tw]
bad_cn = [w for w in TRADITIONAL_IN_SIMP if w in cn]
print("  zh-TW 里出现简体词:", bad_tw or "无")
print("  zh-CN 里出现繁体词:", bad_cn or "无")
if bad_tw or bad_cn:
    ok = False

tops = {loc: len(set(re.findall(r"\n    ([A-Za-z][A-Za-z0-9_]*)\s*:", block(loc)))) for loc in ("zh-CN", "zh-TW", "en")}
print("\n  顶层键数:", tops, "一致:", len(set(tops.values())) == 1)
if len(set(tops.values())) != 1:
    ok = False

print("\n" + ("全部通过" if ok else "仍有问题，需检查"))
