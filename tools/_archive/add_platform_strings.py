# -*- coding: utf-8 -*-
"""给 i18n.js 三个语言块补上「目标系统 / 位数」相关的文案键和新的 arch 盲区。"""
import io

PATH = r"E:\APP\GitHub\dsh-requirement-check\src\i18n.js"
src = io.open(PATH, encoding="utf-8", newline=None).read()   # None: 统一转成 \n 便于匹配

# 1) arch 盲区的标题/理由/句式 —— 插在 delivery 之后（各语言块末尾）
SPOT_ADD = {
    "zh-CN": """      arch: '32 位还是 64 位（能不能在对方机器上跑）',
    },
    spotWhy: {""",
    "zh-TW": """      arch: '32 位元還是 64 位元（能不能在對方電腦上跑）',
    },
    spotWhy: {""",
    "en": """      arch: '32-bit or 64-bit (will it run on their machine)',
    },
    spotWhy: {""",
}

WHY_ADD = {
    "zh-CN": """      delivery: '决定最终给你 exe、文件夹还是网页；不写清可能拿到一堆没法直接用的东西。',
      arch: '64 位程序在 32 位系统上跑不起来；不确定时按使用者自己的电脑来做最稳，但要写明。',
    },""",
    "zh-TW": """      delivery: '決定最後給你 exe、資料夾還是網頁；不寫清楚可能拿到一堆沒辦法直接用的東西。',
      arch: '64 位元的程式在 32 位元系統上跑不起來；不確定時照使用者自己的電腦來做最穩，但要寫明。',
    },""",
    "en": """      delivery: 'This decides whether you get an exe, a folder, or a web page; without it you may receive something you cannot run.',
      arch: 'A 64-bit build will not run on a 32-bit system; when unsure, target the user\\'s own machine — but say so explicitly.',
    },""",
}

FIX_ADD = {
    "zh-CN": """      delivery: '句式：给我【一个 exe / 一个文件夹，双击里面某个文件】；要放桌面。',
      arch: '句式：跑在【Windows / macOS / Linux】【32 位 / 64 位】；不确定就按我的电脑来。',
    },""",
    "zh-TW": """      delivery: '句式：給我【一個 exe／一個資料夾，雙擊裡面某個檔案】；要放桌面。',
      arch: '句式：跑在【Windows／macOS／Linux】【32 位元／64 位元】；不確定就照我的電腦來。',
    },""",
    "en": """      delivery: 'Pattern: Give me [an exe / a folder with a file to double-click]; put it on the desktop.',
      arch: 'Pattern: It runs on [Windows / macOS / Linux] [32-bit / 64-bit]; if unsure, follow my own machine.',
    },""",
}

# 2) 新增两个顶层文案键
KEY_ADD = {
    "zh-CN": """    platformHeading: '目标系统与位数',
    platformHowTo: '句式：要跑在【Windows / macOS / Linux】，【32 位 / 64 位】；如果不确定，就按我的电脑来。',
""",
    "zh-TW": """    platformHeading: '目標系統與位元數',
    platformHowTo: '句式：要跑在【Windows／macOS／Linux】，【32 位元／64 位元】；如果不確定，就照我的電腦來。',
""",
    "en": """    platformHeading: 'Target platform and bitness',
    platformHowTo: 'Pattern: It runs on [Windows / macOS / Linux], [32-bit / 64-bit]; if unsure, follow my own machine.',
""",
}

ANCHORS = {
    "zh-CN": {
        "spotTitles_end": "      delivery: '怎么交付、以后怎么打开（使用方式）',\n    },\n    spotWhy: {",
        "why_end": "      delivery: '决定最终给你 exe、文件夹还是网页；不写清可能拿到一堆没法直接用的东西。',\n    },",
        "fix_end": "      delivery: '句式：给我【一个 exe / 一个文件夹，双击里面某个文件】；要放桌面。',\n    },",
        "key_before": "    localeNoteFmt: '（当前语言：",
    },
    "zh-TW": {
        "spotTitles_end": "      delivery: '怎麼交付、以後怎麼打開（使用方式）',\n    },\n    spotWhy: {",
        "why_end": "      delivery: '決定最後給你 exe、資料夾還是網頁；不寫清楚可能拿到一堆沒辦法直接用的東西。',\n    },",
        "fix_end": "      delivery: '句式：給我【一個 exe／一個資料夾，雙擊裡面某個檔案】；要放桌面。',\n    },",
        "key_before": "    localeNoteFmt: '（目前語言：",
    },
    "en": {
        "spotTitles_end": "      delivery: 'How it is delivered and reopened',\n    },\n    spotWhy: {",
        "why_end": '      delivery: \'This decides whether you get an exe, a folder, or a web page; without it you may receive something you cannot run.\',\n    },',
        "fix_end": "      delivery: 'Pattern: Give me [an exe / a folder with a file to double-click]; put it on the desktop.',\n    },",
        "key_before": "    localeNoteFmt: '(Current language: ",
    },
}

for loc in ("zh-CN", "zh-TW", "en"):
    a = ANCHORS[loc]

    # 标题
    assert a["spotTitles_end"] in src, "spotTitles 锚点找不到: " + loc
    src = src.replace(a["spotTitles_end"], SPOT_ADD[loc], 1)

    # 理由
    assert a["why_end"] in src, "why 锚点找不到: " + loc
    src = src.replace(a["why_end"], WHY_ADD[loc], 1)

    # 句式
    assert a["fix_end"] in src, "fix 锚点找不到: " + loc
    src = src.replace(a["fix_end"], FIX_ADD[loc], 1)

    # 顶层键
    assert a["key_before"] in src, "顶层键锚点找不到: " + loc
    src = src.replace(a["key_before"], KEY_ADD[loc] + a["key_before"], 1)
    print("已处理:", loc)

io.open(PATH, "w", encoding="utf-8", newline="\r\n").write(src)  # 写回 CRLF

# 校验
import re
for key in ("platformHeading", "platformHowTo"):
    n = len(re.findall(r"\b%s\s*:" % key, src))
    print("  %s 出现 %d 次（应 3）" % (key, n))
for key in ("arch:",):
    n = len(re.findall(r"\n\s+arch:", src))
    print("  %s 出现 %d 次（应 3）" % (key, n))
print("文件大小:", len(src))
