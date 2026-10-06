# -*- coding: utf-8 -*-
"""修复：上一步把 zh-CN 的文案插了 3 次，zh-TW / en 没插进去。
本脚本按语言块定位，只删掉多余的，再给缺的补上。"""
import io
import re

PATH = r"E:\APP\GitHub\dsh-requirement-check\src\i18n.js"
src = io.open(PATH, encoding="utf-8", newline=None).read()

KEYS = ["paramTarget", "outPlatform", "platformCurrentFmt", "platformTargetFmt", "platformCertainty"]

# 1) 删掉所有已插入的这段（不管在哪个语言块），再重新按块补
block_zhcn = """    paramTarget: '目标系统与位数。默认 auto = 跟随使用者自己的电脑。',
    outPlatform: '本机平台信息（供确认默认值）',
    platformCurrentFmt: '本机：{osLabel} {bits} 位{archNote}',
    platformTargetFmt: '默认目标：{target}',
    platformCertainty: '说明：探测的是运行本插件的机器。若目标用户用的是别的系统或 32 位机器，请以对方为准。',
"""
n = src.count(block_zhcn)
src = src.replace(block_zhcn, "")
print("删除了 %d 处误插的 zh-CN 段落" % n)

# 2) 定位三个语言块，各自补上正确的文案
BLOCKS = {
    "zh-CN": {
        "start": "'zh-CN': {",
        "end": "'zh-TW': {",
        "text": block_zhcn,
    },
    "zh-TW": {
        "start": "'zh-TW': {",
        "end": "  en: {",
        "text": """    paramTarget: '目標系統與位元數。預設 auto = 跟隨使用者自己的電腦。',
    outPlatform: '本機平台資訊（供確認預設值）',
    platformCurrentFmt: '本機：{osLabel} {bits} 位元{archNote}',
    platformTargetFmt: '預設目標：{target}',
    platformCertainty: '說明：偵測的是執行本插件的機器。若目標使用者用的是別的系統或 32 位元機器，請以對方為準。',
""",
    },
    "en": {
        "start": "  en: {",
        "end": None,
        "text": """    paramTarget: "Target platform and bitness. Default auto = follow the user's own machine.",
    outPlatform: 'Local platform info (to confirm the default)',
    platformCurrentFmt: 'Local machine: {osLabel} {bits}-bit{archNote}',
    platformTargetFmt: 'Default target: {target}',
    platformCertainty: 'Note: this detects the machine running the plugin. If the intended user is on a different OS or a 32-bit machine, follow theirs.',
""",
    },
}

for loc in ("en", "zh-TW", "zh-CN"):   # 从后往前插，避免位移影响
    b = BLOCKS[loc]
    s = src.index(b["start"])
    e = src.index(b["end"], s) if b["end"] else len(src)
    seg = src[s:e]
    assert "platformHeading:" in seg, f"{loc} 块里找不到 platformHeading，定位可能错了"
    seg2 = seg.replace("    platformHeading: ", b["text"] + "    platformHeading: ", 1)
    assert seg2 != seg, f"{loc} 插入失败"
    src = src[:s] + seg2 + src[e:]
    print("已补:", loc)

io.open(PATH, "w", encoding="utf-8", newline="\r\n").write(src)

# 3) 校验：每个键在三个块里各出现一次
def block(loc):
    if loc == "en":
        s = src.index("  en: {")
        e = src.index("\n  },", s)
    else:
        s = src.index("'%s': {" % loc)
        e = src.index("\n  },", s)
    return src[s:e]

ok = True
for loc in ("zh-CN", "zh-TW", "en"):
    t = block(loc)
    counts = {k: len(re.findall(r"\b%s\s*:" % k, t)) for k in KEYS}
    bad = {k: c for k, c in counts.items() if c != 1}
    print("  %-7s 各键出现 1 次: %s %s" % (loc, "是" if not bad else "否", bad or ""))
    if bad:
        ok = False

# 顶层键数应一致
tops = {loc: len(set(re.findall(r"\n    ([A-Za-z][A-Za-z0-9_]*)\s*:", block(loc)))) for loc in ("zh-CN", "zh-TW", "en")}
print("  顶层键数:", tops, "一致:", len(set(tops.values())) == 1)
print("\n" + ("修复完成" if ok and len(set(tops.values())) == 1 else "仍需检查"))
