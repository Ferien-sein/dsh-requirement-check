# -*- coding: utf-8 -*-
"""更新插件的版本、描述与 README（补上查重工具）。"""
import io
import json
import os
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# ---------------- package.json ----------------
pk = os.path.join(ROOT, "package.json")
d = json.load(io.open(pk, encoding="utf-8-sig"))
d["version"] = "0.4.0"
d["description"] = (
    "Requirement tools for DeepSeek Harness (Simplified Chinese / Traditional Chinese / English): "
    "blind-spot check on your own requirement text, 8 fill-in templates, local OS/bitness detection "
    "(Windows/macOS/Linux, 32/64-bit, plus Android/iOS/HarmonyOS/web targets), a GitHub duplicate check "
    "that searches before you build, and a language switch.")
for k in ("github", "duplicate-check", "search-before-build", "android", "ios", "harmonyos"):
    if k not in d["keywords"]:
        d["keywords"].append(k)
d["scripts"]["test"] = "node test/run.mjs && node test/lookup.mjs"
io.open(pk, "w", encoding="utf-8", newline="\n").write(
    json.dumps(d, ensure_ascii=False, indent=2) + "\n")
print("  package.json: version=%s" % d["version"])
print("  scripts.test: %s" % d["scripts"]["test"])

# ---------------- README ----------------
rp = os.path.join(ROOT, "README.md")
s = io.open(rp, encoding="utf-8", newline=None).read()

ANCHOR = "### 3. `requirement_template` —— 行业模板（8 套 × 三语）"
ADD = """### 3. `requirement_duplicate_check` —— 动手前先查 GitHub 有没有现成的

**这个工具回答的是「我该不该自己做」。** 很多需求 GitHub 上已经有成熟方案，
先查一眼能省掉大量重复劳动；有能用的就拿现成的改，通常比从零做更可靠。

- 自动把**中文需求转成 GitHub 上更好搜的英文词**
  （实测：整句中文在 GitHub 上返回 0 个结果）
- 搜索后给出判断：**建议用现成的 / 值得先看看 / 自己做更省事**
- 附星数、最近更新、许可证、是否已归档

> [!WARNING]
> **它强制先按相关性过滤。** 原因是实测踩到的坑：GitHub 的多词搜索是 **OR 语义**，
> 搜 `excel merge tool` 会返回任何带 excel / merge / tool 之一的仓库 ——
> 头名是个 3250 星的政治话题仓库。只看星数会给出「建议用现成的」这种完全错误的结论。

限流（未登录约 10 次/分钟）时不是报「失败」，而是提示你可以自己搜。

"""

if "requirement_duplicate_check" in s:
    print("  README: 已有查重工具章节")
elif ANCHOR in s:
    s = s.replace(ANCHOR, ADD + ANCHOR, 1)
    # 插在第 3 位之后，原来的 3/4 顺移为 4/5
    s = s.replace("### 4. `requirement_locale`", "### 5. `requirement_locale`")
    s = s.replace(ANCHOR, "### 4. `requirement_template` —— 行业模板（8 套 × 三语）", 1)
    s = s.replace("## 它提供的四个工具", "## 它提供的五个工具")
    s = s.replace("四个工具的描述与参数说明", "五个工具的描述与参数说明")
    s = s.replace("失败也不影响四个工具和系统提示", "失败也不影响五个工具和系统提示")
    s = s.replace("插件本体（四个工具、settings、系统提示）",
                  "插件本体（五个工具、settings、系统提示）")
    io.open(rp, "w", encoding="utf-8", newline="\r\n").write(s)
    print("  README: 已补查重工具章节，编号已顺移")
else:
    print("  [X] README 找不到锚点 %r" % ANCHOR)
    sys.exit(1)

# 复查
s2 = io.open(rp, encoding="utf-8", newline=None).read()
for probe in ("### 3. `requirement_duplicate_check`", "### 4. `requirement_platform`",
              "### 5. `requirement_locale`", "五个工具"):
    print("    README 含 %-42s %s" % (probe, probe in s2))
