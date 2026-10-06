# dsh-requirement-check · 需求体检

> 把你的需求描述**倒进来看一眼**：缺了什么、为什么重要、怎么补。
> 再附 8 套行业模板，不知道该怎么说时照着填。
> 支持 **简体中文 / 繁體中文 / English**；
> 自动探测**你的电脑是 Windows / macOS / Linux、32 位还是 64 位**并作为默认目标。

给 DeepSeek Harness 用的插件。**不帮你改写需求，只检查你的描述有没有盲区**——
因为改写这件事市面上已经够挤了，检查反而没人做。

---

## 为什么做这个（先做过市场调研）

做之前我把 DSH 插件市场的注册源拉下来筛了一遍（`awesome-dsh-plugin.com/plugins.json`，
**共 4,412 个插件**），结论是这样：

| 方向 | 市场现状 |
|---|---|
| **把草稿改写成结构化需求** | **已经很挤** — `dsh-prompt-enhance`(7★)、`dsh-prompt-enhancer`(81★)、`dsh-prompt-enhance`(4,764 次下载) 等至少 7 个 |
| **一句话想法 → 需求规格 → 技术方案** | **已被占** — `DSH-Project-Initialization`（73 个 skill 的 agent preset） |
| **网页端分支问卷** | **已被占** — `dsh-rich-questions`（`ask_survey` 工具，按选项路由） |
| **新手说人话需求路由** | 有人做 — `dsh-beginner-hub`（本地关键词引擎把大白话路由成方案，1★） |
| **运行时需求漂移防护** | 高星集中在这 — `dsh-completion-guard` **3,672★**、`dsh-requirements-alignment` 8★ |
| **检查描述里的盲区** | **几乎是空的** — 只有 `dsh-ambiguity-handling`（1★，往系统提示里加一句规则） |
| **行业需求模板库** | **没人做** |

所以这个插件只做**最后两行**：不问你要做什么，而是拿你**已经写好的**东西，
比对一张 15 项的盲区清单，把缺口指出来；再给一套模板让你照着填。

一句话概括差异：**别人帮你把话写漂亮，这个帮你发现话没说到。**

---

## 它提供的五个工具

### 1. `requirement_check` —— 需求体检

传入你写的需求原文，得到分数、等级、缺失项清单和一份可读报告。

**15 项盲区**（按严重度分三档）：

| 严重度 | 盲区 |
|---|---|
| **high**（不补大概率返工） | 要做什么 · 明确不做什么 · 怎么算做好了 · 输入格式 · 输出格式 · 数据敏感性 |
| **mid** | 出错时怎么办 · 谁来用 · 在哪运行要不要联网 · **32 位还是 64 位** · 现在怎么做的 · 怎么交付 |
| **low** | 数据量级 · 使用频率 · 参照物或样例 |

每一项都给出**为什么要补**和**可直接照抄的句式**，例如：

```
【需求体检】完整度 26/100（太笼统，AI 只能猜）· 覆盖 3/15 项

有 4 个高优先级盲区必须补上，否则大概率要返工：
  · 明确不做什么（范围边界） —— 不说清边界，AI 容易顺手加一堆你不需要
    的功能，改起来更累。
    怎么补：句式：这一版不做【某某功能】；也不要【某某行为】。
  · 怎么算做好了（验收标准） —— 没有可验证的完成标准，就没法判断
    做出来的是不是你要的，只能靠感觉。
    怎么补：句式：拿【什么数据】跑一遍，看到【什么结果】，就算成功。最好带数字。
  ...

【目标系统与位数】
  你的电脑是 Windows 64 位 —— 没有特别说明时，就按这个来（Windows 64 位）。
  提醒：32 位程序在 32/64 位系统上都能跑，但 64 位程序在 32 位系统上跑不起来。
  句式：要跑在【Windows / macOS / Linux】，【32 位 / 64 位】；如果不确定，就按我的电脑来。
```

英文输出示例：

```
[Requirement check] Completeness 16/100 (too vague — the AI can only guess) · 2/15 covered

5 high-priority blind spot(s) must be filled in, otherwise rework is likely:
  · What NOT to build (scope boundary) —— Without boundaries the AI tends to add
    features you never asked for, which is expensive to undo.
    How to fill it in: Pattern: This version will NOT do [feature]; it should also not [behavior].
```

繁体输出用台湾用词（資訊／資料／範例／篩選／介面），不是简繁转码。

评分规则：high 权重 3、mid 权重 2、low 权重 1，满分 100；
另外对内容长度和结构词给少量宽容分，避免"写得多反而分低"的荒谬感。
**分数只取决于命中了哪些盲区，与语言无关** —— 同一段内容三种语言得分一致。

### 2. `requirement_platform` —— 目标系统与位数（默认跟随你的电脑）

「这软件要跑在哪」是需求里最常漏、又最容易导致**做好了别人打不开**的一项。
所以插件直接探测本机，给出默认值：

```json
{
  "platform": { "os": "win", "osLabel": "Windows", "arch": "x64", "bits": 64, "certain": false },
  "target": "windows-64",
  "targetLabel": "Windows 64 位",
  "targetResolvedBy": "auto",
  "defaultSentence": "你的电脑是 Windows 64 位 —— 没有特别说明时，就按这个来（Windows 64 位）。",
  "compatNote": "提醒：32 位程序在 32/64 位系统上都能跑，但 64 位程序在 32 位系统上跑不起来。"
}
```

支持的取值：

| 分组 | 取值 |
|---|---|
| 自动 | `auto`（默认，跟随使用者电脑） |
| Windows | `windows-64` / `windows-32` / `windows-arm64` |
| macOS | `macos-64`（Intel）/ `macos-arm64`（M 系列） |
| Linux | `linux-64` / `linux-arm64` |
| 网页 | `web` |

也可以用 `set_default: true` 把它存成偏好，之后 `requirement_check` 自动跟随。

**探测的诚实之处**：Node 的 `process.arch` 报的是**运行 Node 的那个进程**的架构——
在 Apple 芯片上跑 x64 版 Node 会报 x64。所以 macOS 上会额外查 `sysctl` 纠正，
其他不确定的情况用 `certain: false` 如实标出来，而不是假装知道。

### 3. `requirement_duplicate_check` —— 动手前先查 GitHub 有没有现成的

**这个工具回答的是「我该不该自己做」。** 很多需求 GitHub 上已经有成熟方案，
先查一眼能省掉大量重复劳动；有能用的就拿现成的改，通常比从零做更可靠。

- 自动把**中文需求转成 GitHub 上更好搜的英文词**
  （实测：整句中文在 GitHub 上返回 0 个结果）
- 搜索后给出判断：**建议用现成的 / 值得先看看 / 自己做更省事**
- 附星数、最近更新、许可证、是否已归档

> **⚠️ 它强制先按相关性过滤。** 原因是实测踩到的坑：
> GitHub 的多词搜索是 **OR 语义**，搜 `excel merge tool` 会返回任何带
> excel / merge / tool 之一的仓库 —— 头名是个 3250 星的政治话题仓库。
> 只看星数会给出「建议用现成的」这种完全错误的结论。

限流（未登录约 10 次/分钟）时不是报「失败」，而是提示你可以自己搜。

### 4. `requirement_template` —— 行业模板（8 套 × 三语）

不带参数列出全部，传 `keyword` 筛选，传 `template_id` 取回可编辑草案。

| id | 模板 | 场景 |
|---|---|---|
| `excel-merge` | Excel 多表汇总 | 每天把几个表合成一个总表，还要核对数字 |
| `report-generate` | 批量生成文档 | 按固定格式批量出 Word/报价单/通知 |
| `reconcile` | 两个表对账 | 找出两份数据不一致的地方 |
| `file-rename` | 文件批量整理 | 文件名很乱，要按规则改名分类 |
| **`decoration-quote`** | **装修报价计算** | **按房间面积、材料、人工算报价，出客户能看的单子** |
| **`payroll-overtime`** | **工资与加班计算** | **按考勤算工资、加班分段、扣款，出工资条** |
| `stock-reconcile` | 库存与出入库核对 | 理论结存 vs 实际盘点，找差异来源 |
| `shift-schedule` | 排班表生成 | 按人数和规则排一个月班次，统计每人班次 |

每套模板固定 8 个格子，顺序是：
**要做什么 → 现在怎么做 → 输入 → 输出 → 怎么算做好了 → 出错怎么办 → 不做什么 → 给谁用**

### 5. `requirement_locale` —— 语言开关

```
requirement_locale({ locale: 'zh-TW' })   // 之后默认用繁体
```

可选 `zh-CN` / `zh-TW` / `en`。选择会写进 `~/.dsh/requirement-check.json`，
下次启动仍然生效（也可以用 `set_default` 存目标系统）。也可以在每次调用里临时传
`locale` / `target` 参数覆盖。

语言判断优先级：**调用参数 > 环境变量（`XBSH_LOCALE`/`DSH_LOCALE`）> 偏好文件 > 系统代码页 > 默认简中**。
环境变量排在偏好文件之前——本次运行的明确意图应该能压过持久化的旧选择。

五个工具的描述与参数说明也随语言变化（用函数形式，按调用时解析，不锁死在加载时）。

---

## 安装

```bash
dsh plugin --profile <你的 profile 名> add <本插件路径或 npm 包名>
```

本地目录可以直接给路径。装完后确认 profile 的 `package.json` 里
`dsh.profile.bundles` 已经包含 `dsh-requirement-check`。

> ⚠️ **改 profile 会重启 DSH**。如果你正在会话里，先保存好手头的事。

卸载：`dsh plugin --profile <profile> remove dsh-requirement-check`

### 怎么用

装好后直接说话就行，agent 会自己调：

| 你说 | 调用 |
|---|---|
| 「帮我看看这个需求写得对不对」 | `requirement_check` |
| 「我想做个工具但不知道怎么说清楚」 | `requirement_template` → 再 `requirement_check` |
| 「用繁体」/「switch to English」 | `requirement_locale` |
| 「要做成 Windows 的还是 Mac 的？」 | `requirement_platform` |

语言和目标系统也可以单次指定，不用改全局偏好：

```
requirement_check({ text: '...', locale: 'en', target: 'macos-arm64' })
```

---

## 装上之后的行为（请先知道）

插件注册后会向系统提示注入一段说明，让 agent 在你提「想做个软件/工具」时
**先体检你的描述再动手**，而不是直接猜；用户不知道怎么写时给模板。

这段提示词的强度由 `Config` 里的 **`promptHint`** 控制（默认 `true`）。
一旦宿主支持在设置页里渲染插件 `Config`，它就是一个可以关掉的开关；
宿主不支持时它保持默认行为，不会报错。

---

## 已知限制

- **`settings.register` 有代际差异**。dsh `0.1.0-rc.7` / `0.1.2-alpha` 时代是
  `settings.register(ns, schema, opts)`；**`0.1.7` 起 `SettingsService` 改成
  `describe`/`update`，没有 `register`**，命名空间改为从插件的 `Config`
  schema 推导。这种情况下 `register` 会抛 TypeError。
  代码里已做 `try/catch` + `typeof` 检查，**失败也不影响五个工具和系统提示**。
  （这条来自 `dshmarket` 源码里的真实排错记录，不是推测。）
- **语言偏好没走 settings，而是自己存文件**（`~/.dsh/requirement-check.json`，
  测试可用 `XBSH_PREFS_PATH` 改写位置）。
  原因同上：各代宿主读自身配置的 API 不一致，与其承诺一个读不回来的开关，
  不如自己存一个小 JSON。代价是它不出现在设置页里。
- **盲区判定是正则关键词匹配，不是语义理解**。写得含蓄但内容齐全的描述，
  可能被误判为缺失；反之堆砌关键词但没有实质内容，可能拿高分。
  设计取向是**宁可误报也不漏报**——多问一句的成本远低于返工。
- **中英混写时会同时用两套规则**，偏向更容易命中（更宽松）。
- **模板是通用示例，不含行业专有规则**（比如具体税务口径、地区法规）。
- **繁体用词是人工写的台湾用法**，不是简繁字表转换；如果你更习惯香港用词，
  改 `src/i18n.js` 里的 `zh-TW` 段落即可。

---

## 开发与测试

```bash
npm run check            # 八个模块的语法检查
npm test                 # 96 项测试（run.mjs 71 项 + lookup.mjs 25 项）
npm run verify           # 发布前检查：BOM / 漏翻 / 跨语言污染 / 模板完整性
npm run fault-injection  # 反证：故意删一个翻译键，确认测试真的能抓到
npm run demo             # 三语各跑一遍，看实际输出
```

测试不启动 DSH：用一个 mock 的 `ctx` 调用 `apply()`，捕获注册的工具，
校验形状是否符合 DSH 的 `ToolDefinition`，再直接调用 `execute()` 验证输出。
所有断言都用 `XBSH_LOCALE` 显式钉住语言，不受跑测试这台机器的系统语言影响。

覆盖的点包括：

- 语言归一化（`zh_Hant` / `zh-TW` / `en-US` 等 14 种写法）
- 三个语言包的**键集合完全一致**（防漏翻）
- 15 项盲区的标题/理由/句式三语齐全且非空（缺键时报「漏翻」）
- 简繁共用中文规则、英文规则独立生效
- **同一段内容三语得分一致**（分数与语言无关）
- 繁体报告不出现简体标题
- 模板三语结构一致、8 个字段标题都出现在草案里
- 空输入 / 非字符串输入不崩
- `max_items` 生效且有"未列出"提示
- 语言偏好读写往返、文件损坏时不抛
- 工具名合法、不重复、不占保留名 `run_code`
- `parameters` 只含 `JsonSchemaNode` 允许的字段
- `output.render` 返回 `ContentBlock[]`（形状 `{type:"text", text}`）
- 宿主不支持 `settings.register` 时不崩
- 没有 `systemPrompt` 服务时不崩

### 目录

```
.
├─ src/
│  ├─ index.js            插件本体（五个工具、settings、系统提示）
│  ├─ blindspots.js       15 项盲区清单 + 打分 + 报告（纯逻辑，可单独测）
│  ├─ locale.js           语言探测与归一化
│  ├─ platform.js         系统与位数探测（Windows/macOS/Linux × 32/64 位）
│  ├─ i18n.js             三语文案（标题/理由/句式/工具描述）
│  ├─ templates.js        8 套模板 × 三语数据（由脚本生成）
│  ├─ templates_render.js 模板渲染与查询
│  └─ config-store.js     语言偏好持久化（~/.dsh/requirement-check.json）
├─ test/
│  ├─ run.mjs             71 项测试
│  ├─ lookup.mjs          25 项测试（查重逻辑，用 mock 不联网）
│  └─ demo.mjs            三语演示
├─ tools/
│  ├─ gen_templates.py    生成 templates.js（192 条文案，手写易漏）
│  └─ add_locale_strings.py 给三语块补语言开关的文案键
└─ cordis.patch.yml       把插件插进 profile 的接线
```

`blindspots.js`、`i18n.js`、`templates*.js` **不依赖任何 DSH API**，
可以直接在普通 Node 里 import 使用——想把这套体检接到别的工具里也行。

---

## English summary

A DeepSeek Harness plugin that **audits your requirement text for blind spots**
instead of rewriting it. It checks 15 things people habitually omit (goal,
explicit out-of-scope, acceptance criteria, input/output shape, error handling,
privacy, and **32-bit vs 64-bit target**, …), scores completeness, and gives
copy-ready sentence patterns for whatever is missing. Also ships **8 fill-in
requirement templates**, a language switch, and **automatic detection of the
local OS and bitness** (Windows / macOS / Linux, 32- or 64-bit) as the default
target. Available in **Simplified Chinese, Traditional Chinese, and English** —
the score depends only on which blind spots are hit, never on the language.

Built after surveying all **4,412** plugins in the DSH marketplace: "rewrite my
draft into a structured prompt" is crowded (7+ plugins), "one-line idea →
spec → plan" is taken, but **"tell me what my description is missing"** was
essentially empty.

## License

MIT
