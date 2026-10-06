/** 演示：三语各跑一遍体检（含目标系统段）+ 模板，看实际输出。 */
import { checkRequirement, renderReport, BLIND_SPOTS } from '../src/blindspots.js'
import { TEMPLATES } from '../src/templates.js'
import { renderTemplate, templateIndex } from '../src/templates_render.js'
import { LOCALES, LOCALE_NAMES } from '../src/locale.js'
import { detectPlatform, platformToTarget, defaultTargetSentence, compatNote, TARGETS, describeTarget } from '../src/platform.js'

const VAGUE = {
  'zh-CN': '我想做一个管理客户的小软件，能记录客户信息，界面好看一点。',
  'zh-TW': '我想做一個管理客戶的小軟體，能記錄客戶資訊，介面好看一點。',
  en: 'I want to build a small tool to manage customers. It should look nice.',
}

const FULL = {
  'zh-CN': `我想做一个把每天三份销售 Excel 自动合并的小工具，用来省掉手动汇总。
现在我是手动复制粘贴，约 40 分钟，容易抄错。
输入是每天 3 个 .xlsx 放在「每日数据」文件夹，第一行是标题，列有 日期/客户/金额，约 200 行。
输出：屏幕显示总金额和异常行数；导出 Excel 到桌面，文件名 汇总_当天日期.xlsx。
怎么算做好了：拿上周 3 个文件跑一遍，总金额和财务给的完全一致，异常行全部标出。
出错怎么办：客户名对不上时把那几行列出来提醒我，不要静默跳过。
这一版不做图表、不联网、不做多用户。只有我自己用，Windows 电脑，数据不能上传。
我放了一份样例在「每日数据/样例.xlsx」。给我一个 exe 放桌面，双击就能用。`,
  'zh-TW': `我想做一個把每天三份銷售 Excel 自動合併的小工具，用來省掉手動彙總。
現在我是手動複製貼上，約 40 分鐘，容易抄錯。
輸入是每天 3 個 .xlsx 放在「每日資料」資料夾，第一列是標題，欄位有 日期／客戶／金額，約 200 列。
輸出：螢幕顯示總金額和異常列數；匯出 Excel 到桌面，檔名 彙總_當天日期.xlsx。
怎麼算做好了：拿上週 3 個檔案跑一遍，總金額和財務給的完全一致，異常列全部標出。
出錯怎麼辦：客戶名稱對不上時把那幾列列出來提醒我，不要默默跳過。
這一版不做圖表、不連線、不做多使用者。只有我自己用，Windows 電腦，資料不能上傳。
我放了一份範例在「每日資料/範例.xlsx」。給我一個 exe 放桌面，雙擊就能用。`,
  en: `I want to build a tool that merges three daily sales .xlsx files into one summary, to stop doing it by hand.
Right now I copy and paste manually, about 40 minutes, and I mistype rows.
Input: 3 .xlsx files in a daily-data folder; the first row is headers; columns are date/customer/amount; about 200 rows.
Output: show the total and the number of problem rows on screen; export an Excel file to the desktop named summary_date.xlsx.
What counts as done: run last week's 3 files and the total must match finance exactly, and every problem row is flagged.
On error: if a customer name cannot be matched, list those rows instead of skipping them silently.
Out of scope: no charts, no network, no multi-user. Only me, on a Windows PC, and the data must not be uploaded.
I will give you a sample at daily-data/sample.xlsx. Give me an exe on the desktop that I can double-click.`,
}

const line = (s) => '─'.repeat(Math.max(20, Math.min(s.length, 72)))

for (const loc of LOCALES) {
  console.log('\n' + '█'.repeat(72))
  console.log(`█ ${LOCALE_NAMES[loc]}（${loc}）`)
  console.log('█'.repeat(72))

  console.log('\n▸ 模糊需求：')
  const vague = checkRequirement(VAGUE[loc], { locale: loc, maxItems: 4 })
  console.log(renderReport(vague))

  console.log('\n▸ 完整需求：')
  const full = checkRequirement(FULL[loc], { locale: loc })
  console.log(`  分数 ${full.score}/100 · ${full.level} · ok=${full.ok} · 覆盖 ${full.covered}/${full.total}`)
  console.log('  ' + full.summary.split('\n')[0])

  // 演示「做什么类型」的效果：同一段文字按不同类型检查，重点不一样。
  // 这是这一版新增的能力 —— 不传 kind 就只查通用项（和以前一样）。
  console.log('\n▸ 同一段「插件需求」，按不同类型检查有什么不同：')
  const PLUGIN_DEMO = {
    'zh-CN': '帮我做个插件，能检查我写的需求。挂在 DeepSeek Harness 里，打一个命令触发。',
    'zh-TW': '幫我做個外掛，能檢查我寫的需求。掛在 DeepSeek Harness 裡，打一個指令觸發。',
    en: 'Build me a plugin that checks my requirement text. Inside DeepSeek Harness, '
      + 'triggered by a command.',
  }[loc]
  for (const kind of ['program', 'plugin', 'script']) {
    const r = checkRequirement(PLUGIN_DEMO, { locale: loc, kind, maxItems: 3 })
    // 该类型**多查了哪些项**（不管有没有被覆盖，这才是类型之间的差别）
    const extras = BLIND_SPOTS.filter((s) => s.kinds.includes(kind)).map((s) => s.id)
    const missingIds = r.missing.map((m) => m.id)
    const notCovered = extras.filter((x) => missingIds.includes(x))
    console.log(`  kind=${kind.padEnd(8)} 共 ${String(r.total).padStart(2)} 项 · 分数 ${String(r.score).padStart(3)}`
      + (extras.length
        ? ` · 多查: ${extras.join(', ')}`
          + (notCovered.length ? `（这段没覆盖: ${notCovered.join(', ')}）` : '（这段都覆盖了）')
        : ' · 纯通用项，无类型专属'))
  }
}

console.log('\n' + '='.repeat(72))
console.log('本机平台探测（这就是「默认选使用者电脑」的来源）')
const det = detectPlatform()
console.log('  detectPlatform()   =', JSON.stringify(det))
console.log('  → 默认目标          =', platformToTarget(det), '（' + describeTarget(platformToTarget(det), 'zh-CN') + '）')
console.log('  可选目标            =', TARGETS.join(', '))
console.log('\n  三语默认句：')
for (const loc of LOCALES) {
  console.log('    [' + loc + '] ' + defaultTargetSentence(loc, det))
}
console.log('\n  三语兼容提醒：')
for (const loc of LOCALES) {
  console.log('    [' + loc + '] ' + compatNote(loc, det))
}

console.log('\n' + '='.repeat(72))
console.log('模板库（8 套 × 三语）')
for (const loc of ['zh-CN', 'zh-TW', 'en']) {
  console.log('\n  [' + LOCALE_NAMES[loc] + ']')
  for (const t of templateIndex(loc)) console.log(`    ${t.id.padEnd(18)} ${t.name}`)
}

console.log('\n' + '='.repeat(72))
console.log('▸ 英文装修报价模板草案（前 20 行）')
const tpl = TEMPLATES.find((x) => x.id === 'decoration-quote')
renderTemplate(tpl, 'en').split('\n').slice(0, 20).forEach((l) => console.log('  ' + l))
