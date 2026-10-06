# -*- coding: utf-8 -*-
"""补上目标平台参数相关的三语文案键。"""
import io
import re

PATH = r"E:\APP\GitHub\dsh-requirement-check\src\i18n.js"
src = io.open(PATH, encoding="utf-8", newline=None).read()

ADD = {
    "zh-CN": """    paramTarget: '目标系统与位数。默认 auto = 跟随使用者自己的电脑。',
    outPlatform: '本机平台信息（供确认默认值）',
    platformCurrentFmt: '本机：{osLabel} {bits} 位{archNote}',
    platformTargetFmt: '默认目标：{target}',
    platformCertainty: '说明：探测的是运行本插件的机器。若目标用户用的是别的系统或 32 位机器，请以对方为准。',
""",
    "zh-TW": """    paramTarget: '目標系統與位元數。預設 auto = 跟隨使用者自己的電腦。',
    outPlatform: '本機平台資訊（供確認預設值）',
    platformCurrentFmt: '本機：{osLabel} {bits} 位元{archNote}',
    platformTargetFmt: '預設目標：{target}',
    platformCertainty: '說明：偵測的是執行本插件的機器。若目標使用者用的是別的系統或 32 位元機器，請以對方為準。',
""",
    "en": """    paramTarget: "Target platform and bitness. Default auto = follow the user's own machine.",
    outPlatform: 'Local platform info (to confirm the default)',
    platformCurrentFmt: 'Local machine: {osLabel} {bits}-bit{archNote}',
    platformTargetFmt: 'Default target: {target}',
    platformCertainty: 'Note: this detects the machine running the plugin. If the intended user is on a different OS or a 32-bit machine, follow theirs.',
""",
}

ANCHOR = {
    "zh-CN": "    platformHeading: '",
    "zh-TW": "    platformHeading: '",
    "en": "    platformHeading: '",
}

for loc in ("zh-CN", "zh-TW", "en"):
    a = ANCHOR[loc]
    # 每个语言块各插一次，按顺序找
    idx = src.index(a)
    src = src[:idx] + ADD[loc] + src[idx:]
    print("已插入:", loc)

io.open(PATH, "w", encoding="utf-8", newline="\r\n").write(src)

for key in ("paramTarget", "outPlatform", "platformCurrentFmt", "platformTargetFmt", "platformCertainty"):
    n = len(re.findall(r"\b%s\s*:" % key, src))
    print("  %-22s 出现 %d 次（应 3）" % (key, n))
