# -*- coding: utf-8 -*-
"""给 i18n.js 的三个语言块补上「语言开关」工具需要的文案键。"""
import io
import re

PATH = r"E:\APP\GitHub\dsh-requirement-check\src\i18n.js"
src = io.open(PATH, encoding="utf-8").read()

NEW = {
    "zh-CN": """    toolLocaleDesc:
      '设置需求体检使用的语言（简体中文 / 繁體中文 / English），并记住这个选择。' +
      '当用户说“用繁体”“切换成英文”“switch to English”“說中文”时使用。',
    paramLocale: '目标语言。可选 zh-CN（简体中文）/ zh-TW（繁體中文）/ en（English）。',
    outLocale: '语言切换结果',
    localeSwitchedFmt: '已切换到 {name}。之后的需求体检与模板都会用这个语言。',
    localeSaveFailed: '语言已在本进程生效，但写入偏好文件失败（目录可能只读），下次启动会回到默认。',
    localeCurrentFmt: '当前语言：{name}。',
""",
    "zh-TW": """    toolLocaleDesc:
      '設定需求健檢使用的語言（简体中文 / 繁體中文 / English），並記住這個選擇。' +
      '當使用者說「用繁體」「切換成英文」「switch to English」「說中文」時使用。',
    paramLocale: '目標語言。可選 zh-CN（简体中文）／ zh-TW（繁體中文）／ en（English）。',
    outLocale: '語言切換結果',
    localeSwitchedFmt: '已切換到 {name}。之後的需求健檢與範本都會用這個語言。',
    localeSaveFailed: '語言已在本次執行生效，但寫入偏好檔案失敗（目錄可能唯讀），下次啟動會回到預設值。',
    localeCurrentFmt: '目前語言：{name}。',
""",
    "en": """    toolLocaleDesc:
      'Set the language used by the requirement tools (简体中文 / 繁體中文 / English) and remember it. ' +
      'Use when the user says "use traditional Chinese", "switch to English", "in Chinese please", etc.',
    paramLocale: 'Target language: zh-CN (Simplified Chinese) / zh-TW (Traditional Chinese) / en (English).',
    outLocale: 'Language switch result',
    localeSwitchedFmt: 'Switched to {name}. Requirement checks and templates will use this language from now on.',
    localeSaveFailed: 'The language is active for this run, but writing the preference file failed (directory may be read-only); the next start will fall back to the default.',
    localeCurrentFmt: 'Current language: {name}.',
""",
}

# 在每个语言块的 localeNoteFmt 之前插入新键
for locale, block in NEW.items():
    if locale == "zh-CN":
        anchor = "    localeNoteFmt: '（当前语言：{name}。可用 locale 参数切换：{all}）',"
    elif locale == "zh-TW":
        anchor = "    localeNoteFmt: '（目前語言：{name}。可用 locale 參數切換：{all}）',"
    else:
        anchor = "    localeNoteFmt: '(Current language: {name}. Switch with the locale argument: {all})',"

    assert anchor in src, "找不到锚点: " + locale
    src = src.replace(anchor, block + anchor, 1)
    print("已插入:", locale)

io.open(PATH, "w", encoding="utf-8").write(src)

# 校验：三个块都要有那 6 个新键
keys = ["toolLocaleDesc", "paramLocale", "outLocale", "localeSwitchedFmt",
        "localeSaveFailed", "localeCurrentFmt"]
missing = []
for k in keys:
    n = len(re.findall(r"\b%s\s*:" % k, src))
    if n < 3:
        missing.append((k, n))
print("三语齐全性检查:", "全部 3 处" if not missing else missing)
print("文件大小:", len(src), "字符")
