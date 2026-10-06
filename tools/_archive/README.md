# _archive

这些是**一次性补丁脚本**，任务已完成，保留只为追溯当时怎么改的。
不要直接运行它们——它们基于当时文件的锚点，文件已经变了，会失败或改错。

⚠️ **里面写死的路径是当年的**（早期副本曾放在 `E:\APP\GitHub\dsh-requirement-check`，
那份已于 2026-10 删除；仓库现位于 `E:\Agent\DeepSeek\dsh-requirement-check`）。
路径失效是**预期**的 —— 这些脚本本来就只作留档，不修也不跑。

保留在 tools/ 下的是仍然有用的：
- gen_templates.py       重新生成 templates.js（改模板时用它）
- prove-fault-injection.mjs  反证：故意删一个翻译键，确认测试能抓到

事故记录（为什么这些脚本要归档、不能再跑）：
- 用同一个锚点循环三次 → 三段文案全插进了第一个语言块
- 锚点把 delivery 那一行也包含进去 → replace 时整行被吃掉，键丢失
- PowerShell Set-Content -Encoding UTF8 → 写进 BOM，Node 解析 package.json 失败