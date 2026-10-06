# AGENTS.md —— 给 AI 助手的工作约定

> 这个文件给**在这个仓库里干活的 AI 助手**看。
> 人（尤其是这个插件的作者）不一定懂编程，所以下面的规矩要**无条件遵守**，
> 不要因为「改动很小」「只是改个文案」就跳过。

> **第一次接手这个项目，请先读 [`维护交接文档.md`](维护交接文档.md)** ——
> 里面有当前状态、常见任务入口、**以及 12 条别重走的坑**（每条都是真踩过的）。
> 那份文档比这份更全面；这份只讲「干活的硬规矩」。

---

## 注意事项

### 1、每次改动完成后，都必须创建一个对应的 GIT commit，以便后继追踪和回滚。

- 一次改动 = 一个 commit。改完就提交，不要攒着。
- commit 信息要写**改了什么、为什么改**，不要只写 "update"、"fix"。
- 提交前先看一眼 `git status`，确认没有把不该进仓库的东西带进去
  （`node_modules/` 已在 `.gitignore` 里，**不要用 `git add -f` 强行加它**）。
- 如果一次改动包含了多个互不相关的事，拆成多个 commit。
- **反向也要遵守**：发现工作区有未提交的改动，先弄清楚那是谁的、
  该不该提交，不要直接在上面继续改。

### 2、每次改动后，都必须编写或更新相关测试，并在交付给用户前，确保所有测试和验证全部通过。

- 改了逻辑 → 补/改对应的测试；改了文案 → 确认三语（简中/繁中/英文）都有对应译文。
- **不许说「应该没问题」**。跑完再说，并把真实结果贴出来（包括失败项）。
- 测试**失败或跳过**都要如实说，不要把它说成通过。
- 修 bug 时，**优先先写一个能复现它的测试**，再修 —— 这样以后不会再犯同一个错
  （这个项目里几个真 bug 就是这么抓出来的：改文案后三语漏翻、
  中文整句拿去搜 GitHub 返回 0 结果）。

#### 这个项目要跑哪些

```powershell
node test\run.mjs        # 插件契约与各工具行为，71 项
node test\lookup.mjs     # GitHub 查重逻辑（用 mock，不联网），25 项
node test\demo.mjs       # 看输出长什么样（人工确认用）

python tools\preflight.py    # 发布前检查：清单字段、BOM、测试
```

联网探针（手动跑，会占用 GitHub 未登录限流约 10 次/分钟）：

```powershell
node tools\probe-lookup.mjs
```

#### 交付前的最低要求

| 项目 | 要求 |
|---|---|
| 测试 | `node test\run.mjs` 与 `node test\lookup.mjs` **全部通过** |
| 三语 | `src/i18n.js` 里三种语言**都有**对应文案，不能靠回退 |
| 清单 | `package.json` 合法、无 BOM（`preflight.py` 会查） |
| 界面/输出改动 | 跑 `node test\demo.mjs` **看一眼真实输出** |

---

## 一些项目约定（避免改出问题）

### `node_modules` 是目录联接，不是真文件

`src/index.js` 需要 `@deepseek-ai/schemastery`（peer 是 `@deepseek-ai/cordis`），
它是指向 DSH profile 的 **junction（目录联接）**：

```
node_modules\@deepseek-ai\schemastery -> C:\Users\<你>\.dsh\profiles\desktop\node_modules\@deepseek-ai\schemastery
```

- **别提交它**，也**别在别处复制整个文件夹**（联接复制不过去）。
- 换机器 / 重新克隆后测试报 `ERR_MODULE_NOT_FOUND` 就是这个原因，
  按仓库根目录「本副本说明.md」里的命令重建联接。

### 其他

- **文案一律写进 `src/i18n.js` 的三套表**，不要在代码里散落中文字符串。
- **GitHub 的多词搜索是 OR 语义**，会返回无关的高星项目。
  查重逻辑**必须**先按相关性过滤再判断（`relevanceScore` / `rankRepos`），
  否则会给出「建议用现成的」这种完全错误的结论。有测试盯这条。
- **中文整句拿去搜 GitHub 命中率极低**，要走 `toSearchQuery()` 映射成英文检索词。
- **不要删测试来让测试通过**。测试失败说明有问题，去修问题本身。
