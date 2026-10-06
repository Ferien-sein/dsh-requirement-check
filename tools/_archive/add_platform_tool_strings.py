# -*- coding: utf-8 -*-
"""补上 requirement_platform 工具需要的三语文案键。

教训：上一版脚本用同一个锚点循环三次，结果三段都插进了第一个语言块。
这次按语言块定位，并用计数校验每个键在每块各出现一次。
"""
import io
import re

PATH = r"E:\APP\GitHub\dsh-requirement-check\src\i18n.js"
src = io.open(PATH, encoding="utf-8", newline=None).read()

TEXT = {
    "zh-CN": """    toolPlatformDesc:
      '查看本机（使用者电脑）的操作系统与位数，并给出默认的目标平台。' +
      '当需要确定「这个软件要跑在什么系统、32 位还是 64 位」时使用；' +
      '不特别说明时，默认就按使用者自己的电脑来做。',
    paramSetDefault: '是否把选定的 target 存为默认值（下次不用再传）。',
""",
    "zh-TW": """    toolPlatformDesc:
      '查看本機（使用者電腦）的作業系統與位元數，並給出預設的目標平台。' +
      '當需要確定「這個軟體要跑在什麼系統、32 位元還是 64 位元」時使用；' +
      '沒有特別說明時，預設就照使用者自己的電腦來做。',
    paramSetDefault: '是否把選定的 target 存為預設值（下次不用再傳）。',
""",
    "en": """    toolPlatformDesc:
      "Show the local machine's OS and bitness and the default target platform. " +
      'Use when deciding which system the software must run on and whether 32-bit or 64-bit; ' +
      "when nothing is stated, default to the user's own machine.",
    paramSetDefault: 'Whether to persist the chosen target as the default (so it need not be passed again).',
""",
}

KEYS = ["toolPlatformDesc", "paramSetDefault"]

# 从后往前插，避免位移
for loc in ("en", "zh-TW", "zh-CN"):
    start = "  en: {" if loc == "en" else "'%s': {" % loc
    s = src.index(start)
    # 该块的结束：下一个语言块开头，en 用文件末尾
    if loc == "en":
        e = len(src)
    elif loc == "zh-TW":
        e = src.index("  en: {", s)
    else:
        e = src.index("'zh-TW': {", s)
    seg = src[s:e]
    assert "platformHeading:" in seg, loc + " 块定位错误"
    anchor = "    platformHeading: "
    assert anchor in seg, loc + " 找不到 platformHeading 锚点"
    seg2 = seg.replace(anchor, TEXT[loc] + anchor, 1)
    assert seg2 != seg
    src = src[:s] + seg2 + src[e:]
    print("已补:", loc)

io.open(PATH, "w", encoding="utf-8", newline="\r\n").write(src)


def block(loc):
    if loc == "en":
        s = src.index("  en: {")
        e = src.index("\n  },", s)
    else:
        s = src.index("'%s': {" % loc)
        e = src.index("\n  },", s)
    return src[s:e]


print("\n=== 校验：每键在每块恰好 1 次 ===")
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

# 跨语言污染
SIMPLIFIED = ["预设", "目标", "位数", "说明", "系统", "电脑", "资讯", "验证", "选择"]
TRADITIONAL = ["預設", "目標", "位元", "說明", "系統", "電腦", "資訊", "選擇"]
bad_tw = [w for w in SIMPLIFIED if w in block("zh-TW")]
bad_cn = [w for w in TRADITIONAL if w in block("zh-CN")]
print("  zh-TW 简体泄漏:", bad_tw or "无")
print("  zh-CN 繁体泄漏:", bad_cn or "无")
if bad_tw or bad_cn:
    ok = False

print("\n" + ("通过" if ok and len(set(tops.values())) == 1 else "仍有问题"))
