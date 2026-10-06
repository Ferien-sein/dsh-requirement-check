# -*- coding: utf-8 -*-
"""插件发布前检查。

覆盖这几轮踩过的坑：
  1. BOM（会让 Node 解析 package.json 失败）
  2. 漏翻 / 多翻（某个语言块少了键）
  3. 文案插错语言块（繁体插进简中）
  4. 锚点替换误删内容（我曾把 delivery 整行替换掉）
  5. 语法错误、文件缺失、files 白名单对不上
"""
import io
import json
import os
import re
import shutil
import subprocess
import sys

# ★ 路径不能用写死的本机绝对路径：
#   1) 别人克隆下来根本跑不了 —— 等于把检查脚本绑死在一台机器上
#   2) 也会把作者的用户名和目录结构带进公开仓库
#   改成从脚本自身位置推算，并用 shutil.which 找 node —— 谁克隆都能跑。
PLUGIN = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def find_node():
    """找 node 可执行文件：环境变量 > PATH > DSH 自带运行时。"""
    env = os.environ.get("XBSH_NODE") or os.environ.get("NODE")
    if env and os.path.exists(env):
        return env
    found = shutil.which("node")
    if found:
        return found
    for cand in (
        os.path.join(os.path.expanduser("~"), ".dsh", "dsh-runtimes",
                     "dsh-primary-runtime", "dependencies", "node", "bin", "node.exe"),
        os.path.join(os.path.expanduser("~"), ".dsh", "dsh-runtimes",
                     "dsh-primary-runtime", "dependencies", "node", "bin", "node"),
    ):
        if os.path.exists(cand):
            return cand
    return None


NODE = find_node()

problems = []

# ---------------------------------------------------------------- 文件与 BOM
files = {}
bom = []
for root, dirs, names in os.walk(PLUGIN):
    dirs[:] = [d for d in dirs if d not in {"node_modules", ".git", "__pycache__"}]
    for n in names:
        p = os.path.join(root, n)
        rel = os.path.relpath(p, PLUGIN).replace("\\", "/")
        files[rel] = os.path.getsize(p)
        if open(p, "rb").read(3) == b"\xef\xbb\xbf":
            bom.append(rel)

print("=== 文件清单 ===")
for k in sorted(files):
    print("  %8d B  %s%s" % (files[k], "[BOM] " if k in bom else "", k))
print("\n=== BOM ===")
if bom:
    problems.append("含 BOM: " + ", ".join(bom))
    print("  ★ " + ", ".join(bom))
else:
    print("  无")

required = ["package.json", "cordis.patch.yml", "README.md", "LICENSE", ".gitignore",
            "src/index.js", "src/blindspots.js", "src/platform.js", "src/locale.js",
            "src/i18n.js", "src/templates.js", "src/templates_render.js",
            "src/config-store.js", "test/run.mjs", "test/demo.mjs"]
print("\n=== 必备文件 ===")
for f in required:
    if f not in files:
        problems.append("缺少 " + f)
        print("  缺失 " + f)
print("  全部存在" if not any(f not in files for f in required) else "")

pkg = json.load(io.open(os.path.join(PLUGIN, "package.json"), encoding="utf-8-sig"))
for item in pkg.get("files", []):
    if not os.path.exists(os.path.join(PLUGIN, item)):
        problems.append("files 白名单不存在: " + item)
print("\n=== package.json ===")
print("  %s %s" % (pkg["name"], pkg["version"]))
print("  files:", pkg.get("files"))

# ---------------------------------------------------------------- 语法
print("\n=== 语法检查 ===")
if not NODE:
    problems.append("找不到 node（设 XBSH_NODE 环境变量，或把 node 加进 PATH）")
    print("  ★ 找不到 node —— 设 XBSH_NODE，或把 node 加进 PATH")
for f in sorted(k for k in files if k.endswith((".js", ".mjs"))):
    if not NODE:
        break
    r = subprocess.run([NODE, "--check", os.path.join(PLUGIN, f)], capture_output=True, text=True)
    if r.returncode != 0:
        problems.append("语法错误: " + f)
        print("  错误 " + f)
print("  全部通过" if NODE and not any("语法错误" in p for p in problems) else "")

# ---------------------------------------------------------------- 盲区 id 来源
print("\n=== 盲区清单（从 blindspots.js 读真实 id）===")
bs = io.open(os.path.join(PLUGIN, "src/blindspots.js"), encoding="utf-8").read()
# ★ 正则不能要求 `{ id: 'x', severity:` 紧邻 —— 加了「做什么类型」维度后，
#   有的项在两者之间插了 `kinds: [...]`，写死顺序会**静默漏掉那几项**
#   （实测：4 个类型专属项没被读到，于是三语完整性检查把它们的文案
#     当成"多余键"，而真正缺的却查不出来）。
ids = re.findall(r"\{ id: '([a-z\-]+)',\s*(?:severity|kinds)", bs)
print("  %d 项: %s" % (len(ids), ", ".join(ids)))
if len(ids) != len(set(ids)):
    problems.append("盲区 id 有重复")

# ---------------------------------------------------------------- 三语结构
print("\n=== 三语结构 ===")
i18n = io.open(os.path.join(PLUGIN, "src/i18n.js"), encoding="utf-8").read()


def span(loc):
    if loc == "en":
        s = i18n.index("  en: {")
        return s, len(i18n)
    if loc == "zh-TW":
        s = i18n.index("'zh-TW': {")
        return s, i18n.index("  en: {", s)
    s = i18n.index("'zh-CN': {")
    return s, i18n.index("'zh-TW': {", s)


blocks = {loc: i18n[slice(*span(loc))] for loc in ("zh-CN", "zh-TW", "en")}

top = {loc: sorted(set(re.findall(r"\n    ([A-Za-z][A-Za-z0-9_]*)\s*:", b))) for loc, b in blocks.items()}
print("  顶层键: " + "  ".join("%s=%d" % (k, len(v)) for k, v in top.items()))
ref = top["zh-CN"]
for loc in ("zh-TW", "en"):
    miss = [k for k in ref if k not in top[loc]]
    extra = [k for k in top[loc] if k not in ref]
    if miss or extra:
        problems.append("%s 顶层键不一致 缺%s 多%s" % (loc, miss, extra))
        print("  ★ %s 缺:%s 多:%s" % (loc, miss, extra))
if len({len(v) for v in top.values()}) == 1:
    print("  三语顶层键数一致")

# 每组盲区文案的完整性
#
# ★ 这里换成「跑 node 去读真实导出」，不再用正则从源码里抠键。
#   原因：正则我改坏了两次 —— 先是只认单引号（新加的键是双引号），
#   再是字符类漏了 `-`（scope-out 被截成 scope）。靠正则解析 JS 源码太脆，
#   而 Node 就在旁边，直接读导出既准确又不依赖书写风格。
print("\n=== 每组盲区文案完整性（%d 项 × 3 组 × 3 语）===" % len(ids))
KINDS = ("program", "plugin", "script")


def node_json(script, fallback):
    """跑一段 node 脚本（ESM），把 JSON 结果读回来。失败就记问题并给 fallback。"""
    r = subprocess.run([NODE, "--input-type=module", "-e", script], cwd=PLUGIN,
                       capture_output=True, text=True, encoding="utf-8")
    if r.returncode != 0:
        tail = (r.stderr or "").strip().splitlines()
        problems.append("读取文案结构失败: %s" % (tail[-1] if tail else "?"))
        return fallback
    try:
        return json.loads(r.stdout)
    except Exception as e:  # noqa: BLE001
        problems.append("文案结构不是合法 JSON: %r" % (e,))
        return fallback


# LOCALES 在 locale.js 里（不在 i18n.js）——这个坑踩过一次，写成注释免得再犯
_size = node_json("""
import { LOCALES } from './src/locale.js'
import { stringsFor } from './src/i18n.js'
const out = {}
for (const loc of LOCALES) {
  const S = stringsFor(loc)
  out[loc] = {}
  for (const g of ['spotTitles', 'spotWhy', 'spotFix']) {
    out[loc][g] = Object.keys(S[g] || {})
  }
}
console.log(JSON.stringify(out))
""", {})

for loc in blocks:
    got = _size.get(loc) if isinstance(_size, dict) else None
    if not got:
        problems.append("%s: 读不到文案键" % loc)
        continue
    for group in ("spotTitles", "spotWhy", "spotFix"):
        keys = list(got.get(group) or [])
        plain = [k for k in keys if "." not in k]
        missing = [i for i in ids if i not in plain]
        if missing:
            problems.append("%s.%s 缺键 %s" % (loc, group, missing))
            print("  ★ %-7s %-11s 缺: %s" % (loc, group, missing))
        # 「id.类型」形式的按类型覆盖必须三组齐全（标题换了理由也要换）
        for k in keys:
            if "." not in k:
                continue
            base, _, kind = k.rpartition(".")
            if base not in ids or kind not in KINDS:
                problems.append("%s.%s 有多余键（既不是盲点 id 也不是 id.类型）: %s"
                                % (loc, group, k))
            elif not all(k in list(got.get(g2) or [])
                         for g2 in ("spotTitles", "spotWhy", "spotFix")):
                problems.append("%s: 按类型覆盖键 %s 没有三组齐全" % (loc, k))
    ok_here = not any(("%s." % loc) in p for p in problems)
    print("  %-7s 三组齐全" % loc if ok_here else "  %-7s 见上" % loc)

# 跨语言污染
SIMPLIFIED_IN_TRAD = ["预设", "目标", "位数", "说明", "系统", "电脑", "资讯", "选择", "默认"]
TRADITIONAL_IN_SIMP = ["預設", "目標", "位元", "說明", "系統", "電腦", "資訊", "選擇", "預設值"]
bad_tw = [w for w in SIMPLIFIED_IN_TRAD if w in blocks["zh-TW"]]
bad_cn = [w for w in TRADITIONAL_IN_SIMP if w in blocks["zh-CN"]]
print("\n=== 跨语言污染 ===")
print("  zh-TW 里的简体词:", bad_tw or "无")
print("  zh-CN 里的繁体词:", bad_cn or "无")
if bad_tw or bad_cn:
    problems.append("跨语言污染 tw=%s cn=%s" % (bad_tw, bad_cn))

# ---------------------------------------------------------------- 模板
print("\n=== 模板 ===")
tsrc = io.open(os.path.join(PLUGIN, "src/templates.js"), encoding="utf-8").read()
n_tpl = tsrc.count("\n    id: ")
print("  模板数: %d" % n_tpl)
for loc in ("zh-CN", "zh-TW", "en"):
    cnt = tsrc.count('"%s":' % loc)
    exp = n_tpl * 10 + 8   # 每套 名称+场景+8字段 = 10，另加 FIELD_LABELS 的 8 个字段名
    flag = "" if cnt == exp else "  ★ 期望 %d" % exp
    print("  %-7s 出现 %d 次%s" % (loc, cnt, flag))
    if cnt != exp:
        problems.append("templates.js 的 %s 出现 %d 次，期望 %d" % (loc, cnt, exp))

# ---------------------------------------------------------------- 测试
print("\n=== 运行测试 ===")
if not NODE:
    problems.append("没跑测试：找不到 node")
    print("  跳过（找不到 node）")
else:
    # 两个测试文件都要跑（lookup.mjs 是查重逻辑的测试）
    for entry in ("test/run.mjs", "test/lookup.mjs"):
        if not os.path.exists(os.path.join(PLUGIN, entry)):
            problems.append("缺少测试文件: " + entry)
            continue
        r = subprocess.run([NODE, entry], cwd=PLUGIN, capture_output=True,
                           text=True, encoding="utf-8")
        out = (r.stdout or "") + (r.stderr or "")
        for line in out.strip().splitlines()[-2:]:
            print("  " + line)
        if r.returncode != 0:
            problems.append("测试未通过: " + entry)

print("\n" + "=" * 60)
if problems:
    print("发现 %d 个问题：" % len(problems))
    for p in problems:
        print("  - " + p)
    sys.exit(1)
print("发布前检查全部通过")
